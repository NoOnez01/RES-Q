import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { LocalTrack, LocalVideoTrack, Participant, Room, Track } from 'livekit-client'
import { supabase, supabaseEnabled } from './supabase'

type LiveKit = typeof import('livekit-client')
type Credentials = { token: string; url: string }

// The SDK is ~150kB gzipped -- loaded only once a call actually starts (or
// starts ringing, see prepareCall), so it never weighs down the first load
// for a citizen on weak mobile data who may never place a call at all.
let liveKitModule: Promise<LiveKit> | null = null
function loadLiveKit(): Promise<LiveKit> {
  return (liveKitModule ??= import('livekit-client').catch((err: unknown) => {
    liveKitModule = null // a failed chunk load (flaky mobile data) must be retryable
    throw err
  }))
}

/** Which of a case's call rooms to join -- see supabase/functions/livekit-token. */
export type CallRoomKind = 'dispatch' | 'rescue-citizen'
/** Which side of the call this screen is. Only honored for admins, who can
 * open any screen; everyone else joins as their own profile role. */
export type CallSide = 'public' | 'dispatch' | 'rescue'
export type CameraState = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable'
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'failed' | 'disconnected'

export interface CallParticipant {
  identity: string
  /** 'public' | 'dispatch' | 'rescue', stamped into the token server-side. */
  role: string | undefined
  name: string | undefined
  videoTrack: Track | null
  audioTrack: Track | null
  micOn: boolean
  isSpeaking: boolean
  /** Another connection of the signed-in account (another tab or device).
   * Never played aloud: it's your own voice, and playing it back through
   * the speaker into the same microphone is an echo loop. */
  sameUser: boolean
}

/** Which step of joining failed, and what it said -- shown on the call
 * screen, so "couldn't connect" names its cause instead of hiding it in the
 * console. */
export interface CallFailure {
  step: 'token' | 'sdk' | 'connect' | 'dropped'
  detail?: string
}

export interface LiveKitCall {
  remotes: CallParticipant[]
  localVideoTrack: Track | null
  cameraState: CameraState
  connectionState: ConnectionState
  cameraOn: boolean
  micOn: boolean
  /** Which camera is live -- the front one's preview is shown mirrored. */
  facingMode: 'user' | 'environment'
  /** The device has more than one camera to switch between. */
  canSwitchCamera: boolean
  /** The browser blocked remote audio autoplay -- needs a tap to start. */
  audioBlocked: boolean
  toggleCamera: () => void
  toggleMic: () => void
  switchCamera: () => void
  startAudio: () => void
  /** Why the last join failed; null while connecting/connected. */
  failure: CallFailure | null
  /** Join again, without ending the call. */
  retry: () => void
}

type TokenResult = Credentials | { error: string }

async function fetchToken(caseId: string, roomKind: CallRoomKind, side: CallSide): Promise<TokenResult> {
  if (!supabase) return { error: 'supabase not configured' }
  try {
    const { data, error } = await supabase.functions.invoke<Credentials>('livekit-token', {
      body: { caseId, roomKind, role: side },
    })
    if (error) {
      // A non-2xx carries the function's own response -- its { error } body
      // says which check refused the caller (unauthorized/forbidden/...).
      const body = error.context instanceof Response ? await error.context.text().catch(() => '') : ''
      console.error('livekit-token failed:', error.message, body)
      let reason = error.message
      try {
        reason = (JSON.parse(body) as { error?: string }).error ?? reason
      } catch {
        // not JSON -- keep the SDK's message
      }
      return { error: reason }
    }
    if (!data?.token || !data.url) {
      console.error('livekit-token returned no token/url')
      return { error: 'no token returned' }
    }
    return data
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// Tokens fetched while a call is still ringing, each used once by the join
// that follows (identities are per connection, so a token is single-use).
// Well inside the token's 10-minute TTL.
const PREFETCH_MAX_AGE_MS = 5 * 60_000
const prefetched = new Map<string, { at: number; credentials: Promise<TokenResult> }>()

function prefetchKey(caseId: string, roomKind: CallRoomKind, side: CallSide): string {
  return `${caseId}|${roomKind}|${side}`
}

/**
 * Called while a call rings for this user: loads the SDK and fetches the
 * token ahead of time, so answering goes straight to connecting instead of
 * first waiting on a chunk download and an Edge Function round trip.
 */
export function prepareCall(caseId: string, roomKind: CallRoomKind, side: CallSide): void {
  if (!supabaseEnabled) return
  loadLiveKit().catch(() => {})
  const key = prefetchKey(caseId, roomKind, side)
  const hit = prefetched.get(key)
  if (hit && Date.now() - hit.at < PREFETCH_MAX_AGE_MS) return
  prefetched.set(key, { at: Date.now(), credentials: fetchToken(caseId, roomKind, side) })
}

/** The prefetched token if there's a fresh one, else a new fetch. Doesn't
 * remove it -- the join does that once it actually connects, so a join
 * cancelled straight away (a quick remount) leaves it for the next one. */
function getCredentials(caseId: string, roomKind: CallRoomKind, side: CallSide): Promise<TokenResult> {
  const hit = prefetched.get(prefetchKey(caseId, roomKind, side))
  if (!hit || Date.now() - hit.at >= PREFETCH_MAX_AGE_MS) return fetchToken(caseId, roomKind, side)
  // A prefetch that failed (e.g. while the ring was still syncing) is no
  // verdict on now -- ask again.
  return hit.credentials.then((c) => ('error' in c ? fetchToken(caseId, roomKind, side) : c))
}

function mediaErrorState(err: unknown): CameraState {
  return (err as DOMException)?.name === 'NotFoundError' ? 'unavailable' : 'denied'
}

/**
 * Camera + mic in one request (one permission prompt), falling back to the
 * mic alone -- a voice-only call beats no call on a phone with no camera or
 * a refused one.
 */
async function openLocalMedia(
  lk: LiveKit,
  facingMode: 'user' | 'environment',
): Promise<{ tracks: LocalTrack[]; cameraState: CameraState }> {
  try {
    return { tracks: await lk.createLocalTracks({ audio: true, video: { facingMode } }), cameraState: 'ready' }
  } catch (err) {
    const cameraState = mediaErrorState(err)
    try {
      return { tracks: await lk.createLocalTracks({ audio: true }), cameraState }
    } catch (audioErr) {
      return { tracks: [], cameraState: mediaErrorState(audioErr) }
    }
  }
}

/** Identities are `${userId}:${per-connection suffix}` (see livekit-token). */
function userOfIdentity(identity: string): string {
  return identity.split(':')[0]
}

function toCallParticipant(lk: LiveKit, p: Participant, localIdentity: string): CallParticipant {
  const camera = p.getTrackPublication(lk.Track.Source.Camera)
  const mic = p.getTrackPublication(lk.Track.Source.Microphone)
  return {
    identity: p.identity,
    role: p.attributes.role,
    name: p.name,
    videoTrack: camera && !camera.isMuted ? (camera.track ?? null) : null,
    audioTrack: mic?.track ?? null,
    micOn: !!mic && !mic.isMuted,
    isSpeaking: p.isSpeaking,
    sameUser: p.identity !== localIdentity && userOfIdentity(p.identity) === userOfIdentity(localIdentity),
  }
}

// Hook instances whose room is connected with at least one *other* person
// in it -- so the app can tell this device is mid-conversation (the ringtone
// must not loop into an ongoing call; see CallRingtoneBridge).
const conversing = new Set<symbol>()
const conversingListeners = new Set<() => void>()

function setConversing(id: symbol, on: boolean) {
  if (on === conversing.has(id)) return
  if (on) conversing.add(id)
  else conversing.delete(id)
  for (const listener of conversingListeners) listener()
}

/** True while this device is in a live call with someone else. */
export function useInLiveConversation(): boolean {
  return useSyncExternalStore(
    (listener) => {
      conversingListeners.add(listener)
      return () => conversingListeners.delete(listener)
    },
    () => conversing.size > 0,
  )
}

/**
 * Joins a case's LiveKit room while `active` is true and leaves it when it
 * turns false or the component unmounts. Who's ringing/answered/hung up is
 * still decided by the synced case fields (callStatus etc.) -- this hook
 * only carries the media, so any number of participants (citizen,
 * dispatcher, and a rescue crew pulled in) can share the same room.
 */
export function useLiveKitCall(
  caseId: string | null,
  roomKind: CallRoomKind,
  side: CallSide,
  active: boolean,
): LiveKitCall {
  const [remotes, setRemotes] = useState<CallParticipant[]>([])
  const [localVideoTrack, setLocalVideoTrack] = useState<Track | null>(null)
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [canSwitchCamera, setCanSwitchCamera] = useState(false)
  const [failure, setFailure] = useState<CallFailure | null>(null)
  // Bumped to join again (retry) without the call itself ending.
  const [attempt, setAttempt] = useState(0)
  // One automatic retry per call -- a blip shouldn't need a tap, but a real
  // fault (bad key, blocked network) shouldn't loop either.
  const autoRetriedRef = useRef(false)
  const roomRef = useRef<Room | null>(null)
  const liveKitRef = useRef<LiveKit | null>(null)
  const facingModeRef = useRef<'user' | 'environment'>('user')
  const instanceRef = useRef(Symbol('call'))

  useEffect(() => {
    if (!active || !caseId || !supabaseEnabled) return
    let cancelled = false
    let room: Room | null = null
    // Tracks publish one at a time, so reading the toggles off live
    // publications mid-join would flash "camera off" for a moment on every
    // call -- hold the defaults until the first publish attempt is done.
    let mediaSettled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const fail = (f: CallFailure) => {
      if (cancelled) return
      setFailure(f)
      setConnectionState('failed')
      setCameraState('idle')
      if (!autoRetriedRef.current) {
        autoRetriedRef.current = true
        retryTimer = setTimeout(() => setAttempt((a) => a + 1), 1500)
      }
    }

    // Counted once camera access is granted (before that, browsers hide
    // the device list) and again whenever a camera is plugged in or out.
    const countCameras = () => {
      navigator.mediaDevices?.enumerateDevices().then(
        (devices) => {
          if (!cancelled) setCanSwitchCamera(devices.filter((d) => d.kind === 'videoinput').length > 1)
        },
        () => {},
      )
    }
    navigator.mediaDevices?.addEventListener('devicechange', countCameras)

    async function join() {
      setConnectionState('connecting')
      setCameraState('requesting')
      setFailure(null)
      // Joining is several round trips to the LiveKit server, which may be
      // far away -- so the camera/mic start up while the token and connect
      // are in flight rather than after them.
      const media = loadLiveKit().then((lk) => openLocalMedia(lk, facingModeRef.current))
      media.catch(() => {}) // an SDK load failure is reported just below
      const discardMedia = () => void media.then(({ tracks }) => tracks.forEach((t) => t.stop())).catch(() => {})
      let sdkError: unknown = null
      const [lk, credentials] = await Promise.all([
        loadLiveKit().catch((err: unknown) => {
          console.error('LiveKit SDK failed to load:', err)
          sdkError = err
          return null
        }),
        getCredentials(caseId!, roomKind, side),
      ])
      if (cancelled || !lk || 'error' in credentials) {
        discardMedia()
        if (!lk) fail({ step: 'sdk', detail: sdkError instanceof Error ? sdkError.message : undefined })
        else if ('error' in credentials) fail({ step: 'token', detail: credentials.error })
        return
      }
      prefetched.delete(prefetchKey(caseId!, roomKind, side))
      liveKitRef.current = lk
      room = new lk.Room({ adaptiveStream: true, dynacast: true })
      roomRef.current = room
      const r = room
      let joined = false

      const refresh = () => {
        if (cancelled) return
        const localIdentity = r.localParticipant.identity
        const others = [...r.remoteParticipants.values()].map((p) => toCallParticipant(lk, p, localIdentity))
        setRemotes(others)
        setConversing(instanceRef.current, r.state === lk.ConnectionState.Connected && others.some((p) => !p.sameUser))
        const local = toCallParticipant(lk, r.localParticipant, localIdentity)
        setLocalVideoTrack(local.videoTrack)
        if (mediaSettled) {
          setCameraOn(!!local.videoTrack)
          setMicOn(local.micOn)
        }
      }
      const E = lk.RoomEvent
      const refreshEvents = [
        E.ParticipantConnected,
        E.ParticipantDisconnected,
        E.TrackSubscribed,
        E.TrackUnsubscribed,
        E.TrackMuted,
        E.TrackUnmuted,
        E.LocalTrackPublished,
        E.LocalTrackUnpublished,
        E.ActiveSpeakersChanged,
        E.ParticipantAttributesChanged,
      ] as const
      for (const event of refreshEvents) r.on(event, refresh)
      r.on(E.AudioPlaybackStatusChanged, () => {
        if (!cancelled) setAudioBlocked(!r.canPlaybackAudio)
      })
      r.on(E.Disconnected, (reason) => {
        if (cancelled) return
        const name = reason === undefined ? 'unknown' : lk.DisconnectReason[reason]
        console.warn('LiveKit disconnected:', name)
        // Only after having been connected -- a failed connect() reports
        // itself below.
        if (joined) fail({ step: 'dropped', detail: name })
      })
      r.on(E.ConnectionStateChanged, (state) => {
        if (cancelled) return
        if (state === lk.ConnectionState.Connected) setConnectionState('connected')
        else if (state === lk.ConnectionState.Disconnected) setConnectionState('disconnected')
        else setConnectionState('connecting')
        refresh()
      })

      try {
        await r.connect(credentials.url, credentials.token)
      } catch (err) {
        console.error('LiveKit connect failed:', err)
        discardMedia()
        fail({ step: 'connect', detail: err instanceof Error ? err.message : String(err) })
        return
      }
      joined = true
      autoRetriedRef.current = false
      if (cancelled) {
        discardMedia()
        return
      }
      setAudioBlocked(!r.canPlaybackAudio)

      const { tracks, cameraState: mediaState } = await media
      if (cancelled) {
        tracks.forEach((t) => t.stop())
        return
      }
      setCameraState(mediaState)
      await Promise.all(
        tracks.map((t) =>
          r.localParticipant.publishTrack(t).catch((err: unknown) => {
            console.error('LiveKit publish failed:', err)
            t.stop()
          }),
        ),
      )
      mediaSettled = true
      refresh()
      countCameras()
    }

    void join()

    const instance = instanceRef.current
    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      navigator.mediaDevices?.removeEventListener('devicechange', countCameras)
      setConversing(instance, false)
      // `room` is still null if this runs while the SDK/token are loading --
      // join() then bails before creating one. A pending connect() is
      // aborted by disconnect().
      room?.removeAllListeners()
      void room?.disconnect()
      roomRef.current = null
      facingModeRef.current = 'user'
      setFacingMode('user')
      setCanSwitchCamera(false)
      setRemotes([])
      setLocalVideoTrack(null)
      setCameraState('idle')
      setConnectionState('idle')
      setCameraOn(true)
      setMicOn(true)
      setAudioBlocked(false)
      setFailure(null)
    }
  }, [active, caseId, roomKind, side, attempt])

  // A new call (not a retry within one) gets its own automatic retry.
  useEffect(() => {
    if (!active) autoRetriedRef.current = false
  }, [active])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])

  const toggleCamera = useCallback(() => {
    const room = roomRef.current
    if (!room) return
    const next = !room.localParticipant.isCameraEnabled
    void room.localParticipant
      .setCameraEnabled(next, { facingMode: facingModeRef.current })
      .catch((err) => console.error('toggleCamera failed:', err))
  }, [])

  const toggleMic = useCallback(() => {
    const room = roomRef.current
    if (!room) return
    void room.localParticipant
      .setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled)
      .catch((err) => console.error('toggleMic failed:', err))
  }, [])

  // The citizen filming a scene needs to flip from the front (selfie)
  // camera to the rear one to actually show 1669/rescue the surroundings.
  const switchCamera = useCallback(() => {
    const lk = liveKitRef.current
    if (!lk) return
    const track = roomRef.current?.localParticipant.getTrackPublication(lk.Track.Source.Camera)?.track as
      | LocalVideoTrack
      | undefined
    if (!track) return
    const settings = track.mediaStreamTrack.getSettings()
    if (settings.facingMode) {
      // A phone: front <-> back. By facing rather than by device, since a
      // phone lists each back lens (wide, ultra-wide, zoom) as its own camera.
      const next = facingModeRef.current === 'user' ? 'environment' : 'user'
      track
        .restartTrack({ facingMode: next })
        .then(() => {
          facingModeRef.current = next
          setFacingMode(next)
        })
        .catch((err) => console.error('switchCamera failed:', err))
      return
    }
    // A computer's cameras say nothing about which way they face -- step
    // through them in turn instead.
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const cameras = devices.filter((d) => d.kind === 'videoinput')
        if (cameras.length < 2) return
        const at = cameras.findIndex((d) => d.deviceId === settings.deviceId)
        // Exact: a bare id is only a preference, and Chrome keeps the
        // camera it already had.
        return track.restartTrack({ deviceId: { exact: cameras[(at + 1) % cameras.length].deviceId } })
      })
      .catch((err) => console.error('switchCamera failed:', err))
  }, [])

  const startAudio = useCallback(() => {
    void roomRef.current?.startAudio()
  }, [])

  return {
    remotes,
    localVideoTrack,
    cameraState,
    connectionState,
    cameraOn,
    micOn,
    facingMode,
    canSwitchCamera,
    audioBlocked,
    failure,
    retry,
    toggleCamera,
    toggleMic,
    switchCamera,
    startAudio,
  }
}
