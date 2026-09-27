import { useEffect } from 'react'
import { useStore } from './store'
import type { EmergencyCase } from './types'

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

// Ring stamps are written on the CALLER's clock and read on the receiver's,
// so a phone running a minute behind the dispatch PC made every call look
// already expired -- no ring, no popup. So each device also notes, on its
// own clock, when a live update renewed a ring (the call started, or the
// waiting caller re-stamped it). A live call keeps renewing; a caller who
// left stops, and the ring goes quiet here too. Only live updates count --
// a stale ring found on page load still has to pass the stamp check.
const ringRenewedAt = new Map<string, number>()
const ringFirstHeardAt = new Map<string, number>()

type RingState = Pick<
  EmergencyCase,
  'callStatus' | 'callRingingAt' | 'rescueCallStatus' | 'rescueCallRingingAt' | 'rescueCallInvite' | 'updatedAt'
>

/** Called for every live (realtime) case update this device applies. */
export function noteRingRenewal(caseId: string, prev: RingState | undefined, next: RingState): void {
  const started =
    (next.callStatus === 'connecting' && prev?.callStatus !== 'connecting') ||
    (next.rescueCallStatus === 'connecting' && prev?.rescueCallStatus !== 'connecting') ||
    (next.rescueCallInvite?.status === 'ringing' && prev?.rescueCallInvite?.status !== 'ringing')
  const renewed =
    started ||
    (next.callStatus === 'connecting' && next.callRingingAt !== prev?.callRingingAt) ||
    (next.rescueCallStatus === 'connecting' && next.rescueCallRingingAt !== prev?.rescueCallRingingAt) ||
    (next.rescueCallInvite?.status === 'ringing' && next.rescueCallInvite.invitedAt !== prev?.rescueCallInvite?.invitedAt)
  if (!renewed) return
  const now = Date.now()
  ringRenewedAt.set(caseId, now)
  if (started) ringFirstHeardAt.set(caseId, now)
}

/** Whether a ring stamped `stamp` (caller's clock) for `caseId` is still
 * live -- by the stamp, or by this device having heard it renewed lately. */
export function isRingLive(caseId: string, stamp: number | undefined, now = Date.now()): boolean {
  return isStillRinging(stamp, now) || isStillRinging(ringRenewedAt.get(caseId), now)
}

/** When this device first heard the current ring start, on its own clock. */
export function ringFirstHeard(caseId: string): number | undefined {
  return ringFirstHeardAt.get(caseId)
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

/**
 * A caller hears its call was answered from the case sync -- but whoever
 * answers only joins the call once they have, so seeing them in it is the
 * same news, and can't go missing on the way. A lost or late update left
 * the caller's side ringing while the two were already talking: no call
 * timer, and a rescue call hung itself up as unanswered.
 */
export function useAnsweredOnJoin(
  caseId: string | null | undefined,
  ringing: boolean,
  answererJoined: boolean,
  answer: (caseId: string) => void,
): void {
  useEffect(() => {
    if (caseId && ringing && answererJoined) answer(caseId)
  }, [caseId, ringing, answererJoined, answer])
}
