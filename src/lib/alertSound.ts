// Master switch for every synthesized sound in the app (clicks, toast dings,
// case-alert tones, the call ringtone). All sound functions below funnel
// through getContext(), so this one flag silences everything without
// touching each call site.
const SOUND_ENABLED = true

let audioCtx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (!SOUND_ENABLED) return null
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) audioCtx = new Ctx()
  return audioCtx
}

function beep(ctx: AudioContext, freq: number, startTime: number, duration: number, gain: number) {
  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gainNode.gain.setValueAtTime(0, startTime)
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

/**
 * Plays a short synthesized tone for on-screen alerts — no audio asset file
 * needed. `urgent` gives a sharper double-beep (new case / emergency),
 * otherwise a single softer tone (general notifications).
 */
export function playAlertSound(urgent = false): void {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  if (urgent) {
    beep(ctx, 880, now, 0.16, 0.18)
    beep(ctx, 880, now + 0.22, 0.16, 0.18)
  } else {
    beep(ctx, 660, now, 0.2, 0.12)
  }
}

/**
 * Distinct alert per triage severity, so it's audible which kind of case
 * just landed on you without looking at the screen. Severity 1 (วิกฤต) is
 * the lowest-pitched but the most elaborate/urgent-sounding pattern (a fast
 * alternating wail); severity 4 (เร่งด่วนต่ำ) is the highest-pitched but the
 * plainest — a single short beep. 2 and 3 sit between both axes.
 */
export function playSeverityAlert(severity: 1 | 2 | 3 | 4 | 5): void {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  switch (severity) {
    case 1:
      beep(ctx, 440, now, 0.14, 0.2)
      beep(ctx, 349, now + 0.16, 0.14, 0.2)
      beep(ctx, 440, now + 0.32, 0.14, 0.2)
      beep(ctx, 349, now + 0.48, 0.14, 0.2)
      break
    case 2:
      beep(ctx, 587, now, 0.16, 0.18)
      beep(ctx, 587, now + 0.22, 0.16, 0.18)
      break
    case 3:
      beep(ctx, 740, now, 0.16, 0.14)
      beep(ctx, 740, now + 0.24, 0.12, 0.12)
      break
    case 4:
      beep(ctx, 988, now, 0.14, 0.1)
      break
    case 5:
      beep(ctx, 1175, now, 0.12, 0.08)
      break
  }
}

const HOSPITAL_RUNS: Record<1 | 2 | 3 | 4 | 5 | 0, number[]> = {
  1: [349, 415, 494, 587],
  2: [415, 523, 659],
  3: [523, 659, 784],
  4: [659, 880],
  5: [784, 988],
  0: [494, 622, 784],
}

/**
 * Hospital handoff alert: a rising note run (frequency climbs through the
 * call, unlike the flat/alternating patterns used elsewhere) so it reads as
 * more urgent and more distinct from the dispatch/rescue alerts. More
 * severe cases (lower `severity` number) get more notes in the run and a
 * lower starting pitch; unassessed cases fall back to a generic 3-note run.
 */
export function playHospitalAlert(severity?: 1 | 2 | 3 | 4 | 5): void {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  const run = HOSPITAL_RUNS[severity ?? 0]
  const step = 0.15
  run.forEach((freq, i) => beep(ctx, freq, now + i * step, step + 0.05, 0.16))
}

/** Quiet click tick for button/interaction feedback. */
export function playClickSound(): void {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  beep(ctx, 520, ctx.currentTime, 0.05, 0.06)
}

/** Bright two-note "ding" for accepting/completing something (case accepted, admission confirmed, case closed, etc.). */
export function playDingSound(): void {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  beep(ctx, 784, now, 0.12, 0.14)
  beep(ctx, 1047, now + 0.1, 0.18, 0.16)
}

let ringtoneTimer: ReturnType<typeof setInterval> | null = null

function ringBurst(ctx: AudioContext, startTime: number) {
  // Classic dual-tone telephone ring cadence: two overlapping tones held for
  // ~0.9s, matching a real ringback/incoming-call ring, loud enough to
  // notice from across a room — quite different from the short alert beeps.
  beep(ctx, 480, startTime, 0.9, 0.3)
  beep(ctx, 440, startTime, 0.9, 0.26)
}

/**
 * Loops a loud telephone-style ring until `stopRingtone()` is called — for
 * an actively ringing 1669 call (unanswered), on both the caller's and the
 * dispatcher's side. Safe to call repeatedly; it won't stack.
 */
export function startRingtone(): void {
  if (ringtoneTimer) return
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const ring = () => {
    const c = getContext()
    if (c) ringBurst(c, c.currentTime)
  }
  ring()
  ringtoneTimer = setInterval(ring, 2000)
}

export function stopRingtone(): void {
  if (ringtoneTimer) {
    clearInterval(ringtoneTimer)
    ringtoneTimer = null
  }
}

/**
 * Browsers refuse to start audio until the page has seen a real user
 * gesture. Call this from the first pointerdown/keydown anywhere in the
 * app so the AudioContext is already running by the time an async event
 * (e.g. a new case arriving from another tab/device) needs to play a sound.
 */
export function primeAudio(): void {
  const ctx = getContext()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}
