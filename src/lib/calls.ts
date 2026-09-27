import { useEffect } from 'react'
import { useStore } from './store'

/**
 * How long a ring stays live without word from its caller. A call to 1669
 * rings until someone answers or the caller cancels -- the caller's screen
 * keeps re-stamping the ring (useKeepRinging) while it waits. Rescue calling
 * a reporter gives up after this long unanswered. Receivers stop ringing
 * once a ring is this old (plus a short grace for clock skew and sync
 * delay), so a caller who closed the page mid-ring can't leave everyone
 * else's ringtone looping forever.
 */
export const RING_TIMEOUT_MS = 45_000
const RING_GRACE_MS = 15_000
/** How often a waiting caller re-stamps its ring -- well inside the timeout. */
const RING_HEARTBEAT_MS = 15_000

/** Whether a call last stamped as ringing at `ringingAt` should still ring. */
export function isStillRinging(ringingAt: number | undefined, now = Date.now()): boolean {
  return ringingAt !== undefined && now - ringingAt < RING_TIMEOUT_MS + RING_GRACE_MS
}

/**
 * When a case's call (or rescue's call to the reporter) was last stamped
 * as ringing. An older app -- the Android build, or a tab opened before an
 * update -- sends no stamp at all; its case's updatedAt is set the moment
 * it starts the call, so that stands in. Treating "no stamp" as abandoned
 * silenced every call from those apps: no ring, no popup.
 */
export function callRingStamp(c: { callRingingAt?: number; updatedAt: number }): number {
  return c.callRingingAt ?? c.updatedAt
}

export function rescueCallRingStamp(c: { rescueCallRingingAt?: number; updatedAt: number }): number {
  return c.rescueCallRingingAt ?? c.updatedAt
}

/**
 * Keeps a call to 1669 ringing everywhere for as long as the caller is
 * waiting on this screen -- including after it comes back from the
 * background, where a phone pauses timers.
 */
export function useKeepRinging(caseId: string | null | undefined, ringing: boolean): void {
  const keepCallRinging = useStore((s) => s.keepCallRinging)
  useEffect(() => {
    if (!ringing || !caseId) return
    const id = caseId
    const beat = () => keepCallRinging(id)
    const onVisible = () => {
      if (document.visibilityState === 'visible') beat()
    }
    beat()
    const timer = setInterval(beat, RING_HEARTBEAT_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [caseId, ringing, keepCallRinging])
}
