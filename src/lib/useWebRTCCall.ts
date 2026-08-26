import { useEffect, useRef, useState } from 'react'
import { supabase, supabaseEnabled } from './supabase'

type SignalPayload =
  | { type: 'join'; role: 'caller' | 'callee' }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit }
  | { type: 'hangup' }

// STUN alone only works when at least one side has a NAT simple enough to
// traverse directly -- two real phones on different networks (different
// wifi, or mobile data with carrier-grade NAT) very often can't, and the
// call just hangs with no video/audio on either end. TURN relays the media
// through a server instead when a direct path can't be found. OpenRelay's
// credentials below are published publicly by Metered.ca specifically for
// this kind of testing/demo use (https://www.metered.ca/tools/openrelay/) --
// fine for a prototype, but a production deployment should use its own paid
// TURN provider instead (this free tier has bandwidth limits).
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:openrelay.metered.ca:80' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

export type CameraState = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable'
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'failed' | 'disconnected'

/**
 * Peer-to-peer video call between the citizen (caller) and dispatcher
 * (callee) for a given case, signaled over a Supabase Realtime broadcast
 * channel keyed by case id — no separate signaling server needed. The
 * caller is assumed to already be subscribed (ringing) before the callee
 * joins (they answer second), so the callee's "join" broadcast is what
 * triggers the caller to create and send the SDP offer.
 */
export function useWebRTCCall(caseId: string | null, role: 'caller' | 'callee', active: boolean) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [remoteJoined, setRemoteJoined] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')

  const localStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!active || !caseId || !supabaseEnabled || !supabase) return
    const client = supabase
    let cancelled = false
    let hasOffered = false
    const pendingCandidates: RTCIceCandidateInit[] = []
    // createOffer()/createAnswer() force a transceiver's negotiated direction
    // down to recvonly if its sender has no track *at that exact moment* --
    // even when the transceiver was configured sendrecv. getUserMedia is
    // async, so whichever side has to answer/offer before its own camera
    // resolves gets locked into "receive only" for the rest of the call, with
    // nothing to renegotiate it later. The callee in particular has almost no
    // lead time (it must answer the instant the offer arrives), so this hit
    // outgoing video from whoever answered far more often than the caller.
    // Waiting for media to settle (success or failure) before creating the
    // offer/answer avoids the downgrade entirely.
    let resolveMediaReady: () => void
    const mediaReady = new Promise<void>((resolve) => {
      resolveMediaReady = resolve
    })

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    // The offering side (caller) pre-creates its own sendrecv transceivers so
    // the initial offer always declares both directions. The answering side
    // (callee) must NOT do this: transceivers created via addTransceiver()
    // before any remote description exists are never reused once an offer
    // comes in -- setRemoteDescription(offer) creates its own fresh
    // transceivers for the negotiated m-lines (defaulting to recvonly, no
    // track) and those are what createAnswer() actually uses, leaving the
    // pre-created ones permanently orphaned (mid stays null forever). So the
    // callee instead grabs the transceivers setRemoteDescription just made
    // for it (see the 'offer' handler below) and configures those.
    //
    // Both sides route their outgoing tracks through one MediaStream so the
    // SDP's msid grouping is established up front. replaceTrack() alone
    // swaps which track is sent but never attaches a stream -- without a
    // stream set on the transceiver, the far side's ontrack event arrives
    // with an empty streams array and setRemoteStream(e.streams[0]) is
    // permanently null, even though the underlying RTP connection is fine.
    const outboundStream = new MediaStream()
    let videoTransceiver: RTCRtpTransceiver | null = null
    let audioTransceiver: RTCRtpTransceiver | null = null
    let pendingVideoTrack: MediaStreamTrack | null = null
    let pendingAudioTrack: MediaStreamTrack | null = null

    async function attachLocalTracks() {
      await Promise.all([
        videoTransceiver && pendingVideoTrack ? videoTransceiver.sender.replaceTrack(pendingVideoTrack) : null,
        audioTransceiver && pendingAudioTrack ? audioTransceiver.sender.replaceTrack(pendingAudioTrack) : null,
      ])
    }

    if (role === 'caller') {
      videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv', streams: [outboundStream] })
      audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv', streams: [outboundStream] })
    }

    // iceConnectionState doesn't reliably reach 'failed' in a timely way (or
    // at all, on some browsers) when NAT traversal just never succeeds --
    // it can sit in 'checking' indefinitely. A hard timeout gives the UI a
    // definite point to stop waiting and show the "connection failed"
    // messaging instead of spinning forever.
    let connectTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      if (cancelled) return
      setConnectionState((s) => (s === 'connected' ? s : 'failed'))
    }, 15000)

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        void channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'ice-candidate', candidate: e.candidate.toJSON() } satisfies SignalPayload,
        })
      }
    }

    pc.ontrack = (e) => {
      if (!cancelled) setRemoteStream(e.streams[0] ?? null)
    }

    pc.oniceconnectionstatechange = () => {
      if (cancelled) return
      const state = pc.iceConnectionState
      if (state === 'checking') setConnectionState('connecting')
      else if (state === 'connected' || state === 'completed') {
        setConnectionState('connected')
        if (connectTimeout) {
          clearTimeout(connectTimeout)
          connectTimeout = null
        }
      } else if (state === 'failed') setConnectionState('failed')
      else if (state === 'disconnected') setConnectionState('disconnected')
    }

    async function sendOffer() {
      if (hasOffered) return
      hasOffered = true
      await mediaReady
      if (cancelled) return
      await attachLocalTracks()
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      void channel.send({ type: 'broadcast', event: 'signal', payload: { type: 'offer', sdp: offer } satisfies SignalPayload })
    }

    async function handleSignal(msg: SignalPayload) {
      if (cancelled) return
      if (msg.type === 'join') {
        setRemoteJoined(true)
        if (role === 'caller' && msg.role === 'callee') void sendOffer()
        return
      }
      if (msg.type === 'offer' && role === 'callee') {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        // Grab the transceivers setRemoteDescription just created for the
        // negotiated m-lines (see the comment above pc.addTransceiver) and
        // explicitly flip them to sendrecv -- they default to recvonly since
        // this side had no track when they were created.
        videoTransceiver = pc.getTransceivers().find((t) => t.receiver.track?.kind === 'video') ?? null
        audioTransceiver = pc.getTransceivers().find((t) => t.receiver.track?.kind === 'audio') ?? null
        // These transceivers were never given `streams` at creation (unlike
        // the caller's, passed via addTransceiver's init) -- without this,
        // the answer's msid has no stream grouping and the caller's ontrack
        // fires with an empty streams array, same failure as before.
        videoTransceiver?.sender.setStreams(outboundStream)
        audioTransceiver?.sender.setStreams(outboundStream)
        if (videoTransceiver) videoTransceiver.direction = 'sendrecv'
        if (audioTransceiver) audioTransceiver.direction = 'sendrecv'
        await attachLocalTracks()
        for (const c of pendingCandidates.splice(0)) await pc.addIceCandidate(c)
        await mediaReady
        if (cancelled) return
        await attachLocalTracks()
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        void channel.send({ type: 'broadcast', event: 'signal', payload: { type: 'answer', sdp: answer } satisfies SignalPayload })
        return
      }
      if (msg.type === 'answer' && role === 'caller') {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        for (const c of pendingCandidates.splice(0)) await pc.addIceCandidate(c)
        return
      }
      if (msg.type === 'ice-candidate') {
        if (pc.remoteDescription) await pc.addIceCandidate(msg.candidate)
        else pendingCandidates.push(msg.candidate)
        return
      }
      if (msg.type === 'hangup') {
        setRemoteStream(null)
        setRemoteJoined(false)
      }
    }

    const channel = client.channel(`webrtc-call-${caseId}`)
    channel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        void handleSignal(payload as SignalPayload)
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED' || cancelled) return
        void channel.send({ type: 'broadcast', event: 'signal', payload: { type: 'join', role } satisfies SignalPayload })
      })

    setCameraState('requesting')
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        localStreamRef.current = stream
        setLocalStream(stream)
        setCameraState('ready')
        pendingVideoTrack = stream.getVideoTracks()[0] ?? null
        pendingAudioTrack = stream.getAudioTracks()[0] ?? null
        await attachLocalTracks()
        resolveMediaReady()
      })
      .catch((err: DOMException) => {
        if (!cancelled) setCameraState(err.name === 'NotFoundError' ? 'unavailable' : 'denied')
        resolveMediaReady()
      })

    return () => {
      cancelled = true
      if (connectTimeout) clearTimeout(connectTimeout)
      void channel.send({ type: 'broadcast', event: 'signal', payload: { type: 'hangup' } satisfies SignalPayload })
      pc.close()
      void client.removeChannel(channel)
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
      setLocalStream(null)
      setRemoteStream(null)
      setCameraState('idle')
      setRemoteJoined(false)
      setConnectionState('idle')
    }
  }, [active, caseId, role])

  return { localStream, remoteStream, cameraState, remoteJoined, connectionState }
}

/** Local mute/camera-off toggles — just flips `.enabled` on the existing tracks. */
export function useMediaToggle(stream: MediaStream | null) {
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)

  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => {
      t.enabled = cameraOn
    })
  }, [stream, cameraOn])

  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => {
      t.enabled = micOn
    })
  }, [stream, micOn])

  return { cameraOn, setCameraOn, micOn, setMicOn }
}
