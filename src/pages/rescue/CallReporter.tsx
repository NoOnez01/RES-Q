import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Phone, PhoneOff } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { VideoCallPanel } from '@/components/VideoCallPanel'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { useStore } from '@/lib/store'
import { useWebRTCCall, useMediaToggle } from '@/lib/useWebRTCCall'
import { formatDuration } from '@/lib/utils'
import { toast } from '@/lib/toast'

/**
 * Rescue calling the reporter directly -- a separate call relationship from
 * either side's calls to 1669 (see EmergencyCase.rescueCallStatus). Rescue
 * is always the caller here, the reporter the callee, using its own webrtc
 * room key (`${id}-rescue-citizen`) so it can't collide with a citizen/
 * rescue-to-1669 call already using the plain case id as its room.
 *
 * Rescue is staff, so unlike the reporter's own call screens, hanging up
 * here is never restricted.
 */
export default function RescueCallReporter() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const c = useStore((s) => (id ? s.cases[id] : undefined))
  const setRescueCallStatus = useStore((s) => s.setRescueCallStatus)
  const tickRescueCallDuration = useStore((s) => s.tickRescueCallDuration)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasShownEndedRef = useRef(false)
  const hasProceededRef = useRef(false)
  const proceedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const callIsLive = c?.rescueCallStatus === 'connecting' || c?.rescueCallStatus === 'in-call'
  const { localStream, remoteStream, cameraState, remoteJoined, connectionState, switchCamera } = useWebRTCCall(
    id ? `${id}-rescue-citizen` : null,
    'caller',
    !!callIsLive,
  )
  const { cameraOn, setCameraOn, micOn, setMicOn } = useMediaToggle(localStream)

  useEffect(() => {
    if (c?.rescueCallStatus === 'in-call' && !intervalRef.current && id) {
      const caseId = id
      intervalRef.current = setInterval(() => tickRescueCallDuration(caseId), 1000)
    }
    if (c?.rescueCallStatus !== 'in-call' && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [c?.rescueCallStatus, id, tickRescueCallDuration])

  useEffect(() => {
    if (c?.rescueCallStatus !== 'ended' || hasShownEndedRef.current) return
    hasShownEndedRef.current = true
    toast({ title: 'การโทรสิ้นสุดแล้ว', tone: 'info' })
  }, [c?.rescueCallStatus])

  useEffect(() => {
    if (c?.rescueCallStatus !== 'ended' || hasProceededRef.current) return
    hasProceededRef.current = true
    proceedTimerRef.current = setTimeout(() => navigate(`/rescue/case/${id}`), 1200)
    return () => {
      if (proceedTimerRef.current) clearTimeout(proceedTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.rescueCallStatus])

  if (!id || !c) {
    return (
      <AppShell variant="flow" title="โทรหาผู้แจ้งเหตุ" showBack>
        <div className="py-16 text-center text-sm text-muted">ไม่พบข้อมูลเคส</div>
      </AppShell>
    )
  }

  function handleCall() {
    hasShownEndedRef.current = false
    hasProceededRef.current = false
    if (proceedTimerRef.current) {
      clearTimeout(proceedTimerRef.current)
      proceedTimerRef.current = null
    }
    setRescueCallStatus(id!, 'connecting')
  }

  function handleHangUp() {
    setRescueCallStatus(id!, 'ended')
  }

  const isCallActive = c.rescueCallStatus === 'connecting' || c.rescueCallStatus === 'in-call'

  return (
    <AppShell variant="flow" title="โทรหาผู้แจ้งเหตุ" showBack onBack={() => navigate(`/rescue/case/${id}`)}>
      <div className="relative">
        <AnimatedBackground variant="call" />
        <div className="relative z-10 flex flex-col gap-5 pb-8">
          <Card className="flex flex-col items-center gap-2 text-center">
            <div className="relative flex size-20 items-center justify-center">
              {isCallActive && (
                <span className="bg-fx absolute inset-0 rounded-full bg-primary/15 animate-ping-slow" aria-hidden="true" />
              )}
              <div
                className={clsx(
                  'relative flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary transition-shadow duration-300',
                  isCallActive && 'shadow-card-lg',
                )}
              >
                <Phone className="size-9" />
              </div>
            </div>
            <p className="text-sm font-semibold text-navy">{c.reporterName ?? 'ผู้แจ้งเหตุ'}</p>
            <p className="text-xs text-muted">เคส {c.caseNumber}</p>
            {c.rescueCallStatus === 'connecting' && (
              <p className="text-xs font-medium text-warning animate-pulse">กำลังโทร... รอผู้แจ้งเหตุรับสาย</p>
            )}
            {c.rescueCallStatus === 'in-call' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                <PulseRing tone="success" size="sm" />
                {formatDuration(c.rescueCallDurationSec ?? 0)}
              </span>
            )}
          </Card>

          {callIsLive && (
            <>
              <VideoCallPanel
                localStream={localStream}
                remoteStream={remoteStream}
                cameraState={cameraState}
                connectionState={connectionState}
                remoteLabel={c.reporterName ?? 'ผู้แจ้งเหตุ'}
                remoteWaitingLabel={remoteJoined ? 'กำลังเชื่อมต่อวิดีโอ...' : 'รอผู้แจ้งเหตุรับสาย'}
                cameraOn={cameraOn}
                onToggleCamera={() => setCameraOn((v) => !v)}
                micOn={micOn}
                onToggleMic={() => setMicOn((v) => !v)}
                onSwitchCamera={switchCamera}
              />
              <Button variant="danger" size="lg" fullWidth icon={<PhoneOff className="size-5" />} onClick={handleHangUp}>
                วางสาย
              </Button>
            </>
          )}

          {!isCallActive && (
            <Button variant="primary" size="lg" fullWidth icon={<Phone className="size-5" />} onClick={handleCall}>
              โทรหาผู้แจ้งเหตุ
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  )
}
