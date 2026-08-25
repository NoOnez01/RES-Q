import { useEffect, useRef, useState } from 'react'
import { supabase, supabaseEnabled } from './supabase'

type SignalPayload =
  | { type: 'join'; role: 'caller' | 'callee' }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit }
  | { type: 'hangup' }

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

export type CameraState = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable'

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

  const localStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!active || !caseId || !supabaseEnabled || !supabase) return
    const client = supabase
    let cancelled = false
    let hasOffered = false
    const pendingCandidates: RTCIceCandidateInit[] = []

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

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
        stream.getTracks().forEach((track) => pc.addTrack(track, stream))
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
    }
  }, [active, caseId, role])

  return { localStream, remoteStream, cameraState, remoteJoined }
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
