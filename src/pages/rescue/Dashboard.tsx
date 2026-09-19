import { lazy, Suspense, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, ClipboardPlus, Loader2, CheckCircle2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { StatBar, StatItem } from '@/components/DashboardCard'
import { EmergencyCaseCard } from '@/components/EmergencyCaseCard'
import { EmptyState } from '@/components/States'
import { ChartCardSkeleton } from '@/components/ChartCardSkeleton'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'
import type { CaseStatus, EmergencyCase } from '@/lib/types'

registerTranslations({
  แดชบอร์ดหน่วยกู้ชีพ: 'Rescue dashboard',
  เคสใหม่: 'New cases',
  กำลังดำเนินการ: 'In progress',
  เสร็จสิ้นวันนี้: 'Completed today',
  พบเหตุด้วยตนเอง: 'Found incident myself',
  เคสใหม่ที่ได้รับมอบหมาย: 'Newly assigned cases',
  ยังไม่มีเคสใหม่: 'No new cases',
  'เมื่อมีการมอบหมายเคสให้หน่วยของคุณ จะแสดงที่นี่': 'Cases assigned to your team will appear here',
  รับเคส: 'Accept case',
  ปฏิเสธ: 'Reject',
  ไม่มีเคสที่กำลังดำเนินการ: 'No cases in progress',
  เคสที่คุณรับไว้และกำลังดำเนินการจะแสดงที่นี่: "Cases you've accepted and are working on will appear here",
  เสร็จสิ้นแล้ว: 'Completed',
  ยังไม่มีเคสที่เสร็จสิ้น: 'No completed cases yet',
  เคสที่นำส่งโรงพยาบาลสำเร็จแล้วจะแสดงที่นี่: 'Cases successfully transported to hospital will appear here',
  สัดส่วนระดับความรุนแรงของเคสที่รับผิดชอบ: "Severity distribution of your team's cases",
  รับเคสแล้ว: 'Case accepted',
  'เริ่มเดินทางไปยังเคส {caseNumber}': 'Now heading to case {caseNumber}',
  ปฏิเสธเคสแล้ว: 'Case rejected',
  'ระบบกำลังค้นหาหน่วยกู้ชีพใหม่สำหรับเคส {caseNumber}': 'Now finding a new rescue team for case {caseNumber}',
})

const SeverityDistributionChart = lazy(() => import('@/components/SeverityDistributionChart'))

const IN_PROGRESS_STATUSES: CaseStatus[] = [
  'rescue-en-route',
  'rescue-arrived',
  'assisted',
  'transporting',
  'hospital-arrived',
]

const DONE_STATUSES: CaseStatus[] = ['hospital-received', 'completed']

export default function RescueDashboard() {
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
    return list.sort((a, b) => b.createdAt - a.createdAt)
  }, [cases, viewingAllTeams, currentUser?.rescueTeamId])

  const newCases = allCases.filter((c) => c.status === 'rescue-assigned')
  const inProgressCases = allCases.filter((c) => IN_PROGRESS_STATUSES.includes(c.status))
  const doneCases = allCases.filter((c) => DONE_STATUSES.includes(c.status)).slice(0, 5)

  function handleAccept(c: EmergencyCase) {
    rescueAcceptCase(c.id)
    toast({ title: t('รับเคสแล้ว'), message: t('เริ่มเดินทางไปยังเคส {caseNumber}', { caseNumber: c.caseNumber }), tone: 'success' })
  }

  function handleReject(c: EmergencyCase) {
    rescueRejectCase(c.id)
    toast({ title: t('ปฏิเสธเคสแล้ว'), message: t('ระบบกำลังค้นหาหน่วยกู้ชีพใหม่สำหรับเคส {caseNumber}', { caseNumber: c.caseNumber }), tone: 'info' })
  }

  return (
    <AppShell variant="dashboard" title={t('แดชบอร์ดหน่วยกู้ชีพ')}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10">
          <StatBar>
            <StatItem
              label={t('เคสใหม่')}
              value={
                <span key={newCases.length} className="inline-block animate-count-pop">
                  {newCases.length}
                </span>
              }
              icon={<ClipboardList className="size-4.5" />}
              tone="warning"
            />
            <StatItem
              label={t('กำลังดำเนินการ')}
              value={
                <span key={inProgressCases.length} className="inline-block animate-count-pop">
                  {inProgressCases.length}
                </span>
              }
              icon={<Loader2 className="size-4.5" />}
              tone="primary"
            />
            <StatItem
              label={t('เสร็จสิ้นวันนี้')}
              value={
                <span key={doneCases.length} className="inline-block animate-count-pop">
                  {doneCases.length}
                </span>
              }
              icon={<CheckCircle2 className="size-4.5" />}
              tone="success"
            />
          </StatBar>

          <div className="mt-8 flex justify-end">
            <Link to="/rescue/new-case">
              <Button variant="primary" size="sm" icon={<ClipboardPlus className="size-4" />}>
                {t('พบเหตุด้วยตนเอง')}
              </Button>
            </Link>
          </div>

          <section className="mt-4">
            <h2 className="mb-3 text-lg font-bold text-ink">{t('เคสใหม่ที่ได้รับมอบหมาย')}</h2>
            {newCases.length === 0 ? (
              <EmptyState title={t('ยังไม่มีเคสใหม่')} description={t('เมื่อมีการมอบหมายเคสให้หน่วยของคุณ จะแสดงที่นี่')} />
            ) : (
              <div className="flex flex-col gap-4">
                {newCases.map((c, i) => (
                  <div
                    key={c.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
                  >
                    <EmergencyCaseCard
                      emergencyCase={c}
                      to={`/rescue/case/${c.id}`}
                      actions={
                        <>
                          <Button variant="success" size="sm" onClick={() => handleAccept(c)}>
                            {t('รับเคส')}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleReject(c)}>
                            {t('ปฏิเสธ')}
                          </Button>
                        </>
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-ink">{t('กำลังดำเนินการ')}</h2>
            {inProgressCases.length === 0 ? (
              <EmptyState title={t('ไม่มีเคสที่กำลังดำเนินการ')} description={t('เคสที่คุณรับไว้และกำลังดำเนินการจะแสดงที่นี่')} />
            ) : (
              <div className="flex flex-col gap-4">
                {inProgressCases.map((c, i) => (
                  <div key={c.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}>
                    <EmergencyCaseCard emergencyCase={c} to={`/rescue/case/${c.id}`} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-ink">{t('เสร็จสิ้นแล้ว')}</h2>
            {doneCases.length === 0 ? (
              <EmptyState title={t('ยังไม่มีเคสที่เสร็จสิ้น')} description={t('เคสที่นำส่งโรงพยาบาลสำเร็จแล้วจะแสดงที่นี่')} />
            ) : (
              <div className="flex flex-col gap-4">
                {doneCases.map((c) => (
                  <EmergencyCaseCard key={c.id} emergencyCase={c} to={`/rescue/case/${c.id}`} />
                ))}
              </div>
            )}
          </section>

          <div className="mt-8">
            <Suspense fallback={<ChartCardSkeleton />}>
              <SeverityDistributionChart title={t('สัดส่วนระดับความรุนแรงของเคสที่รับผิดชอบ')} cases={allCases} />
            </Suspense>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
