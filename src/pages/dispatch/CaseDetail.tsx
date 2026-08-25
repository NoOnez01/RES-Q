import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Phone, User, Users, Activity, FileText, StickyNote, Truck, Hash, CheckCircle2, ClipboardList, Pencil } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { RadioCard } from '@/components/ui/RadioCard'
import { StatusBadge } from '@/components/StatusBadge'
import { SeverityBadge } from '@/components/SeverityBadge'
import { CaseTimeline } from '@/components/CaseTimeline'
import { MapPanel } from '@/components/MapPanel'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { ErrorState, SuccessState } from '@/components/States'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { useStore, MOCK_RESCUE_TEAMS } from '@/lib/store'
import type { RescueTeam } from '@/lib/types'
import { toast } from '@/lib/toast'

const CONSCIOUS_LABEL: Record<string, string> = {
  conscious: 'รู้สึกตัวดี',
  unconscious: 'หมดสติ',
  unknown: 'ไม่ทราบ',
}

export default function DispatchCaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const emergencyCase = useStore((s) => (id ? s.cases[id] : undefined))
  const startFindingRescue = useStore((s) => s.startFindingRescue)
  const assignRescueTeam = useStore((s) => s.assignRescueTeam)

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [findingLoading, setFindingLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)
  const [justAssigned, setJustAssigned] = useState(false)

  if (!id || !emergencyCase) {
    return (
      <AppShell variant="dashboard" title="รายละเอียดเคส">
        <ErrorState title="ไม่พบเคสนี้" description="เคสนี้อาจถูกลบหรือไม่มีอยู่ในระบบ" />
      </AppShell>
    )
  }

  const c = emergencyCase
  const details = c.incidentDetails
  const selectedTeam = MOCK_RESCUE_TEAMS.find((t) => t.id === selectedTeamId) ?? null

  function handleStartFinding() {
    setFindingLoading(true)
    setTimeout(() => {
      startFindingRescue(id!)
      setFindingLoading(false)
      toast({
        title: 'เริ่มค้นหาหน่วยกู้ภัยแล้ว',
        message: `เคส ${c.caseNumber} กำลังค้นหาหน่วยกู้ภัยที่พร้อมปฏิบัติงาน`,
        tone: 'info',
      })
    }, 500)
  }

  function handleConfirmAssign() {
    if (!selectedTeam) return
    setAssignLoading(true)
    setTimeout(() => {
      assignRescueTeam(id!, selectedTeam as RescueTeam)
      setAssignLoading(false)
      setConfirmOpen(false)
      setJustAssigned(true)
      toast({
        title: 'มอบหมายหน่วยกู้ภัยสำเร็จ',
        message: `${selectedTeam.name} ได้รับมอบหมายเคส ${c.caseNumber} แล้ว`,
        tone: 'success',
      })
      setTimeout(() => setJustAssigned(false), 3200)
    }, 600)
  }

  const isAssignedOrLater =
    c.status !== 'received' && c.status !== 'finding-rescue' && c.status !== 'completed'

  return (
    <AppShell variant="dashboard" title="รายละเอียดเคส">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-lg font-extrabold text-primary">{c.caseNumber}</p>
          <p className="text-sm text-muted">สร้างเคสเมื่อ {new Date(c.createdAt).toLocaleString('th-TH')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {c.assessment && <SeverityBadge severity={c.assessment.severity} />}
          <span className="inline-flex items-center gap-1.5" aria-label="สถานะเคสอัปเดตแบบเรียลไทม์">
            <PulseRing
              tone={c.status === 'completed' ? 'success' : c.status === 'called-1669' ? 'emergency' : 'primary'}
              size="sm"
            />
            <StatusBadge status={c.status} />
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 text-base font-bold text-navy">รายละเอียดเหตุการณ์</h2>
            {details ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-2.5">
                  <Activity className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted">ประเภทเหตุการณ์</p>
                    <p className="text-sm font-semibold text-navy">{details.incidentType}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Users className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted">จำนวนผู้ป่วย</p>
                    <p className="text-sm font-semibold text-navy">{details.patientCount} คน</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <User className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted">ระดับความรู้สึกตัว</p>
                    <p className="text-sm font-semibold text-navy">{CONSCIOUS_LABEL[details.conscious] ?? details.conscious}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted">เบอร์ติดต่อกลับ</p>
                    <p className="text-sm font-semibold text-navy">{details.callbackPhone}</p>
                  </div>
                </div>
                {details.notes && (
                  <div className="flex items-start gap-2.5 sm:col-span-2">
                    <StickyNote className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-muted">หมายเหตุเพิ่มเติม</p>
                      <p className="text-sm font-semibold text-navy">{details.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">ยังไม่มีรายละเอียดเหตุการณ์จากผู้แจ้ง</p>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-navy">การประเมินความรุนแรง (ศูนย์ 1669)</h2>
              {c.assessment && c.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Pencil className="size-4" />}
                  onClick={() => navigate(`/dispatch/emergency-details/${id}`)}
                >
                  แก้ไขการประเมิน
                </Button>
              )}
            </div>
            {c.assessment ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted">ลักษณะการบาดเจ็บ</p>
                    <p className="text-sm font-semibold text-navy">{c.assessment.injuryDescription}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted">ยังไม่มีการประเมินระดับความรุนแรงจากศูนย์ 1669</p>
                <Button
                  size="sm"
                  icon={<ClipboardList className="size-4" />}
                  onClick={() => navigate(`/dispatch/emergency-details/${id}`)}
                >
                  กรอกรายละเอียดเหตุการณ์
                </Button>
              </div>
            )}
          </Card>

          {c.photos.length > 0 && (
            <Card>
              <h2 className="mb-4 text-base font-bold text-navy">ภาพถ่ายจุดเกิดเหตุ</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {c.photos.map((p) => (
                  <img
                    key={p.id}
                    src={p.dataUrl}
                    alt="ภาพจุดเกิดเหตุ"
                    className="aspect-square w-full rounded-xl border border-border object-cover"
                  />
                ))}
              </div>
            </Card>
          )}

          {c.location && (
            <Card className="p-0 overflow-hidden">
              <MapPanel
                pins={[
                  {
                    id: 'incident',
                    lat: c.location.lat,
                    lng: c.location.lng,
                    label: 'จุดเกิดเหตุ',
                    kind: 'incident',
                  },
                ]}
                height="280px"
              />
              <p className="p-4 text-sm text-muted">{c.location.address}</p>
            </Card>
          )}

          <Card>
            <h2 className="mb-4 text-base font-bold text-navy">ไทม์ไลน์เคส</h2>
            <CaseTimeline timeline={c.timeline} currentStatus={c.status} />
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="mb-4 text-base font-bold text-navy">การดำเนินการ</h2>

            {c.status === 'received' && !c.assessment && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">กรุณากรอกรายละเอียดเหตุการณ์และประเมินระดับความรุนแรงก่อนค้นหาหน่วยกู้ภัย</p>
                <Button fullWidth icon={<ClipboardList className="size-4" />} onClick={() => navigate(`/dispatch/emergency-details/${id}`)}>
                  กรอกรายละเอียดเหตุการณ์
                </Button>
              </div>
            )}

            {c.status === 'received' && c.assessment && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">เคสนี้ประเมินความรุนแรงแล้ว พร้อมค้นหาหน่วยกู้ภัยที่ใกล้ที่สุด</p>
                <Button fullWidth loading={findingLoading} onClick={handleStartFinding}>
                  ค้นหาหน่วยกู้ภัย
                </Button>
              </div>
            )}

            {c.status === 'finding-rescue' && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">เลือกหน่วยกู้ภัยที่ต้องการมอบหมายให้เคสนี้</p>
                <div className="flex flex-col gap-3">
                  {MOCK_RESCUE_TEAMS.map((team) => (
                    <RadioCard
                      key={team.id}
                      selected={selectedTeamId === team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      icon={<Truck className="size-5 text-primary" />}
                      title={team.name}
                      description={`${team.unitCode} · ${team.vehicle} · ทีม ${team.members} คน`}
                    />
                  ))}
                </div>
                <Button fullWidth disabled={!selectedTeamId} onClick={() => setConfirmOpen(true)}>
                  มอบหมายหน่วยนี้
                </Button>
              </div>
            )}

            {isAssignedOrLater && c.assignedRescueTeam && (
              <div className="flex flex-col gap-3">
                {justAssigned && (
                  <div
                    role="status"
                    className="animate-scale-in flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-sm font-semibold text-success"
                  >
                    <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
                    มอบหมายหน่วยกู้ภัยสำเร็จแล้ว
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-start gap-2.5">
                    <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-muted">หน่วยกู้ภัยที่รับผิดชอบ</p>
                      <p className="text-sm font-semibold text-navy">{c.assignedRescueTeam.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Hash className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-muted">รหัสหน่วย</p>
                      <p className="text-sm font-semibold text-navy">{c.assignedRescueTeam.unitCode}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Activity className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-muted">ยานพาหนะ</p>
                      <p className="text-sm font-semibold text-navy">{c.assignedRescueTeam.vehicle}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-muted">เบอร์ติดต่อ</p>
                      <p className="text-sm font-semibold text-navy">{c.assignedRescueTeam.phone}</p>
                    </div>
                  </div>
                </div>
                <p className="rounded-xl bg-skyblue-light px-3 py-2.5 text-xs font-medium text-muted">
                  หน่วยกู้ภัยรับผิดชอบเคสนี้แล้ว
                </p>
              </div>
            )}

            {c.status === 'completed' && (
              <SuccessState title="เคสเสร็จสิ้นแล้ว" description="กระบวนการช่วยเหลือฉุกเฉินเสร็จสมบูรณ์" />
            )}
          </Card>
        </div>
      </div>

      <ConfirmationModal
        open={confirmOpen}
        title="ยืนยันการมอบหมายหน่วยกู้ภัย"
        message={selectedTeam ? `ต้องการมอบหมาย "${selectedTeam.name}" ให้รับผิดชอบเคส ${c.caseNumber} ใช่หรือไม่` : ''}
        confirmLabel="ยืนยันมอบหมาย"
        confirmLoading={assignLoading}
        onConfirm={handleConfirmAssign}
        onCancel={() => setConfirmOpen(false)}
      />
        </div>
      </div>
    </AppShell>
  )
}
