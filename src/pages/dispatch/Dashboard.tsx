import { lazy, Suspense, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Search, Ambulance, CheckCircle2, ClipboardList, ClipboardPlus, ArrowRight } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatBar, StatItem } from '@/components/DashboardCard'
import { CaseQueue, QueueSection, byUrgency, isToday, reachedAt } from '@/components/CaseQueue'
import { RoadClosuresCard } from '@/components/RoadClosuresCard'
import { ChartCardSkeleton } from '@/components/ChartCardSkeleton'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'
import type { EmergencyCase } from '@/lib/types'

registerTranslations({
  ภาพรวมศูนย์สั่งการ: 'Dispatch overview',
  เหตุใหม่รอดำเนินการ: 'New cases pending',
  กำลังค้นหาหน่วยกู้ชีพ: 'Finding a rescue team',
  หน่วยกู้ชีพกำลังปฏิบัติงาน: 'Rescue teams active',
  เสร็จสิ้นวันนี้: 'Completed today',
  บันทึกเหตุใหม่: 'Log new case',
  ต้องดำเนินการ: 'Needs action',
  กำลังปฏิบัติงาน: 'In progress',
  ไม่มีเหตุที่รอดำเนินการ: 'No cases waiting on dispatch',
  ไม่มีหน่วยกู้ชีพที่กำลังปฏิบัติงาน: 'No rescue teams out on a case',
  ยังไม่มีเหตุที่เสร็จสิ้นวันนี้: 'No cases completed today',
  ดูประวัติเหตุทั้งหมด: 'See full case history',
  สถิติการปฏิบัติงาน: 'Performance',
  ประเมินเหตุ: 'Assess case',
  ค้นหาหน่วยกู้ชีพ: 'Search for a rescue team',
  เริ่มค้นหาหน่วยกู้ชีพแล้ว: 'Started finding a rescue team',
  'เหตุหมายเลข {caseNumber} อยู่ระหว่างค้นหาหน่วยกู้ชีพที่พร้อมปฏิบัติงาน': 'Case {caseNumber} is now searching for an available rescue team',
  สัดส่วนระดับความรุนแรงของเหตุ: 'Case severity distribution',
})

const SeverityDistributionChart = lazy(() => import('@/components/SeverityDistributionChart'))
const ResponseTimeSummary = lazy(() => import('@/components/ResponseTimeSummary'))

// Reports still being put together by the citizen show here too, so a
// dispatcher sees them coming before the call does.
const NEEDS_DISPATCH = new Set<EmergencyCase['status']>(['contacted', 'photos-taken', 'received', 'finding-rescue'])
const DONE = new Set<EmergencyCase['status']>(['completed'])

const completedAt = (c: EmergencyCase) => reachedAt(c, 'completed') ?? c.updatedAt

export default function DispatchDashboard() {
  const navigate = useNavigate()
  const cases = useStore((s) => s.cases)
  const startFindingRescue = useStore((s) => s.startFindingRescue)
  const t = useT()

  // Calls that are ringing/connected, or have ended but haven't had incident
  // details filled in yet, live exclusively on the Incoming Call page.
  const allCases = useMemo(
    () =>
      Object.values(cases).filter(
        (c) => c.status !== 'called-1669' && c.callStatus !== 'connecting' && c.callStatus !== 'in-call',
      ),
    [cases],
  )

  const { needsAction, active, doneToday } = useMemo(() => {
    const needsAction = allCases.filter((c) => NEEDS_DISPATCH.has(c.status)).sort(byUrgency)
    const active = allCases.filter((c) => !NEEDS_DISPATCH.has(c.status) && !DONE.has(c.status)).sort(byUrgency)
    const doneToday = allCases
      .filter((c) => DONE.has(c.status) && isToday(completedAt(c)))
      .sort((a, b) => completedAt(b) - completedAt(a))
    return { needsAction, active, doneToday }
  }, [allCases])

  const newCount = needsAction.filter((c) => c.status === 'received').length
  const findingCount = needsAction.filter((c) => c.status === 'finding-rescue').length

  function handleStartFinding(c: EmergencyCase) {
    startFindingRescue(c.id)
    toast({
      title: t('เริ่มค้นหาหน่วยกู้ชีพแล้ว'),
      message: t('เหตุหมายเลข {caseNumber} อยู่ระหว่างค้นหาหน่วยกู้ชีพที่พร้อมปฏิบัติงาน', { caseNumber: c.caseNumber }),
      tone: 'info',
    })
  }

  // The one step dispatch owes each case waiting on it.
  function actionFor(c: EmergencyCase) {
    if (c.status !== 'received') return undefined
    return c.assessment ? (
      <Button size="sm" icon={<Search className="size-4" />} onClick={() => handleStartFinding(c)}>
        {t('ค้นหาหน่วยกู้ชีพ')}
      </Button>
    ) : (
      <Button
        size="sm"
        icon={<ClipboardList className="size-4" />}
        onClick={() => navigate(`/dispatch/emergency-details/${c.id}`)}
      >
        {t('ประเมินเหตุ')}
      </Button>
    )
  }

  const row = (c: EmergencyCase) => ({ case: c, to: `/dispatch/case/${c.id}`, action: actionFor(c) })

  return (
    <AppShell variant="dashboard" title={t('ภาพรวมศูนย์สั่งการ')}>
      <StatBar>
        <StatItem
          label={t('เหตุใหม่รอดำเนินการ')}
          value={newCount}
          icon={<AlertTriangle />}
          tone="emergency"
          alert={newCount > 0}
        />
        <StatItem label={t('กำลังค้นหาหน่วยกู้ชีพ')} value={findingCount} icon={<Search />} tone="warning" />
        <StatItem label={t('หน่วยกู้ชีพกำลังปฏิบัติงาน')} value={active.length} icon={<Ambulance />} tone="primary" />
        <StatItem label={t('เสร็จสิ้นวันนี้')} value={doneToday.length} icon={<CheckCircle2 />} tone="success" />
      </StatBar>

      <RoadClosuresCard className="mt-6" />

      <QueueSection
        title={t('ต้องดำเนินการ')}
        count={needsAction.length}
        urgent
        aside={
          <Link to="/dispatch/new-case">
            <Button size="sm" icon={<ClipboardPlus className="size-4" />}>
              {t('บันทึกเหตุใหม่')}
            </Button>
          </Link>
        }
      >
        <CaseQueue rows={needsAction.map(row)} empty={t('ไม่มีเหตุที่รอดำเนินการ')} actionWidth="11.5rem" />
      </QueueSection>

      <QueueSection title={t('กำลังปฏิบัติงาน')} count={active.length}>
        <CaseQueue rows={active.map(row)} empty={t('ไม่มีหน่วยกู้ชีพที่กำลังปฏิบัติงาน')} actionWidth="11.5rem" />
      </QueueSection>

      <QueueSection
        title={t('เสร็จสิ้นวันนี้')}
        count={doneToday.length}
        aside={
          <Link
            to="/case-history"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-bright"
          >
            {t('ดูประวัติเหตุทั้งหมด')}
            <ArrowRight className="size-4" />
          </Link>
        }
      >
        <CaseQueue rows={doneToday.map(row)} empty={t('ยังไม่มีเหตุที่เสร็จสิ้นวันนี้')} timeOf={completedAt} actionWidth="11.5rem" />
      </QueueSection>

      <section className="mt-10">
        <h2 className="mb-3 text-base font-bold text-ink">{t('สถิติการปฏิบัติงาน')}</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Suspense fallback={<ChartCardSkeleton />}>
            <ResponseTimeSummary cases={allCases} />
          </Suspense>
          <Suspense fallback={<ChartCardSkeleton />}>
            <SeverityDistributionChart title={t('สัดส่วนระดับความรุนแรงของเหตุ')} cases={allCases} />
          </Suspense>
        </div>
      </section>
    </AppShell>
  )
}
