import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { AlertTriangle, Search, Ambulance, CheckCircle2, ArrowRight, ClipboardList } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardCard } from '@/components/DashboardCard'
import { EmergencyCaseCard } from '@/components/EmergencyCaseCard'
import { EmptyState } from '@/components/States'
import { Button } from '@/components/ui/Button'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'

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
      title: 'เริ่มค้นหาหน่วยกู้ชีพแล้ว',
      message: `เคส ${caseNumber} กำลังค้นหาหน่วยกู้ชีพที่พร้อมปฏิบัติงาน`,
      tone: 'info',
    })
  }

  return (
    <AppShell variant="dashboard" title="แดชบอร์ดศูนย์สั่งการ">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              label="เคสใหม่รอดำเนินการ"
              value={
                <span key={newCount} className="inline-block animate-count-pop">
                  {newCount}
                </span>
              }
              icon={<AlertTriangle className="size-5" />}
              tone="emergency"
            />
            <DashboardCard
              label="กำลังค้นหาหน่วยกู้ชีพ"
              value={
                <span key={findingCount} className="inline-block animate-count-pop">
                  {findingCount}
                </span>
              }
              icon={<Search className="size-5" />}
              tone="warning"
            />
            <DashboardCard
              label="หน่วยกู้ชีพกำลังปฏิบัติงาน"
              value={
                <span key={inProgressCount} className="inline-block animate-count-pop">
                  {inProgressCount}
                </span>
              }
              icon={<Ambulance className="size-5" />}
              tone="primary"
            />
            <DashboardCard
              label="เสร็จสิ้นวันนี้"
              value={
                <span key={completedCount} className="inline-block animate-count-pop">
                  {completedCount}
                </span>
              }
              icon={<CheckCircle2 className="size-5" />}
              tone="success"
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-navy">เคสทั้งหมด</h2>
            <div className="flex flex-wrap gap-2">
              <Link to="/dispatch/pending-approvals">
                <Button variant="outline" size="sm" iconRight={<ArrowRight className="size-4" />}>
                  บัญชีรออนุมัติ
                </Button>
              </Link>
              <Link to="/dispatch/feedback-stats">
                <Button variant="outline" size="sm" iconRight={<ArrowRight className="size-4" />}>
                  สถิติความพึงพอใจ
                </Button>
              </Link>
              <Link to="/dispatch/incoming-call">
                <Button variant="outline" size="sm" iconRight={<ArrowRight className="size-4" />}>
                  ดูสายเรียกเข้าทั้งหมด
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-4">
            {activeCases.length === 0 ? (
              <EmptyState title="ยังไม่มีเคสในระบบ" description="เคสใหม่จะปรากฏที่นี่โดยอัตโนมัติ" />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {activeCases.map((c, index) => {
                  const isCritical = c.assessment?.severity === 1
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
                        className={clsx(
                          'relative animate-fade-in-up rounded-2xl',
                          isCritical && 'border-l-4 border-l-emergency',
                        )}
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
                                  เริ่มค้นหาหน่วยกู้ชีพ
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
                                  กรอกรายละเอียดเหตุการณ์
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
        </div>
      </div>
    </AppShell>
  )
}
