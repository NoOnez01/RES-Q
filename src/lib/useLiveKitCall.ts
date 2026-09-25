import { useCallback, useEffect, useRef, useState } from 'react'
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
}

export interface LiveKitCall {
  remotes: CallParticipant[]
  localVideoTrack: Track | null
  cameraState: CameraState
  connectionState: ConnectionState
  cameraOn: boolean
  micOn: boolean
  /** The browser blocked remote audio autoplay -- needs a tap to start. */
  audioBlocked: boolean
  toggleCamera: () => void
  toggleMic: () => void
  switchCamera: () => void
  startAudio: () => void
}

async function fetchToken(caseId: string, roomKind: CallRoomKind, side: CallSide): Promise<Credentials | null> {
  if (!supabase) return null
  const { data, error } = await supabase.functions.invoke<Credentials>('livekit-token', {
    body: { caseId, roomKind, role: side },
  })
  if (error) {
    // A non-2xx carries the function's own response -- its { error } body
    // says which check refused the caller (unauthorized/forbidden/...).
    const detail = error.context instanceof Response ? await error.context.text().catch(() => '') : ''
    console.error('livekit-token failed:', error.message, detail)
    return null
  }
  if (!data?.token || !data.url) {
    console.error('livekit-token returned no token/url')
    return null
  }
  return data
}

// Tokens fetched while a call is still ringing, each used once by the join
// that follows (identities are per connection, so a token is single-use).
// Well inside the token's 10-minute TTL.
const PREFETCH_MAX_AGE_MS = 5 * 60_000
const prefetched = new Map<string, { at: number; credentials: Promise<Credentials | null> }>()

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
function getCredentials(caseId: string, roomKind: CallRoomKind, side: CallSide): Promise<Credentials | null> {
  const hit = prefetched.get(prefetchKey(caseId, roomKind, side))
  if (!hit || Date.now() - hit.at >= PREFETCH_MAX_AGE_MS) return fetchToken(caseId, roomKind, side)
  return hit.credentials.then((c) => c ?? fetchToken(caseId, roomKind, side))
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

function toCallParticipant(lk: LiveKit, p: Participant): CallParticipant {
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
  }
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
  const roomRef = useRef<Room | null>(null)
  const liveKitRef = useRef<LiveKit | null>(null)
  const facingModeRef = useRef<'user' | 'environment'>('user')

  useEffect(() => {
    if (!active || !caseId || !supabaseEnabled) return
    let cancelled = false
    let room: Room | null = null
    // Tracks publish one at a time, so reading the toggles off live
    // publications mid-join would flash "camera off" for a moment on every
    // call -- hold the defaults until the first publish attempt is done.
    let mediaSettled = false

    async function join() {
      setConnectionState('connecting')
      setCameraState('requesting')
      // Joining is several round trips to the LiveKit server, which may be
      // far away -- so the camera/mic start up while the token and connect
      // are in flight rather than after them.
      const media = loadLiveKit().then((lk) => openLocalMedia(lk, facingModeRef.current))
      media.catch(() => {}) // an SDK load failure is reported just below
      const discardMedia = () => void media.then(({ tracks }) => tracks.forEach((t) => t.stop())).catch(() => {})
      const [lk, credentials] = await Promise.all([loadLiveKit(), getCredentials(caseId!, roomKind, side)]).catch(
        (err: unknown) => {
          console.error('LiveKit SDK failed to load:', err)
          return [null, null] as const
        },
      )
      if (cancelled || !lk || !credentials) {
        discardMedia()
        if (!cancelled) {
          setConnectionState('failed')
          setCameraState('idle')
        }
        return
      }
      prefetched.delete(prefetchKey(caseId!, roomKind, side))
      liveKitRef.current = lk
      room = new lk.Room({ adaptiveStream: true, dynacast: true })
      roomRef.current = room
      const r = room

      const refresh = () => {
        if (cancelled) return
        setRemotes([...r.remoteParticipants.values()].map((p) => toCallParticipant(lk, p)))
        const local = toCallParticipant(lk, r.localParticipant)
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
        if (!cancelled) console.warn('LiveKit disconnected:', reason === undefined ? 'unknown' : lk.DisconnectReason[reason])
      })
      r.on(E.ConnectionStateChanged, (state) => {
        if (cancelled) return
        if (state === lk.ConnectionState.Connected) setConnectionState('connected')
        else if (state === lk.ConnectionState.Disconnected) setConnectionState('disconnected')
        else setConnectionState('connecting')
      })

      try {
        await r.connect(credentials.url, credentials.token)
      } catch (err) {
        console.error('LiveKit connect failed:', err)
        discardMedia()
        if (!cancelled) {
          setConnectionState('failed')
          setCameraState('idle')
        }
        return
      }
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
    }

    void join()

    return () => {
      cancelled = true
      // `room` is still null if this runs while the SDK/token are loading --
      // join() then bails before creating one. A pending connect() is
      // aborted by disconnect().
      room?.removeAllListeners()
      void room?.disconnect()
      roomRef.current = null
      facingModeRef.current = 'user'
      setRemotes([])
      setLocalVideoTrack(null)
      setCameraState('idle')
      setConnectionState('idle')
      setCameraOn(true)
      setMicOn(true)
      setAudioBlocked(false)
    }
  }, [active, caseId, roomKind, side])

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
    const next = facingModeRef.current === 'user' ? 'environment' : 'user'
    track
      .restartTrack({ facingMode: next })
      .then(() => {
        facingModeRef.current = next
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
    audioBlocked,
    toggleCamera,
    toggleMic,
    switchCamera,
    startAudio,
  }
}
