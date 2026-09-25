import { useCallback, useEffect, useRef, useState } from 'react'
import type { LocalVideoTrack, Participant, Room, Track } from 'livekit-client'
import { supabase, supabaseEnabled } from './supabase'

type LiveKit = typeof import('livekit-client')

// The SDK is ~150kB gzipped -- loaded only once a call actually starts, so
// it never weighs down the first load for a citizen on weak mobile data who
// may never place a call at all.
let liveKitModule: Promise<LiveKit> | null = null
function loadLiveKit(): Promise<LiveKit> {
  return (liveKitModule ??= import('livekit-client'))
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

async function fetchToken(
  caseId: string,
  roomKind: CallRoomKind,
  side: CallSide,
): Promise<{ token: string; url: string } | null> {
  if (!supabase) return null
  const { data, error } = await supabase.functions.invoke<{ token: string; url: string }>('livekit-token', {
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
    // The mic publishes before the camera, so reading the toggles off live
    // publications mid-join would flash "camera off" for a moment on every
    // call -- hold the defaults until both have had their first attempt.
    let mediaSettled = false

    async function join() {
      setConnectionState('connecting')
      setCameraState('requesting')
      const [lk, credentials] = await Promise.all([loadLiveKit(), fetchToken(caseId!, roomKind, side)])
      if (cancelled) return
      if (!credentials) {
        setConnectionState('failed')
        setCameraState('idle')
        return
      }
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
        if (!cancelled) {
          setConnectionState('failed')
          setCameraState('idle')
        }
        return
      }
      if (cancelled) return
      setAudioBlocked(!r.canPlaybackAudio)

      // Separately, so a phone with no camera (or a denied camera) still
      // joins with its microphone -- a voice-only call beats no call.
      try {
        await r.localParticipant.setMicrophoneEnabled(true)
      } catch (err) {
        if (!cancelled && (err as DOMException)?.name === 'NotAllowedError') setCameraState('denied')
      }
      try {
        await r.localParticipant.setCameraEnabled(true, { facingMode: facingModeRef.current })
        if (!cancelled) setCameraState((s) => (s === 'denied' ? s : 'ready'))
      } catch (err) {
        if (!cancelled) setCameraState((err as DOMException)?.name === 'NotFoundError' ? 'unavailable' : 'denied')
      }
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
