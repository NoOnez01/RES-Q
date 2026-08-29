import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Check, MapPin, Phone, Users, AlertTriangle, Navigation as NavigationIcon } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/StatusBadge'
import { SeverityBadge } from '@/components/SeverityBadge'
import { MapPanel } from '@/components/MapPanel'
import type { MapPin as MapPinT } from '@/components/MapPanel'
import { CaseTimeline } from '@/components/CaseTimeline'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { PatientInformationCard } from '@/components/PatientInformationCard'
import { CaseMediaGallery } from '@/components/CaseMediaGallery'
import { RelativeContacts } from '@/components/RelativeContacts'
import { SpeechToTextPanel } from '@/components/SpeechToTextPanel'
import { RadioCard } from '@/components/ui/RadioCard'
import { ErrorState } from '@/components/States'
import { Input } from '@/components/ui/Field'
import { VehicleLevelBadge } from '@/components/VehicleLevelBadge'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { formatDateTime } from '@/lib/utils'
import type { CaseStatus } from '@/lib/types'
import { Truck } from 'lucide-react'

const WORKFLOW_STEPS = ['เดินทาง', 'ถึงที่เกิดเหตุ', 'บันทึกข้อมูล', 'เลือกโรงพยาบาล', 'นำส่ง', 'เสร็จสิ้น']

function workflowStepIndex(status: CaseStatus, hasHospital: boolean): number {
  switch (status) {
    case 'rescue-assigned':
    case 'rescue-en-route':
      return 0
    case 'rescue-arrived':
      return 2
    case 'assisted':
      return hasHospital ? 4 : 3
    case 'transporting':
      return 4
    case 'hospital-arrived':
    case 'hospital-received':
    case 'completed':
      return 5
    default:
      return 0
  }
}

function WorkflowStepper({ status, hasHospital }: { status: CaseStatus; hasHospital: boolean }) {
  const currentIndex = workflowStepIndex(status, hasHospital)
  return (
    <div className="flex items-start" role="list" aria-label="ความคืบหน้าของเคส">
      {WORKFLOW_STEPS.map((label, i) => {
        const done = i < currentIndex
        const current = i === currentIndex
        return (
          <div key={label} role="listitem" className={clsx('flex items-start', i < WORKFLOW_STEPS.length - 1 ? 'flex-1' : 'shrink-0')}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={clsx(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors',
                  done && 'border-primary bg-primary text-white',
                  current && !done && 'border-primary bg-white text-primary animate-pulse-glow',
                  !done && !current && 'border-border bg-white text-muted/50',
                )}
              >
                {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={clsx(
                  'hidden max-w-[64px] text-center text-[10px] leading-tight sm:block',
                  current ? 'font-bold text-primary' : done ? 'text-navy' : 'text-muted/60',
                )}
              >
                {label}
              </span>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <span className={clsx('mt-3 h-0.5 flex-1', done ? 'bg-primary' : 'bg-border')} aria-hidden="true" />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function RescueCaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const c = useStore((s) => (id ? s.cases[id] : undefined))
  const currentUser = useStore((s) => s.currentUser)
  const rescueTeams = useStore((s) => s.rescueTeams)
  const rescueAcceptCase = useStore((s) => s.rescueAcceptCase)
  const rescueRejectCase = useStore((s) => s.rescueRejectCase)
  const assignVehicle = useStore((s) => s.assignVehicle)
  const startTransport = useStore((s) => s.startTransport)
  const addPatientUpdate = useStore((s) => s.addPatientUpdate)

  const [confirmOpen, setConfirmOpen] = useState<'accept' | 'reject' | null>(null)
  const [loading, setLoading] = useState(false)
  const [updateNote, setUpdateNote] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)
  const [pendingVehicleId, setPendingVehicleId] = useState<string | null>(null)
  const [crewCount, setCrewCount] = useState('')

  if (!id || !c) {
    return (
      <AppShell variant="dashboard" title="รายละเอียดเคส">
        <ErrorState
          title="ไม่พบเคสนี้"
          description="เคสอาจถูกลบหรือไม่มีอยู่ในระบบ"
          onRetry={() => navigate('/rescue/dashboard')}
          retryLabel="กลับแดชบอร์ด"
        />
      </AppShell>
    )
  }

  function handleAccept() {
    setLoading(true)
    setTimeout(() => {
      rescueAcceptCase(c!.id)
      setLoading(false)
      setConfirmOpen(null)
      toast({ title: 'รับเคสแล้ว', message: 'เริ่มเดินทางไปยังจุดเกิดเหตุได้ทันที', tone: 'success' })
    }, 500)
  }

  function handleReject() {
    setLoading(true)
    setTimeout(() => {
      rescueRejectCase(c!.id)
      setLoading(false)
      setConfirmOpen(null)
      toast({ title: 'ปฏิเสธเคสแล้ว', message: 'ระบบกำลังค้นหาหน่วยกู้ชีพใหม่', tone: 'info' })
      navigate('/rescue/dashboard')
    }, 500)
  }

  function handleStartTransport() {
    startTransport(c!.id)
    toast({ title: 'เริ่มนำส่งโรงพยาบาล', message: 'กำลังนำทางไปยังโรงพยาบาลที่เลือก', tone: 'info' })
    navigate(`/navigation/${c!.id}`)
  }

  function handlePickVehicle(vehicleId: string) {
    const vehicle = ownVehicles.find((v) => v.id === vehicleId)
    if (!vehicle) return
    setPendingVehicleId(vehicleId)
    setCrewCount(String(vehicle.members))
  }

  function handleConfirmVehicle() {
    const vehicle = ownVehicles.find((v) => v.id === pendingVehicleId)
    const count = Number(crewCount)
    if (!vehicle || !c || !crewCount.trim() || Number.isNaN(count) || count < 1) return
    assignVehicle(c.id, vehicle, count)
    setPendingVehicleId(null)
    toast({ title: 'เลือกรถ/ทีมที่รับผิดชอบแล้ว', message: `${vehicle.unitCode} · ${count} คน`, tone: 'success' })
  }

  function handleAddUpdate() {
    if (!updateNote.trim()) return
    setUpdateLoading(true)
    setTimeout(() => {
      addPatientUpdate(c!.id, updateNote.trim())
      setUpdateNote('')
      setUpdateLoading(false)
      toast({ title: 'บันทึกอัปเดตอาการแล้ว', message: 'ศูนย์สั่งการและโรงพยาบาลจะเห็นอัปเดตนี้ทันที', tone: 'success' })
    }, 400)
  }

  const ownVehicles = rescueTeams.find((t) => t.id === currentUser?.rescueTeamId)?.vehicles ?? []

  const pins: MapPinT[] = []
  if (c.location) {
    pins.push({ id: 'incident', lat: c.location.lat, lng: c.location.lng, label: 'จุดเกิดเหตุ', kind: 'incident' })
  }
  if (c.assignedRescueTeam) {
    pins.push({
      id: 'rescue',
      lat: c.assignedRescueTeam.base.lat,
      lng: c.assignedRescueTeam.base.lng,
      label: c.assignedRescueTeam.name,
      kind: 'rescue',
    })
  }

  return (
    <AppShell variant="dashboard" title="รายละเอียดเคส">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 flex flex-col gap-5">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm font-bold text-primary">{c.caseNumber}</p>
              <p className="mt-1 text-lg font-bold text-navy">{c.incidentDetails?.incidentType ?? 'รอรายละเอียดเหตุการณ์'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {c.assessment && <SeverityBadge severity={c.assessment.severity} />}
              <StatusBadge status={c.status} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-bold text-navy">ความคืบหน้าการปฏิบัติงาน</h3>
          <WorkflowStepper status={c.status} hasHospital={!!c.selectedHospital} />
        </Card>

        {c.incidentDetails && (
          <Card className="space-y-3">
            <h3 className="font-bold text-navy">รายละเอียดเหตุการณ์</h3>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-navy">{c.location?.address ?? c.incidentDetails.location}</span>
              </div>
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-navy">ผู้ป่วย {c.incidentDetails.patientCount} คน</span>
              </div>
              {c.assessment && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-navy">{c.assessment.injuryDescription}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-navy">{c.incidentDetails.callbackPhone}</span>
              </div>
            </div>
            {c.incidentDetails.notes && (
              <p className="border-t border-border pt-3 text-sm text-muted">{c.incidentDetails.notes}</p>
            )}
          </Card>
        )}

        {c.status !== 'completed' && <CaseMediaGallery photos={c.photos} audioRecordings={c.audioRecordings} />}

        <RelativeContacts caseId={c.id} contacts={c.relativeContacts} />

        {pins.length > 0 && (
          <Card className="!p-0 overflow-hidden">
            <MapPanel pins={pins} height="280px" />
          </Card>
        )}

        {c.assignedRescueTeam && (
          <Card className="space-y-3">
            <h3 className="font-bold text-navy">หน่วยกู้ชีพที่รับผิดชอบ</h3>
            <p className="text-sm text-navy">{c.assignedRescueTeam.name}</p>
            <p className="text-xs text-muted">{c.assignedRescueTeam.phone}</p>

            {c.assignedVehicle ? (
              <div className="rounded-xl border border-primary/20 bg-skyblue-pale p-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
                  <Truck className="size-4 text-primary" /> {c.assignedVehicle.unitCode}
                  <VehicleLevelBadge level={c.assignedVehicle.level} />
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {c.assignedVehicle.vehicle} · {c.assignedVehicleCrewCount ?? c.assignedVehicle.members} คน
                  {c.assignedVehicle.plateNumber && ` · ทะเบียน ${c.assignedVehicle.plateNumber}`}
                </p>
                {c.assignedVehicle.driverName && (
                  <p className="mt-0.5 text-xs text-muted">คนขับ: {c.assignedVehicle.driverName}</p>
                )}
              </div>
            ) : (
              c.status !== 'completed' &&
              ownVehicles.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-navy">เลือกรถ/ทีมที่รับผิดชอบ</p>
                  {ownVehicles.map((v) => (
                    <RadioCard
                      key={v.id}
                      selected={pendingVehicleId === v.id}
                      onClick={() => handlePickVehicle(v.id)}
                      icon={<Truck className="size-5 text-primary" />}
                      title={v.unitCode}
                      description={`${v.vehicle} · ${v.members} คน`}
                      badge={<VehicleLevelBadge level={v.level} />}
                    />
                  ))}
                  {pendingVehicleId && (
                    <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-skyblue-pale p-3">
                      <Input
                        label="จำนวนทีมที่ออกปฏิบัติงานจริง"
                        type="number"
                        min={1}
                        value={crewCount}
                        onChange={(e) => setCrewCount(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button fullWidth onClick={handleConfirmVehicle} disabled={!crewCount.trim()}>
                          ยืนยันเลือกรถ/ทีม
                        </Button>
                        <Button variant="outline" onClick={() => setPendingVehicleId(null)}>
                          ยกเลิก
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </Card>
        )}

        {c.patientInfo && (
          <>
            <PatientInformationCard patient={c.patientInfo} updates={c.patientUpdates} />
            {c.status !== 'completed' && (
              <Card className="space-y-3">
                <h3 className="font-bold text-navy">อัปเดตอาการผู้ป่วย</h3>
                <SpeechToTextPanel
                  value={updateNote}
                  onChange={setUpdateNote}
                  label="มีการเปลี่ยนแปลงอาการหรือไม่ (พิมพ์หรือพูด)"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  loading={updateLoading}
                  disabled={!updateNote.trim()}
                  onClick={handleAddUpdate}
                >
                  บันทึกอัปเดต
                </Button>
              </Card>
            )}
          </>
        )}

        {c.selectedHospital && (
          <Card className="space-y-1">
            <h3 className="font-bold text-navy">โรงพยาบาลที่เลือก</h3>
            <p className="text-sm text-navy">{c.selectedHospital.name}</p>
            <p className="text-xs text-muted">{c.selectedHospital.location.address}</p>
          </Card>
        )}

        <Card>
          <h3 className="mb-3 font-bold text-navy">ไทม์ไลน์เคส</h3>
          <CaseTimeline timeline={c.timeline} currentStatus={c.status} />
        </Card>

        <Card className="sticky bottom-4 space-y-3">
          {c.status === 'rescue-assigned' && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="primary" size="lg" fullWidth onClick={() => setConfirmOpen('accept')}>
                รับเคส
              </Button>
              <Button variant="outline" fullWidth onClick={() => setConfirmOpen('reject')}>
                ปฏิเสธเคส
              </Button>
            </div>
          )}

          {c.status === 'rescue-en-route' && (
            <Button variant="primary" fullWidth size="lg" icon={<NavigationIcon className="size-5" />} onClick={() => navigate(`/navigation/${c.id}`)}>
              เริ่มนำทางไปยังจุดเกิดเหตุ
            </Button>
          )}

          {c.status === 'rescue-arrived' && (
            <div className="space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle2 className="size-5" />
                <p className="font-semibold">ถึงจุดเกิดเหตุแล้ว</p>
              </div>
              <Button variant="primary" fullWidth size="lg" onClick={() => navigate(`/rescue/patient-record/${c.id}`)}>
                บันทึกข้อมูลผู้ป่วย
              </Button>
            </div>
          )}

          {c.status === 'assisted' && !c.selectedHospital && (
            <Button variant="primary" fullWidth size="lg" onClick={() => navigate(`/hospital-selection?caseId=${c.id}`)}>
              เลือกโรงพยาบาล
            </Button>
          )}

          {c.status === 'assisted' && c.selectedHospital && (
            <Button variant="primary" fullWidth size="lg" icon={<NavigationIcon className="size-5" />} onClick={handleStartTransport}>
              เริ่มนำส่งโรงพยาบาล
            </Button>
          )}

          {c.status === 'transporting' && (
            <Button variant="primary" fullWidth size="lg" icon={<NavigationIcon className="size-5" />} onClick={() => navigate(`/navigation/${c.id}`)}>
              กำลังนำส่ง — ดูเส้นทาง
            </Button>
          )}

          {(c.status === 'hospital-arrived' || c.status === 'hospital-received' || c.status === 'completed') && (
            <div className="flex items-center justify-center gap-2 py-2 text-center text-success">
              <CheckCircle2 className="size-5" />
              <p className="font-semibold">ส่งมอบผู้ป่วยให้โรงพยาบาลเรียบร้อยแล้ว</p>
            </div>
          )}

          <p className="text-center text-xs text-muted">อัปเดตล่าสุด {formatDateTime(c.updatedAt)}</p>
        </Card>
        </div>
      </div>

      <ConfirmationModal
        open={confirmOpen === 'accept'}
        title="ยืนยันการรับเคส"
        message={`คุณต้องการรับเคส ${c.caseNumber} และเริ่มเดินทางไปยังจุดเกิดเหตุใช่หรือไม่`}
        confirmLabel="ยืนยันรับเคส"
        onConfirm={handleAccept}
        onCancel={() => setConfirmOpen(null)}
        confirmLoading={loading}
      />
      <ConfirmationModal
        open={confirmOpen === 'reject'}
        title="ยืนยันการปฏิเสธเคส"
        message={`คุณต้องการปฏิเสธเคส ${c.caseNumber} หรือไม่ ระบบจะค้นหาหน่วยกู้ชีพอื่นแทน`}
        confirmLabel="ยืนยันปฏิเสธ"
        tone="danger"
        onConfirm={handleReject}
        onCancel={() => setConfirmOpen(null)}
        confirmLoading={loading}
      />
    </AppShell>
  )
}
