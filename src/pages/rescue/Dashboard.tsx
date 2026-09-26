import { lazy, Suspense, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClipboardList, ClipboardPlus, Loader2, CheckCircle2, Navigation, Check, X } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatBar, StatItem } from '@/components/DashboardCard'
import { CaseQueue, QueueSection, byUrgency, isToday, reachedAt } from '@/components/CaseQueue'
import { ChartCardSkeleton } from '@/components/ChartCardSkeleton'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'
import type { CaseStatus, EmergencyCase } from '@/lib/types'

registerTranslations({
  ภาพรวมหน่วยกู้ชีพ: 'Rescue overview',
  เหตุใหม่: 'New cases',
  กำลังดำเนินการ: 'In progress',
  เสร็จสิ้นวันนี้: 'Completed today',
  พบเหตุด้วยตนเอง: 'Found incident myself',
  เหตุใหม่ที่ได้รับมอบหมาย: 'Newly assigned cases',
  ภารกิจที่กำลังดำเนินการ: 'Current missions',
  เสร็จสิ้นล่าสุด: 'Recently completed',
  'ไม่มีเหตุใหม่ เหตุที่ได้รับมอบหมายให้หน่วยของคุณจะแสดงที่นี่': 'No new cases. Cases assigned to your team will appear here.',
  ไม่มีภารกิจที่กำลังดำเนินการ: 'No missions in progress',
  ยังไม่มีเหตุที่ดำเนินการเสร็จสิ้น: 'No completed cases yet',
  รับเหตุ: 'Accept case',
  ปฏิเสธเหตุ: 'Reject case',
  นำทาง: 'Navigate',
  สัดส่วนระดับความรุนแรงของเหตุที่รับผิดชอบ: "Severity distribution of your team's cases",
  รับเหตุแล้ว: 'Case accepted',
  'เริ่มเดินทางไปยังเหตุหมายเลข {caseNumber}': 'Now heading to case {caseNumber}',
  ปฏิเสธเหตุแล้ว: 'Case declined',
  'ระบบกำลังค้นหาหน่วยกู้ชีพใหม่สำหรับเหตุหมายเลข {caseNumber}': 'Now finding a new rescue team for case {caseNumber}',
})

const SeverityDistributionChart = lazy(() => import('@/components/SeverityDistributionChart'))

const IN_PROGRESS_STATUSES: CaseStatus[] = [
  'rescue-en-route',
  'rescue-arrived',
  'assisted',
  'transporting',
  'hospital-arrived',
]
// The legs driven with the navigation screen open.
const DRIVING: CaseStatus[] = ['rescue-en-route', 'transporting']

const DONE_STATUSES: CaseStatus[] = ['hospital-received', 'completed']

const finishedAt = (c: EmergencyCase) => reachedAt(c, 'hospital-received') ?? reachedAt(c, 'completed') ?? c.updatedAt

export default function RescueDashboard() {
  const navigate = useNavigate()
  const cases = useStore((s) => s.cases)
  const currentUser = useStore((s) => s.currentUser)
  const viewingRole = useStore((s) => s.viewingRole)
  const rescueAcceptCase = useStore((s) => s.rescueAcceptCase)
  const rescueRejectCase = useStore((s) => s.rescueRejectCase)
  const t = useT()

  // A real rescue account is already scoped to its own team by RLS -- this
  // filter is a no-op for them. It matters for an admin whose own base role
  // is 'rescue': is_admin bypasses RLS entirely, so `cases` would otherwise
  // contain every team's cases even when just browsing as themselves (not
  // explicitly using the "view as -- all teams" switcher from Settings).
  const viewingAllTeams = currentUser?.isAdmin && viewingRole === 'rescue'
  const allCases = useMemo(() => {
    let list = Object.values(cases)
    if (!viewingAllTeams) {
      list = list.filter(
        (c) => c.assignedRescueTeam?.id === currentUser?.rescueTeamId || c.supportingRescueTeam?.id === currentUser?.rescueTeamId,
      )
    }
    return list
  }, [cases, viewingAllTeams, currentUser?.rescueTeamId])

  const newCases = allCases.filter((c) => c.status === 'rescue-assigned').sort(byUrgency)
  const inProgressCases = allCases.filter((c) => IN_PROGRESS_STATUSES.includes(c.status)).sort(byUrgency)
  const doneCases = allCases.filter((c) => DONE_STATUSES.includes(c.status)).sort((a, b) => finishedAt(b) - finishedAt(a))
  const doneToday = doneCases.filter((c) => isToday(finishedAt(c))).length

  function handleAccept(c: EmergencyCase) {
    rescueAcceptCase(c.id)
    toast({ title: t('รับเหตุแล้ว'), message: t('เริ่มเดินทางไปยังเหตุหมายเลข {caseNumber}', { caseNumber: c.caseNumber }), tone: 'success' })
  }

  function handleReject(c: EmergencyCase) {
    rescueRejectCase(c.id)
    toast({ title: t('ปฏิเสธเหตุแล้ว'), message: t('ระบบกำลังค้นหาหน่วยกู้ชีพใหม่สำหรับเหตุหมายเลข {caseNumber}', { caseNumber: c.caseNumber }), tone: 'info' })
  }

  return (
    <AppShell variant="dashboard" title={t('ภาพรวมหน่วยกู้ชีพ')}>
      <StatBar>
        <StatItem label={t('เหตุใหม่')} value={newCases.length} icon={<ClipboardList />} tone="warning" alert={newCases.length > 0} />
        <StatItem label={t('กำลังดำเนินการ')} value={inProgressCases.length} icon={<Loader2 />} tone="primary" />
        <StatItem label={t('เสร็จสิ้นวันนี้')} value={doneToday} icon={<CheckCircle2 />} tone="success" />
      </StatBar>

      <QueueSection
        title={t('เหตุใหม่ที่ได้รับมอบหมาย')}
        count={newCases.length}
        urgent
        aside={
          <Link to="/rescue/new-case">
            <Button variant="outline" size="sm" icon={<ClipboardPlus className="size-4" />}>
              {t('พบเหตุด้วยตนเอง')}
            </Button>
          </Link>
        }
      >
        <CaseQueue
          rows={newCases.map((c) => ({
            case: c,
            to: `/rescue/case/${c.id}`,
            action: (
              <>
                <Button variant="outline" size="sm" icon={<X className="size-4" />} onClick={() => handleReject(c)}>
                  {t('ปฏิเสธเหตุ')}
                </Button>
                <Button variant="success" size="sm" icon={<Check className="size-4" />} onClick={() => handleAccept(c)}>
                  {t('รับเหตุ')}
                </Button>
              </>
            ),
          }))}
          empty={t('ไม่มีเหตุใหม่ เหตุที่ได้รับมอบหมายให้หน่วยของคุณจะแสดงที่นี่')}
          actionWidth="14.5rem"
        />
      </QueueSection>

      <QueueSection title={t('ภารกิจที่กำลังดำเนินการ')} count={inProgressCases.length}>
        <CaseQueue
          rows={inProgressCases.map((c) => ({
            case: c,
            to: `/rescue/case/${c.id}`,
            action: DRIVING.includes(c.status) ? (
              <Button size="sm" icon={<Navigation className="size-4" />} onClick={() => navigate(`/navigation/${c.id}`)}>
                {t('นำทาง')}
              </Button>
            ) : undefined,
          }))}
          empty={t('ไม่มีภารกิจที่กำลังดำเนินการ')}
          actionWidth="14.5rem"
        />
      </QueueSection>

      <QueueSection title={t('เสร็จสิ้นล่าสุด')} count={Math.min(doneCases.length, 5)}>
        <CaseQueue
          rows={doneCases.slice(0, 5).map((c) => ({ case: c, to: `/rescue/case/${c.id}` }))}
          empty={t('ยังไม่มีเหตุที่ดำเนินการเสร็จสิ้น')}
          timeOf={finishedAt}
          actionWidth="14.5rem"
        />
      </QueueSection>

      <div className="mt-10">
        <Suspense fallback={<ChartCardSkeleton />}>
          <SeverityDistributionChart title={t('สัดส่วนระดับความรุนแรงของเหตุที่รับผิดชอบ')} cases={allCases} />
        </Suspense>
      </div>
    </AppShell>
  )
}
