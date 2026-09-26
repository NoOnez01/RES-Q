import { lazy, Suspense, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Clock, CheckCircle2, Building2, Users, BedDouble, DoorOpen, DoorClosed, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { Card } from '@/components/ui/Card'
import { StatBar, StatItem } from '@/components/DashboardCard'
import { CaseQueue, QueueSection, byUrgency, reachedAt, type QueueDetail } from '@/components/CaseQueue'
import type { EmergencyCase } from '@/lib/types'
import { ChartCardSkeleton } from '@/components/ChartCardSkeleton'
import { Button } from '@/components/ui/Button'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ภาพรวมโรงพยาบาล: 'Hospital overview',
  เปิดรับผู้ป่วยแล้ว: 'Now accepting patients',
  ปิดรับผู้ป่วยชั่วคราวแล้ว: 'Temporarily not accepting patients',
  โรงพยาบาลพร้อมรับผู้ป่วยเพิ่มเติม: 'The hospital is ready to receive more patients',
  หน่วยกู้ชีพและศูนย์สั่งการจะเห็นว่าโรงพยาบาลนี้ไม่พร้อมรับผู้ป่วยใหม่: 'Rescue teams and the dispatch center will see this hospital as not ready for new patients',
  ปฏิเสธการรับผู้ป่วยแล้ว: 'Patient declined',
  ระบบแจ้งหน่วยกู้ชีพให้เลือกโรงพยาบาลใหม่แล้ว: 'The rescue team has been told to choose a different hospital',
  เปิดรับผู้ป่วย: 'Accepting patients',
  ปิดรับผู้ป่วยชั่วคราว: 'Not accepting patients',
  หน่วยกู้ชีพและศูนย์สั่งการสามารถส่งผู้ป่วยมาที่นี่ได้: 'Rescue teams and the dispatch center can send patients here',
  ปิดรับผู้ป่วย: 'Stop accepting',
  ห้องฉุกเฉิน: 'Emergency room',
  ทีมแพทย์: 'Medical team',
  เตียงว่าง: 'Beds available',
  '{n} เตียง': '{n} beds',
  กำลังนำส่ง: 'In transit',
  รอยืนยันรับผู้ป่วย: 'Awaiting patient confirmation',
  เสร็จสิ้นแล้ว: 'Completed',
  ยังไม่มีผู้ป่วยที่ถูกส่งมายังโรงพยาบาล: 'No patients sent to this hospital yet',
  'เมื่อมีการเลือกนำส่งผู้ป่วยมายังโรงพยาบาลนี้ รายการจะแสดงที่นี่': 'Once a case selects this hospital, it will appear here',
  ไม่มีผู้ป่วยกำลังนำส่งในขณะนี้: 'No patients currently in transit',
  ปฏิเสธการรับผู้ป่วย: 'Decline patient',
  รับผู้ป่วย: 'Accept patient',
  ไม่มีผู้ป่วยรอการยืนยันรับตัว: 'No patients awaiting admission confirmation',
  ยืนยันรับผู้ป่วย: 'Confirm patient admission',
  ยังไม่มีเหตุที่ดำเนินการเสร็จสิ้น: 'No completed cases yet',
  สัดส่วนระดับความรุนแรงของผู้ป่วยที่ส่งมา: 'Severity distribution of incoming patients',
  ยืนยันการปฏิเสธการรับผู้ป่วย: 'Confirm declining this patient',
  'ต้องการปฏิเสธการรับผู้ป่วยจากเหตุหมายเลข {caseNumber} หรือไม่ ระบบจะแจ้งให้หน่วยกู้ชีพเลือกโรงพยาบาลใหม่':
    'Decline the patient from case {caseNumber}? The rescue team will be told to choose a different hospital.',
  ยืนยันการปฏิเสธ: 'Confirm rejection',
  พร้อม: 'Ready',
  ภาระงานสูง: 'Busy',
  ผู้ป่วย: 'Patient',
  ผู้ป่วยกำลังนำส่งมา: 'Patients on the way',
  รอบันทึกข้อมูลผู้ป่วย: 'Patient details not recorded yet',
  ไม่มีข้อมูลผู้ป่วยในระบบ: 'No patient details on record',
  ปฏิเสธ: 'Reject',
  '{age} ปี': '{age} y',
  'ความดัน {bp} · ชีพจร {hr} · ออกซิเจน {o2}%': 'BP {bp} · HR {hr} · SpO₂ {o2}%',
})

/** Who's coming in, and their last recorded vitals -- what a receiving
 * team reads first, ahead of where the incident happened. */
function patientDetail(c: EmergencyCase, t: ReturnType<typeof useT>): QueueDetail {
  const p = c.patientInfo
  if (!p) {
    const done = c.status === 'hospital-received' || c.status === 'completed'
    return { primary: done ? t('ไม่มีข้อมูลผู้ป่วยในระบบ') : t('รอบันทึกข้อมูลผู้ป่วย'), secondary: c.location?.address }
  }
  const who = [p.name, p.age ? t('{age} ปี', { age: p.age }) : '', p.gender].filter(Boolean).join(' · ')
  const v = p.vitals
  const vitals =
    v && (v.bloodPressure || v.pulse || v.oxygenSat)
      ? t('ความดัน {bp} · ชีพจร {hr} · ออกซิเจน {o2}%', { bp: v.bloodPressure || '-', hr: v.pulse || '-', o2: v.oxygenSat || '-' })
      : undefined
  return { primary: who, secondary: vitals }
}

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

  const transportingCases = hospitalCases.filter((c) => c.status === 'transporting').sort(byUrgency)
  const arrivedCases = hospitalCases.filter((c) => c.status === 'hospital-arrived').sort(byUrgency)
  const receivedAt = (c: EmergencyCase) => reachedAt(c, 'hospital-received') ?? c.updatedAt
  const doneCases = hospitalCases
    .filter((c) => c.status === 'hospital-received' || c.status === 'completed')
    .sort((a, b) => receivedAt(b) - receivedAt(a))

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
      title: next ? t('เปิดรับผู้ป่วยแล้ว') : t('ปิดรับผู้ป่วยชั่วคราวแล้ว'),
      message: next ? t('โรงพยาบาลพร้อมรับผู้ป่วยเพิ่มเติม') : t('หน่วยกู้ชีพและศูนย์สั่งการจะเห็นว่าโรงพยาบาลนี้ไม่พร้อมรับผู้ป่วยใหม่'),
      tone: next ? 'success' : 'warning',
    })
  }

  function handleConfirmReject() {
    if (!rejectTargetId) return
    hospitalRejectCase(rejectTargetId)
    toast({ title: t('ปฏิเสธการรับผู้ป่วยแล้ว'), message: t('ระบบแจ้งหน่วยกู้ชีพให้เลือกโรงพยาบาลใหม่แล้ว'), tone: 'warning' })
    setRejectTargetId(null)
  }

  return (
    <AppShell variant="dashboard" title={t('ภาพรวมโรงพยาบาล')}>
          <Card className="mb-5 divide-y divide-border p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="flex items-center gap-2.5">
                {hospitalAcceptingCases ? (
                  <DoorOpen className="size-5 shrink-0 text-success" />
                ) : (
                  <DoorClosed className="size-5 shrink-0 text-emergency" />
                )}
                <div>
                  <p className="text-sm font-bold text-ink">
                    {hospitalAcceptingCases ? t('เปิดรับผู้ป่วย') : t('ปิดรับผู้ป่วยชั่วคราว')}
                  </p>
                  <p className="text-xs text-muted">
                    {hospitalAcceptingCases
                      ? t('หน่วยกู้ชีพและศูนย์สั่งการสามารถส่งผู้ป่วยมาที่นี่ได้')
                      : t('หน่วยกู้ชีพและศูนย์สั่งการจะเห็นว่าโรงพยาบาลนี้ไม่พร้อมรับผู้ป่วยใหม่')}
                  </p>
                </div>
              </div>
              <Button size="sm" variant={hospitalAcceptingCases ? 'danger' : 'success'} onClick={handleToggleAccepting}>
                {hospitalAcceptingCases ? t('ปิดรับผู้ป่วย') : t('เปิดรับผู้ป่วย')}
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
              value={transportingCases.length}
              icon={<Truck />}
              tone="primary"
            />
            <StatItem
              label={t('รอยืนยันรับผู้ป่วย')}
              value={arrivedCases.length}
              icon={<Clock />}
              tone="warning"
              alert={arrivedCases.length > 0}
            />
            <StatItem
              label={t('เสร็จสิ้นแล้ว')}
              value={doneCases.length}
              icon={<CheckCircle2 />}
              tone="success"
            />
          </StatBar>

          <QueueSection title={t('ผู้ป่วยกำลังนำส่งมา')} count={transportingCases.length} urgent>
            <CaseQueue
              rows={transportingCases.map((c) => ({
                case: c,
                to: '/hospital/case/' + c.id,
                action: (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<XCircle className="size-4" />}
                      aria-label={t('ปฏิเสธการรับผู้ป่วย')}
                      title={t('ปฏิเสธการรับผู้ป่วย')}
                      onClick={() => setRejectTargetId(c.id)}
                    >
                      {t('ปฏิเสธ')}
                    </Button>
                    <Button size="sm" onClick={() => navigate('/hospital/case/' + c.id)}>
                      {t('รับผู้ป่วย')}
                    </Button>
                  </>
                ),
              }))}
              empty={t('ไม่มีผู้ป่วยกำลังนำส่งในขณะนี้')}
              detailLabel={t('ผู้ป่วย')}
              detailOf={(c) => patientDetail(c, t)}
              timeOf={(c) => reachedAt(c, 'transporting') ?? c.updatedAt}
              actionWidth="16rem"
            />
          </QueueSection>

          <QueueSection title={t('รอยืนยันรับผู้ป่วย')} count={arrivedCases.length} urgent>
            <CaseQueue
              rows={arrivedCases.map((c) => ({
                case: c,
                to: '/hospital/case/' + c.id,
                action: (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<XCircle className="size-4" />}
                      aria-label={t('ปฏิเสธการรับผู้ป่วย')}
                      title={t('ปฏิเสธการรับผู้ป่วย')}
                      onClick={() => setRejectTargetId(c.id)}
                    >
                      {t('ปฏิเสธ')}
                    </Button>
                    <Button size="sm" onClick={() => navigate('/hospital/case/' + c.id)}>
                      {t('ยืนยันรับผู้ป่วย')}
                    </Button>
                  </>
                ),
              }))}
              empty={t('ไม่มีผู้ป่วยรอการยืนยันรับตัว')}
              detailLabel={t('ผู้ป่วย')}
              detailOf={(c) => patientDetail(c, t)}
              timeOf={(c) => reachedAt(c, 'hospital-arrived') ?? c.updatedAt}
              actionWidth="16rem"
            />
          </QueueSection>

          <QueueSection title={t('เสร็จสิ้นแล้ว')} count={doneCases.length}>
            <CaseQueue
              rows={doneCases.slice(0, 8).map((c) => ({ case: c, to: '/hospital/case/' + c.id }))}
              empty={hospitalCases.length === 0 ? t('ยังไม่มีผู้ป่วยที่ถูกส่งมายังโรงพยาบาล') : t('ยังไม่มีเหตุที่ดำเนินการเสร็จสิ้น')}
              detailLabel={t('ผู้ป่วย')}
              detailOf={(c) => patientDetail(c, t)}
              timeOf={receivedAt}
              actionWidth="16rem"
            />
          </QueueSection>

          <div className="mt-10">
            <Suspense fallback={<ChartCardSkeleton />}>
              <SeverityDistributionChart title={t('สัดส่วนระดับความรุนแรงของผู้ป่วยที่ส่งมา')} cases={hospitalCases} />
            </Suspense>
          </div>

      <ConfirmationModal
        open={!!rejectTargetId}
        title={t('ยืนยันการปฏิเสธการรับผู้ป่วย')}
        message={t('ต้องการปฏิเสธการรับผู้ป่วยจากเหตุหมายเลข {caseNumber} หรือไม่ ระบบจะแจ้งให้หน่วยกู้ชีพเลือกโรงพยาบาลใหม่', {
          caseNumber: rejectTargetId ? (cases[rejectTargetId]?.caseNumber ?? '') : '',
        })}
        confirmLabel={t('ยืนยันการปฏิเสธ')}
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
        {ready ? t('พร้อม') : t('ภาระงานสูง')}
      </span>
    </div>
  )
}
