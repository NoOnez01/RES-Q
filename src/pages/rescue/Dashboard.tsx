import { useMemo } from 'react'
import { ClipboardList, Loader2, CheckCircle2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { DashboardCard } from '@/components/DashboardCard'
import { EmergencyCaseCard } from '@/components/EmergencyCaseCard'
import { EmptyState } from '@/components/States'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { CaseStatus, EmergencyCase } from '@/lib/types'

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
  const rescueAcceptCase = useStore((s) => s.rescueAcceptCase)
  const rescueRejectCase = useStore((s) => s.rescueRejectCase)

  const allCases = useMemo(
    () => Object.values(cases).sort((a, b) => b.createdAt - a.createdAt),
    [cases],
  )

  const newCases = allCases.filter((c) => c.status === 'rescue-assigned')
  const inProgressCases = allCases.filter((c) => IN_PROGRESS_STATUSES.includes(c.status))
  const doneCases = allCases.filter((c) => DONE_STATUSES.includes(c.status)).slice(0, 5)

  function handleAccept(c: EmergencyCase) {
    rescueAcceptCase(c.id)
    toast({ title: 'รับเคสแล้ว', message: `เริ่มเดินทางไปยังเคส ${c.caseNumber}`, tone: 'success' })
  }

  function handleReject(c: EmergencyCase) {
    rescueRejectCase(c.id)
    toast({ title: 'ปฏิเสธเคสแล้ว', message: `ระบบกำลังค้นหาหน่วยกู้ชีพใหม่สำหรับเคส ${c.caseNumber}`, tone: 'info' })
  }

  return (
    <AppShell variant="dashboard" title="แดชบอร์ดหน่วยกู้ชีพ">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <DashboardCard
              label="เคสใหม่"
              value={
                <span key={newCases.length} className="inline-block animate-count-pop">
                  {newCases.length}
                </span>
              }
              icon={<ClipboardList className="size-4.5" />}
              tone="warning"
            />
            <DashboardCard
              label="กำลังดำเนินการ"
              value={
                <span key={inProgressCases.length} className="inline-block animate-count-pop">
                  {inProgressCases.length}
                </span>
              }
              icon={<Loader2 className="size-4.5" />}
              tone="primary"
            />
            <DashboardCard
              label="เสร็จสิ้นวันนี้"
              value={
                <span key={doneCases.length} className="inline-block animate-count-pop">
                  {doneCases.length}
                </span>
              }
              icon={<CheckCircle2 className="size-4.5" />}
              tone="success"
            />
          </div>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-navy">เคสใหม่ที่ได้รับมอบหมาย</h2>
            {newCases.length === 0 ? (
              <EmptyState title="ยังไม่มีเคสใหม่" description="เมื่อมีการมอบหมายเคสให้หน่วยของคุณ จะแสดงที่นี่" />
            ) : (
              <div className="flex flex-col gap-4">
                {newCases.map((c, i) => (
                  <div
                    key={c.id}
                    className="relative animate-fade-in-up pl-3"
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
                  >
                    <span
                      className="absolute inset-y-2 left-0 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(11,110,189,0.5)]"
                      aria-hidden="true"
                    />
                    <EmergencyCaseCard
                      emergencyCase={c}
                      to={`/rescue/case/${c.id}`}
                      actions={
                        <>
                          <Button variant="success" size="sm" onClick={() => handleAccept(c)}>
                            รับเคส
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleReject(c)}>
                            ปฏิเสธ
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
            <h2 className="mb-3 text-lg font-bold text-navy">กำลังดำเนินการ</h2>
            {inProgressCases.length === 0 ? (
              <EmptyState title="ไม่มีเคสที่กำลังดำเนินการ" description="เคสที่คุณรับไว้และกำลังดำเนินการจะแสดงที่นี่" />
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
            <h2 className="mb-3 text-lg font-bold text-navy">เสร็จสิ้นแล้ว</h2>
            {doneCases.length === 0 ? (
              <EmptyState title="ยังไม่มีเคสที่เสร็จสิ้น" description="เคสที่นำส่งโรงพยาบาลสำเร็จแล้วจะแสดงที่นี่" />
            ) : (
              <div className="flex flex-col gap-4">
                {doneCases.map((c) => (
                  <EmergencyCaseCard key={c.id} emergencyCase={c} to={`/rescue/case/${c.id}`} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  )
}
