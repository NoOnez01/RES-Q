import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { startRingtone, stopRingtone } from '@/lib/alertSound'
import { toast } from '@/lib/toast'
import { IncomingCallAlert } from './IncomingCallAlert'

/**
 * Headless, mounted once at the app root. A ringing (unanswered) 1669 call
 * should be audible regardless of which page someone's looking at — a real
 * phone rings no matter what app is in the foreground. Dispatch hears it for
 * any case currently ringing; a citizen hears their own outgoing ring only.
 * Driven purely by synced case state, so the moment either side answers or
 * cancels, the ring stops everywhere — that's what makes a cancel on one
 * side cancel the ring on the other.
 */
export function CallRingtoneBridge() {
  const cases = useStore((s) => s.cases)
  const currentUser = useStore((s) => s.currentUser)
  const activeCaseId = useStore((s) => s.activeCaseId)
  const answerCall = useStore((s) => s.answerCall)
  const navigate = useNavigate()
  const [dismissedCallIds, setDismissedCallIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const role = currentUser?.role ?? 'public'
    let shouldRing = false
    if (role === 'dispatch') {
      shouldRing = Object.values(cases).some((c) => c.callStatus === 'connecting')
    } else if (role === 'public') {
      const activeCase = activeCaseId ? cases[activeCaseId] : null
      // Either an outgoing call to 1669 still ringing, or an incoming call
      // from rescue -- a citizen can be reached by rescue on any case they
      // reported, not just whichever one happens to be "active" at the
      // moment, so this checks every case's rescueCallStatus rather than
      // only activeCaseId.
      shouldRing =
        activeCase?.callStatus === 'connecting' ||
        Object.values(cases).some((c) => c.rescueCallStatus === 'connecting')
    }
    if (shouldRing) startRingtone()
    else stopRingtone()
  }, [cases, currentUser, activeCaseId])

  useEffect(() => stopRingtone, [])

  // The ring above is audible everywhere, but a dispatcher not already on
  // /dispatch/incoming-call had no visual cue which case was calling -- this
  // is that missing on-screen half, following the ring itself rather than
  // firing once, so it's visible for as long as the call actually rings.
  const role = currentUser?.role ?? 'public'
  const visibleCall = useMemo(() => {
    if (role !== 'dispatch') return null
    const ringing = Object.values(cases)
      .filter((c) => c.callStatus === 'connecting' && !dismissedCallIds.has(c.id))
      .sort((a, b) => a.createdAt - b.createdAt)
    return ringing[0] ?? null
  }, [role, cases, dismissedCallIds])

  useEffect(() => {
    // Once a call stops ringing (answered/cancelled), drop it from the
    // dismissed set so a genuinely new, later call with the same id (can't
    // really happen, but cheap to guard) isn't permanently suppressed.
    const stillRinging = new Set(
      Object.values(cases)
        .filter((c) => c.callStatus === 'connecting')
        .map((c) => c.id),
    )
    setDismissedCallIds((prev) => {
      const next = new Set([...prev].filter((id) => stillRinging.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [cases])

  if (!visibleCall) return null

  return (
    <IncomingCallAlert
      caseNumber={visibleCall.caseNumber}
      onAnswer={() => {
        answerCall(visibleCall.id)
        toast({ title: 'รับสายแล้ว', message: `กำลังสนทนากับผู้แจ้งเหตุ เคส ${visibleCall.caseNumber}`, tone: 'success' })
        navigate(`/dispatch/call/${visibleCall.id}`)
      }}
      onDismiss={() => setDismissedCallIds((prev) => new Set(prev).add(visibleCall.id))}
    />
  )
}
