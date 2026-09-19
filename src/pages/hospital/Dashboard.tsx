import { lazy, Suspense, useMemo, useState } from 'react'
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
import { ChartCardSkeleton } from '@/components/ChartCardSkeleton'
import { Button } from '@/components/ui/Button'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  แดชบอร์ดโรงพยาบาล: 'Hospital dashboard',
  เปิดรับเคสแล้ว: 'Now accepting cases',
  ปิดรับเคสชั่วคราวแล้ว: 'Temporarily not accepting cases',
  โรงพยาบาลพร้อมรับผู้ป่วยเพิ่มเติม: 'The hospital is ready to receive more patients',
  หน่วยกู้ชีพและศูนย์สั่งการจะเห็นว่าโรงพยาบาลนี้ไม่พร้อมรับเคสใหม่: 'Rescue teams and the dispatch center will see this hospital as not ready for new cases',
  ปฏิเสธเคสแล้ว: 'Case rejected',
  ระบบแจ้งหน่วยกู้ชีพให้เลือกโรงพยาบาลใหม่แล้ว: 'The rescue team has been told to choose a different hospital',
  เปิดรับเคส: 'Accepting cases',
  ปิดรับเคสชั่วคราว: 'Not accepting cases',
  หน่วยกู้ชีพและศูนย์สั่งการสามารถส่งผู้ป่วยมาที่นี่ได้: 'Rescue teams and the dispatch center can send patients here',
  ปิดรับเคส: 'Stop accepting',
  ห้องฉุกเฉิน: 'Emergency room',
  ทีมแพทย์: 'Medical team',
  เตียงว่าง: 'Beds available',
  '{n} เตียง': '{n} beds',
  กำลังนำส่ง: 'In transit',
  รอยืนยันรับผู้ป่วย: 'Awaiting patient confirmation',
  เสร็จสิ้นแล้ว: 'Completed',
  ยังไม่มีผู้ป่วยที่ถูกส่งมายังโรงพยาบาล: 'No patients sent to this hospital yet',
  'เมื่อมีเคสเลือกส่งตัวมาที่โรงพยาบาล รายการจะแสดงที่นี่': 'Once a case selects this hospital, it will appear here',
  ไม่มีผู้ป่วยกำลังนำส่งในขณะนี้: 'No patients currently in transit',
  ปฏิเสธเคส: 'Reject case',
  รับเคส: 'Accept case',
  ไม่มีผู้ป่วยรอการยืนยันรับตัว: 'No patients awaiting admission confirmation',
  ยืนยันรับผู้ป่วย: 'Confirm patient admission',
  ยังไม่มีเคสที่เสร็จสิ้น: 'No completed cases yet',
  สัดส่วนระดับความรุนแรงของผู้ป่วยที่ส่งมา: 'Severity distribution of incoming patients',
  ยืนยันการปฏิเสธเคส: 'Confirm rejecting this case',
  'คุณต้องการปฏิเสธเคส {caseNumber} หรือไม่ ระบบจะแจ้งให้หน่วยกู้ชีพเลือกโรงพยาบาลใหม่':
    'Do you want to reject case {caseNumber}? The rescue team will be told to choose a different hospital.',
  ยืนยันปฏิเสธ: 'Confirm rejection',
  พร้อม: 'Ready',
  ตึงมือ: 'Busy',
})

const SeverityDistributionChart = lazy(() => import('@/components/SeverityDistributionChart'))

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
  const t = useT()

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
      title: next ? t('เปิดรับเคสแล้ว') : t('ปิดรับเคสชั่วคราวแล้ว'),
      message: next ? t('โรงพยาบาลพร้อมรับผู้ป่วยเพิ่มเติม') : t('หน่วยกู้ชีพและศูนย์สั่งการจะเห็นว่าโรงพยาบาลนี้ไม่พร้อมรับเคสใหม่'),
      tone: next ? 'success' : 'warning',
    })
  }

  function handleConfirmReject() {
    if (!rejectTargetId) return
    hospitalRejectCase(rejectTargetId)
    toast({ title: t('ปฏิเสธเคสแล้ว'), message: t('ระบบแจ้งหน่วยกู้ชีพให้เลือกโรงพยาบาลใหม่แล้ว'), tone: 'warning' })
    setRejectTargetId(null)
  }

  return (
    <AppShell variant="dashboard" title={t('แดชบอร์ดโรงพยาบาล')}>
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
                  <p className="text-sm font-bold text-ink">
                    {hospitalAcceptingCases ? t('เปิดรับเคส') : t('ปิดรับเคสชั่วคราว')}
                  </p>
                  <p className="text-xs text-muted">
                    {hospitalAcceptingCases
                      ? t('หน่วยกู้ชีพและศูนย์สั่งการสามารถส่งผู้ป่วยมาที่นี่ได้')
                      : t('หน่วยกู้ชีพและศูนย์สั่งการจะเห็นว่าโรงพยาบาลนี้ไม่พร้อมรับเคสใหม่')}
                  </p>
                </div>
              </div>
              <Button size="sm" variant={hospitalAcceptingCases ? 'danger' : 'success'} onClick={handleToggleAccepting}>
                {hospitalAcceptingCases ? t('ปิดรับเคส') : t('เปิดรับเคส')}
              </Button>
            </div>

            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
              <ReadinessChip icon={<Building2 className="size-4" />} label={t('ห้องฉุกเฉิน')} ready={erReady} />
              <ReadinessChip icon={<Users className="size-4" />} label={t('ทีมแพทย์')} ready={teamReady} />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <BedDouble className="size-4 text-primary" /> {t('เตียงว่าง')}
                  </span>
                  <span key={bedsRemaining} className="text-sm font-bold text-primary animate-count-pop">
                    {t('{n} เตียง', { n: bedsRemaining })}
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
              label={t('กำลังนำส่ง')}
              value={
                <span key={transportingCases.length} className="inline-block animate-count-pop">
                  {transportingCases.length}
                </span>
              }
              icon={<Truck className="size-5" />}
              tone="primary"
            />
            <StatItem
              label={t('รอยืนยันรับผู้ป่วย')}
              value={
                <span key={arrivedCases.length} className="inline-block animate-count-pop">
                  {arrivedCases.length}
                </span>
              }
              icon={<Clock className="size-5" />}
              tone="warning"
            />
            <StatItem
              label={t('เสร็จสิ้นแล้ว')}
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
                title={t('ยังไม่มีผู้ป่วยที่ถูกส่งมายังโรงพยาบาล')}
                description={t('เมื่อมีเคสเลือกส่งตัวมาที่โรงพยาบาล รายการจะแสดงที่นี่')}
              />
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-8">
              <section>
                <h2 className="mb-4 text-lg font-bold text-ink">{t('กำลังนำส่ง')}</h2>
                {transportingCases.length === 0 ? (
                  <p className="text-sm text-muted">{t('ไม่มีผู้ป่วยกำลังนำส่งในขณะนี้')}</p>
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
                                {t('ปฏิเสธเคส')}
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/hospital/case/${c.id}`)
                                }}
                              >
                                {t('รับเคส')}
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
                <h2 className="mb-4 text-lg font-bold text-ink">{t('รอยืนยันรับผู้ป่วย')}</h2>
                {arrivedCases.length === 0 ? (
                  <p className="text-sm text-muted">{t('ไม่มีผู้ป่วยรอการยืนยันรับตัว')}</p>
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
                                {t('ปฏิเสธเคส')}
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/hospital/case/${c.id}`)
                                }}
                              >
                                {t('ยืนยันรับผู้ป่วย')}
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
                <h2 className="mb-4 text-lg font-bold text-ink">{t('เสร็จสิ้นแล้ว')}</h2>
                {doneCases.length === 0 ? (
                  <p className="text-sm text-muted">{t('ยังไม่มีเคสที่เสร็จสิ้น')}</p>
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

          <div className="mt-8">
            <Suspense fallback={<ChartCardSkeleton />}>
              <SeverityDistributionChart title={t('สัดส่วนระดับความรุนแรงของผู้ป่วยที่ส่งมา')} cases={hospitalCases} />
            </Suspense>
          </div>
        </div>
      </div>

      <ConfirmationModal
        open={!!rejectTargetId}
        title={t('ยืนยันการปฏิเสธเคส')}
        message={t('คุณต้องการปฏิเสธเคส {caseNumber} หรือไม่ ระบบจะแจ้งให้หน่วยกู้ชีพเลือกโรงพยาบาลใหม่', {
          caseNumber: rejectTargetId ? (cases[rejectTargetId]?.caseNumber ?? '') : '',
        })}
        confirmLabel={t('ยืนยันปฏิเสธ')}
        tone="danger"
        onConfirm={handleConfirmReject}
        onCancel={() => setRejectTargetId(null)}
      />
    </AppShell>
  )
}

function ReadinessChip({ icon, label, ready }: { icon: React.ReactNode; label: string; ready: boolean }) {
  const t = useT()
  return (
    <div className="flex flex-1 items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
        {icon} {label}
      </span>
      <span className={clsx('flex items-center gap-1.5 text-xs font-bold', ready ? 'text-success' : 'text-warning')}>
        {ready && <PulseRing tone="success" size="sm" />}
        {ready ? t('พร้อม') : t('ตึงมือ')}
      </span>
    </div>
  )
}
