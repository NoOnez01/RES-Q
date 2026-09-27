import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useLiveKitCall } from '@/lib/useLiveKitCall'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'
import { CallScreen } from './CallScreen'

registerTranslations({
  การโทรสิ้นสุดแล้ว: 'The call has ended',
  วางสาย: 'Hang up',
  รายละเอียดเหตุ: 'Case details',
  เชิญหน่วยกู้ชีพเข้าร่วมสาย: 'Invite the rescue team into this call',
  'กำลังเรียก {team}...': 'Calling {team}...',
  '{team} กำลังเข้าร่วมสาย...': '{team} is joining the call...',
  ยกเลิก: 'Cancel',
})

// Long enough for CallScreen's "call ended" moment to show before letting go.
const ENDED_HOLD_MS = 1600

/**
 * 1669's side of a call, held at the app root instead of inside one page --
 * so the dispatcher can open the case, assess it and send a rescue team
 * while still talking to the caller. The call shrinks to a floating tile
 * over whichever page they're on; tapping it brings the call back full
 * screen. Answering lands on the case itself, with the call on top.
 */
export function DispatchCallHost() {
  const caseId = useStore((s) => s.dispatchCallCaseId)
  const c = useStore((s) => (s.dispatchCallCaseId ? s.cases[s.dispatchCallCaseId] : undefined))
  const setDispatchCallCaseId = useStore((s) => s.setDispatchCallCaseId)
  const setCallStatus = useStore((s) => s.setCallStatus)
  const inviteRescueToCall = useStore((s) => s.inviteRescueToCall)
  const clearRescueCallInvite = useStore((s) => s.clearRescueCallInvite)
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()

  const isActive = c?.callStatus === 'in-call'
  const call = useLiveKitCall(caseId, 'dispatch', 'dispatch', isActive)
  const wasActiveRef = useRef(false)

  // Once the call is over -- from either side -- say so, make sure the
  // dispatcher is on the case (what they just heard gets assessed next),
  // then let go. A remembered call that had already ended before this page
  // loaded is just dropped.
  useEffect(() => {
    if (!caseId) return
    if (isActive) {
      wasActiveRef.current = true
      return
    }
    if (!wasActiveRef.current) {
      if (c && c.callStatus !== 'connecting') setDispatchCallCaseId(null)
      return
    }
    wasActiveRef.current = false
    toast({ title: t('การโทรสิ้นสุดแล้ว'), tone: 'info' })
    const casePath = `/dispatch/case/${caseId}`
    if (!location.pathname.endsWith(casePath)) navigate(casePath, { replace: location.pathname.includes('/dispatch/call/') })
    const timer = setTimeout(() => setDispatchCallCaseId(null), ENDED_HOLD_MS)
    return () => clearTimeout(timer)
    // `t`/location intentionally omitted: this runs on the call's own state
    // changes, not on every render or navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, isActive, c?.callStatus])

  // Closing or reloading the tab drops a live emergency call -- ask first.
  useEffect(() => {
    if (!isActive) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isActive])

  if (!caseId || !c) return null

  // Only a citizen's call can be made three-way -- when rescue itself is
  // the one calling in, they're already on the line. Keyed off who's
  // actually in the room rather than the invite's own status, so a crew
  // that dropped out without pressing "leave" can simply be invited again.
  const team = c.assignedRescueTeam
  const rescueInCall = call.remotes.some((p) => p.role === 'rescue')
  const canPullInRescue = isActive && !!team && c.activeCallerRole !== 'rescue' && !rescueInCall
  const invite = c.rescueCallInvite

  return (
    <CallScreen
      call={call}
      emergencyCase={c}
      open={isActive}
      peer={c.activeCallerRole === 'rescue' ? 'rescue' : 'public'}
      durationSec={c.callDurationSec}
      onEnd={() => setCallStatus(caseId, 'ended')}
      endLabel={t('วางสาย')}
      details={{ label: t('รายละเอียดเหตุ'), onOpen: () => navigate(`/dispatch/case/${caseId}`) }}
      action={canPullInRescue && !invite ? { label: t('เชิญหน่วยกู้ชีพเข้าร่วมสาย'), onClick: () => inviteRescueToCall(caseId) } : undefined}
      banner={
        canPullInRescue && team && invite
          ? {
              text:
                invite.status === 'ringing'
                  ? t('กำลังเรียก {team}...', { team: team.name })
                  : t('{team} กำลังเข้าร่วมสาย...', { team: team.name }),
              actionLabel: t('ยกเลิก'),
              onAction: () => clearRescueCallInvite(caseId),
            }
          : undefined
      }
    />
  )
}
