import { useSyncExternalStore } from 'react'

/**
 * Every sound in the app, synthesized with Web Audio -- no audio files to
 * ship or preload. Each sound has its own voice so it's recognisable
 * without looking: struck bars and bells (marimba, glockenspiel) for calls
 * and good news, a bright detuned synth for alarms, a hollow square for
 * mistakes, and a tiny dry tick for taps. Everything goes through one
 * compressor, so alerts are loud and even without clipping, and alarms and
 * chimes get a short room reverb so they carry across a room.
 *
 * Two kinds of sound:
 * - interface sounds (taps, success, error, warning) -- the user can turn
 *   these off in Settings;
 * - alerts, rings and call sounds -- always on: missing one of these means
 *   missing a case or a call.
 */

type Overtone = readonly [ratio: number, amp: number, decayScale: number]

// Overtone recipes for struck sounds: [frequency ratio, level, how long it
// rings relative to the fundamental].
const MARIMBA: readonly Overtone[] = [
  [1, 1, 1],
  [3.99, 0.28, 0.32],
  [9.9, 0.06, 0.12],
]
const BELL: readonly Overtone[] = [
  [1, 1, 1],
  [2.76, 0.42, 0.55],
  [5.4, 0.2, 0.35],
  [8.93, 0.1, 0.22],
]
const CHIME: readonly Overtone[] = [
  [1, 1, 1],
  [2, 0.3, 0.55],
  [3, 0.12, 0.3],
]

let ctx: AudioContext | null = null
let dryBus: GainNode | null = null
let reverbBus: GainNode | null = null
let noise: AudioBuffer | null = null

/** A short, soft room: decaying stereo noise. */
function roomImpulse(c: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(c.sampleRate * seconds)
  const buffer = c.createBuffer(2, length, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3
  }
  return buffer
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) {
    const c = new Ctor()
    const compressor = c.createDynamicsCompressor()
    compressor.threshold.value = -18
    compressor.knee.value = 12
    compressor.ratio.value = 5
    compressor.attack.value = 0.002
    compressor.release.value = 0.2
    const master = c.createGain()
    master.gain.value = 0.95
    compressor.connect(master).connect(c.destination)
    dryBus = c.createGain()
    dryBus.connect(compressor)
    const reverb = c.createConvolver()
    reverb.buffer = roomImpulse(c, 1.2)
    reverbBus = c.createGain()
    reverbBus.gain.value = 0.9
    reverbBus.connect(reverb).connect(compressor)
    noise = c.createBuffer(1, Math.floor(c.sampleRate * 0.05), c.sampleRate)
    const n = noise.getChannelData(0)
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1
    ctx = c
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Sends a voice to the speakers, plus `reverb` of it to the room. */
function route(c: AudioContext, node: AudioNode, reverb: number) {
  node.connect(dryBus!)
  if (reverb > 0) {
    const send = c.createGain()
    send.gain.value = reverb
    node.connect(send).connect(reverbBus!)
  }
}

/** A struck bar or bell: overtones that ring out, the higher ones dying first. */
function strike(
  c: AudioContext,
  freq: number,
  at: number,
  { gain = 0.3, decay = 0.9, partials = MARIMBA, reverb = 0.2 }: { gain?: number; decay?: number; partials?: readonly Overtone[]; reverb?: number } = {},
) {
  const bus = c.createGain()
  bus.gain.value = gain
  route(c, bus, reverb)
  for (const [ratio, amp, decayScale] of partials) {
    const f = freq * ratio
    if (f > c.sampleRate / 2.2) continue
    const d = Math.max(0.05, decay * decayScale)
    const osc = c.createOscillator()
    osc.frequency.value = f
    const env = c.createGain()
    env.gain.setValueAtTime(0, at)
    env.gain.linearRampToValueAtTime(amp, at + 0.004)
    env.gain.exponentialRampToValueAtTime(0.0001, at + d)
    osc.connect(env).connect(bus)
    osc.start(at)
    osc.stop(at + d + 0.05)
  }
}

/** A held synth note: two detuned oscillators through a low-pass filter. */
function tone(
  c: AudioContext,
  freq: number,
  at: number,
  dur: number,
  {
    gain = 0.2,
    wave = 'sawtooth',
    cutoff = 3000,
    detune = 8,
    glideTo,
    reverb = 0.12,
  }: { gain?: number; wave?: OscillatorType; cutoff?: number; detune?: number; glideTo?: number; reverb?: number } = {},
) {
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = cutoff
  filter.Q.value = 0.7
  const env = c.createGain()
  env.gain.setValueAtTime(0, at)
  env.gain.linearRampToValueAtTime(gain, at + 0.006)
  env.gain.setValueAtTime(gain, at + Math.max(0.01, dur - 0.04))
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  filter.connect(env)
  route(c, env, reverb)
  for (const cents of [-detune, detune]) {
    const osc = c.createOscillator()
    osc.type = wave
    osc.detune.value = cents
    osc.frequency.setValueAtTime(freq, at)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, at + dur)
    osc.connect(filter)
    osc.start(at)
    osc.stop(at + dur + 0.02)
  }
}

/** A tiny, dry tick -- a burst of filtered noise with a click of pitch. */
function tick(c: AudioContext, at: number, gain = 0.2) {
  const src = c.createBufferSource()
  src.buffer = noise
  const band = c.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 3400
  band.Q.value = 1.1
  const env = c.createGain()
  env.gain.setValueAtTime(gain, at)
  env.gain.exponentialRampToValueAtTime(0.0001, at + 0.03)
  src.connect(band).connect(env)
  route(c, env, 0)
  src.start(at)
  src.stop(at + 0.04)
  const blip = c.createOscillator()
  blip.frequency.setValueAtTime(1900, at)
  blip.frequency.exponentialRampToValueAtTime(1200, at + 0.025)
  const blipEnv = c.createGain()
  blipEnv.gain.setValueAtTime(gain * 0.5, at)
  blipEnv.gain.exponentialRampToValueAtTime(0.0001, at + 0.03)
  blip.connect(blipEnv)
  route(c, blipEnv, 0)
  blip.start(at)
  blip.stop(at + 0.04)
}

/** Alternating two-tone alarm, `times` pairs. */
function hiLo(c: AudioContext, at: number, hi: number, lo: number, times: number, step: number, gain: number) {
  for (let i = 0; i < times; i++) {
    tone(c, hi, at + i * step * 2, step * 0.92, { gain, cutoff: 3600 })
    tone(c, lo, at + i * step * 2 + step, step * 0.92, { gain, cutoff: 3200 })
  }
}

type Severity = 1 | 2 | 3 | 4 | 5

/** A triaged case, by how urgent it is -- the more urgent, the more it
 * sounds like an alarm rather than a chime. */
function severityAlert(c: AudioContext, at: number, severity: Severity) {
  switch (severity) {
    case 1: // วิกฤต: three rising sweeps, then a fast hi-lo
      for (let i = 0; i < 3; i++) tone(c, 620, at + i * 0.24, 0.22, { gain: 0.26, glideTo: 1480, cutoff: 4200 })
      hiLo(c, at + 0.78, 1319, 988, 2, 0.12, 0.26)
      break
    case 2: // ฉุกเฉิน: three hi-lo pairs
      hiLo(c, at, 1175, 880, 3, 0.13, 0.24)
      break
    case 3: // เร่งด่วน: a bright triple beep and a bell
      for (let i = 0; i < 3; i++) tone(c, 988, at + i * 0.16, 0.1, { gain: 0.2, cutoff: 3000 })
      strike(c, 1319, at + 0.5, { gain: 0.22, partials: BELL, decay: 1.1, reverb: 0.3 })
      break
    case 4: // ไม่เร่งด่วน: two bells
      strike(c, 1175, at, { gain: 0.26, partials: BELL, decay: 1.0, reverb: 0.3 })
      strike(c, 1568, at + 0.16, { gain: 0.24, partials: BELL, decay: 1.3, reverb: 0.3 })
      break
    case 5: // ทั่วไป: one soft bell
      strike(c, 1568, at, { gain: 0.2, partials: BELL, decay: 1.3, reverb: 0.3 })
      break
  }
}

// ---------------------------------------------------------------------------
// Interface sounds -- the user can switch these off.

const UI_SOUNDS_KEY = 'resq-ui-sounds'
const uiListeners = new Set<() => void>()

function readUiSounds(): boolean {
  try {
    return localStorage.getItem(UI_SOUNDS_KEY) !== 'off'
  } catch {
    return true
  }
}
let uiSoundsOn = readUiSounds()

export function setUiSoundsEnabled(on: boolean): void {
  uiSoundsOn = on
  try {
    localStorage.setItem(UI_SOUNDS_KEY, on ? 'on' : 'off')
  } catch {
    // Private mode etc. -- the choice still holds for this session.
  }
  for (const l of uiListeners) l()
}

function subscribeUiSounds(listener: () => void) {
  uiListeners.add(listener)
  return () => uiListeners.delete(listener)
}

/** Whether taps, success, error and warning sounds play (Settings). */
export function useUiSoundsEnabled(): boolean {
  return useSyncExternalStore(subscribeUiSounds, () => uiSoundsOn)
}

export type UiSound = 'tap' | 'success' | 'error' | 'warning'

let lastTapAt = 0

function renderUi(c: AudioContext, name: UiSound, at: number) {
  switch (name) {
    case 'tap':
      tick(c, at)
      break
    case 'success': // two rising chimes, a fifth apart
      strike(c, 1047, at, { gain: 0.2, partials: CHIME, decay: 0.5, reverb: 0.18 })
      strike(c, 1568, at + 0.09, { gain: 0.24, partials: CHIME, decay: 0.9, reverb: 0.22 })
      break
    case 'error': // a low hollow "uh-uh", falling
      tone(c, 311, at, 0.12, { wave: 'square', gain: 0.17, cutoff: 1500, detune: 4, reverb: 0.05 })
      tone(c, 233, at + 0.15, 0.22, { wave: 'square', gain: 0.19, cutoff: 1100, detune: 4, reverb: 0.05 })
      break
    case 'warning': // the same bell twice
      strike(c, 880, at, { gain: 0.22, partials: BELL, decay: 0.7, reverb: 0.25 })
      strike(c, 880, at + 0.17, { gain: 0.2, partials: BELL, decay: 1.0, reverb: 0.25 })
      break
  }
}

export function playUiSound(name: UiSound): void {
  if (!uiSoundsOn) return
  const c = audio()
  if (!c) return
  if (name === 'tap') {
    // A double-fired click (pointer + synthetic) stays one tick.
    const now = performance.now()
    if (now - lastTapAt < 45) return
    lastTapAt = now
  }
  renderUi(c, name, c.currentTime + 0.005)
}

// ---------------------------------------------------------------------------
// Alerts -- always on.

/** What just landed on this person:
 * - case-new: a new emergency for 1669
 * - rescue-assigned: a case handed to this rescue team
 * - rescue-rejected: a rescue team turned a case down -- 1669 must reassign
 * - hospital-incoming: a patient on the way to this hospital
 * - notice: anything else worth a sound (an emergency-tone notification) */
export type AlertEvent = 'case-new' | 'rescue-assigned' | 'rescue-rejected' | 'hospital-incoming' | 'notice'

function renderAlert(c: AudioContext, event: AlertEvent, severity: Severity | undefined, at: number) {
  switch (event) {
    case 'case-new':
    case 'rescue-assigned':
      if (severity) {
        severityAlert(c, at, severity)
      } else {
        // Not triaged yet: an incoming-emergency alarm, hi-lo with a bell
        // on top.
        hiLo(c, at, 1319, 988, 3, 0.12, 0.25)
        strike(c, 1976, at + 0.74, { gain: 0.2, partials: BELL, decay: 1.2, reverb: 0.35 })
      }
      break
    case 'rescue-rejected':
      // Falling and hollow -- plainly "something went wrong", unlike any
      // new-case alarm: G, D#, A#, then two low pulses.
      for (const [i, f] of [784, 622, 466].entries()) {
        tone(c, f, at + i * 0.19, 0.17, { wave: 'square', gain: 0.2, cutoff: 1900, glideTo: f * 0.97, reverb: 0.15 })
      }
      tone(c, 233, at + 0.64, 0.13, { wave: 'square', gain: 0.22, cutoff: 1200, reverb: 0.1 })
      tone(c, 233, at + 0.84, 0.13, { wave: 'square', gain: 0.22, cutoff: 1200, reverb: 0.1 })
      break
    case 'hospital-incoming': {
      // A paging chime: a rising bell arpeggio, more notes and lower for
      // the more urgent patient; the most urgent two ring it twice.
      const runs: Record<Severity | 0, number[]> = {
        1: [523, 659, 784, 1047, 1319],
        2: [587, 740, 880, 1175],
        3: [659, 831, 988],
        4: [784, 988],
        5: [880, 1109],
        0: [659, 831, 988],
      }
      const run = runs[severity ?? 0]
      const passes = severity === 1 || severity === 2 ? 2 : 1
      const step = 0.13
      for (let p = 0; p < passes; p++) {
        const start = at + p * (run.length * step + 0.45)
        run.forEach((f, i) =>
          strike(c, f, start + i * step, { gain: 0.3, partials: BELL, decay: i === run.length - 1 ? 1.6 : 0.8, reverb: 0.35 }),
        )
      }
      break
    }
    case 'notice':
      strike(c, 988, at, { gain: 0.26, partials: BELL, decay: 0.8, reverb: 0.3 })
      strike(c, 1319, at + 0.14, { gain: 0.26, partials: BELL, decay: 1.2, reverb: 0.3 })
      break
  }
}

export function playAlert(event: AlertEvent, severity?: Severity): void {
  const c = audio()
  if (!c) return
  renderAlert(c, event, severity, c.currentTime + 0.01)
}

// ---------------------------------------------------------------------------
// Calls -- always on.

export type CallSound = 'connected' | 'ended'

function renderCall(c: AudioContext, name: CallSound, at: number) {
  if (name === 'connected') {
    strike(c, 1175, at, { gain: 0.24, partials: CHIME, decay: 0.5, reverb: 0.2 })
    strike(c, 1760, at + 0.1, { gain: 0.26, partials: CHIME, decay: 0.9, reverb: 0.25 })
  } else {
    strike(c, 880, at, { gain: 0.22, partials: CHIME, decay: 0.5, reverb: 0.2 })
    strike(c, 587, at + 0.13, { gain: 0.24, partials: CHIME, decay: 0.9, reverb: 0.25 })
  }
}

export function playCallSound(name: CallSound): void {
  const c = audio()
  if (!c) return
  renderCall(c, name, c.currentTime + 0.01)
}

/** Incoming: a lively marimba phrase, twice a cycle -- loud enough to hear
 * across a room. Outgoing (you're the caller, waiting): a soft, calm pulse. */
export type RingKind = 'incoming' | 'outgoing'

const RING_PHRASE = [1319, 988, 831, 988, 1319, 1480, 1319, 988]
const RING_CYCLE_MS: Record<RingKind, number> = { incoming: 2600, outgoing: 3000 }

function renderRing(c: AudioContext, kind: RingKind, at: number) {
  if (kind === 'incoming') {
    for (let rep = 0; rep < 2; rep++) {
      RING_PHRASE.forEach((f, i) => {
        const t = at + rep * 1.1 + i * 0.11
        strike(c, f, t, { gain: 0.36, decay: 0.55, reverb: 0.2 })
        // An octave below, quieter, for body on small speakers.
        strike(c, f / 2, t, { gain: 0.12, decay: 0.45, reverb: 0 })
      })
    }
  } else {
    for (const offset of [0, 0.42]) {
      strike(c, 740, at + offset, { gain: 0.13, partials: CHIME, decay: 1.1, reverb: 0.3 })
      strike(c, 1109, at + offset, { gain: 0.07, partials: CHIME, decay: 0.9, reverb: 0.3 })
    }
  }
}

const rings = new Map<RingKind, ReturnType<typeof setInterval>>()

/** Loops a ring until stopRing(kind). Calling it again while that ring is
 * already going is a no-op. Incoming and outgoing are separate -- the
 * call bridge owns one, the caller's call screen the other. */
export function startRing(kind: RingKind): void {
  if (rings.has(kind)) return
  const c = audio()
  if (!c) return
  const ring = () => {
    const now = audio()
    if (now) renderRing(now, kind, now.currentTime + 0.02)
  }
  ring()
  rings.set(kind, setInterval(ring, RING_CYCLE_MS[kind]))
}

export function stopRing(kind: RingKind): void {
  const timer = rings.get(kind)
  if (timer === undefined) return
  clearInterval(timer)
  rings.delete(kind)
}

/**
 * Browsers refuse to start audio until the page has seen a real user
 * gesture. Call this from the first pointerdown/keydown anywhere in the app
 * so audio is already running by the time an async event (a case arriving
 * from another device) needs to play a sound.
 */
export function primeAudio(): void {
  audio()
}

// ---------------------------------------------------------------------------
// For the Settings preview list.

export type SoundPreview =
  | { kind: 'ui'; name: UiSound }
  | { kind: 'alert'; event: AlertEvent; severity?: Severity }
  | { kind: 'call'; name: CallSound }
  | { kind: 'ring'; ring: RingKind }

/** Plays one sound regardless of the interface-sounds setting (the user
 * asked to hear it). Rings play one cycle. */
export function previewSound(p: SoundPreview): void {
  const c = audio()
  if (!c) return
  const at = c.currentTime + 0.01
  if (p.kind === 'ui') renderUi(c, p.name, at)
  else if (p.kind === 'alert') renderAlert(c, p.event, p.severity, at)
  else if (p.kind === 'call') renderCall(c, p.name, at)
  else renderRing(c, p.ring, at)
}
