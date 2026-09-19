import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PhoneOff, MapPin, User } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { VideoCallPanel } from '@/components/VideoCallPanel'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { useStore } from '@/lib/store'
import { useWebRTCCall, useMediaToggle } from '@/lib/useWebRTCCall'
import { formatDuration } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  การโทรสิ้นสุดแล้ว: 'The call has ended',
  สายเรียกเข้า: 'Incoming calls',
  ไม่พบข้อมูลเคส: 'Case not found',
  กำลังสนทนา: 'In conversation',
  'เคส {caseNumber}': 'Case {caseNumber}',
  ตำแหน่ง: 'Location',
  ยังไม่ระบุตำแหน่ง: 'No location set yet',
  หน่วยกู้ชีพ: 'Rescue team',
  ผู้แจ้งเหตุ: 'Reporter',
  'กำลังเชื่อมต่อวิดีโอ...': 'Connecting video...',
  รอหน่วยกู้ชีพเปิดกล้อง: "Waiting for the rescue team to turn on their camera",
  รอผู้แจ้งเหตุเปิดกล้อง: "Waiting for the reporter to turn on their camera",
  วางสาย: 'Hang up',
  ยังอยู่ระหว่างการสนทนา: 'Still in an active call',
  ต้องการวางสายและออกจากหน้านี้หรือไม่: 'Hang up and leave this screen?',
  วางสายและออก: 'Hang up and leave',
  คุยต่อ: 'Keep talking',
})

export default function DispatchCallScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const emergencyCase = useStore((s) => (id ? s.cases[id] : undefined))
  const setCallStatus = useStore((s) => s.setCallStatus)
  const hasNavigatedAway = useRef(false)
  const t = useT()

  const isActive = emergencyCase?.callStatus === 'in-call'
  const { localStream, remoteStream, cameraState, remoteJoined, connectionState, switchCamera } = useWebRTCCall(
    id ?? null,
    'callee',
    isActive,
  )
  const { cameraOn, setCameraOn, micOn, setMicOn } = useMediaToggle(localStream)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  // This screen has no back button (showBack={false} below) so a stray tap
  // can't hang up -- but the browser/Android back gesture still can, and
  // silently dropping a live emergency call was the actual bug report: an
  // accidental back-navigation ended the call with no warning, and the pc
  // torn down by unmounting left nothing to "retry" back into (see the
  // hasOffered/restartIce fix in useWebRTCCall.ts for that second half).
  // Traps ONE back-press per mount: push a dummy history entry now, and
  // treat popstate while still on a live call as "confirm before leaving"
  // rather than letting it through.
  useEffect(() => {
    if (!isActive) return
    window.history.pushState(null, '', window.location.href)
    function onPopState() {
      setShowLeaveConfirm(true)
      window.history.pushState(null, '', window.location.href)
    }
    window.addEventListener('popstate', onPopState)
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [isActive])

  function handleConfirmLeave() {
    setShowLeaveConfirm(false)
    // Same path as the "วางสาย" button -- just flip callStatus and let the
    // existing "call ended" effect above show the toast and navigate away,
    // rather than duplicating that here.
    if (id) setCallStatus(id, 'ended')
  }

  // The call ending is driven purely by the synced callStatus field, so this
  // fires the same way whether WE hung up or the citizen on the other end
  // did — one side ending the call ends it for both.
  useEffect(() => {
    if (emergencyCase?.callStatus !== 'ended' || hasNavigatedAway.current) return
    hasNavigatedAway.current = true
    toast({ title: t('การโทรสิ้นสุดแล้ว'), tone: 'info' })
    const timer = setTimeout(() => navigate('/dispatch/incoming-call'), 1200)
    return () => clearTimeout(timer)
  }, [emergencyCase?.callStatus, navigate])

  if (!id || !emergencyCase) {
    return (
      <AppShell variant="flow" title={t('สายเรียกเข้า')} showBack>
        <div className="py-16 text-center text-sm text-muted">{t('ไม่พบข้อมูลเคส')}</div>
      </AppShell>
    )
  }

  function handleHangUp() {
    if (!id) return
    setCallStatus(id, 'ended')
  }

  return (
    <AppShell variant="flow" title={t('กำลังสนทนา')} showBack={false}>
      <div className="relative">
        <AnimatedBackground variant="call" />

        <div className="relative z-10 flex flex-col gap-5 pb-8">
          <Card className="flex flex-col gap-2.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-semibold text-ink">
                <User className="size-4 text-primary" />
                {t('เคส {caseNumber}', { caseNumber: emergencyCase.caseNumber })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                <PulseRing tone="success" size="sm" />
                {formatDuration(emergencyCase.callDurationSec)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-1.5 text-muted">
                <MapPin className="size-4" /> {t('ตำแหน่ง')}
              </span>
              <span className="max-w-[65%] text-right font-medium text-ink">
                {emergencyCase.location?.address ?? t('ยังไม่ระบุตำแหน่ง')}
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
                ? (emergencyCase.assignedRescueTeam?.name ?? t('หน่วยกู้ชีพ'))
                : (emergencyCase.reporterName ?? t('ผู้แจ้งเหตุ'))
            }
            remoteWaitingLabel={
              remoteJoined
                ? t('กำลังเชื่อมต่อวิดีโอ...')
                : emergencyCase.activeCallerRole === 'rescue'
                  ? t('รอหน่วยกู้ชีพเปิดกล้อง')
                  : t('รอผู้แจ้งเหตุเปิดกล้อง')
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
            {t('วางสาย')}
          </Button>
        </div>
      </div>

      <ConfirmationModal
        open={showLeaveConfirm}
        title={t('ยังอยู่ระหว่างการสนทนา')}
        message={t('ต้องการวางสายและออกจากหน้านี้หรือไม่')}
        confirmLabel={t('วางสายและออก')}
        cancelLabel={t('คุยต่อ')}
        tone="danger"
        onConfirm={handleConfirmLeave}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </AppShell>
  )
}
