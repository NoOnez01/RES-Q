import { useEffect, useRef } from 'react'
import { Video, VideoOff, Mic, MicOff, UserRound, AlertTriangle, SwitchCamera, Volume2 } from 'lucide-react'
import clsx from 'clsx'
import type { Track } from 'livekit-client'
import type { CallParticipant, CameraState, LiveKitCall } from '@/lib/useLiveKitCall'
import type { EmergencyCase } from '@/lib/types'
import { Button } from './ui/Button'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'กำลังขอเข้าถึงกล้อง...': 'Requesting camera access...',
  'ไม่ได้รับอนุญาตให้ใช้กล้อง/ไมโครโฟน': 'Camera/microphone access was not granted',
  ไม่พบกล้องหรือไมโครโฟนบนอุปกรณ์นี้: 'No camera or microphone found on this device',
  เชื่อมต่อสายไม่สำเร็จ: 'Could not connect the call',
  'ตรวจสอบสัญญาณอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง': 'Check your internet connection and try again',
  'สลับกล้องหน้า/หลัง': 'Switch front/back camera',
  ไมโครโฟนเปิด: 'Mic on',
  ปิดไมโครโฟน: 'Mic off',
  กล้องเปิด: 'Camera on',
  ปิดกล้อง: 'Camera off',
  แตะเพื่อเปิดเสียง: 'Tap to turn on sound',
  'เจ้าหน้าที่ 1669': 'Responder 1669',
  หน่วยกู้ชีพ: 'Rescue team',
  ผู้แจ้งเหตุ: 'Reporter',
})

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

function participantLabel(p: CallParticipant, c: EmergencyCase, t: (text: string) => string): string {
  if (p.role === 'dispatch') return t('เจ้าหน้าที่ 1669')
  if (p.role === 'rescue') return c.assignedRescueTeam?.name ?? t('หน่วยกู้ชีพ')
  return c.reporterName ?? t('ผู้แจ้งเหตุ')
}

function TrackVideo({ track }: { track: Track }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    track.attach(el)
    return () => {
      track.detach(el)
    }
  }, [track])
  return <video ref={ref} autoPlay playsInline muted className="h-full w-full object-cover" />
}

function TrackAudio({ track }: { track: Track }) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    track.attach(el)
    return () => {
      track.detach(el)
    }
  }, [track])
  return <audio ref={ref} autoPlay />
}

function ParticipantTile({ participant, label }: { participant: CallParticipant; label: string }) {
  return (
    <div
      className={clsx(
        'relative aspect-video w-full overflow-hidden rounded-2xl bg-navy shadow-card transition-shadow',
        participant.isSpeaking && 'ring-2 ring-success',
      )}
    >
      {participant.videoTrack ? (
        <TrackVideo track={participant.videoTrack} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
          <UserRound className="size-10" />
          <p className="text-sm font-medium">{label}</p>
        </div>
      )}
      <span className="absolute bottom-2 left-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-white">
        {!participant.micOn && <MicOff className="size-3" aria-hidden="true" />}
        {label}
      </span>
    </div>
  )
}

/**
 * Renders a LiveKit call: one tile per other participant (a citizen and
 * dispatcher 1:1, or three-way once a rescue crew is pulled in), your own
 * camera as a picture-in-picture, and the mic/camera controls.
 */
export function VideoCallPanel({
  call,
  emergencyCase,
  waitingLabel,
}: {
  call: LiveKitCall
  emergencyCase: EmergencyCase
  /** Shown until anyone else is in the call, e.g. "waiting for 1669 to answer". */
  waitingLabel: string
}) {
  const t = useT()
  const errorLabel = cameraStateLabel(t, call.cameraState)
  const connectionFailed = call.connectionState === 'failed' || call.connectionState === 'disconnected'

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        {connectionFailed ? (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl bg-navy p-6 text-center shadow-card">
            <AlertTriangle className="size-10 text-warning" />
            <p className="text-sm font-medium text-warning">{t('เชื่อมต่อสายไม่สำเร็จ')}</p>
            <p className="max-w-[240px] text-xs text-white/60">{t('ตรวจสอบสัญญาณอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง')}</p>
          </div>
        ) : call.remotes.length === 0 ? (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl bg-navy text-white/70 shadow-card">
            <UserRound className="size-10" />
            <p className="text-sm font-medium">{waitingLabel}</p>
          </div>
        ) : (
          <div className={clsx('grid gap-2', call.remotes.length > 1 && 'sm:grid-cols-2')}>
            {call.remotes.map((p) => (
              <ParticipantTile key={p.identity} participant={p} label={participantLabel(p, emergencyCase, t)} />
            ))}
          </div>
        )}

        <div
          className={clsx(
            'absolute right-2 top-2 aspect-video overflow-hidden rounded-xl border-2 border-white/80 bg-navy shadow-card',
            // Half-width tiles in a three-way call -- a full-size preview
            // would cover most of whichever tile it sits on.
            call.remotes.length > 1 ? 'w-20 sm:w-24' : 'w-28 sm:w-36',
          )}
        >
          {call.localVideoTrack ? (
            <>
              <TrackVideo track={call.localVideoTrack} />
              <button
                type="button"
                onClick={call.switchCamera}
                aria-label={t('สลับกล้องหน้า/หลัง')}
                className="absolute bottom-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <SwitchCamera className="size-3.5" />
              </button>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/60">
              <VideoOff className="size-5" />
            </div>
          )}
        </div>
      </div>

      {errorLabel && <p className="text-center text-xs font-medium text-warning">{errorLabel}</p>}

      {call.audioBlocked && (
        <Button variant="secondary" size="sm" icon={<Volume2 className="size-4" />} onClick={call.startAudio} className="self-center">
          {t('แตะเพื่อเปิดเสียง')}
        </Button>
      )}

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={call.toggleMic}
          aria-pressed={call.micOn}
          className={clsx(
            'flex flex-col items-center gap-1.5 rounded-2xl px-5 py-3 text-xs font-semibold transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30',
            call.micOn ? 'bg-skyblue-light text-primary' : 'scale-105 bg-navy text-white shadow-card-lg',
          )}
        >
          {call.micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          {call.micOn ? t('ไมโครโฟนเปิด') : t('ปิดไมโครโฟน')}
        </button>
        <button
          onClick={call.toggleCamera}
          aria-pressed={call.cameraOn}
          className={clsx(
            'flex flex-col items-center gap-1.5 rounded-2xl px-5 py-3 text-xs font-semibold transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30',
            call.cameraOn ? 'bg-skyblue-light text-primary' : 'scale-105 bg-navy text-white shadow-card-lg',
          )}
        >
          {call.cameraOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          {call.cameraOn ? t('กล้องเปิด') : t('ปิดกล้อง')}
        </button>
      </div>

      {call.remotes.map((p) => p.audioTrack && <TrackAudio key={p.identity} track={p.audioTrack} />)}
    </div>
  )
}
