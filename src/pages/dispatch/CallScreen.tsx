import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, User } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { CallScreen } from '@/components/call/CallScreen'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { useStore } from '@/lib/store'
import { useLiveKitCall } from '@/lib/useLiveKitCall'
import { formatDuration } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  การโทรสิ้นสุดแล้ว: 'The call has ended',
  สายเรียกเข้า: 'Incoming calls',
  ไม่พบข้อมูลเหตุ: 'Case not found',
  กำลังสนทนา: 'In conversation',
  'เหตุหมายเลข {caseNumber}': 'Case {caseNumber}',
  ตำแหน่ง: 'Location',
  ยังไม่ระบุตำแหน่ง: 'No location set yet',
  หน่วยกู้ชีพ: 'Rescue team',
  ผู้แจ้งเหตุ: 'Reporter',
  วางสาย: 'Hang up',
  ยังอยู่ระหว่างการสนทนา: 'Still in an active call',
  ต้องการวางสายและออกจากหน้านี้หรือไม่: 'Hang up and leave this screen?',
  วางสายและออก: 'Hang up and leave',
  สนทนาต่อ: 'Continue the call',
  เชิญหน่วยกู้ชีพเข้าร่วมสาย: 'Invite the rescue team into this call',
  'กำลังเรียก {team}...': 'Calling {team}...',
  '{team} กำลังเข้าร่วมสาย...': '{team} is joining the call...',
  ยกเลิก: 'Cancel',
})

export default function DispatchCallScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const emergencyCase = useStore((s) => (id ? s.cases[id] : undefined))
  const setCallStatus = useStore((s) => s.setCallStatus)
  const inviteRescueToCall = useStore((s) => s.inviteRescueToCall)
  const clearRescueCallInvite = useStore((s) => s.clearRescueCallInvite)
  const hasNavigatedAway = useRef(false)
  const t = useT()

  const isActive = emergencyCase?.callStatus === 'in-call'
  const call = useLiveKitCall(id ?? null, 'dispatch', 'dispatch', isActive)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  // This screen has no back button (showBack={false} below) so a stray tap
  // can't hang up -- but the browser/Android back gesture still can, and
  // silently dropping a live emergency call was the actual bug report: an
  // accidental back-navigation ended the call with no warning.
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
  // did — one side ending the call ends it for both. Straight on to the
  // case itself: what was just heard gets assessed next.
  useEffect(() => {
    if (emergencyCase?.callStatus !== 'ended' || hasNavigatedAway.current) return
    hasNavigatedAway.current = true
    toast({ title: t('การโทรสิ้นสุดแล้ว'), tone: 'info' })
    const timer = setTimeout(() => navigate(`/dispatch/case/${id}`, { replace: true }), 1200)
    return () => clearTimeout(timer)
    // `t` intentionally omitted -- see Navigation.tsx's GPS-watch effect for
    // why (a new closure every render from useT()); this toast only ever
    // fires once per call anyway (guarded by hasNavigatedAway above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emergencyCase?.callStatus, navigate, id])

  if (!id || !emergencyCase) {
    return (
      <AppShell variant="flow" title={t('สายเรียกเข้า')} showBack>
        <div className="py-16 text-center text-sm text-muted">{t('ไม่พบข้อมูลเหตุ')}</div>
      </AppShell>
    )
  }

  function handleHangUp() {
    if (!id) return
    setCallStatus(id, 'ended')
  }

  // Only a citizen's call can be made three-way -- when rescue itself is
  // the one calling in, they're already on the line. Keyed off who's
  // actually in the room rather than the invite's own status, so a crew
  // that dropped out without pressing "leave" can simply be invited again.
  const team = emergencyCase.assignedRescueTeam
  const rescueInCall = call.remotes.some((p) => p.role === 'rescue')
  const canPullInRescue = isActive && !!team && emergencyCase.activeCallerRole !== 'rescue' && !rescueInCall
  const invite = emergencyCase.rescueCallInvite

  return (
    <AppShell variant="flow" title={t('กำลังสนทนา')} showBack={false}>
      <div className="relative">
        <AnimatedBackground variant="call" />

        <div className="relative z-10 flex flex-col gap-5 pb-8">
          <Card className="flex flex-col gap-2.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-semibold text-ink">
                <User className="size-4 text-primary" />
                {t('เหตุหมายเลข {caseNumber}', { caseNumber: emergencyCase.caseNumber })}
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

        </div>
      </div>

      <CallScreen
        call={call}
        emergencyCase={emergencyCase}
        open={isActive}
        peer={emergencyCase.activeCallerRole === 'rescue' ? 'rescue' : 'public'}
        durationSec={emergencyCase.callDurationSec}
        onEnd={handleHangUp}
        endLabel={t('วางสาย')}
        action={canPullInRescue && !invite ? { label: t('เชิญหน่วยกู้ชีพเข้าร่วมสาย'), onClick: () => inviteRescueToCall(id) } : undefined}
        banner={
          canPullInRescue && team && invite
            ? {
                text:
                  invite.status === 'ringing'
                    ? t('กำลังเรียก {team}...', { team: team.name })
                    : t('{team} กำลังเข้าร่วมสาย...', { team: team.name }),
                actionLabel: t('ยกเลิก'),
                onAction: () => clearRescueCallInvite(id),
              }
            : undefined
        }
      />

      <ConfirmationModal
        open={showLeaveConfirm}
        title={t('ยังอยู่ระหว่างการสนทนา')}
        message={t('ต้องการวางสายและออกจากหน้านี้หรือไม่')}
        confirmLabel={t('วางสายและออก')}
        cancelLabel={t('สนทนาต่อ')}
        tone="danger"
        onConfirm={handleConfirmLeave}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </AppShell>
  )
}
