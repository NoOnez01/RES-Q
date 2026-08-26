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

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    // Pre-create sendrecv transceivers up front, before either side's camera
    // is even ready, instead of relying on addTrack (called later, once
    // getUserMedia resolves) to add them. addTrack only shapes the SDP if it
    // runs *before* the offer/answer for this m-line is created -- and since
    // getUserMedia is async (camera warm-up, permission prompts), whichever
    // side's media happened to resolve after their offer/answer went out
    // would get negotiated as recvonly forever, with no renegotiation to fix
    // it. Declaring sendrecv immediately means both directions are always
    // negotiated regardless of that race; replaceTrack() below just swaps
    // the real track into the already-negotiated transceiver.
    const videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' })
    const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' })

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
      else if (state === 'connected' || state === 'completed') setConnectionState('connected')
      else if (state === 'failed') setConnectionState('failed')
      else if (state === 'disconnected') setConnectionState('disconnected')
    }

    async function sendOffer() {
      if (hasOffered) return
      hasOffered = true
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
        for (const c of pendingCandidates.splice(0)) await pc.addIceCandidate(c)
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
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        localStreamRef.current = stream
        setLocalStream(stream)
        setCameraState('ready')
        const videoTrack = stream.getVideoTracks()[0]
        const audioTrack = stream.getAudioTracks()[0]
        if (videoTrack) void videoTransceiver.sender.replaceTrack(videoTrack)
        if (audioTrack) void audioTransceiver.sender.replaceTrack(audioTrack)
      })
      .catch((err: DOMException) => {
        if (cancelled) return
        setCameraState(err.name === 'NotFoundError' ? 'unavailable' : 'denied')
      })

    return () => {
      cancelled = true
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
