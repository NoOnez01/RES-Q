import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Hourglass, MapPin, Users, Phone, CheckCircle2, Stethoscope } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { PulseRing } from '@/components/ui/PulseRing'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/StatusBadge'
import { SeverityBadge } from '@/components/SeverityBadge'
import { PatientInformationCard } from '@/components/PatientInformationCard'
import { CaseMediaGallery } from '@/components/CaseMediaGallery'
import { RelativeContacts } from '@/components/RelativeContacts'
import { CaseTimeline } from '@/components/CaseTimeline'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { ErrorState, SuccessState } from '@/components/States'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'
import { HospitalDecisionCard } from '@/components/HospitalRisk'

registerTranslations({
  ยังไม่ระบุเบอร์ติดต่อกลับ: 'No callback number provided',
  รายละเอียดเหตุ: 'Case details',
  ไม่พบเหตุนี้: 'Case not found',
  เหตุที่คุณค้นหาอาจถูกลบหรือไม่มีอยู่ในระบบ: "The case you're looking for may have been deleted or does not exist",
  ยืนยันรับผู้ป่วยเรียบร้อยแล้ว: 'Patient admission confirmed',
  ปิดเหตุเรียบร้อยแล้ว: 'Case closed',
  'เหตุหมายเลข {caseNumber}': 'Case {caseNumber}',
  กำลังเตรียมข้อมูลสำหรับขั้นตอนถัดไป: 'Preparing case data for the next step',
  รอรายละเอียดเหตุการณ์: 'Awaiting incident details',
  รายละเอียดเหตุการณ์: 'Incident details',
  'ผู้ป่วย {n} คน': '{n} patient(s)',
  อาการบาดเจ็บ: 'Injury description',
  หมายเหตุ: 'Notes',
  หน่วยกู้ชีพที่นำส่ง: 'Transporting rescue team',
  ชื่อหน่วย: 'Team name',
  ยานพาหนะ: 'Vehicle',
  เบอร์ติดต่อ: 'Contact number',
  ลำดับการดำเนินการ: 'Response timeline',
  เตรียมทีมรักษา: 'Prepare care team',
  ทำเครื่องหมายเมื่อทีมแพทย์เตรียมพร้อมรับผู้ป่วย: 'Mark this once the medical team is ready to receive the patient',
  ทำเครื่องหมายว่าทีมแพทย์เตรียมพร้อม: 'Mark the medical team as ready',
  ทีมพร้อมแล้ว: 'Team ready',
  ทำเครื่องหมายว่าพร้อม: 'Mark as ready',
  ผู้ป่วยถึงโรงพยาบาลแล้ว: 'Patient has arrived at the hospital',
  กรุณายืนยันเมื่อโรงพยาบาลได้รับตัวผู้ป่วยเรียบร้อยแล้ว: 'Please confirm once the hospital has admitted the patient',
  ยืนยันรับผู้ป่วย: 'Confirm patient admission',
  กระบวนการช่วยเหลือฉุกเฉินเสร็จสมบูรณ์แล้ว: 'The emergency response process is complete',
  รับผู้ป่วยเรียบร้อยแล้ว: 'Patient admitted',
  ปิดเหตุเมื่อกระบวนการช่วยเหลือฉุกเฉินเสร็จสมบูรณ์: 'Close the case once the emergency response is complete',
  ปิดเหตุ: 'Close case',
  ดำเนินการเสร็จสิ้นแล้ว: 'Case completed',
  ยังไม่มีผู้ป่วยถึงโรงพยาบาล: 'No patient has arrived at the hospital yet',
  ระบบจะแจ้งเตือนเมื่อผู้ป่วยถึงโรงพยาบาลของท่าน: 'You will be notified when a patient arrives at your hospital',
  ยืนยันการรับผู้ป่วย: 'Confirm patient admission',
  กรุณายืนยันว่าโรงพยาบาลได้รับตัวผู้ป่วยเรียบร้อยแล้ว: 'Please confirm that the hospital has admitted the patient',
  'ยืนยันการปิดเหตุนี้ กระบวนการช่วยเหลือฉุกเฉินจะถือว่าเสร็จสมบูรณ์': 'Confirm closing this case — the emergency response will be marked complete',
})

export default function HospitalCaseDetail() {
  const { id } = useParams<{ id: string }>()
  const c = useStore((s) => (id ? s.cases[id] : undefined))
  const hospitalConfirmAdmission = useStore((s) => s.hospitalConfirmAdmission)
  const completeCase = useStore((s) => s.completeCase)
  const t = useT()

  const [admitOpen, setAdmitOpen] = useState(false)
  const [admitLoading, setAdmitLoading] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [closeLoading, setCloseLoading] = useState(false)
  const [justClosed, setJustClosed] = useState(false)
  const [showAdmitSuccess, setShowAdmitSuccess] = useState(false)
  const [teamReady, setTeamReady] = useState(false)

  useEffect(() => {
    if (!showAdmitSuccess) return
    const timer = setTimeout(() => setShowAdmitSuccess(false), 2400)
    return () => clearTimeout(timer)
  }, [showAdmitSuccess])

  if (!id || !c) {
    return (
      <AppShell variant="dashboard" title={t('รายละเอียดเหตุ')}>
        <ErrorState title={t('ไม่พบเหตุนี้')} description={t('เหตุที่คุณค้นหาอาจถูกลบหรือไม่มีอยู่ในระบบ')} />
      </AppShell>
    )
  }

  function handleConfirmAdmission() {
    setAdmitLoading(true)
    setTimeout(() => {
      hospitalConfirmAdmission(id as string)
      setAdmitLoading(false)
      setAdmitOpen(false)
      setShowAdmitSuccess(true)
      toast({ title: t('ยืนยันรับผู้ป่วยเรียบร้อยแล้ว'), tone: 'success' })
    }, 700)
  }

  function handleCompleteCase() {
    setCloseLoading(true)
    setTimeout(() => {
      completeCase(id as string)
      setCloseLoading(false)
      setCloseOpen(false)
      setJustClosed(true)
      toast({ title: t('ปิดเหตุเรียบร้อยแล้ว'), tone: 'success' })
    }, 700)
  }

  const arrivedNotYet = !['hospital-arrived', 'hospital-received', 'completed'].includes(c.status)

  return (
    <AppShell variant="dashboard" title={t('เหตุหมายเลข {caseNumber}', { caseNumber: c.caseNumber })}>
      <div className="relative">
        <div className="flex flex-col gap-5">
        {showAdmitSuccess && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-2xl border border-success/20 bg-success/5 p-4 animate-scale-in"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success-ink">
              <CheckCircle2 className="size-6 animate-scale-in" />
            </span>
            <div>
              <p className="font-semibold text-ink">{t('ยืนยันรับผู้ป่วยเรียบร้อยแล้ว')}</p>
              <p className="text-sm text-muted">{t('กำลังเตรียมข้อมูลสำหรับขั้นตอนถัดไป')}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-meta text-muted">{c.caseNumber}</p>
            <p className="mt-0.5 text-title text-ink">
              {c.incidentDetails?.incidentType ?? t('รอรายละเอียดเหตุการณ์')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {c.assessment && <SeverityBadge severity={c.assessment.severity} />}
            <StatusBadge status={c.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] docked:lg:grid-cols-1 docked:2xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-5">
            {c.incidentDetails && (
              <Card className="space-y-3">
                <h3 className="text-heading text-ink">{t('รายละเอียดเหตุการณ์')}</h3>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
                    <span className="text-ink">{c.location?.address ?? c.incidentDetails.location}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="mt-0.5 size-4 shrink-0 text-muted" />
                    <span className="text-ink">{t('ผู้ป่วย {n} คน', { n: c.incidentDetails.patientCount })}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 size-4 shrink-0 text-muted" />
                    <span className="text-ink">{c.incidentDetails.callbackPhone || t('ยังไม่ระบุเบอร์ติดต่อกลับ')}</span>
                  </div>
                </div>
                {c.assessment && (
                  <div className="border-t border-border pt-3">
                    <p className="text-sm font-semibold text-ink">{t('อาการบาดเจ็บ')}</p>
                    <p className="mt-1 text-sm text-muted whitespace-pre-wrap">
                      {c.assessment.injuryDescription}
                    </p>
                  </div>
                )}
                {c.incidentDetails.notes && (
                  <div className="border-t border-border pt-3">
                    <p className="text-sm font-semibold text-ink">{t('หมายเหตุ')}</p>
                    <p className="mt-1 text-sm text-muted whitespace-pre-wrap">{c.incidentDetails.notes}</p>
                  </div>
                )}
              </Card>
            )}

            {c.patientInfo && <PatientInformationCard patient={c.patientInfo} updates={c.patientUpdates} />}

            {c.selectedHospital && c.hospitalDecision?.risk && (
              <HospitalDecisionCard decision={c.hospitalDecision} hospitalName={c.selectedHospital.name} />
            )}

            <CaseMediaGallery photos={c.photos} audioRecordings={c.audioRecordings} />

            <RelativeContacts caseId={c.id} contacts={c.relativeContacts} />

            {c.assignedRescueTeam && (
              <Card className="space-y-3">
                <h3 className="text-heading text-ink">
                  {t('หน่วยกู้ชีพที่นำส่ง')}
                </h3>
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-muted">{t('ชื่อหน่วย')}</p>
                    <p className="font-semibold text-ink">{c.assignedRescueTeam.name}</p>
                  </div>
                  <div>
                    <p className="text-muted">{t('ยานพาหนะ')}</p>
                    <p className="font-semibold text-ink">{c.assignedVehicle?.vehicle ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted">{t('เบอร์ติดต่อ')}</p>
                    <p className="font-semibold text-ink">{c.assignedRescueTeam.phone}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
          <div className="order-first flex flex-col gap-5 lg:order-none lg:sticky lg:top-[4.5rem] lg:self-start docked:lg:order-first docked:lg:static docked:2xl:order-none docked:2xl:sticky">
            {(c.status === 'transporting' || c.status === 'hospital-arrived') && (
              <Card className="flex flex-col items-start gap-3">
                <div className="flex items-start gap-3">
                  <Stethoscope className={clsx('mt-0.5 size-5 shrink-0', teamReady ? 'text-success-ink' : 'text-muted')} aria-hidden="true" />
                  <div>
                    <p className="text-subheading text-ink">{t('เตรียมทีมรักษา')}</p>
                    <p className="mt-0.5 text-small text-muted">{t('ทำเครื่องหมายเมื่อทีมแพทย์เตรียมพร้อมรับผู้ป่วย')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {teamReady && <PulseRing tone="success" size="sm" />}
                  <Button
                    variant={teamReady ? 'primary' : 'outline'}
                    size="sm"
                    aria-pressed={teamReady}
                    aria-label={t('ทำเครื่องหมายว่าทีมแพทย์เตรียมพร้อม')}
                    onClick={() => setTeamReady((v) => !v)}
                  >
                    {teamReady ? t('ทีมพร้อมแล้ว') : t('ทำเครื่องหมายว่าพร้อม')}
                  </Button>
                </div>
              </Card>
            )}

            {c.status === 'hospital-arrived' && (
              <Card className="flex flex-col items-start gap-3 border-warning/40 bg-warning/[0.06]">
                <div>
                  <p className="text-subheading text-ink">{t('ผู้ป่วยถึงโรงพยาบาลแล้ว')}</p>
                  <p className="mt-0.5 text-small text-muted">{t('กรุณายืนยันเมื่อโรงพยาบาลได้รับตัวผู้ป่วยเรียบร้อยแล้ว')}</p>
                </div>
                <Button onClick={() => setAdmitOpen(true)}>{t('ยืนยันรับผู้ป่วย')}</Button>
              </Card>
            )}

            {c.status === 'hospital-received' &&
              (justClosed ? (
                <SuccessState title={t('ปิดเหตุเรียบร้อยแล้ว')} description={t('กระบวนการช่วยเหลือฉุกเฉินเสร็จสมบูรณ์แล้ว')} />
              ) : (
                <Card className="flex flex-col items-start gap-3">
                  <div>
                    <p className="text-subheading text-ink">{t('รับผู้ป่วยเรียบร้อยแล้ว')}</p>
                    <p className="mt-0.5 text-small text-muted">{t('ปิดเหตุเมื่อกระบวนการช่วยเหลือฉุกเฉินเสร็จสมบูรณ์')}</p>
                  </div>
                  <Button onClick={() => setCloseOpen(true)}>{t('ปิดเหตุ')}</Button>
                </Card>
              ))}

            {c.status === 'completed' && (
              <div className="relative">
                {justClosed && (
                  <span className="absolute right-6 top-6" aria-hidden="true">
                    <PulseRing tone="success" size="lg" />
                  </span>
                )}
                <SuccessState
                  title={justClosed ? t('ปิดเหตุเรียบร้อยแล้ว') : t('ดำเนินการเสร็จสิ้นแล้ว')}
                  description={t('กระบวนการช่วยเหลือฉุกเฉินเสร็จสมบูรณ์แล้ว')}
                />
              </div>
            )}

            {arrivedNotYet && (
              <Card className="flex items-start gap-3">
                <Hourglass className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
                <div>
                  <p className="text-subheading text-ink">{t('ยังไม่มีผู้ป่วยถึงโรงพยาบาล')}</p>
                  <p className="mt-0.5 text-small text-muted">{t('ระบบจะแจ้งเตือนเมื่อผู้ป่วยถึงโรงพยาบาลของท่าน')}</p>
                </div>
              </Card>
            )}
            <Card>
              <h3 className="mb-4 text-heading text-ink">{t('ลำดับการดำเนินการ')}</h3>
              <CaseTimeline timeline={c.timeline} currentStatus={c.status} />
            </Card>
          </div>
        </div>
        </div>
      </div>

      <ConfirmationModal
        open={admitOpen}
        title={t('ยืนยันการรับผู้ป่วย')}
        message={t('กรุณายืนยันว่าโรงพยาบาลได้รับตัวผู้ป่วยเรียบร้อยแล้ว')}
        confirmLabel={t('ยืนยันรับผู้ป่วย')}
        confirmLoading={admitLoading}
        onConfirm={handleConfirmAdmission}
        onCancel={() => setAdmitOpen(false)}
      />

      <ConfirmationModal
        open={closeOpen}
        title={t('ปิดเหตุ')}
        message={t('ยืนยันการปิดเหตุนี้ กระบวนการช่วยเหลือฉุกเฉินจะถือว่าเสร็จสมบูรณ์')}
        confirmLabel={t('ปิดเหตุ')}
        confirmLoading={closeLoading}
        onConfirm={handleCompleteCase}
        onCancel={() => setCloseOpen(false)}
      />
    </AppShell>
  )
}
