import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, MapPin, Camera, PhoneOff } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { VideoCallPanel } from '@/components/VideoCallPanel'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { useStore } from '@/lib/store'
import { useWebRTCCall, useMediaToggle } from '@/lib/useWebRTCCall'
import { toast } from '@/lib/toast'

// How long the citizen waits with no dispatcher answering before the call
// is treated as unanswered. Without this, a busy dispatch center left the
// citizen ringing forever with a "cancel" button as the only way out -- and
// because the report itself only reaches dispatch's queue once the call
// *ends* (see handleProceed's submitReport below), an emergency report
// could sit stuck indefinitely behind a call nobody ever picked up.
const RING_TIMEOUT_MS = 45000

export default function Call1669() {
  const navigate = useNavigate()
  const activeCaseId = useStore((s) => s.activeCaseId)
  const cases = useStore((s) => s.cases)
  const setCallStatus = useStore((s) => s.setCallStatus)
  const tickCallDuration = useStore((s) => s.tickCallDuration)
  const finishCall = useStore((s) => s.finishCall)
  const submitReport = useStore((s) => s.submitReport)

  const activeCase = activeCaseId ? cases[activeCaseId] : null

  const [confirmOpen, setConfirmOpen] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const selfHungUpRef = useRef(false)
  const noAnswerRef = useRef(false)
  const hasShownEndedRef = useRef(false)
  const hasProceededRef = useRef(false)
  const proceedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connecting = activeCase?.callStatus === 'connecting'
  const callIsLive = activeCase?.callStatus === 'connecting' || activeCase?.callStatus === 'in-call'
  const { localStream, remoteStream, cameraState, remoteJoined, connectionState, switchCamera } = useWebRTCCall(
    activeCaseId,
    'caller',
    callIsLive,
  )
  const { cameraOn, setCameraOn, micOn, setMicOn } = useMediaToggle(localStream)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // The call only actually connects once a dispatcher presses "รับสาย" on
  // their end (answerCall) — that flips callStatus to 'in-call' and syncs
  // here, which is what starts the duration timer, not a local timeout.
  useEffect(() => {
    if (activeCase?.callStatus === 'in-call' && !intervalRef.current && activeCaseId) {
      const id = activeCaseId
      intervalRef.current = setInterval(() => {
        tickCallDuration(id)
      }, 1000)
    }
    if (activeCase?.callStatus !== 'in-call' && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [activeCase?.callStatus, activeCaseId, tickCallDuration])

  // If nobody at dispatch answers within RING_TIMEOUT_MS, stop ringing on
  // our own rather than leaving the citizen staring at "รอเจ้าหน้าที่รับสาย"
  // indefinitely. Ending the call here (same as a manual hang-up) still lets
  // the existing "call ended -> proceed" effect below submit the report, so
  // an unanswered call never leaves the emergency report itself stuck.
  useEffect(() => {
    if (activeCase?.callStatus !== 'connecting' || !activeCaseId) return
    const id = activeCaseId
    ringTimeoutRef.current = setTimeout(() => {
      noAnswerRef.current = true
      setCallStatus(id, 'ended')
    }, RING_TIMEOUT_MS)
    return () => {
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current)
        ringTimeoutRef.current = null
      }
    }
  }, [activeCase?.callStatus, activeCaseId, setCallStatus])

  // The call ending is driven purely by the synced callStatus field, so this
  // fires whether the citizen hung up themselves, the dispatcher did on
  // their end, or nobody ever answered (see the ring-timeout effect above)
  // — one side ending the call ends it for both.
  useEffect(() => {
    if (activeCase?.callStatus !== 'ended' || hasShownEndedRef.current) return
    hasShownEndedRef.current = true
    if (noAnswerRef.current) {
      toast({
        title: 'ยังไม่มีเจ้าหน้าที่รับสาย',
        message: 'ระบบบันทึกเรื่องแจ้งเหตุของคุณเข้าคิวของศูนย์สั่งการแล้ว เจ้าหน้าที่จะติดต่อกลับโดยเร็วที่สุด',
        tone: 'warning',
      })
    } else if (!selfHungUpRef.current) {
      toast({ title: 'เจ้าหน้าที่วางสายแล้ว', message: 'การโทรสิ้นสุดแล้ว', tone: 'info' })
    }
  }, [activeCase?.callStatus])

  // Once the call ends -- from either side -- move on automatically instead
  // of waiting for a manual tap, so a citizen who just hung up isn't left
  // stuck on the call screen.
  useEffect(() => {
    if (activeCase?.callStatus !== 'ended' || hasProceededRef.current) return
    hasProceededRef.current = true
    proceedTimerRef.current = setTimeout(() => {
      handleProceed()
    }, 1200)
    return () => {
      if (proceedTimerRef.current) clearTimeout(proceedTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase?.callStatus])

  function clearTimers() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (proceedTimerRef.current) {
      clearTimeout(proceedTimerRef.current)
      proceedTimerRef.current = null
    }
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current)
      ringTimeoutRef.current = null
    }
  }

  function handleConfirmCall() {
    if (!activeCaseId) return
    selfHungUpRef.current = false
    noAnswerRef.current = false
    hasShownEndedRef.current = false
    hasProceededRef.current = false
    setConfirmOpen(false)
    setCallStatus(activeCaseId, 'connecting')
  }

  function handleHangUp() {
    if (!activeCaseId) return
    selfHungUpRef.current = true
    clearTimers()
    setCallStatus(activeCaseId, 'ended')
  }

  function handleProceed() {
    if (!activeCaseId) return
    clearTimers()
    finishCall(activeCaseId)
    submitReport(activeCaseId)
    navigate(`/public/case/${activeCaseId}`)
  }

  if (!activeCase) {
    return (
      <AppShell variant="flow" title="ติดต่อศูนย์ 1669" showBack>
        <div className="py-16 text-center text-sm text-muted">ไม่พบข้อมูลเคส</div>
      </AppShell>
    )
  }

  const canProceed = activeCase.callStatus === 'in-call' || activeCase.callStatus === 'ended'
  const photoCount = activeCase.photos.length
  const isCallActive = activeCase.callStatus === 'connecting' || activeCase.callStatus === 'in-call'

  return (
    <AppShell variant="flow" title="ติดต่อศูนย์ 1669" showBack>
      <div className="relative">
        <AnimatedBackground variant="call" />

        <div className="relative z-10 flex flex-col gap-5 pb-28">
          <div>
            <h1 className="text-xl font-bold text-navy">ติดต่อศูนย์ 1669</h1>
            <p className="mt-1.5 text-sm text-muted">กรุณาโทรแจ้งเหตุเพื่อให้เจ้าหน้าที่ประสานความช่วยเหลือ</p>
          </div>

          <Card className="flex flex-col items-center gap-2 text-center">
            <div className="relative flex size-20 items-center justify-center">
              {isCallActive && (
                <>
                  <span className="bg-fx absolute inset-0 rounded-full bg-emergency/20 animate-ping-slow" aria-hidden="true" />
                  <span
                    className="bg-fx absolute inset-0 rounded-full bg-emergency/15 animate-ping-slow"
                    style={{ animationDelay: '0.5s' }}
                    aria-hidden="true"
                  />
                  <span
                    className="bg-fx absolute inset-0 rounded-full bg-emergency/10 animate-ping-slow"
                    style={{ animationDelay: '1s' }}
                    aria-hidden="true"
                  />
                </>
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
            <p className="text-sm font-semibold text-navy">สายด่วนการแพทย์ฉุกเฉิน 1669</p>
            {activeCase.callStatus === 'connecting' && (
              <>
                <p className="text-xs font-medium text-warning animate-pulse">กำลังโทร... รอเจ้าหน้าที่รับสาย</p>
                <p className="text-xs text-muted">
                  หากไม่มีผู้รับสายภายใน {RING_TIMEOUT_MS / 1000} วินาที ระบบจะบันทึกเรื่องแจ้งเหตุของคุณให้อัตโนมัติ
                </p>
              </>
            )}
            {activeCase.callStatus === 'in-call' && (
              <p className="text-xs font-medium text-success">เจ้าหน้าที่รับสายแล้ว กำลังสนทนา</p>
            )}
          </Card>

          <Card className="flex flex-col gap-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">หมายเลขเคส</span>
              <span className="font-semibold text-navy">{activeCase.caseNumber}</span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-1.5 text-muted">
                <MapPin className="size-4" /> ตำแหน่ง
              </span>
              <span className="max-w-[65%] text-right font-medium text-navy">
                {activeCase.location?.address ?? 'ยังไม่ระบุตำแหน่ง'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-muted">
                <Camera className="size-4" /> รูปภาพแนบ
              </span>
              <span className="font-medium text-navy">
                {photoCount > 0 ? `แนบรูปภาพแล้ว ${photoCount} รูป` : 'ไม่มีรูปภาพแนบ'}
              </span>
            </div>
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
                onSwitchCamera={switchCamera}
              />
              {activeCase.callStatus === 'connecting' ? (
                <Button variant="outline" size="lg" fullWidth icon={<PhoneOff className="size-5" />} onClick={handleHangUp}>
                  ยกเลิกการโทร
                </Button>
              ) : (
                // Once connected, only 1669 ends the call -- staff controls
                // when the conversation is actually finished, not a citizen
                // who may still be distressed mid-call.
                <p className="text-center text-xs text-muted">เจ้าหน้าที่จะเป็นผู้วางสายเมื่อสิ้นสุดการสนทนา</p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mt-2 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {canProceed ? (
            <Button variant="primary" size="lg" fullWidth onClick={handleProceed}>
              โทรเสร็จแล้ว ไปต่อ
            </Button>
          ) : (
            <Button
              variant="danger"
              size="lg"
              fullWidth
              icon={<Phone className="size-5" />}
              loading={connecting}
              disabled={activeCase.callStatus === 'connecting'}
              onClick={() => setConfirmOpen(true)}
            >
              โทร 1669
            </Button>
          )}
        </div>
      </div>

      <ConfirmationModal
        open={confirmOpen}
        title="ยืนยันการโทร 1669"
        confirmLabel="ยืนยันโทร 1669"
        cancelLabel="ยกเลิก"
        onConfirm={handleConfirmCall}
        onCancel={() => setConfirmOpen(false)}
      />
    </AppShell>
  )
}
