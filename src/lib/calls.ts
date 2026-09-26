/**
 * How long a call rings before it counts as unanswered. Every caller screen
 * ends its own call after this; receivers also stop ringing after it (plus
 * a short grace for clock skew and sync delay), so a caller who closed the
 * page mid-ring can't leave everyone else's ringtone looping forever.
 */
export const RING_TIMEOUT_MS = 45_000
const RING_GRACE_MS = 15_000

/** Whether a call that started ringing at `ringingAt` should still ring. A
 * call with no start time predates this field and is treated as abandoned. */
export function isStillRinging(ringingAt: number | undefined, now = Date.now()): boolean {
  return ringingAt !== undefined && now - ringingAt < RING_TIMEOUT_MS + RING_GRACE_MS
}
