import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Camera, MapPin, User } from 'lucide-react'
import { useStore } from '@/lib/store'
import { startRing, stopRing } from '@/lib/sounds'
import { prepareCall, useInLiveConversation } from '@/lib/useLiveKitCall'
import { callRingStamp, isRingLive, rescueCallRingStamp, ringFirstHeard } from '@/lib/calls'
import { toast } from '@/lib/toast'
import { IncomingCallAlert } from './IncomingCallAlert'
import { IncomingCallScreen } from './call/IncomingCallScreen'
import { IncomingCallPopup, type IncomingCallDetail } from './call/IncomingCallPopup'
import type { EmergencyCase } from '@/lib/types'
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
  ภายหลัง: 'Later',
  ผู้แจ้งเหตุ: 'Reporter',
  ยังไม่ระบุตำแหน่ง: 'No location set yet',
  'แนบรูปภาพแล้ว {n} รูป': '{n} photo(s) attached',
  หน่วยกู้ชีพ: 'Rescue team',
  'สายวิดีโอเรียกเข้า · เหตุหมายเลข {caseNumber}': 'Incoming video call · case {caseNumber}',
})

/**
 * Headless, mounted once at the app root. A ringing call should be audible
 * regardless of which page someone's looking at — a real phone rings no
 * matter what app is in the foreground. Dispatch hears any unanswered 1669
 * call; a rescue crew hears 1669 inviting them into a live call on one of
 * their cases; a citizen hears their own outgoing ring, and a rescue team
 * calling them comes up full screen wherever they are. Driven purely by
 * synced case state, so the moment anyone answers or cancels, the ring
 * stops everywhere.
 */
export function CallRingtoneBridge() {
  const cases = useStore((s) => s.cases)
  const currentUser = useStore((s) => s.currentUser)
  const answerCall = useStore((s) => s.answerCall)
  const setDispatchCallCaseId = useStore((s) => s.setDispatchCallCaseId)
  const acceptRescueCallInvite = useStore((s) => s.acceptRescueCallInvite)
  const answerRescueCall = useStore((s) => s.answerRescueCall)
  const setRescueCallStatus = useStore((s) => s.setRescueCallStatus)
  const navigate = useNavigate()
  const [dismissedCallIds, setDismissedCallIds] = useState<Set<string>>(new Set())
  const t = useT()

  // An admin browsing another role's dashboard ("view as") gets that
  // role's calls, the same way the menus follow it.
  const viewingRole = useStore((s) => s.viewingRole)
  const role = (currentUser?.isAdmin && viewingRole ? viewingRole : currentUser?.role) ?? 'public'
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
    if (role === 'dispatch') return all.filter((c) => c.callStatus === 'connecting' && isRingLive(c.id, callRingStamp(c), now))
    if (role === 'rescue' && myTeamId) {
      return all.filter(
        (c) =>
          c.rescueCallInvite?.status === 'ringing' &&
          isRingLive(c.id, c.rescueCallInvite.invitedAt, now) &&
          (c.assignedRescueTeam?.id === myTeamId || c.supportingRescueTeam?.id === myTeamId),
      )
    }
    return []
  }, [cases, role, myTeamId, now])

  // A rescue team calling a citizen about a case they reported -- shown full
  // screen from wherever they are in the app, like a phone call. Only their
  // *own* cases: an admin working with a citizen profile has every case in
  // the store.
  const citizenIncoming = useMemo(() => {
    if (role !== 'public' || !currentUser) return null
    return (
      Object.values(cases)
        .filter(
          (c) =>
            c.reporterUserId === currentUser.id &&
            c.rescueCallStatus === 'connecting' &&
            isRingLive(c.id, rescueCallRingStamp(c), now),
        )
        .sort((a, b) => a.createdAt - b.createdAt)[0] ?? null
    )
  }, [cases, role, currentUser, now])

  // Rings for a call coming in to this person -- staff for their queue, a
  // citizen for rescue calling them. Their own outgoing call rings back
  // softly from its call screen instead (CallScreen).
  const incoming = ringingForMe.length > 0 || citizenIncoming !== null
  useEffect(() => {
    // Never loop the ring into a call this device is already on: it drowns
    // out the conversation and the microphone carries it to the other side.
    // The on-screen alert below still shows the waiting call.
    if (incoming && !inConversation) startRing('incoming')
    else stopRing('incoming')
  }, [incoming, inConversation])

  useEffect(() => () => stopRing('incoming'), [])

  // Get the call ready while it rings -- answering then goes straight to
  // connecting instead of first loading the SDK and fetching a token.
  useEffect(() => {
    const side = role === 'rescue' ? 'rescue' : 'dispatch'
    for (const c of ringingForMe) prepareCall(c.id, 'dispatch', side)
    if (citizenIncoming) prepareCall(citizenIncoming.id, 'rescue-citizen', 'public')
  }, [ringingForMe, role, citizenIncoming])

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

  if (citizenIncoming) {
    const id = citizenIncoming.id
    return (
      <IncomingCallScreen
        callerRole="rescue"
        title={citizenIncoming.assignedRescueTeam?.name ?? t('หน่วยกู้ชีพ')}
        subtitle={t('สายวิดีโอเรียกเข้า · เหตุหมายเลข {caseNumber}', { caseNumber: citizenIncoming.caseNumber })}
        onAccept={() => {
          answerRescueCall(id)
          navigate(`/public/case/${id}`)
        }}
        onDecline={() => setRescueCallStatus(id, 'ended')}
      />
    )
  }

  if (!visibleCall) return null

  const c = visibleCall
  const dismiss = () => setDismissedCallIds((prev) => new Set(prev).add(c.id))
  const waitingCount = ringingForMe.length - 1 - ringingForMe.filter((r) => r.id !== c.id && dismissedCallIds.has(r.id)).length

  // What's already known about the case, so it's answered knowing where
  // and what.
  const details = (who: IncomingCallDetail | null): IncomingCallDetail[] =>
    [
      who,
      c.incidentDetails?.incidentType ? { icon: <AlertTriangle />, text: c.incidentDetails.incidentType } : null,
      { icon: <MapPin />, text: c.location?.address ?? t('ยังไม่ระบุตำแหน่ง') },
      c.photos.length > 0 ? { icon: <Camera />, text: t('แนบรูปภาพแล้ว {n} รูป', { n: c.photos.length }) } : null,
    ].filter((d): d is IncomingCallDetail => d !== null)

  // A popup in the middle of the screen, unless this device is already on a
  // call -- then the banner, so nothing covers the live conversation.
  if (role === 'rescue') {
    const answer = () => {
      acceptRescueCallInvite(c.id)
      navigate(`/rescue/join-call/${c.id}`)
    }
    return inConversation ? (
      <IncomingCallAlert
        callerRole="dispatch"
        title={t('ศูนย์สั่งการ 1669 เชิญคุณเข้าร่วมการสนทนา')}
        message={t('เหตุหมายเลข {caseNumber} · สนทนากับผู้แจ้งเหตุ', { caseNumber: c.caseNumber })}
        answerLabel={t('เข้าร่วม')}
        onAnswer={answer}
        onDismiss={dismiss}
      />
    ) : (
      <IncomingCallPopup
        callerRole="dispatch"
        title={t('ศูนย์สั่งการ 1669 เชิญคุณเข้าร่วมการสนทนา')}
        caseNumber={c.caseNumber}
        details={details(null)}
        ringingSince={ringFirstHeard(c.id) ?? c.rescueCallInvite?.invitedAt}
        waitingCount={waitingCount}
        answerLabel={t('เข้าร่วม')}
        dismissLabel={t('ภายหลัง')}
        onAnswer={answer}
        onDismiss={dismiss}
      />
    )
  }

  const answer = () => {
    answerCall(c.id)
    toast({
      title: t('รับสายแล้ว'),
      message: t('กำลังสนทนากับผู้แจ้งเหตุ หมายเลข {caseNumber}', { caseNumber: c.caseNumber }),
      tone: 'success',
    })
    // The call opens full screen over the case itself (DispatchCallHost).
    setDispatchCallCaseId(c.id)
    navigate(`/dispatch/case/${c.id}`)
  }
  const callerRole = c.activeCallerRole === 'rescue' ? 'rescue' : 'public'
  return inConversation ? (
    <IncomingCallAlert
      callerRole={callerRole}
      title={t('สายเรียกเข้าใหม่')}
      message={t('สายเรียกเข้าจากเหตุหมายเลข {caseNumber}', { caseNumber: c.caseNumber })}
      answerLabel={t('รับสาย')}
      onAnswer={answer}
      onDismiss={dismiss}
    />
  ) : (
    <IncomingCallPopup
      callerRole={callerRole}
      title={t('สายเรียกเข้าใหม่')}
      caseNumber={c.caseNumber}
      details={details(callerLine(c, t))}
      // Counted on this device's clock when it heard the ring start live;
      // the caller's own clock may be off.
      ringingSince={ringFirstHeard(c.id) ?? c.callRingStartedAt ?? callRingStamp(c)}
      waitingCount={waitingCount}
      answerLabel={t('รับสาย')}
      dismissLabel={t('ภายหลัง')}
      onAnswer={answer}
      onDismiss={dismiss}
    />
  )
}

/** Who's on the line: the reporter (with the number they gave), or the
 * rescue team when a crew is the one calling in. */
function callerLine(c: EmergencyCase, t: ReturnType<typeof useT>): IncomingCallDetail {
  if (c.activeCallerRole === 'rescue') {
    return { icon: <User />, text: c.assignedRescueTeam?.name ?? t('หน่วยกู้ชีพ') }
  }
  const phone = c.incidentDetails?.callbackPhone ?? c.reporterPhone
  const name = c.reporterName ?? t('ผู้แจ้งเหตุ')
  return { icon: <User />, text: phone ? `${name} · ${phone}` : name }
}
