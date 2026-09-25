import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PhoneOff, Users } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { VideoCallPanel } from '@/components/VideoCallPanel'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { useStore } from '@/lib/store'
import { useLiveKitCall } from '@/lib/useLiveKitCall'
import { formatDuration } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'สายสนทนากับศูนย์ 1669': 'Call with Center 1669',
  'เคส {caseNumber}': 'Case {caseNumber}',
  'สนทนาร่วมกับศูนย์ 1669 และผู้แจ้งเหตุ': 'On the call with Center 1669 and the reporter',
  'รอเจ้าหน้าที่ 1669': 'Waiting for 1669',
  ออกจากสาย: 'Leave call',
  การโทรสิ้นสุดแล้ว: 'The call has ended',
  ไม่มีสายที่เชิญเข้าร่วม: 'No call to join',
  'สายนี้สิ้นสุดแล้ว หรือศูนย์ 1669 ยกเลิกการเชิญ': 'This call has ended, or Center 1669 cancelled the invite',
  กลับไปที่เคส: 'Back to case',
})

/**
 * Where a rescue crew lands after accepting 1669's invite to an
 * in-progress citizen call (see CallRingtoneBridge) -- joins the case's
 * 1669 LiveKit room alongside the citizen and dispatcher. Leaving only
 * drops the crew out; the citizen/dispatcher call carries on, and 1669 can
 * invite them back in.
 */
export default function RescueJoinCall() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const c = useStore((s) => (id ? s.cases[id] : undefined))
  const acceptRescueCallInvite = useStore((s) => s.acceptRescueCallInvite)
  const clearRescueCallInvite = useStore((s) => s.clearRescueCallInvite)
  const t = useT()
  const wasActiveRef = useRef(false)
  const leftRef = useRef(false)

  const inviteStatus = c?.rescueCallInvite?.status
  const active = c?.callStatus === 'in-call' && !!inviteStatus
  const call = useLiveKitCall(id ?? null, 'dispatch', active)

  // Normally already accepted from the incoming-call alert; this covers
  // opening the screen straight from a link while it's still ringing.
  useEffect(() => {
    if (id && inviteStatus === 'ringing') acceptRescueCallInvite(id)
  }, [id, inviteStatus, acceptRescueCallInvite])

  // 1669 hung up (or cancelled the invite) while the crew was on the call.
  useEffect(() => {
    if (active) {
      wasActiveRef.current = true
      return
    }
    if (!wasActiveRef.current || leftRef.current) return
    leftRef.current = true
    toast({ title: t('การโทรสิ้นสุดแล้ว'), tone: 'info' })
    const timer = setTimeout(() => navigate(`/rescue/case/${id}`), 1200)
    return () => clearTimeout(timer)
    // `t` intentionally omitted -- see Navigation.tsx's GPS-watch effect for
    // why (a new closure every render from useT()).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, id, navigate])

  function handleLeave() {
    leftRef.current = true
    if (id) clearRescueCallInvite(id)
    navigate(`/rescue/case/${id}`)
  }

  if (!id || !c || !active) {
    return (
      <AppShell variant="flow" title={t('สายสนทนากับศูนย์ 1669')} showBack onBack={() => navigate(id ? `/rescue/case/${id}` : '/rescue/dashboard')}>
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-semibold text-ink">{t('ไม่มีสายที่เชิญเข้าร่วม')}</p>
          <p className="text-sm text-muted">{t('สายนี้สิ้นสุดแล้ว หรือศูนย์ 1669 ยกเลิกการเชิญ')}</p>
          <Button variant="outline" size="sm" onClick={() => navigate(id ? `/rescue/case/${id}` : '/rescue/dashboard')}>
            {t('กลับไปที่เคส')}
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell variant="flow" title={t('สายสนทนากับศูนย์ 1669')} showBack onBack={handleLeave}>
      <div className="relative">
        <AnimatedBackground variant="call" />
        <div className="relative z-10 flex flex-col gap-5 pb-8">
          <Card className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <Users className="size-4 text-primary" />
              {t('เคส {caseNumber}', { caseNumber: c.caseNumber })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
              <PulseRing tone="success" size="sm" />
              {formatDuration(c.callDurationSec)}
            </span>
            <p className="w-full text-xs text-muted">{t('สนทนาร่วมกับศูนย์ 1669 และผู้แจ้งเหตุ')}</p>
          </Card>

          <VideoCallPanel call={call} emergencyCase={c} waitingLabel={t('รอเจ้าหน้าที่ 1669')} />

          <Button variant="danger" size="lg" fullWidth icon={<PhoneOff className="size-5" />} onClick={handleLeave}>
            {t('ออกจากสาย')}
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
