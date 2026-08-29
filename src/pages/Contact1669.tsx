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
 * Generic "contact 1669" call screen for reaching dispatch about a case
 * that's already in progress -- used by both a rescue crew and the original
 * reporter, any time (not just during initial intake). Deliberately
 * separate from public/Call1669.tsx, which drives the one-time
 * report-finishing flow (finishCall/submitReport advance the case's status
 * on hang-up) -- reusing that page here would silently regress an
 * already-advanced case back to `called-1669` every time someone re-called.
 * This page only ever starts/ends a call; it never touches case status.
 */
export default function Contact1669() {
  const { caseId } = useParams<{ caseId: string }>()
  const navigate = useNavigate()
  const currentUser = useStore((s) => s.currentUser)
  const c = useStore((s) => (caseId ? s.cases[caseId] : undefined))
  const setCallStatus = useStore((s) => s.setCallStatus)
  const tickCallDuration = useStore((s) => s.tickCallDuration)

  const isRescue = currentUser?.role === 'rescue'
  const backTo = caseId ? (isRescue ? `/rescue/case/${caseId}` : `/public/case/${caseId}`) : '/'

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasShownEndedRef = useRef(false)

  const callIsLive = c?.callStatus === 'connecting' || c?.callStatus === 'in-call'
  const { localStream, remoteStream, cameraState, remoteJoined, connectionState } = useWebRTCCall(
    caseId ?? null,
    'caller',
    !!callIsLive,
  )
  const { cameraOn, setCameraOn, micOn, setMicOn } = useMediaToggle(localStream)

  useEffect(() => {
    if (c?.callStatus === 'in-call' && !intervalRef.current && caseId) {
      const id = caseId
      intervalRef.current = setInterval(() => tickCallDuration(id), 1000)
    }
    if (c?.callStatus !== 'in-call' && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [c?.callStatus, caseId, tickCallDuration])

  useEffect(() => {
    if (c?.callStatus !== 'ended' || hasShownEndedRef.current) return
    hasShownEndedRef.current = true
    toast({ title: 'การโทรสิ้นสุดแล้ว', tone: 'info' })
  }, [c?.callStatus])

  if (!caseId || !c) {
    return (
      <AppShell variant="flow" title="ติดต่อศูนย์ 1669" showBack>
        <div className="py-16 text-center text-sm text-muted">ไม่พบข้อมูลเคส</div>
      </AppShell>
    )
  }

  function handleCall() {
    hasShownEndedRef.current = false
    setCallStatus(caseId!, 'connecting', isRescue ? 'rescue' : 'public')
  }

  function handleHangUp() {
    setCallStatus(caseId!, 'ended')
  }

  const isCallActive = c.callStatus === 'connecting' || c.callStatus === 'in-call'

  return (
    <AppShell variant="flow" title="ติดต่อศูนย์ 1669" showBack onBack={() => navigate(backTo)}>
      <div className="relative">
        <AnimatedBackground variant="call" />
        <div className="relative z-10 flex flex-col gap-5 pb-8">
          <Card className="flex flex-col items-center gap-2 text-center">
            <div className="relative flex size-20 items-center justify-center">
              {isCallActive && (
                <span className="bg-fx absolute inset-0 rounded-full bg-emergency/15 animate-ping-slow" aria-hidden="true" />
              )}
              <div
                className={clsx(
                  'relative flex size-20 items-center justify-center rounded-full bg-emergency/10 text-emergency transition-shadow duration-300',
                  isCallActive && 'animate-pulse-glow shadow-red-glow',
                )}
              >
                <Phone className="size-9" />
              </div>
            </div>
            <p className="text-2xl font-extrabold tracking-wide text-emergency">1669</p>
            <p className="text-sm font-semibold text-navy">เคส {c.caseNumber}</p>
            {c.callStatus === 'connecting' && (
              <p className="text-xs font-medium text-warning animate-pulse">กำลังโทร... รอเจ้าหน้าที่รับสาย</p>
            )}
            {c.callStatus === 'in-call' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                <PulseRing tone="success" size="sm" />
                {formatDuration(c.callDurationSec)}
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
                remoteLabel="เจ้าหน้าที่ 1669"
                remoteWaitingLabel={remoteJoined ? 'กำลังเชื่อมต่อวิดีโอ...' : 'รอเจ้าหน้าที่รับสาย'}
                cameraOn={cameraOn}
                onToggleCamera={() => setCameraOn((v) => !v)}
                micOn={micOn}
                onToggleMic={() => setMicOn((v) => !v)}
              />
              <Button variant="danger" size="lg" fullWidth icon={<PhoneOff className="size-5" />} onClick={handleHangUp}>
                วางสาย
              </Button>
            </>
          )}

          {!isCallActive && (
            <Button variant="danger" size="lg" fullWidth icon={<Phone className="size-5" />} onClick={handleCall}>
              โทร 1669
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  )
}
