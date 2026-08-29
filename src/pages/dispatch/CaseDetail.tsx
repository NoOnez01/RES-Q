import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Phone,
  User,
  Users,
  Activity,
  FileText,
  StickyNote,
  Truck,
  Hash,
  CheckCircle2,
  ClipboardList,
  Pencil,
  Wrench,
  AlertTriangle,
  IdCard,
  XCircle,
  ArrowUpCircle,
} from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { RadioCard } from '@/components/ui/RadioCard'
import { StatusBadge } from '@/components/StatusBadge'
import { SeverityBadge } from '@/components/SeverityBadge'
import { CaseTimeline } from '@/components/CaseTimeline'
import { CaseMediaGallery } from '@/components/CaseMediaGallery'
import { PatientInformationCard } from '@/components/PatientInformationCard'
import { RelativeContacts } from '@/components/RelativeContacts'
import { MapPanel } from '@/components/MapPanel'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { ErrorState, SuccessState } from '@/components/States'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { useStore } from '@/lib/store'
import { recommendAssignment, rankRescueTeams, requiredEquipmentFor, nextLevelUp } from '@/lib/rescueAssignment'
import { DEFAULT_INCIDENT_LOCATION } from '@/lib/mockData'
import { toast } from '@/lib/toast'
import { VEHICLE_LEVEL_RANK } from '@/lib/types'
import type { VehicleLevel, RescueTeam } from '@/lib/types'
import { VehicleLevelBadge, VEHICLE_LEVEL_SELECTED_CLASSES } from '@/components/VehicleLevelBadge'
import { Textarea } from '@/components/ui/Field'

const CONSCIOUS_LABEL: Record<string, string> = {
  conscious: 'รู้สึกตัวดี',
  unconscious: 'หมดสติ',
  unknown: 'ไม่ทราบ',
}

export default function DispatchCaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const emergencyCase = useStore((s) => (id ? s.cases[id] : undefined))
  const cases = useStore((s) => s.cases)
  const rescueTeams = useStore((s) => s.rescueTeams)
  const startFindingRescue = useStore((s) => s.startFindingRescue)
  const assignRescueTeam = useStore((s) => s.assignRescueTeam)
  const addSupportingRescueTeam = useStore((s) => s.addSupportingRescueTeam)
  const closeCaseWithAdvice = useStore((s) => s.closeCaseWithAdvice)
  const confirmRescueSeverity = useStore((s) => s.confirmRescueSeverity)

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [includeSupport, setIncludeSupport] = useState(true)
  const [findingLoading, setFindingLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)
  const [justAssigned, setJustAssigned] = useState(false)
  const [showAddSupport, setShowAddSupport] = useState(false)
  const [addSupportTeamId, setAddSupportTeamId] = useState<string | null>(null)
  const [addSupportLoading, setAddSupportLoading] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<VehicleLevel | null>(null)
  const [showCloseAdvice, setShowCloseAdvice] = useState(false)
  const [closeAdviceNote, setCloseAdviceNote] = useState('')
  const [closeAdviceLoading, setCloseAdviceLoading] = useState(false)
  const [escalateConfirmOpen, setEscalateConfirmOpen] = useState(false)
  const [escalating, setEscalating] = useState(false)

  const recommendation = useMemo(() => {
    if (!emergencyCase) return null
    return recommendAssignment(
      rescueTeams,
      emergencyCase.location ?? DEFAULT_INCIDENT_LOCATION,
      emergencyCase.incidentDetails?.incidentType,
      Object.values(cases),
      emergencyCase.id,
      selectedLevel ?? undefined,
    )
  }, [emergencyCase, cases, rescueTeams, selectedLevel])

  if (!id || !emergencyCase || !recommendation) {
    return (
      <AppShell variant="dashboard" title="รายละเอียดเคส">
        <ErrorState title="ไม่พบเคสนี้" description="เคสนี้อาจถูกลบหรือไม่มีอยู่ในระบบ" />
      </AppShell>
    )
  }

  const c = emergencyCase
  const details = c.incidentDetails
  const selectedTeam = recommendation.ranked.find((r) => r.team.id === selectedTeamId)?.team ?? null
  const supportTeam = includeSupport && recommendation.needsSupport ? recommendation.support?.team ?? null : null

  function handleStartFinding() {
    setFindingLoading(true)
    setTimeout(() => {
      startFindingRescue(id!)
      setFindingLoading(false)
      toast({
        title: 'เริ่มค้นหาหน่วยกู้ชีพแล้ว',
        message: `เคส ${c.caseNumber} กำลังค้นหาหน่วยกู้ชีพที่พร้อมปฏิบัติงาน`,
        tone: 'info',
      })
    }, 500)
  }

  function handleCloseAdvice() {
    if (!id || !closeAdviceNote.trim()) return
    setCloseAdviceLoading(true)
    setTimeout(() => {
      closeCaseWithAdvice(id, closeAdviceNote.trim())
      setCloseAdviceLoading(false)
      toast({ title: 'ปิดเคสแล้ว', message: 'บันทึกว่าให้คำแนะนำทางโทรศัพท์ ไม่ต้องส่งหน่วยกู้ชีพ', tone: 'success' })
      navigate('/dispatch/dashboard')
    }, 400)
  }

  const escalateLevel = c.assignedVehicle?.level ? nextLevelUp(c.assignedVehicle.level) : null

  // Reused wherever a "close without dispatch" option applies -- both when
  // there's no assessment yet, and (below) when the assessed severity turns
  // out to be non-urgent -- so the note/confirm markup exists in one place.
  const closeAdviceBlock = !showCloseAdvice ? (
    <Button variant="outline" fullWidth icon={<XCircle className="size-4" />} onClick={() => setShowCloseAdvice(true)}>
      ปิดเคส (ให้คำแนะนำแล้ว)
    </Button>
  ) : (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <p className="text-sm font-semibold text-navy">บันทึกคำแนะนำที่ให้ทางโทรศัพท์</p>
      <Textarea
        value={closeAdviceNote}
        onChange={(e) => setCloseAdviceNote(e.target.value)}
        rows={2}
        placeholder="เช่น ให้คำแนะนำการปฐมพยาบาลเบื้องต้น ไม่ต้องส่งหน่วยกู้ชีพ"
      />
      <div className="flex gap-2">
        <Button fullWidth disabled={!closeAdviceNote.trim()} loading={closeAdviceLoading} onClick={handleCloseAdvice}>
          ยืนยันปิดเคส
        </Button>
        <Button variant="outline" onClick={() => setShowCloseAdvice(false)} disabled={closeAdviceLoading}>
          ยกเลิก
        </Button>
      </div>
    </div>
  )

  function handleConfirmSeverity(accept: boolean) {
    if (!id || !c.rescueSeverityProposal) return
    const gotWorse = accept && c.assessment && c.rescueSeverityProposal.severity < c.assessment.severity
    confirmRescueSeverity(id, accept)
    if (gotWorse && escalateLevel) {
      setEscalateConfirmOpen(true)
    }
  }

  function handleConfirmAssign() {
    if (!selectedTeam) return
    setAssignLoading(true)
    setTimeout(() => {
      assignRescueTeam(id!, selectedTeam, supportTeam)
      setAssignLoading(false)
      setConfirmOpen(false)
      setJustAssigned(true)
      toast({
        title: 'มอบหมายหน่วยกู้ชีพสำเร็จ',
        message: supportTeam
          ? `${selectedTeam.name} และ ${supportTeam.name} ได้รับมอบหมายเคส ${c.caseNumber} แล้ว`
          : `${selectedTeam.name} ได้รับมอบหมายเคส ${c.caseNumber} แล้ว`,
        tone: 'success',
      })
      setTimeout(() => setJustAssigned(false), 3200)
    }, 600)
  }

  const isAssignedOrLater =
    c.status !== 'received' && c.status !== 'finding-rescue' && c.status !== 'completed'

  // For adding a support team *after* the primary is already assigned --
  // unlike `recommendation` above, this doesn't exclude the current case
  // from availability, so the already-assigned primary team correctly shows
  // as busy (can't support its own case) instead of appearing pickable.
  const requiredEquipment = requiredEquipmentFor(c.incidentDetails?.incidentType)
  const bestTeamLevel = (team: RescueTeam): VehicleLevel =>
    team.vehicles.reduce<VehicleLevel>((best, v) => {
      const lvl = v.level ?? 'BLS'
      return VEHICLE_LEVEL_RANK.indexOf(lvl) < VEHICLE_LEVEL_RANK.indexOf(best) ? lvl : best
    }, 'BLS')
  let supportCandidates = rankRescueTeams(rescueTeams, c.location ?? DEFAULT_INCIDENT_LOCATION, requiredEquipment, Object.values(cases)).filter(
    (r) => r.team.id !== c.assignedRescueTeam?.id,
  )
  if (escalating) {
    // Escalating after a worse severity re-assessment -- consider ALS/CLS
    // units first regardless of equipment match, since capability is the
    // point of this particular support request.
    supportCandidates = [...supportCandidates].sort(
      (a, b) => VEHICLE_LEVEL_RANK.indexOf(bestTeamLevel(a.team)) - VEHICLE_LEVEL_RANK.indexOf(bestTeamLevel(b.team)),
    )
  }
  const canAddSupport =
    isAssignedOrLater && c.status !== 'completed' && !!c.assignedRescueTeam && !c.supportingRescueTeam

  function handleAddSupport() {
    const team = supportCandidates.find((r) => r.team.id === addSupportTeamId)?.team
    if (!team || !id) return
    setAddSupportLoading(true)
    setTimeout(() => {
      addSupportingRescueTeam(id, team)
      setAddSupportLoading(false)
      setShowAddSupport(false)
      setAddSupportTeamId(null)
      toast({ title: 'เพิ่มหน่วยสนับสนุนแล้ว', message: `${team.name} เข้าร่วมช่วยเหลือเคสนี้`, tone: 'success' })
    }, 500)
  }

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
              <p className="text-sm text-muted">ยังไม่ได้กรอกรายละเอียดเหตุการณ์</p>
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

          {c.rescueSeverityProposal && (
            <Card className="border-warning/30 bg-warning/5">
              <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-navy">
                <AlertTriangle className="size-4 text-warning" />
                หน่วยกู้ชีพเสนอปรับระดับความรุนแรง
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                {c.assessment && (
                  <div className="flex flex-col items-start gap-1">
                    <p className="text-xs text-muted">เดิม</p>
                    <SeverityBadge severity={c.assessment.severity} />
                  </div>
                )}
                <div className="flex flex-col items-start gap-1">
                  <p className="text-xs text-muted">เสนอโดยหน่วยกู้ชีพ</p>
                  <SeverityBadge severity={c.rescueSeverityProposal.severity} />
                </div>
              </div>
              {c.rescueSeverityProposal.note && (
                <p className="mt-3 text-sm text-navy">{c.rescueSeverityProposal.note}</p>
              )}
              <div className="mt-4 flex gap-2">
                <Button fullWidth onClick={() => handleConfirmSeverity(true)}>
                  ยืนยันระดับสี
                </Button>
                <Button variant="outline" fullWidth onClick={() => handleConfirmSeverity(false)}>
                  ไม่ยืนยัน
                </Button>
              </div>
            </Card>
          )}

          {c.status !== 'completed' && <CaseMediaGallery photos={c.photos} audioRecordings={c.audioRecordings} />}

          <RelativeContacts caseId={c.id} contacts={c.relativeContacts} />

          {c.patientInfo && <PatientInformationCard patient={c.patientInfo} updates={c.patientUpdates} />}

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

        <div className="order-first flex flex-col gap-6 lg:order-none lg:sticky lg:top-6 lg:self-start">
          <Card>
            <h2 className="mb-4 text-base font-bold text-navy">การดำเนินการ</h2>

            {c.status === 'received' && !c.assessment && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">กรุณากรอกรายละเอียดเหตุการณ์และประเมินระดับความรุนแรงก่อนค้นหาหน่วยกู้ชีพ</p>
                <Button fullWidth icon={<ClipboardList className="size-4" />} onClick={() => navigate(`/dispatch/emergency-details/${id}`)}>
                  กรอกรายละเอียดเหตุการณ์
                </Button>

                {closeAdviceBlock}
              </div>
            )}

            {c.status === 'received' && c.assessment && (
              <div className="flex flex-col gap-3">
                {c.assessment.severity === 5 ? (
                  <>
                    <p className="text-sm text-muted">
                      เคสนี้ประเมินเป็นระดับไม่ฉุกเฉิน — พิจารณาปิดเคสโดยไม่ต้องส่งหน่วยกู้ชีพ หรือค้นหาหน่วยกู้ชีพตามปกติก็ได้
                    </p>
                    <Button fullWidth variant="outline" loading={findingLoading} onClick={handleStartFinding}>
                      ค้นหาหน่วยกู้ชีพ
                    </Button>
                    {closeAdviceBlock}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted">เคสนี้ประเมินความรุนแรงแล้ว พร้อมค้นหาหน่วยกู้ชีพที่ใกล้ที่สุด</p>
                    <Button fullWidth loading={findingLoading} onClick={handleStartFinding}>
                      ค้นหาหน่วยกู้ชีพ
                    </Button>
                  </>
                )}
              </div>
            )}

            {c.status === 'finding-rescue' && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">
                  เลือกหน่วยกู้ชีพที่ต้องการมอบหมายให้เคสนี้ — เรียงตามความพร้อมและระยะทางที่ใกล้ที่สุด
                </p>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-navy">กรองตามระดับรถ (ไม่บังคับ)</p>
                  <div className="flex gap-2">
                    {VEHICLE_LEVEL_RANK.map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSelectedLevel((cur) => (cur === lvl ? null : lvl))}
                        className={clsx(
                          'flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition-colors',
                          selectedLevel === lvl
                            ? VEHICLE_LEVEL_SELECTED_CLASSES[lvl]
                            : 'border-border bg-white text-muted hover:border-primary/40',
                        )}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
                {recommendation.requiredEquipment.length > 0 && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    <Wrench className="size-3.5 text-primary" />
                    เหตุนี้ต้องการอุปกรณ์: {recommendation.requiredEquipment.join(', ')}
                  </p>
                )}
                <div className="flex flex-col gap-3">
                  {recommendation.ranked.map((r) => (
                    <RadioCard
                      key={r.team.id}
                      selected={selectedTeamId === r.team.id}
                      onClick={() => r.available && setSelectedTeamId(r.team.id)}
                      icon={<Truck className="size-5 text-primary" />}
                      title={r.team.name}
                      description={`${r.distanceKm.toFixed(1)} กม. · ${r.team.vehicles.length} รถ/ทีม${!r.available ? ' · ไม่ว่าง' : ''}`}
                      className={clsx(!r.available && 'pointer-events-none opacity-50')}
                      badge={
                        selectedLevel || recommendation.requiredEquipment.length > 0 ? (
                          <span className="flex flex-col items-end gap-1">
                            {selectedLevel && (
                              <span
                                className={clsx(
                                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                                  r.hasVehicleAtLevel ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning',
                                )}
                              >
                                {r.hasVehicleAtLevel ? `มีรถระดับ ${selectedLevel}` : `ไม่มีรถระดับ ${selectedLevel}`}
                              </span>
                            )}
                            {recommendation.requiredEquipment.length > 0 && (
                              <span
                                className={clsx(
                                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                                  r.hasRequiredEquipment ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning',
                                )}
                              >
                                <Wrench className="size-3" />
                                {r.hasRequiredEquipment ? 'มีอุปกรณ์ครบ' : 'อุปกรณ์ไม่ครบ'}
                              </span>
                            )}
                          </span>
                        ) : undefined
                      }
                    />
                  ))}
                </div>

                {recommendation.needsSupport && recommendation.support && (
                  <div className="flex flex-col gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3.5">
                    <p className="flex items-start gap-2 text-sm font-semibold text-navy">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                      หน่วยที่ใกล้ที่สุดไม่มีอุปกรณ์ที่เหมาะสม แนะนำให้มอบหมายร่วมกับหน่วยที่มีอุปกรณ์
                    </p>
                    <label className="flex items-center gap-2 text-sm text-navy">
                      <input
                        type="checkbox"
                        checked={includeSupport}
                        onChange={(e) => setIncludeSupport(e.target.checked)}
                        className="size-4 accent-primary"
                      />
                      มอบหมายร่วมกับ {recommendation.support.team.name} ({recommendation.support.distanceKm.toFixed(1)} กม.)
                    </label>
                  </div>
                )}

                <Button fullWidth disabled={!selectedTeamId} onClick={() => setConfirmOpen(true)}>
                  {supportTeam ? 'มอบหมายทั้ง 2 หน่วย' : 'มอบหมายหน่วยนี้'}
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
                    มอบหมายหน่วยกู้ชีพสำเร็จแล้ว
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-start gap-2.5">
                    <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-muted">หน่วยกู้ชีพที่รับผิดชอบ</p>
                      <p className="text-sm font-semibold text-navy">{c.assignedRescueTeam.name}</p>
                    </div>
                  </div>
                  {c.assignedVehicle ? (
                    <>
                      <div className="flex items-start gap-2.5">
                        <Hash className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div>
                          <p className="text-xs text-muted">รหัสรถ/ทีม</p>
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
                            {c.assignedVehicle.unitCode}
                            <VehicleLevelBadge level={c.assignedVehicle.level} />
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Activity className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div>
                          <p className="text-xs text-muted">ยานพาหนะ</p>
                          <p className="text-sm font-semibold text-navy">
                            {c.assignedVehicle.vehicle} · {c.assignedVehicleCrewCount ?? c.assignedVehicle.members} คน
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted">หน่วยกู้ชีพยังไม่ได้เลือกรถ/ทีมที่รับผิดชอบ</p>
                  )}
                  <div className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-muted">เบอร์ติดต่อ</p>
                      <p className="text-sm font-semibold text-navy">{c.assignedRescueTeam.phone}</p>
                    </div>
                  </div>
                  {c.status !== 'rescue-assigned' && c.assignedVehicle?.driverName && (
                    <div className="flex items-start gap-2.5">
                      <IdCard className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-xs text-muted">คนขับ · ทะเบียนรถ</p>
                        <p className="text-sm font-semibold text-navy">
                          {c.assignedVehicle.driverName} · {c.assignedVehicle.plateNumber} · สังกัด{' '}
                          {c.assignedVehicle.unitCode}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {c.supportingRescueTeam && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-border p-3">
                    <Wrench className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-muted">หน่วยสนับสนุน (มีอุปกรณ์เฉพาะทาง)</p>
                      <p className="text-sm font-semibold text-navy">{c.supportingRescueTeam.name}</p>
                    </div>
                  </div>
                )}

                {canAddSupport && !showAddSupport && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Wrench className="size-4" />}
                    onClick={() => {
                      setEscalating(false)
                      setShowAddSupport(true)
                    }}
                  >
                    เพิ่มหน่วยสนับสนุนที่มีอุปกรณ์
                  </Button>
                )}

                {canAddSupport && showAddSupport && (
                  <div className="flex flex-col gap-2.5 rounded-xl border border-border p-3">
                    <p className="text-sm font-semibold text-navy">
                      {escalating ? `เลือกหน่วยสนับสนุนระดับสูงขึ้น (แนะนำ ALS/CLS)` : 'เลือกหน่วยสนับสนุน'}
                    </p>
                    {requiredEquipment.length > 0 && (
                      <p className="flex items-center gap-1.5 text-xs text-muted">
                        <Wrench className="size-3.5 text-primary" />
                        ต้องการอุปกรณ์: {requiredEquipment.join(', ')}
                      </p>
                    )}
                    <div className="flex flex-col gap-2">
                      {supportCandidates.map((r) => (
                        <RadioCard
                          key={r.team.id}
                          selected={addSupportTeamId === r.team.id}
                          onClick={() => r.available && setAddSupportTeamId(r.team.id)}
                          title={r.team.name}
                          description={`${r.distanceKm.toFixed(1)} กม. · ${r.team.vehicles.length} รถ/ทีม${!r.available ? ' · ไม่ว่าง' : ''}`}
                          className={clsx(!r.available && 'pointer-events-none opacity-50')}
                          badge={
                            <span className="flex flex-col items-end gap-1">
                              <VehicleLevelBadge level={bestTeamLevel(r.team)} />
                              {requiredEquipment.length > 0 && (
                                <span
                                  className={clsx(
                                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                                    r.hasRequiredEquipment ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning',
                                  )}
                                >
                                  <Wrench className="size-3" />
                                  {r.hasRequiredEquipment ? 'มีอุปกรณ์ครบ' : 'อุปกรณ์ไม่ครบ'}
                                </span>
                              )}
                            </span>
                          }
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button fullWidth disabled={!addSupportTeamId} loading={addSupportLoading} onClick={handleAddSupport}>
                        ยืนยันเพิ่มหน่วยสนับสนุน
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddSupport(false)
                          setEscalating(false)
                        }}
                        disabled={addSupportLoading}
                      >
                        ยกเลิก
                      </Button>
                    </div>
                  </div>
                )}
                <p className="rounded-xl bg-skyblue-light px-3 py-2.5 text-xs font-medium text-muted">
                  หน่วยกู้ชีพรับผิดชอบเคสนี้แล้ว
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
        title="ยืนยันการมอบหมายหน่วยกู้ชีพ"
        message={selectedTeam ? `ต้องการมอบหมาย "${selectedTeam.name}" ให้รับผิดชอบเคส ${c.caseNumber} ใช่หรือไม่` : ''}
        confirmLabel="ยืนยันมอบหมาย"
        confirmLoading={assignLoading}
        onConfirm={handleConfirmAssign}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmationModal
        open={escalateConfirmOpen}
        title="ต้องการมอบหมายหน่วยสนับสนุนระดับสูงขึ้นหรือไม่"
        message={
          escalateLevel
            ? `ระดับความรุนแรงเพิ่มขึ้น — ต้องการมอบหมายหน่วยสนับสนุนระดับ ${escalateLevel} เพิ่มเติมหรือไม่`
            : ''
        }
        confirmLabel="มอบหมายหน่วยสนับสนุน"
        cancelLabel="ไม่ต้อง"
        onConfirm={() => {
          setEscalateConfirmOpen(false)
          setEscalating(true)
          setShowAddSupport(true)
        }}
        onCancel={() => setEscalateConfirmOpen(false)}
      />
        </div>
      </div>
    </AppShell>
  )
}
