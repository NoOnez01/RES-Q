import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { startRingtone, stopRingtone } from '@/lib/alertSound'
import { prepareCall, useInLiveConversation } from '@/lib/useLiveKitCall'
import { isStillRinging } from '@/lib/calls'
import { toast } from '@/lib/toast'
import { IncomingCallAlert } from './IncomingCallAlert'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  สายเรียกเข้าใหม่: 'New incoming call',
  'สายเรียกเข้าจากเหตุหมายเลข {caseNumber}': 'Incoming call from case {caseNumber}',
  รับสาย: 'Answer',
  รับสายแล้ว: 'Call answered',
  'กำลังสนทนากับผู้แจ้งเหตุ หมายเลข {caseNumber}': 'Now talking with the reporter, case {caseNumber}',
  'ศูนย์สั่งการ 1669 เชิญคุณเข้าร่วมการสนทนา': 'Dispatch Center 1669 is inviting you to the call',
  'เหตุหมายเลข {caseNumber} · สนทนากับผู้แจ้งเหตุ': 'Case {caseNumber} · talk with the reporter',
  เข้าร่วม: 'Join',
})

/**
 * Headless, mounted once at the app root. A ringing call should be audible
 * regardless of which page someone's looking at — a real phone rings no
 * matter what app is in the foreground. Dispatch hears any unanswered 1669
 * call; a rescue crew hears 1669 inviting them into a live call on one of
 * their cases; a citizen hears their own outgoing ring. Driven purely by
 * synced case state, so the moment anyone answers or cancels, the ring
 * stops everywhere.
 */
export function CallRingtoneBridge() {
  const cases = useStore((s) => s.cases)
  const currentUser = useStore((s) => s.currentUser)
  const activeCaseId = useStore((s) => s.activeCaseId)
  const answerCall = useStore((s) => s.answerCall)
  const acceptRescueCallInvite = useStore((s) => s.acceptRescueCallInvite)
  const navigate = useNavigate()
  const [dismissedCallIds, setDismissedCallIds] = useState<Set<string>>(new Set())
  const t = useT()

  const role = currentUser?.role ?? 'public'
  const myTeamId = currentUser?.rescueTeamId
  const inConversation = useInLiveConversation()

  // Re-evaluated on a timer as well as on case changes: a ring has to be
  // able to expire (lib/calls.ts) even when no case data changes -- e.g. the
  // caller closed their page mid-ring and will never hang up.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(timer)
  }, [])

  // Cases ringing for *this* user, i.e. the ones that get an on-screen alert.
  const ringingForMe = useMemo(() => {
    const all = Object.values(cases)
    if (role === 'dispatch') return all.filter((c) => c.callStatus === 'connecting' && isStillRinging(c.callRingingAt, now))
    if (role === 'rescue' && myTeamId) {
      return all.filter(
        (c) =>
          c.rescueCallInvite?.status === 'ringing' &&
          isStillRinging(c.rescueCallInvite.invitedAt, now) &&
          (c.assignedRescueTeam?.id === myTeamId || c.supportingRescueTeam?.id === myTeamId),
      )
    }
    return []
  }, [cases, role, myTeamId, now])

  useEffect(() => {
    let shouldRing = ringingForMe.length > 0
    if (role === 'public') {
      const activeCase = activeCaseId ? cases[activeCaseId] : null
      // Either their outgoing call to 1669 still ringing, or rescue calling
      // them on any case they reported (not only the "active" one). Only
      // their *own* cases -- an admin working with a citizen profile has
      // every case in the store and would otherwise ring for all of them.
      shouldRing =
        (activeCase?.callStatus === 'connecting' && isStillRinging(activeCase.callRingingAt, now)) ||
        Object.values(cases).some(
          (c) =>
            c.reporterUserId === currentUser?.id &&
            c.rescueCallStatus === 'connecting' &&
            isStillRinging(c.rescueCallRingingAt, now),
        )
    }
    // Never loop the ring into a call this device is already on: it drowns
    // out the conversation and the microphone carries it to the other side.
    // The on-screen alert below still shows the waiting call.
    if (shouldRing && !inConversation) startRingtone()
    else stopRingtone()
  }, [ringingForMe, role, cases, activeCaseId, currentUser, now, inConversation])

  useEffect(() => stopRingtone, [])

  // Get the call ready while it rings -- answering then goes straight to
  // connecting instead of first loading the SDK and fetching a token.
  useEffect(() => {
    const side = role === 'rescue' ? 'rescue' : 'dispatch'
    for (const c of ringingForMe) prepareCall(c.id, 'dispatch', side)
  }, [ringingForMe, role])

  useEffect(() => {
    // Once a call stops ringing (answered/cancelled), drop it from the
    // dismissed set so a later ring on the same case alerts again.
    const stillRinging = new Set(ringingForMe.map((c) => c.id))
    setDismissedCallIds((prev) => {
      const next = new Set([...prev].filter((id) => stillRinging.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [ringingForMe])

  const visibleCall = useMemo(
    () => ringingForMe.filter((c) => !dismissedCallIds.has(c.id)).sort((a, b) => a.createdAt - b.createdAt)[0] ?? null,
    [ringingForMe, dismissedCallIds],
  )

  if (!visibleCall) return null

  const dismiss = () => setDismissedCallIds((prev) => new Set(prev).add(visibleCall.id))

  if (role === 'rescue') {
    return (
      <IncomingCallAlert
        title={t('ศูนย์สั่งการ 1669 เชิญคุณเข้าร่วมการสนทนา')}
        message={t('เหตุหมายเลข {caseNumber} · สนทนากับผู้แจ้งเหตุ', { caseNumber: visibleCall.caseNumber })}
        answerLabel={t('เข้าร่วม')}
        onAnswer={() => {
          acceptRescueCallInvite(visibleCall.id)
          navigate(`/rescue/join-call/${visibleCall.id}`)
        }}
        onDismiss={dismiss}
      />
    )
  }

  return (
    <IncomingCallAlert
      title={t('สายเรียกเข้าใหม่')}
      message={t('สายเรียกเข้าจากเหตุหมายเลข {caseNumber}', { caseNumber: visibleCall.caseNumber })}
      answerLabel={t('รับสาย')}
      onAnswer={() => {
        answerCall(visibleCall.id)
        toast({
          title: t('รับสายแล้ว'),
          message: t('กำลังสนทนากับผู้แจ้งเหตุ หมายเลข {caseNumber}', { caseNumber: visibleCall.caseNumber }),
          tone: 'success',
        })
        navigate(`/dispatch/call/${visibleCall.id}`)
      }}
      onDismiss={dismiss}
    />
  )
}
