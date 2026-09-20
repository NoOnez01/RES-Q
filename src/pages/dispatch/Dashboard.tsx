import { lazy, Suspense, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { AlertTriangle, Search, Ambulance, CheckCircle2, ArrowRight, ClipboardList, ClipboardPlus, Building2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatBar, StatItem } from '@/components/DashboardCard'
import { EmergencyCaseCard } from '@/components/EmergencyCaseCard'
import { EmptyState } from '@/components/States'
import { ChartCardSkeleton } from '@/components/ChartCardSkeleton'
import { Button } from '@/components/ui/Button'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  แดชบอร์ดศูนย์สั่งการ: 'Dispatch dashboard',
  เคสใหม่รอดำเนินการ: 'New cases pending',
  กำลังค้นหาหน่วยกู้ชีพ: 'Finding a rescue team',
  หน่วยกู้ชีพกำลังปฏิบัติงาน: 'Rescue teams active',
  เสร็จสิ้นวันนี้: 'Completed today',
  เคสทั้งหมด: 'Total cases',
  บันทึกเคสใหม่: 'Log new case',
  บัญชีรออนุมัติ: 'Pending accounts',
  ประเมินหน่วยกู้ชีพ: 'Rate rescue teams',
  'ค้นหาหน่วยปฏิบัติการ (NDEMS)': 'Search units (NDEMS)',
  ดูสายเรียกเข้าทั้งหมด: 'View all incoming calls',
  ยังไม่มีเคสในระบบ: 'No cases yet',
  เคสใหม่จะปรากฏที่นี่โดยอัตโนมัติ: 'New cases will appear here automatically',
  เริ่มค้นหาหน่วยกู้ชีพ: 'Start finding a rescue team',
  กรอกรายละเอียดเหตุการณ์: 'Fill in incident details',
  เริ่มค้นหาหน่วยกู้ชีพแล้ว: 'Started finding a rescue team',
  'เคส {caseNumber} กำลังค้นหาหน่วยกู้ชีพที่พร้อมปฏิบัติงาน': 'Case {caseNumber} is now searching for an available rescue team',
  สัดส่วนระดับความรุนแรงของเคส: 'Case severity distribution',
})

const SeverityDistributionChart = lazy(() => import('@/components/SeverityDistributionChart'))
const ResponseTimeSummary = lazy(() => import('@/components/ResponseTimeSummary'))

const IN_PROGRESS_STATUSES = [
  'rescue-assigned',
  'rescue-en-route',
  'rescue-arrived',
  'assisted',
  'transporting',
  'hospital-arrived',
]

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

  const newCount = allCases.filter((c) => c.status === 'received').length
  const findingCount = allCases.filter((c) => c.status === 'finding-rescue').length
  const inProgressCount = allCases.filter((c) => IN_PROGRESS_STATUSES.includes(c.status)).length
  const completedCount = allCases.filter((c) => c.status === 'completed').length

  const activeCases = useMemo(
    () =>
      [...allCases].sort((a, b) => {
        const rank = (c: (typeof allCases)[number]) => {
          if (c.status === 'completed') return 2
          if (c.status === 'received' && !c.assessment) return 0
          return 1
        }
        const rankDiff = rank(a) - rank(b)
        if (rankDiff !== 0) return rankDiff
        return b.createdAt - a.createdAt
      }),
    [allCases],
  )

  function handleStartFinding(caseId: string, caseNumber: string) {
    startFindingRescue(caseId)
    toast({
      title: t('เริ่มค้นหาหน่วยกู้ชีพแล้ว'),
      message: t('เคส {caseNumber} กำลังค้นหาหน่วยกู้ชีพที่พร้อมปฏิบัติงาน', { caseNumber }),
      tone: 'info',
    })
  }

  return (
    <AppShell variant="dashboard" title={t('แดชบอร์ดศูนย์สั่งการ')}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10">
          <StatBar>
            <StatItem
              label={t('เคสใหม่รอดำเนินการ')}
              value={
                <span key={newCount} className="inline-block animate-count-pop">
                  {newCount}
                </span>
              }
              icon={<AlertTriangle className="size-5" />}
              tone="emergency"
            />
            <StatItem
              label={t('กำลังค้นหาหน่วยกู้ชีพ')}
              value={
                <span key={findingCount} className="inline-block animate-count-pop">
                  {findingCount}
                </span>
              }
              icon={<Search className="size-5" />}
              tone="warning"
            />
            <StatItem
              label={t('หน่วยกู้ชีพกำลังปฏิบัติงาน')}
              value={
                <span key={inProgressCount} className="inline-block animate-count-pop">
                  {inProgressCount}
                </span>
              }
              icon={<Ambulance className="size-5" />}
              tone="primary"
            />
            <StatItem
              label={t('เสร็จสิ้นวันนี้')}
              value={
                <span key={completedCount} className="inline-block animate-count-pop">
                  {completedCount}
                </span>
              }
              icon={<CheckCircle2 className="size-5" />}
              tone="success"
            />
          </StatBar>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">{t('เคสทั้งหมด')}</h2>
            <div className="flex flex-wrap gap-2">
              <Link to="/dispatch/new-case">
                <Button variant="primary" size="sm" icon={<ClipboardPlus className="size-4" />}>
                  {t('บันทึกเคสใหม่')}
                </Button>
              </Link>
              <Link to="/dispatch/pending-approvals">
                <Button variant="outline" size="sm" iconRight={<ArrowRight className="size-4" />}>
                  {t('บัญชีรออนุมัติ')}
                </Button>
              </Link>
              <Link to="/dispatch/feedback-stats">
                <Button variant="outline" size="sm" iconRight={<ArrowRight className="size-4" />}>
                  {t('ประเมินหน่วยกู้ชีพ')}
                </Button>
              </Link>
              <Link to="/dispatch/unit-search">
                <Button variant="outline" size="sm" icon={<Building2 className="size-4" />}>
                  {t('ค้นหาหน่วยปฏิบัติการ (NDEMS)')}
                </Button>
              </Link>
              <Link to="/dispatch/incoming-call">
                <Button variant="outline" size="sm" iconRight={<ArrowRight className="size-4" />}>
                  {t('ดูสายเรียกเข้าทั้งหมด')}
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-4">
            {activeCases.length === 0 ? (
              <EmptyState title={t('ยังไม่มีเคสในระบบ')} description={t('เคสใหม่จะปรากฏที่นี่โดยอัตโนมัติ')} />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {activeCases.map((c, index) => {
                  const isJustArrived = Date.now() - c.createdAt < 5000
                  return (
                    <div key={c.id} className="relative">
                      {isJustArrived && (
                        <div
                          className="pointer-events-none absolute inset-0 animate-pulse-glow rounded-2xl"
                          aria-hidden="true"
                        />
                      )}
                      <div
                        className="relative animate-fade-in-up rounded-2xl"
                        style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
                      >
                        <EmergencyCaseCard
                          emergencyCase={c}
                          to={`/dispatch/case/${c.id}`}
                          actions={
                            c.status === 'received' ? (
                              c.assessment ? (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleStartFinding(c.id, c.caseNumber)
                                  }}
                                >
                                  {t('เริ่มค้นหาหน่วยกู้ชีพ')}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  icon={<ClipboardList className="size-4" />}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(`/dispatch/emergency-details/${c.id}`)
                                  }}
                                >
                                  {t('กรอกรายละเอียดเหตุการณ์')}
                                </Button>
                              )
                            ) : undefined
                          }
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Suspense fallback={<ChartCardSkeleton />}>
              <ResponseTimeSummary cases={allCases} />
            </Suspense>
            <Suspense fallback={<ChartCardSkeleton />}>
              <SeverityDistributionChart title={t('สัดส่วนระดับความรุนแรงของเคส')} cases={allCases} />
            </Suspense>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
