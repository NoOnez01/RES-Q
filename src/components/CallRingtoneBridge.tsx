import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { startRingtone, stopRingtone } from '@/lib/alertSound'

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

  return null
}
