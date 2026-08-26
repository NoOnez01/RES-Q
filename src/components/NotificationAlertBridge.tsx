import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { ToastTone } from '@/lib/toast'
import { playAlertSound, playSeverityAlert, playHospitalAlert } from '@/lib/alertSound'
import { showNativeNotification, showLoopingNativeNotification, cancelLoopingNotification } from '@/lib/nativeNotify'
import type { AppNotification, EmergencyCase, Role } from '@/lib/types'

const REPEAT_MS = 3000

const TONE_MAP: Record<AppNotification['tone'], ToastTone> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  emergency: 'error',
}

interface HandoffAlert {
  case: EmergencyCase
  title: string
  message: string
  urgent: boolean
  kind: 'dispatch' | 'rescue' | 'hospital'
  /**
   * Unique per distinct event, not just per (role, case) — a single case can
   * legitimately need to alert the same role more than once (e.g. dispatch
   * gets alerted when a case first arrives, and again later if a rescue team
   * rejects it). Including something that changes between occurrences (like
   * `rescueRejectedAt`) is what lets the second alert fire instead of being
   * silently deduped against the first.
   */
  key: string
}

/**
 * The real handoffs in the pipeline — public -> 1669, 1669 -> กู้ภัย, กู้ภัย
 * -> โรงพยาบาล, and a rejection bouncing a case back to 1669 — each need to
 * alert whichever role the case just landed on (or landed back on). Mirrors
 * the same case fields the relevant store actions (submitCallbackPhone,
 * assignRescueTeam, rescueRejectCase, selectHospital) transition, so a case
 * is "actionable for this role" independent of who or which tab moved it.
 */
function handoffsFor(role: Role | 'public', cases: EmergencyCase[]): HandoffAlert[] {
  if (role === 'dispatch') {
    const newCases = cases
      .filter((c) => c.status === 'received' && !c.assessment)
      .map((c) => ({
        case: c,
        title: 'มีเคสฉุกเฉินใหม่',
        message: `เคส ${c.caseNumber} ถูกส่งเข้าระบบแล้ว รอการมอบหมายหน่วยกู้ภัย`,
        urgent: true,
        kind: 'dispatch' as const,
        key: `dispatch-new:${c.id}`,
      }))
    const rejectedCases = cases
      .filter((c) => c.status === 'finding-rescue' && c.rescueRejectedAt)
      .map((c) => ({
        case: c,
        title: 'หน่วยกู้ภัยปฏิเสธเคส',
        message: `เคส ${c.caseNumber} ถูกปฏิเสธจากหน่วยกู้ภัย กรุณามอบหมายหน่วยใหม่`,
        urgent: true,
        kind: 'dispatch' as const,
        key: `dispatch-rejected:${c.id}:${c.rescueRejectedAt}`,
      }))
    return [...newCases, ...rejectedCases]
  }
  if (role === 'rescue') {
    return cases
      .filter((c) => c.status === 'rescue-assigned')
      .map((c) => ({
        case: c,
        title: 'ได้รับมอบหมายเคสใหม่',
        message: `คุณได้รับมอบหมายเคส ${c.caseNumber} กรุณายืนยันการรับเคส`,
        urgent: false,
        kind: 'rescue' as const,
        key: `rescue-assigned:${c.id}`,
      }))
  }
  if (role === 'hospital') {
    return cases
      .filter((c) => c.selectedHospital && c.status !== 'hospital-received' && c.status !== 'completed')
      .map((c) => ({
        case: c,
        title: 'มีผู้ป่วยกำลังนำส่ง',
        message: `เคส ${c.caseNumber} เลือกส่งตัวมาที่โรงพยาบาลของท่าน กรุณาเตรียมทีมรักษา`,
        urgent: true,
        kind: 'hospital' as const,
        key: `hospital-selected:${c.id}`,
      }))
  }
  return []
}

/**
 * Severity-specific alert when the case has been triaged, otherwise the
 * plain urgent/soft tone. Hospital handoffs get their own rising-pitch run
 * instead — more distinct and more urgent-reading than the flat patterns
 * used for dispatch/rescue.
 */
function playHandoffSound(h: HandoffAlert) {
  if (h.kind === 'hospital') {
    playHospitalAlert(h.case.assessment?.severity)
    return
  }
  if (h.case.assessment) playSeverityAlert(h.case.assessment.severity)
  else playAlertSound(h.urgent)
}

/**
 * Headless: turns every new store notification relevant to the current
 * user's role into an on-screen toast + a short alert sound. Every case
 * event already calls the store's `notify()` (new case to dispatch, rescue
 * assigned, hospital handoff, etc.) — this is the single place that surfaces
 * all of them, instead of wiring toast+sound into each call site.
 *
 * `notifications` is local, per-tab state (zustand `persist` -> localStorage
 * only), so it never reaches, say, a dispatcher whose tab didn't create it —
 * e.g. a case submitted from a citizen's own phone/tab. `cases`, on the
 * other hand, genuinely syncs across tabs/devices via Supabase realtime, so
 * handoff alerts for each stage (public -> 1669, 1669 -> กู้ภัย, กู้ภัย ->
 * โรงพยาบาล) are additionally derived straight from that via `handoffsFor`.
 *
 * A pending handoff also re-alerts (sound only, no repeat toast) every
 * REPEAT_MS until whoever it's for actually acts on it — accepting,
 * assessing, confirming admission, etc. all remove the case from
 * `handoffsFor`'s result, which is what silences the loop.
 */
export function NotificationAlertBridge() {
  const notifications = useStore((s) => s.notifications)
  const cases = useStore((s) => s.cases)
  const currentUser = useStore((s) => s.currentUser)
  const seenNotificationIds = useRef<Set<string>>(new Set())
  const alertedCaseKeys = useRef<Set<string>>(new Set())
  const isFirstRun = useRef(true)
  const activeLoopKeys = useRef<Set<string>>(new Set())
  const latest = useRef<{ cases: Record<string, EmergencyCase>; audience: Role | 'public' }>({
    cases: {},
    audience: 'public',
  })

  useEffect(() => {
    const audience = currentUser?.role ?? 'public'
    latest.current = { cases, audience }
    const relevantNotifications = notifications.filter((n) => n.audience === audience || n.audience === 'all')
    const handoffs = handoffsFor(audience, Object.values(cases))

    if (isFirstRun.current) {
      // Don't alert for anything that already existed on mount (seeded demo
      // data, or cases/notifications from before this component was ready).
      for (const n of relevantNotifications) seenNotificationIds.current.add(n.id)
      for (const h of handoffs) alertedCaseKeys.current.add(h.key)
      isFirstRun.current = false
      return
    }

    for (const n of relevantNotifications) {
      if (seenNotificationIds.current.has(n.id)) continue
      seenNotificationIds.current.add(n.id)
      toast({ title: n.title, message: n.message, tone: TONE_MAP[n.tone] })
      if (n.tone === 'emergency' || n.tone === 'warning') playAlertSound(n.tone === 'emergency')
      if (n.tone === 'emergency' || n.tone === 'warning') void showNativeNotification(n.title, n.message)
    }

    for (const h of handoffs) {
      if (alertedCaseKeys.current.has(h.key)) continue
      alertedCaseKeys.current.add(h.key)
      toast({ title: h.title, message: h.message, tone: h.urgent ? 'error' : 'warning' })
      playHandoffSound(h)
      void showNativeNotification(h.title, h.message)
    }
  }, [notifications, cases, currentUser])

  useEffect(() => {
    const interval = setInterval(() => {
      const { cases: latestCases, audience } = latest.current
      const pending = handoffsFor(audience, Object.values(latestCases))
      const pendingKeys = new Set(pending.map((h) => h.key))

      // A case that's no longer pending (handled elsewhere, or by us) needs
      // its looping native notification cleared, same as the web loop going
      // quiet once `handoffsFor` stops returning it.
      for (const key of activeLoopKeys.current) {
        if (!pendingKeys.has(key)) {
          activeLoopKeys.current.delete(key)
          void cancelLoopingNotification(key)
        }
      }

      if (pending.length === 0) return
      const mostUrgent = [...pending].sort(
        (a, b) => (a.case.assessment?.severity ?? 5) - (b.case.assessment?.severity ?? 5),
      )[0]
      playHandoffSound(mostUrgent)
      activeLoopKeys.current.add(mostUrgent.key)
      void showLoopingNativeNotification(mostUrgent.key, mostUrgent.title, mostUrgent.message)
    }, REPEAT_MS)
    return () => clearInterval(interval)
  }, [])

  return null
}
