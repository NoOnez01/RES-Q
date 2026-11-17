import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { PulseRing } from '@/components/ui/PulseRing'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { CallScreen } from '@/components/call/CallScreen'
import { useStore } from '@/lib/store'
import { useLiveKitCall } from '@/lib/useLiveKitCall'
import { useAnsweredOnJoin, useKeepRinging } from '@/lib/calls'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  เจ้าหน้าที่วางสายแล้ว: 'The responder ended the call',
  การโทรสิ้นสุดแล้ว: 'The call has ended',
  'ติดต่อศูนย์สั่งการ 1669': 'Contact Dispatch Center 1669',
  ไม่พบข้อมูลเหตุ: 'Case not found',
  กรุณาโทรแจ้งเหตุเพื่อให้เจ้าหน้าที่ประสานความช่วยเหลือ: 'Please call to report the incident so a responder can coordinate help',
  'สายด่วนการแพทย์ฉุกเฉิน 1669': 'Emergency medical hotline 1669',
  'กำลังโทรออก รอเจ้าหน้าที่รับสาย': 'Calling... waiting for a responder to answer',
  'สายจะรอจนกว่าเจ้าหน้าที่ 1669 จะรับสาย หรือคุณกดยกเลิก': 'The call keeps ringing until a 1669 responder answers, or you cancel',
  'เจ้าหน้าที่รับสายแล้ว กำลังสนทนา': 'The responder has answered, call in progress',
  หมายเลขเหตุ: 'Case number',
  ตำแหน่ง: 'Location',
  ยังไม่ระบุตำแหน่ง: 'No location set yet',
  รูปภาพแนบ: 'Attached photos',
  'แนบรูปภาพแล้ว {n} รูป': '{n} photo(s) attached',
  ไม่มีรูปภาพแนบ: 'No photos attached',
  ยกเลิกการโทร: 'Cancel call',
  'สิ้นสุดการโทร ดำเนินการต่อ': 'End call and continue',
  'โทร 1669': 'Call 1669',
  'ยืนยันการโทร 1669': 'Confirm calling 1669',
  โทรออก: 'Call now',
  ยกเลิก: 'Cancel',
})


export default function Call1669() {
  const navigate = useNavigate()
  const activeCaseId = useStore((s) => s.activeCaseId)
  const cases = useStore((s) => s.cases)
  const setCallStatus = useStore((s) => s.setCallStatus)
  const tickCallDuration = useStore((s) => s.tickCallDuration)
  const answerCall = useStore((s) => s.answerCall)
  const finishCall = useStore((s) => s.finishCall)
  const submitReport = useStore((s) => s.submitReport)
  const t = useT()

  const activeCase = activeCaseId ? cases[activeCaseId] : null

  const [confirmOpen, setConfirmOpen] = useState(false)
  const selfHungUpRef = useRef(false)
  const hasShownEndedRef = useRef(false)
  const hasProceededRef = useRef(false)
  const proceedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connecting = activeCase?.callStatus === 'connecting'
  const callIsLive = activeCase?.callStatus === 'connecting' || activeCase?.callStatus === 'in-call'
  const call = useLiveKitCall(activeCaseId, 'dispatch', 'public', callIsLive)

  // The call only actually connects once a dispatcher presses "รับสาย" on
  // their end (answerCall) — that flips callStatus to 'in-call' and syncs
  // here, which is what starts the duration timer, not a local timeout.
  // Started and stopped by this effect alone -- a ref-guarded interval stays
  // "running" after a cleanup cleared it, so a remount froze the timer.
  useEffect(() => {
    if (activeCase?.callStatus !== 'in-call' || !activeCaseId) return
    const id = activeCaseId
    const timer = setInterval(() => tickCallDuration(id), 1000)
    return () => clearInterval(timer)
  }, [activeCase?.callStatus, activeCaseId, tickCallDuration])

  // An emergency call to 1669 never gives up on its own: it rings until a
  // responder answers or the citizen cancels, kept ringing on dispatch's
  // side for as long as this screen is waiting.
  useKeepRinging(activeCaseId, connecting)
  useAnsweredOnJoin(activeCaseId, connecting, call.remotes.some((p) => p.role === 'dispatch'), answerCall)

  // The call ending is driven purely by the synced callStatus field, so this
  // fires whether the citizen hung up themselves or the dispatcher did on
  // their end — one side ending the call ends it for both.
  useEffect(() => {
    if (activeCase?.callStatus !== 'ended' || hasShownEndedRef.current) return
    hasShownEndedRef.current = true
    if (!selfHungUpRef.current) {
      toast({ title: t('เจ้าหน้าที่วางสายแล้ว'), message: t('การโทรสิ้นสุดแล้ว'), tone: 'info' })
    }
    // `t` intentionally omitted -- see Navigation.tsx's GPS-watch effect for
    // why (a new closure every render from useT()); this toast only ever
    // fires once per call anyway (guarded by hasShownEndedRef above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (proceedTimerRef.current) {
      clearTimeout(proceedTimerRef.current)
      proceedTimerRef.current = null
    }
  }

  function handleConfirmCall() {
    if (!activeCaseId) return
    selfHungUpRef.current = false
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
    // Callback number + family contacts come next, then the timeline.
    navigate(`/public/contact-info/${activeCaseId}`)
  }

  if (!activeCase) {
    return (
      <AppShell variant="flow" title={t('ติดต่อศูนย์สั่งการ 1669')} showBack>
        <div className="py-16 text-center text-sm text-muted">{t('ไม่พบข้อมูลเหตุ')}</div>
      </AppShell>
    )
  }

  const canProceed = activeCase.callStatus === 'in-call' || activeCase.callStatus === 'ended'
  const photoCount = activeCase.photos.length
  const isCallActive = activeCase.callStatus === 'connecting' || activeCase.callStatus === 'in-call'

  return (
    <AppShell variant="flow" title={t('ติดต่อศูนย์สั่งการ 1669')} showBack>
      <div className="relative">

        <div className="flex flex-col gap-5 pb-28">
          <div>
            <p className="text-body text-ink/80">{t('กรุณาโทรแจ้งเหตุเพื่อให้เจ้าหน้าที่ประสานความช่วยเหลือ')}</p>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="flex flex-col items-center px-5 py-7 text-center">
              <p className="text-small text-muted">{t('สายด่วนการแพทย์ฉุกเฉิน 1669')}</p>
              <p className="mt-1 flex items-center gap-3 text-[2.75rem] font-bold leading-none tabular-nums tracking-tight text-emergency">
                <Phone className="size-8" strokeWidth={2.25} aria-hidden="true" />
                1669
              </p>
              {activeCase.callStatus === 'connecting' && (
                <div className="mt-4 flex flex-col items-center gap-1" role="status">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    <PulseRing tone="emergency" size="sm" />
                    {t('กำลังโทรออก รอเจ้าหน้าที่รับสาย')}
                  </p>
                  <p className="text-meta text-muted">{t('สายจะรอจนกว่าเจ้าหน้าที่ 1669 จะรับสาย หรือคุณกดยกเลิก')}</p>
                </div>
              )}
              {activeCase.callStatus === 'in-call' && (
                <p className="mt-4 flex items-center gap-2 text-sm font-medium text-success-ink" role="status">
                  <PulseRing tone="success" size="sm" />
                  {t('เจ้าหน้าที่รับสายแล้ว กำลังสนทนา')}
                </p>
              )}
            </div>
            <dl className="divide-y divide-border border-t border-border text-sm">
              <div className="flex items-start justify-between gap-4 px-5 py-3">
                <dt className="shrink-0 text-muted">{t('หมายเลขเหตุ')}</dt>
                <dd className="font-mono font-medium text-ink">{activeCase.caseNumber}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-3">
                <dt className="shrink-0 text-muted">{t('ตำแหน่ง')}</dt>
                <dd className="text-right font-medium text-ink">{activeCase.location?.address ?? t('ยังไม่ระบุตำแหน่ง')}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-3">
                <dt className="shrink-0 text-muted">{t('รูปภาพแนบ')}</dt>
                <dd className="text-right font-medium text-ink">
                  {photoCount > 0 ? t('แนบรูปภาพแล้ว {n} รูป', { n: photoCount }) : t('ไม่มีรูปภาพแนบ')}
                </dd>
              </div>
            </dl>
          </Card>

        </div>
      </div>

      <CallScreen
        call={call}
        emergencyCase={activeCase}
        open={callIsLive}
        ringing={connecting}
        peer="dispatch"
        durationSec={activeCase.callDurationSec}
        onEnd={handleHangUp}
        endLabel={connecting ? t('ยกเลิกการโทร') : t('วางสาย')}
        note={connecting ? t('สายจะรอจนกว่าเจ้าหน้าที่ 1669 จะรับสาย หรือคุณกดยกเลิก') : undefined}
      />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mt-2 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {canProceed ? (
            <Button variant="primary" size="lg" fullWidth onClick={handleProceed}>
              {t('สิ้นสุดการโทร ดำเนินการต่อ')}
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
              {t('โทร 1669')}
            </Button>
          )}
        </div>
      </div>

      <ConfirmationModal
        open={confirmOpen}
        title={t('ยืนยันการโทร 1669')}
        confirmLabel={t('โทรออก')}
        cancelLabel={t('ยกเลิก')}
        onConfirm={handleConfirmCall}
        onCancel={() => setConfirmOpen(false)}
      />
    </AppShell>
  )
}
