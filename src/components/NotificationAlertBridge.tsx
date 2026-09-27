import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { ToastTone } from '@/lib/toast'
import { playAlert, type AlertEvent } from '@/lib/sounds'
import { showNativeNotification } from '@/lib/nativeNotify'
import { CaseAlertModal } from './CaseAlertModal'
import { useInLiveConversation } from '@/lib/useLiveKitCall'
import type { AppNotification, EmergencyCase, Role } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  หน่วยกู้ชีพเสนอปรับระดับความรุนแรง: 'Rescue team proposed a severity change',
  'เหตุหมายเลข {caseNumber}: หน่วยกู้ชีพประเมิน ณ จุดเกิดเหตุและเสนอปรับระดับความรุนแรง กรุณาพิจารณายืนยัน':
    'Case {caseNumber}: the rescue team assessed the scene and proposed a severity change, please confirm',
  ยืนยันระดับความรุนแรงแล้ว: 'Severity confirmed',
  ไม่ยืนยันการปรับระดับความรุนแรง: 'Severity change declined',
  มีเหตุฉุกเฉินใหม่: 'New emergency case',
  'เหตุหมายเลข {caseNumber} เข้าสู่ระบบแล้ว รอการมอบหมายหน่วยกู้ชีพ': 'Case {caseNumber} has been submitted, awaiting rescue team assignment',
  หน่วยกู้ชีพปฏิเสธการรับเหตุ: 'Rescue team declined the case',
  'หน่วยกู้ชีพปฏิเสธเหตุหมายเลข {caseNumber} กรุณามอบหมายหน่วยใหม่': 'Case {caseNumber} was declined by the rescue team, please assign a new team',
  ได้รับมอบหมายเหตุใหม่: 'New case assigned to you',
  'คุณได้รับมอบหมายเหตุหมายเลข {caseNumber} กรุณายืนยันการรับเหตุ': 'You have been assigned case {caseNumber}, please confirm acceptance',
  มีผู้ป่วยกำลังนำส่ง: 'A patient is being transported',
  'เหตุหมายเลข {caseNumber} จะนำส่งผู้ป่วยมายังโรงพยาบาลของท่าน กรุณาเตรียมทีมรักษา': 'Case {caseNumber} is transporting a patient to your hospital. Please prepare the treatment team.',
})

const TONE_MAP: Record<AppNotification['tone'], ToastTone> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  emergency: 'error',
}

export interface HandoffAlert {
  case: EmergencyCase
  title: string
  message: string
  urgent: boolean
  kind: 'dispatch' | 'rescue' | 'hospital'
  /** What happened -- picks the alert's sound and icon. */
  event: Exclude<AlertEvent, 'notice'>
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
 * The real handoffs in the pipeline — public -> 1669, 1669 -> กู้ชีพ, กู้ชีพ
 * -> โรงพยาบาล, and a rejection bouncing a case back to 1669 — each need to
 * alert whichever role the case just landed on (or landed back on). Mirrors
 * the same case fields the relevant store actions (submitReport,
 * assignRescueTeam, rescueRejectCase, recordHospitalDecision) transition, so
 * a case is "actionable for this role" independent of who or which tab moved
 * it.
 */
function handoffsFor(
  role: Role | 'public',
  cases: EmergencyCase[],
  currentUser: { rescueTeamId?: string; hospitalId?: string } | null,
  t: (text: string, vars?: Record<string, string | number>) => string,
): HandoffAlert[] {
  if (role === 'dispatch') {
    const newCases = cases
      .filter((c) => c.status === 'received' && !c.assessment)
      .map((c) => ({
        case: c,
        title: t('มีเหตุฉุกเฉินใหม่'),
        message: t('เหตุหมายเลข {caseNumber} เข้าสู่ระบบแล้ว รอการมอบหมายหน่วยกู้ชีพ', { caseNumber: c.caseNumber }),
        urgent: true,
        kind: 'dispatch' as const,
        event: 'case-new' as const,
        key: `dispatch-new:${c.id}`,
      }))
    const rejectedCases = cases
      .filter((c) => c.status === 'finding-rescue' && c.rescueRejectedAt)
      .map((c) => ({
        case: c,
        title: t('หน่วยกู้ชีพปฏิเสธการรับเหตุ'),
        message: t('หน่วยกู้ชีพปฏิเสธเหตุหมายเลข {caseNumber} กรุณามอบหมายหน่วยใหม่', { caseNumber: c.caseNumber }),
        urgent: true,
        kind: 'dispatch' as const,
        event: 'rescue-rejected' as const,
        key: `dispatch-rejected:${c.id}:${c.rescueRejectedAt}`,
      }))
    // Rescue re-assessed the level at the scene: 1669 approves or declines
    // it right from the popup.
    const proposals = cases
      .filter((c) => c.rescueSeverityProposal)
      .map((c) => ({
        case: c,
        title: t('หน่วยกู้ชีพเสนอปรับระดับความรุนแรง'),
        message: t('เหตุหมายเลข {caseNumber}: หน่วยกู้ชีพประเมิน ณ จุดเกิดเหตุและเสนอปรับระดับความรุนแรง กรุณาพิจารณายืนยัน', { caseNumber: c.caseNumber }),
        urgent: c.rescueSeverityProposal!.severity <= 2,
        kind: 'dispatch' as const,
        event: 'severity-proposal' as const,
        key: `severity-proposal:${c.id}:${c.rescueSeverityProposal!.proposedAt}`,
      }))
    return [...newCases, ...rejectedCases, ...proposals]
  }
  if (role === 'rescue') {
    return cases
      .filter((c) => c.status === 'rescue-assigned' && c.assignedRescueTeam?.id === currentUser?.rescueTeamId)
      .map((c) => ({
        case: c,
        title: t('ได้รับมอบหมายเหตุใหม่'),
        message: t('คุณได้รับมอบหมายเหตุหมายเลข {caseNumber} กรุณายืนยันการรับเหตุ', { caseNumber: c.caseNumber }),
        urgent: false,
        kind: 'rescue' as const,
        event: 'rescue-assigned' as const,
        key: `rescue-assigned:${c.id}`,
      }))
  }
  if (role === 'hospital') {
    return cases
      .filter(
        (c) =>
          c.selectedHospital?.id === currentUser?.hospitalId &&
          c.status !== 'hospital-received' &&
          c.status !== 'completed',
      )
      .map((c) => ({
        case: c,
        title: t('มีผู้ป่วยกำลังนำส่ง'),
        message: t('เหตุหมายเลข {caseNumber} จะนำส่งผู้ป่วยมายังโรงพยาบาลของท่าน กรุณาเตรียมทีมรักษา', { caseNumber: c.caseNumber }),
        urgent: true,
        kind: 'hospital' as const,
        event: 'hospital-incoming' as const,
        key: `hospital-selected:${c.id}`,
      }))
  }
  return []
}

/** Each event has its own sound; a triaged case's also says how urgent it is. */
function playHandoffSound(h: HandoffAlert) {
  const severity = h.event === 'severity-proposal' ? h.case.rescueSeverityProposal?.severity : h.case.assessment?.severity
  playAlert(h.event, severity)
}

// An alert nobody has acknowledged sounds again this often, for up to
// REPEAT_FOR_MS -- someone who stepped away from the screen still hears it
// when they come back within reach.
const REPEAT_EVERY_MS = 10_000
const REPEAT_FOR_MS = 5 * 60_000

function routeForHandoff(h: HandoffAlert): string {
  if (h.kind === 'dispatch') return `/dispatch/case/${h.case.id}`
  if (h.kind === 'rescue') return `/rescue/case/${h.case.id}`
  return `/hospital/case/${h.case.id}`
}

/**
 * Headless: turns every new store notification relevant to the current
 * user's role into an on-screen toast + a short alert sound, once, the
 * moment it becomes relevant. Every case event already calls the store's
 * `notify()` (new case to dispatch, rescue assigned, hospital handoff, etc.)
 * — this is the single place that surfaces all of them, instead of wiring
 * toast+sound into each call site.
 *
 * `notifications` is local, per-tab state (zustand `persist` -> localStorage
 * only), so it never reaches, say, a dispatcher whose tab didn't create it —
 * e.g. a case submitted from a citizen's own phone/tab. `cases`, on the
 * other hand, genuinely syncs across tabs/devices via Supabase realtime, so
 * handoff alerts for each stage (public -> 1669, 1669 -> กู้ชีพ, กู้ชีพ ->
 * โรงพยาบาล) are additionally derived straight from that via `handoffsFor`.
 * Each alert fires exactly once (deduped by key) and does not repeat.
 */
export function NotificationAlertBridge() {
  const notifications = useStore((s) => s.notifications)
  const cases = useStore((s) => s.cases)
  const currentUser = useStore((s) => s.currentUser)
  const confirmRescueSeverity = useStore((s) => s.confirmRescueSeverity)
  const navigate = useNavigate()
  const seenNotificationIds = useRef<Set<string>>(new Set())
  const alertedCaseKeys = useRef<Set<string>>(new Set())
  const isFirstRun = useRef(true)
  const [alertQueue, setAlertQueue] = useState<HandoffAlert[]>([])
  const t = useT()

  useEffect(() => {
    const audience = currentUser?.role ?? 'public'
    const isStaff = audience !== 'public'
    const relevantNotifications = notifications.filter((n) => n.audience === audience || n.audience === 'all')
    const handoffs = handoffsFor(audience, Object.values(cases), currentUser, t)

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
      // Staff hear an emergency or warning as an alert; everything else
      // (and everything for a citizen) sounds like its toast.
      const alert = isStaff && (n.tone === 'emergency' || n.tone === 'warning')
      toast({ title: n.title, message: n.message, tone: TONE_MAP[n.tone], silent: alert })
      if (alert) playAlert('notice')
      if (n.tone === 'emergency' || n.tone === 'warning') void showNativeNotification(n.title, n.message)
    }

    for (const h of handoffs) {
      if (alertedCaseKeys.current.has(h.key)) continue
      alertedCaseKeys.current.add(h.key)
      // A staff-facing handoff (new case, rejection, hospital incoming) gets
      // the harder-to-miss modal below instead of a toast -- these are
      // exactly the events where missing the notification has real
      // consequences, unlike a generic info/success toast.
      setAlertQueue((q) => [...q, h])
      playHandoffSound(h)
      void showNativeNotification(h.title, h.message)
    }
    // `t` intentionally omitted -- it's a new closure every render (see
    // lib/i18n.ts's useT), and including it would re-run this whole
    // dedup-by-ref-set effect on every render instead of only when the
    // underlying data changes. A language switch not immediately relabeling
    // an already-queued alert is an acceptable tradeoff for that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, cases, currentUser])

  const activeAlert = alertQueue[0] ?? null
  // Held while this device is on a live call -- the modal would cover the
  // call screen, hang-up button included. Its sound has already played;
  // it shows the moment the call ends.
  const inConversation = useInLiveConversation()

  // A proposal already answered -- on the case page, or by another
  // dispatcher -- leaves the queue instead of asking again.
  useEffect(() => {
    setAlertQueue((q) => {
      const next = q.filter(
        (h) => h.event !== 'severity-proposal' || cases[h.case.id]?.rescueSeverityProposal?.proposedAt === h.case.rescueSeverityProposal?.proposedAt,
      )
      return next.length === q.length ? q : next
    })
  }, [cases])

  function decideSeverity(accept: boolean) {
    const h = activeAlert
    const proposal = h?.case.rescueSeverityProposal
    if (!h || !proposal) return
    const current = cases[h.case.id]?.assessment?.severity
    confirmRescueSeverity(h.case.id, accept)
    setAlertQueue((q) => q.slice(1))
    toast({ title: accept ? t('ยืนยันระดับความรุนแรงแล้ว') : t('ไม่ยืนยันการปรับระดับความรุนแรง'), tone: accept ? 'success' : 'info' })
    // More serious than before: the case page offers a higher-level unit.
    if (accept && current !== undefined && proposal.severity < current) {
      navigate(`/dispatch/case/${h.case.id}`, { state: { offerEscalation: true } })
    }
  }

  // Keeps sounding until it's acknowledged (never into a call).
  useEffect(() => {
    if (!activeAlert || inConversation) return
    const until = Date.now() + REPEAT_FOR_MS
    const timer = setInterval(() => {
      if (Date.now() > until) clearInterval(timer)
      else playHandoffSound(activeAlert)
    }, REPEAT_EVERY_MS)
    return () => clearInterval(timer)
  }, [activeAlert, inConversation])

  return (
    <CaseAlertModal
      alert={inConversation ? null : activeAlert}
      queueCount={alertQueue.length}
      onDismiss={() => setAlertQueue((q) => q.slice(1))}
      onView={() => {
        if (activeAlert) navigate(routeForHandoff(activeAlert))
        setAlertQueue((q) => q.slice(1))
      }}
      onDecide={decideSeverity}
    />
  )
}
