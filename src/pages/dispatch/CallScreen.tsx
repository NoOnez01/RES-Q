import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PhoneOff, MapPin, User } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { VideoCallPanel } from '@/components/VideoCallPanel'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { useStore } from '@/lib/store'
import { useWebRTCCall, useMediaToggle } from '@/lib/useWebRTCCall'
import { formatDuration } from '@/lib/utils'
import { toast } from '@/lib/toast'

export default function DispatchCallScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const emergencyCase = useStore((s) => (id ? s.cases[id] : undefined))
  const setCallStatus = useStore((s) => s.setCallStatus)
  const hasNavigatedAway = useRef(false)

  const isActive = emergencyCase?.callStatus === 'in-call'
  const { localStream, remoteStream, cameraState, remoteJoined, connectionState, switchCamera } = useWebRTCCall(
    id ?? null,
    'callee',
    isActive,
  )
  const { cameraOn, setCameraOn, micOn, setMicOn } = useMediaToggle(localStream)

  // The call ending is driven purely by the synced callStatus field, so this
  // fires the same way whether WE hung up or the citizen on the other end
  // did — one side ending the call ends it for both.
  useEffect(() => {
    if (emergencyCase?.callStatus !== 'ended' || hasNavigatedAway.current) return
    hasNavigatedAway.current = true
    toast({ title: 'การโทรสิ้นสุดแล้ว', tone: 'info' })
    const timer = setTimeout(() => navigate('/dispatch/incoming-call'), 1200)
    return () => clearTimeout(timer)
  }, [emergencyCase?.callStatus, navigate])

  if (!id || !emergencyCase) {
    return (
      <AppShell variant="flow" title="สายเรียกเข้า" showBack>
        <div className="py-16 text-center text-sm text-muted">ไม่พบข้อมูลเคส</div>
      </AppShell>
    )
  }

  function handleHangUp() {
    if (!id) return
    setCallStatus(id, 'ended')
  }

  return (
    <AppShell variant="flow" title="กำลังสนทนา" showBack={false}>
      <div className="relative">
        <AnimatedBackground variant="call" />

        <div className="relative z-10 flex flex-col gap-5 pb-8">
          <Card className="flex flex-col gap-2.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-semibold text-navy">
                <User className="size-4 text-primary" />
                เคส {emergencyCase.caseNumber}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                <PulseRing tone="success" size="sm" />
                {formatDuration(emergencyCase.callDurationSec)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-1.5 text-muted">
                <MapPin className="size-4" /> ตำแหน่ง
              </span>
              <span className="max-w-[65%] text-right font-medium text-navy">
                {emergencyCase.location?.address ?? 'ยังไม่ระบุตำแหน่ง'}
              </span>
            </div>
          </Card>

          <VideoCallPanel
            localStream={localStream}
            remoteStream={remoteStream}
            cameraState={cameraState}
            connectionState={connectionState}
            remoteLabel={
              emergencyCase.activeCallerRole === 'rescue'
                ? (emergencyCase.assignedRescueTeam?.name ?? 'หน่วยกู้ชีพ')
                : (emergencyCase.reporterName ?? 'ผู้แจ้งเหตุ')
            }
            remoteWaitingLabel={
              remoteJoined
                ? 'กำลังเชื่อมต่อวิดีโอ...'
                : emergencyCase.activeCallerRole === 'rescue'
                  ? 'รอหน่วยกู้ชีพเปิดกล้อง'
                  : 'รอผู้แจ้งเหตุเปิดกล้อง'
            }
            cameraOn={cameraOn}
            onToggleCamera={() => setCameraOn((v) => !v)}
            micOn={micOn}
            onToggleMic={() => setMicOn((v) => !v)}
            onSwitchCamera={switchCamera}
          />

          <Button
            variant="danger"
            size="lg"
            fullWidth
            icon={<PhoneOff className="size-5" />}
            onClick={handleHangUp}
          >
            วางสาย
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
