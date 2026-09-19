import { useEffect, useRef, useState } from 'react'
import { Video, VideoOff, Mic, MicOff, UserRound, AlertTriangle, SwitchCamera } from 'lucide-react'
import clsx from 'clsx'
import type { CameraState, ConnectionState } from '@/lib/useWebRTCCall'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'กำลังขอเข้าถึงกล้อง...': 'Requesting camera access...',
  'ไม่ได้รับอนุญาตให้ใช้กล้อง/ไมโครโฟน': 'Camera/microphone access was not granted',
  ไม่พบกล้องหรือไมโครโฟนบนอุปกรณ์นี้: 'No camera or microphone found on this device',
  เชื่อมต่อวิดีโอไม่สำเร็จ: 'Video connection failed',
  'เครือข่ายของทั้งสองฝ่ายอาจเชื่อมต่อโดยตรงไม่ได้ ลองสลับมาใช้ Wi-Fi หรือโทรผ่านเสียงแทน':
    'The networks on both ends may not be able to connect directly. Try switching to Wi-Fi, or use a voice call instead',
  'สลับกล้องหน้า/หลัง': 'Switch front/back camera',
  ไมโครโฟนเปิด: 'Mic on',
  ปิดไมโครโฟน: 'Mic off',
  กล้องเปิด: 'Camera on',
  ปิดกล้อง: 'Camera off',
})

function VideoTag({
  stream,
  muted,
  onPlaying,
}: {
  stream: MediaStream | null
  muted: boolean
  onPlaying?: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [stream])
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      onPlaying={onPlaying}
      className={clsx('h-full w-full object-cover', !stream && 'hidden')}
    />
  )
}

function cameraStateLabel(t: (text: string) => string, state: CameraState): string {
  switch (state) {
    case 'requesting':
      return t('กำลังขอเข้าถึงกล้อง...')
    case 'denied':
      return t('ไม่ได้รับอนุญาตให้ใช้กล้อง/ไมโครโฟน')
    case 'unavailable':
      return t('ไม่พบกล้องหรือไมโครโฟนบนอุปกรณ์นี้')
    default:
      return ''
  }
}

export function VideoCallPanel({
  localStream,
  remoteStream,
  cameraState,
  connectionState,
  remoteLabel,
  remoteWaitingLabel,
  cameraOn,
  onToggleCamera,
  micOn,
  onToggleMic,
  onSwitchCamera,
}: {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  cameraState: CameraState
  connectionState: ConnectionState
  remoteLabel: string
  remoteWaitingLabel: string
  cameraOn: boolean
  onToggleCamera: () => void
  micOn: boolean
  onToggleMic: () => void
  /** Omitted entirely on a device with no camera to switch to (desktop). */
  onSwitchCamera?: () => void
}) {
  const t = useT()
  const errorLabel = cameraStateLabel(t, cameraState)
  const connectionFailed = connectionState === 'failed' || connectionState === 'disconnected'
  // ontrack (and so remoteStream) fires as soon as the SDP negotiates a
  // receiver -- well before ICE has actually finished connecting, so relying
  // on remoteStream alone made a real NAT/TURN failure look like a plain
  // black video square instead of surfacing the "connection failed"
  // messaging it's supposed to. But iceConnectionState is computed
  // independently on each peer and is a known WebRTC quirk to settle to
  // 'connected' on one side well before (or without ever cleanly reaching)
  // 'connected' on the other, even once media is genuinely flowing both
  // ways -- gating on it alone caused exactly that: one side's video panel
  // staying on the waiting placeholder forever while the other side saw
  // them fine. remoteVideoPlaying (the <video> element's own onPlaying
  // event, set below) is the authoritative "frames are actually arriving"
  // signal, independent of which way this peer's ICE state happens to lag.
  const [remoteVideoPlaying, setRemoteVideoPlaying] = useState(false)
  useEffect(() => {
    setRemoteVideoPlaying(false)
  }, [remoteStream])
  const videoReady = !!remoteStream && (connectionState === 'connected' || remoteVideoPlaying)

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-navy shadow-card">
        <VideoTag stream={remoteStream} muted={false} onPlaying={() => setRemoteVideoPlaying(true)} />
        {!videoReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
            {connectionFailed ? (
              <>
                <AlertTriangle className="size-10 text-warning" />
                <p className="text-sm font-medium text-warning">{t('เชื่อมต่อวิดีโอไม่สำเร็จ')}</p>
                <p className="max-w-[220px] text-center text-xs text-white/60">
                  {t('เครือข่ายของทั้งสองฝ่ายอาจเชื่อมต่อโดยตรงไม่ได้ ลองสลับมาใช้ Wi-Fi หรือโทรผ่านเสียงแทน')}
                </p>
              </>
            ) : (
              <>
                <UserRound className="size-10" />
                <p className="text-sm font-medium">{remoteWaitingLabel}</p>
              </>
            )}
          </div>
        )}
        <span className="absolute bottom-2 left-3 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-white">
          {remoteLabel}
        </span>

        <div className="absolute top-2 right-2 aspect-video w-28 overflow-hidden rounded-xl border-2 border-white/80 bg-navy shadow-card sm:w-36">
          <VideoTag stream={cameraOn ? localStream : null} muted />
          {(!localStream || !cameraOn) && (
            <div className="absolute inset-0 flex items-center justify-center text-white/60">
              <VideoOff className="size-5" />
            </div>
          )}
          {onSwitchCamera && cameraOn && localStream && (
            <button
              type="button"
              onClick={onSwitchCamera}
              aria-label={t('สลับกล้องหน้า/หลัง')}
              className="absolute bottom-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <SwitchCamera className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {errorLabel && <p className="text-center text-xs font-medium text-warning">{errorLabel}</p>}

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onToggleMic}
          aria-pressed={micOn}
          className={clsx(
            'flex flex-col items-center gap-1.5 rounded-2xl px-5 py-3 text-xs font-semibold transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30',
            micOn ? 'bg-skyblue-light text-primary' : 'scale-105 bg-navy text-white shadow-card-lg',
          )}
        >
          {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          {micOn ? t('ไมโครโฟนเปิด') : t('ปิดไมโครโฟน')}
        </button>
        <button
          onClick={onToggleCamera}
          aria-pressed={cameraOn}
          className={clsx(
            'flex flex-col items-center gap-1.5 rounded-2xl px-5 py-3 text-xs font-semibold transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30',
            cameraOn ? 'bg-skyblue-light text-primary' : 'scale-105 bg-navy text-white shadow-card-lg',
          )}
        >
          {cameraOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          {cameraOn ? t('กล้องเปิด') : t('ปิดกล้อง')}
        </button>
      </div>
    </div>
  )
}
