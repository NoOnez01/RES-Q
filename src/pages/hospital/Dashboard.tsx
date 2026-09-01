import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Clock, CheckCircle2, Building2, Users, BedDouble, DoorOpen, DoorClosed, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { Card } from '@/components/ui/Card'
import { StatBar, StatItem } from '@/components/DashboardCard'
import { EmergencyCaseCard } from '@/components/EmergencyCaseCard'
import { EmptyState } from '@/components/States'
import { Button } from '@/components/ui/Button'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'

export default function HospitalDashboard() {
  const cases = useStore((s) => s.cases)
  const hospitals = useStore((s) => s.hospitals)
  const currentUser = useStore((s) => s.currentUser)
  const viewingRole = useStore((s) => s.viewingRole)
  const hospitalAcceptingCases = useStore((s) => s.hospitalAcceptingCases)
  const setHospitalAcceptingCases = useStore((s) => s.setHospitalAcceptingCases)
  const hospitalRejectCase = useStore((s) => s.hospitalRejectCase)
  const navigate = useNavigate()
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)

  // Same reasoning as rescue/Dashboard.tsx: a no-op for a real hospital
  // account (RLS already scoped it), but closes the gap for an admin whose
  // own base role is 'hospital' browsing without the explicit "view as --
  // all hospitals" switcher.
  const viewingAllHospitals = currentUser?.isAdmin && viewingRole === 'hospital'
  const hospitalCases = useMemo(() => {
    let list = Object.values(cases).filter((c) => !!c.selectedHospital)
    if (!viewingAllHospitals) {
      list = list.filter((c) => c.selectedHospital?.id === currentUser?.hospitalId)
    }
    return list
  }, [cases, viewingAllHospitals, currentUser?.hospitalId])

  const transportingCases = hospitalCases
    .filter((c) => c.status === 'transporting')
    .sort((a, b) => b.updatedAt - a.updatedAt)
  const arrivedCases = hospitalCases
    .filter((c) => c.status === 'hospital-arrived')
    .sort((a, b) => b.updatedAt - a.updatedAt)
  const doneCases = hospitalCases
    .filter((c) => c.status === 'hospital-received' || c.status === 'completed')
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const totalBeds = useMemo(() => hospitals.reduce((sum, h) => sum + h.bedsAvailable, 0), [hospitals])
  const bedsInUse = transportingCases.length + arrivedCases.length
  const bedsRemaining = Math.max(0, totalBeds - bedsInUse)
  const bedCapacity = Math.max(totalBeds, 1)
  const bedPct = Math.round((bedsRemaining / bedCapacity) * 100)
  const erReady = arrivedCases.length < 4
  const teamReady = transportingCases.length < 4

  function handleToggleAccepting() {
    const next = !hospitalAcceptingCases
    setHospitalAcceptingCases(next)
    toast({
      title: next ? 'เปิดรับเคสแล้ว' : 'ปิดรับเคสชั่วคราวแล้ว',
      message: next ? 'โรงพยาบาลพร้อมรับผู้ป่วยเพิ่มเติม' : 'หน่วยกู้ชีพและศูนย์สั่งการจะเห็นว่าโรงพยาบาลนี้ไม่พร้อมรับเคสใหม่',
      tone: next ? 'success' : 'warning',
    })
  }

  function handleConfirmReject() {
    if (!rejectTargetId) return
    hospitalRejectCase(rejectTargetId)
    toast({ title: 'ปฏิเสธเคสแล้ว', message: 'ระบบแจ้งหน่วยกู้ชีพให้เลือกโรงพยาบาลใหม่แล้ว', tone: 'warning' })
    setRejectTargetId(null)
  }

  return (
    <AppShell variant="dashboard" title="แดชบอร์ดโรงพยาบาล">
      <div className="relative">
        <AnimatedBackground variant="hospital" />
        <div className="relative z-10">
          <Card className="mb-5 animate-fade-in-up divide-y divide-border p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="flex items-center gap-2.5">
                {hospitalAcceptingCases ? (
                  <DoorOpen className="size-5 shrink-0 text-success" />
                ) : (
                  <DoorClosed className="size-5 shrink-0 text-emergency" />
                )}
                <div>
                  <p className="text-sm font-bold text-navy">
                    {hospitalAcceptingCases ? 'เปิดรับเคส' : 'ปิดรับเคสชั่วคราว'}
                  </p>
                  <p className="text-xs text-muted">
                    {hospitalAcceptingCases
                      ? 'หน่วยกู้ชีพและศูนย์สั่งการสามารถส่งผู้ป่วยมาที่นี่ได้'
                      : 'หน่วยกู้ชีพและศูนย์สั่งการจะเห็นว่าโรงพยาบาลนี้ไม่พร้อมรับเคสใหม่'}
                  </p>
                </div>
              </div>
              <Button size="sm" variant={hospitalAcceptingCases ? 'danger' : 'success'} onClick={handleToggleAccepting}>
                {hospitalAcceptingCases ? 'ปิดรับเคส' : 'เปิดรับเคส'}
              </Button>
            </div>

            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
              <ReadinessChip icon={<Building2 className="size-4" />} label="ห้องฉุกเฉิน" ready={erReady} />
              <ReadinessChip icon={<Users className="size-4" />} label="ทีมแพทย์" ready={teamReady} />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-navy">
                    <BedDouble className="size-4 text-primary" /> เตียงว่าง
                  </span>
                  <span key={bedsRemaining} className="text-sm font-bold text-primary animate-count-pop">
                    {bedsRemaining} เตียง
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(4, bedPct))}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <StatBar>
            <StatItem
              label="กำลังนำส่ง"
              value={
                <span key={transportingCases.length} className="inline-block animate-count-pop">
                  {transportingCases.length}
                </span>
              }
              icon={<Truck className="size-5" />}
              tone="primary"
            />
            <StatItem
              label="รอยืนยันรับผู้ป่วย"
              value={
                <span key={arrivedCases.length} className="inline-block animate-count-pop">
                  {arrivedCases.length}
                </span>
              }
              icon={<Clock className="size-5" />}
              tone="warning"
            />
            <StatItem
              label="เสร็จสิ้นแล้ว"
              value={
                <span key={doneCases.length} className="inline-block animate-count-pop">
                  {doneCases.length}
                </span>
              }
              icon={<CheckCircle2 className="size-5" />}
              tone="success"
            />
          </StatBar>

          {hospitalCases.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon={<Building2 className="size-6" />}
                title="ยังไม่มีผู้ป่วยที่ถูกส่งมายังโรงพยาบาล"
                description="เมื่อมีเคสเลือกส่งตัวมาที่โรงพยาบาล รายการจะแสดงที่นี่"
              />
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-8">
              <section>
                <h2 className="mb-4 text-lg font-bold text-navy">กำลังนำส่ง</h2>
                {transportingCases.length === 0 ? (
                  <p className="text-sm text-muted">ไม่มีผู้ป่วยกำลังนำส่งในขณะนี้</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {transportingCases.map((c, i) => (
                      <div
                        key={c.id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'backwards' }}
                      >
                        <EmergencyCaseCard
                          emergencyCase={c}
                          to={`/hospital/case/${c.id}`}
                          actions={
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                icon={<XCircle className="size-3.5" />}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRejectTargetId(c.id)
                                }}
                              >
                                ปฏิเสธเคส
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/hospital/case/${c.id}`)
                                }}
                              >
                                รับเคส
                              </Button>
                            </div>
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 className="mb-4 text-lg font-bold text-navy">รอยืนยันรับผู้ป่วย</h2>
                {arrivedCases.length === 0 ? (
                  <p className="text-sm text-muted">ไม่มีผู้ป่วยรอการยืนยันรับตัว</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {arrivedCases.map((c, i) => (
                      <div
                        key={c.id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'backwards' }}
                      >
                        <EmergencyCaseCard
                          emergencyCase={c}
                          to={`/hospital/case/${c.id}`}
                          actions={
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                icon={<XCircle className="size-3.5" />}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRejectTargetId(c.id)
                                }}
                              >
                                ปฏิเสธเคส
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/hospital/case/${c.id}`)
                                }}
                              >
                                ยืนยันรับผู้ป่วย
                              </Button>
                            </div>
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 className="mb-4 text-lg font-bold text-navy">เสร็จสิ้นแล้ว</h2>
                {doneCases.length === 0 ? (
                  <p className="text-sm text-muted">ยังไม่มีเคสที่เสร็จสิ้น</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {doneCases.map((c, i) => (
                      <div
                        key={c.id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'backwards' }}
                      >
                        <EmergencyCaseCard emergencyCase={c} to={`/hospital/case/${c.id}`} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        open={!!rejectTargetId}
        title="ยืนยันการปฏิเสธเคส"
        message={`คุณต้องการปฏิเสธเคส ${rejectTargetId ? (cases[rejectTargetId]?.caseNumber ?? '') : ''} หรือไม่ ระบบจะแจ้งให้หน่วยกู้ชีพเลือกโรงพยาบาลใหม่`}
        confirmLabel="ยืนยันปฏิเสธ"
        tone="danger"
        onConfirm={handleConfirmReject}
        onCancel={() => setRejectTargetId(null)}
      />
    </AppShell>
  )
}

function ReadinessChip({ icon, label, ready }: { icon: React.ReactNode; label: string; ready: boolean }) {
  return (
    <div className="flex flex-1 items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-sm font-semibold text-navy">
        {icon} {label}
      </span>
      <span className={clsx('flex items-center gap-1.5 text-xs font-bold', ready ? 'text-success' : 'text-warning')}>
        {ready && <PulseRing tone="success" size="sm" />}
        {ready ? 'พร้อม' : 'ตึงมือ'}
      </span>
    </div>
  )
}
