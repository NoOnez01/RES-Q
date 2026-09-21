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
  Search,
  Share2,
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
import { ShareCaseModal } from '@/components/ShareCaseModal'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { useStore } from '@/lib/store'
import { recommendAssignment, rankRescueTeams, requiredEquipmentFor, nextLevelUp } from '@/lib/rescueAssignment'
import { DEFAULT_INCIDENT_LOCATION } from '@/lib/mockData'
import { toast } from '@/lib/toast'
import { VEHICLE_LEVEL_RANK } from '@/lib/types'
import type { VehicleLevel, RescueTeam } from '@/lib/types'
import { VehicleLevelBadge, VEHICLE_LEVEL_SELECTED_CLASSES } from '@/components/VehicleLevelBadge'
import { Textarea, Input, SearchableSelect } from '@/components/ui/Field'
import { THAILAND_PROVINCE_COORDS } from '@/lib/thailandProvinces'
import { checkCaseConsistency } from '@/lib/caseHealth'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ข้อมูลเคสไม่สอดคล้องกัน: 'Case data is inconsistent',
  'เคสนี้มีข้อมูลไม่สอดคล้องกับสถานะปัจจุบัน อาจทำให้ไม่เห็นขั้นตอนถัดไป — ลองแก้ไขข้อมูลที่เกี่ยวข้องอีกครั้ง':
    'This case has data that doesn’t match its current status, which may be hiding the next action — try re-submitting the relevant form',
  'มีการประเมินความรุนแรงแล้ว แต่สถานะเคสยังไม่ถึง "รับแจ้งเหตุแล้ว"':
    'Severity has been assessed, but the case status hasn’t reached "Received" yet',
  'มอบหมายหน่วยกู้ชีพแล้ว แต่สถานะเคสยังไม่ถึง "มอบหมายหน่วยกู้ชีพแล้ว"':
    'A rescue team is assigned, but the case status hasn’t reached "Rescue team assigned" yet',
  'เลือกโรงพยาบาลแล้ว แต่สถานะเคสยังไม่ถึง "กำลังนำส่งโรงพยาบาล"':
    'A hospital is selected, but the case status hasn’t reached "Transporting" yet',
  'บันทึกข้อมูลผู้ป่วยแล้ว แต่สถานะเคสยังไม่ถึง "ถึงจุดเกิดเหตุแล้ว"':
    'Patient info is recorded, but the case status hasn’t reached "Arrived at scene" yet',
  'เคสถูกรับแจ้งแล้ว แต่ยังไม่มีรายละเอียดเหตุการณ์': 'The case has been received, but has no incident details yet',
  รู้สึกตัวดี: 'Conscious',
  หมดสติ: 'Unconscious',
  ไม่ทราบ: 'Unknown',
  ทุกจังหวัด: 'All provinces',
  รายละเอียดเคส: 'Case details',
  ไม่พบเคสนี้: 'Case not found',
  เคสนี้อาจถูกลบหรือไม่มีอยู่ในระบบ: 'This case may have been deleted or does not exist',
  'สร้างเคสเมื่อ {date}': 'Created {date}',
  สถานะเคสอัปเดตแบบเรียลไทม์: 'Case status updates in real time',
  'แชร์ QR/ลิงก์': 'Share QR/link',
  รายละเอียดเหตุการณ์: 'Incident details',
  ประเภทเหตุการณ์: 'Incident type',
  จำนวนผู้ป่วย: 'Number of patients',
  '{n} คน': '{n} people',
  ระดับความรู้สึกตัว: 'Consciousness level',
  เบอร์ติดต่อกลับ: 'Callback number',
  หมายเหตุเพิ่มเติม: 'Additional notes',
  ยังไม่ได้กรอกรายละเอียดเหตุการณ์: 'Incident details not yet filled in',
  'การประเมินความรุนแรง (ศูนย์ 1669)': 'Severity assessment (Center 1669)',
  แก้ไขการประเมิน: 'Edit assessment',
  ลักษณะการบาดเจ็บ: 'Nature of injury',
  'ยังไม่มีการประเมินระดับความรุนแรงจากศูนย์ 1669': 'No severity assessment from Center 1669 yet',
  กรอกรายละเอียดเหตุการณ์: 'Fill in incident details',
  หน่วยกู้ชีพเสนอปรับระดับความรุนแรง: 'Rescue team proposed a severity change',
  เดิม: 'Original',
  เสนอโดยหน่วยกู้ชีพ: 'Proposed by rescue team',
  ยืนยันระดับสี: 'Confirm severity',
  ไม่ยืนยัน: 'Decline',
  จุดเกิดเหตุ: 'Incident location',
  ไทม์ไลน์เคส: 'Case timeline',
  การดำเนินการ: 'Actions',
  กรุณากรอกรายละเอียดเหตุการณ์และประเมินระดับความรุนแรงก่อนค้นหาหน่วยกู้ชีพ: 'Please fill in incident details and assess severity before searching for a rescue team',
  'เคสนี้ประเมินเป็นระดับไม่ฉุกเฉิน — พิจารณาปิดเคสโดยไม่ต้องส่งหน่วยกู้ชีพ หรือค้นหาหน่วยกู้ชีพตามปกติก็ได้':
    'This case was assessed as non-urgent — consider closing it without dispatch, or search for a rescue team as usual',
  ค้นหาหน่วยกู้ชีพ: 'Search for a rescue team',
  'เคสนี้ประเมินความรุนแรงแล้ว พร้อมค้นหาหน่วยกู้ชีพที่ใกล้ที่สุด': 'This case has been assessed — ready to search for the nearest rescue team',
  'เลือกหน่วยกู้ชีพที่ต้องการมอบหมายให้เคสนี้ — เรียงตามความพร้อมและระยะทางที่ใกล้ที่สุด':
    'Choose which rescue team to assign to this case — sorted by availability and proximity',
  ค้นหาชื่อหน่วยกู้ชีพ: 'Search rescue team name',
  'กรองตามจังหวัด (ไม่บังคับ)': 'Filter by province (optional)',
  พิมพ์ชื่อจังหวัดเพื่อค้นหา: 'Type a province name to search',
  ไม่พบจังหวัดที่ค้นหา: 'No matching province found',
  'กรองตามระดับรถ (ไม่บังคับ)': 'Filter by vehicle level (optional)',
  'เหตุนี้ต้องการอุปกรณ์: {list}': 'This incident requires equipment: {list}',
  ไม่พบหน่วยกู้ชีพที่ตรงกับคำค้นหาหรือจังหวัดที่เลือก: 'No rescue team matches the search or selected province',
  '{km} กม. · {n} รถ/ทีม': '{km} km · {n} vehicle(s)/crew(s)',
  ไม่ว่าง: 'busy',
  แนะนำที่สุด: 'Best match',
  'มีรถระดับ {level}': '{level}-level vehicle available',
  'ไม่มีรถระดับ {level}': 'No {level}-level vehicle',
  'แสดง {limit} หน่วยที่ใกล้ที่สุด จากทั้งหมด {total} หน่วย': 'Showing the {limit} nearest units, out of {total} total',
  'หน่วยที่ใกล้ที่สุดไม่มีอุปกรณ์ที่เหมาะสม แนะนำให้มอบหมายร่วมกับหน่วยที่มีอุปกรณ์':
    'The nearest unit lacks the right equipment — recommend assigning it alongside a unit that has it',
  'มอบหมายร่วมกับ {team} ({km} กม.)': 'Assign together with {team} ({km} km)',
  'มอบหมายทั้ง 2 หน่วย': 'Assign both teams',
  มอบหมายหน่วยนี้: 'Assign this team',
  มอบหมายหน่วยกู้ชีพสำเร็จแล้ว: 'Rescue team assigned successfully',
  หน่วยกู้ชีพที่รับผิดชอบ: 'Assigned rescue team',
  'รหัสรถ/ทีม': 'Vehicle/crew code',
  ยานพาหนะ: 'Vehicle',
  '{vehicle} · {n} คน': '{vehicle} · {n} people',
  'หน่วยกู้ชีพยังไม่ได้เลือกรถ/ทีมที่รับผิดชอบ': "The rescue team hasn't selected a responding vehicle/crew yet",
  เบอร์ติดต่อ: 'Contact number',
  'คนขับ · ทะเบียนรถ': 'Driver · license plate',
  '{driver} · {plate} · สังกัด {unit}': '{driver} · {plate} · unit {unit}',
  'หน่วยสนับสนุน (มีอุปกรณ์เฉพาะทาง)': 'Support unit (specialized equipment)',
  เพิ่มหน่วยสนับสนุนที่มีอุปกรณ์: 'Add a support unit with the right equipment',
  'เลือกหน่วยสนับสนุนระดับสูงขึ้น (แนะนำ ALS/CLS)': 'Choose a higher-level support unit (ALS/CLS recommended)',
  เลือกหน่วยสนับสนุน: 'Choose a support unit',
  'ต้องการอุปกรณ์: {list}': 'Requires equipment: {list}',
  ยืนยันเพิ่มหน่วยสนับสนุน: 'Confirm adding support unit',
  ยกเลิก: 'Cancel',
  หน่วยกู้ชีพรับผิดชอบเคสนี้แล้ว: 'A rescue team is already responsible for this case',
  เคสเสร็จสิ้นแล้ว: 'Case completed',
  กระบวนการช่วยเหลือฉุกเฉินเสร็จสมบูรณ์: 'The emergency response process is complete',
  ยืนยันการมอบหมายหน่วยกู้ชีพ: 'Confirm rescue team assignment',
  'ต้องการมอบหมาย "{team}" ให้รับผิดชอบเคส {caseNumber} ใช่หรือไม่': 'Assign "{team}" to be responsible for case {caseNumber}?',
  ยืนยันมอบหมาย: 'Confirm assignment',
  ต้องการมอบหมายหน่วยสนับสนุนระดับสูงขึ้นหรือไม่: 'Assign a higher-level support unit?',
  'ระดับความรุนแรงเพิ่มขึ้น — ต้องการมอบหมายหน่วยสนับสนุนระดับ {level} เพิ่มเติมหรือไม่':
    'Severity has increased — assign an additional {level}-level support unit?',
  มอบหมายหน่วยสนับสนุน: 'Assign support unit',
  ไม่ต้อง: 'No',
  แชร์ลิงก์ติดตามเคส: 'Share case tracking link',
  'สแกน QR หรือคัดลอกลิงก์เพื่อส่งให้ผู้แจ้งเหตุ ญาติ หรือหน่วยงานที่เกี่ยวข้องดูสถานะแบบเรียลไทม์':
    'Scan the QR code or copy the link to let the reporter, family, or related agencies watch the status in real time',
  เริ่มค้นหาหน่วยกู้ชีพแล้ว: 'Started finding a rescue team',
  'เคส {caseNumber} กำลังค้นหาหน่วยกู้ชีพที่พร้อมปฏิบัติงาน': 'Case {caseNumber} is now searching for an available rescue team',
  ปิดเคสแล้ว: 'Case closed',
  'บันทึกว่าให้คำแนะนำทางโทรศัพท์ ไม่ต้องส่งหน่วยกู้ชีพ': 'Logged as advice given over the phone — no rescue team dispatched',
  'ปิดเคส (ให้คำแนะนำแล้ว)': 'Close case (advice given)',
  บันทึกคำแนะนำที่ให้ทางโทรศัพท์: 'Log the advice given over the phone',
  'เช่น ให้คำแนะนำการปฐมพยาบาลเบื้องต้น ไม่ต้องส่งหน่วยกู้ชีพ': 'e.g. gave basic first-aid advice, no rescue team needed',
  ยืนยันปิดเคส: 'Confirm closing case',
  'มอบหมายหน่วยกู้ชีพสำเร็จ': 'Rescue team assigned',
  '{team1} และ {team2} ได้รับมอบหมายเคส {caseNumber} แล้ว': '{team1} and {team2} have been assigned to case {caseNumber}',
  '{team} ได้รับมอบหมายเคส {caseNumber} แล้ว': '{team} has been assigned to case {caseNumber}',
  เพิ่มหน่วยสนับสนุนแล้ว: 'Support unit added',
  '{team} เข้าร่วมช่วยเหลือเคสนี้': '{team} has joined to help with this case',
})

const CONSCIOUS_LABEL: Record<string, string> = {
  conscious: 'รู้สึกตัวดี',
  unconscious: 'หมดสติ',
  unknown: 'ไม่ทราบ',
}

const PROVINCE_OPTIONS = [
  { value: '', label: 'ทุกจังหวัด' },
  ...Object.keys(THAILAND_PROVINCE_COORDS)
    .sort((a, b) => a.localeCompare(b, 'th'))
    .map((p) => ({ value: p, label: p })),
]

/** The imported NDEMS org shells put their province in base_address (e.g.
 * "จังหวัดเชียงใหม่ (ตำแหน่งโดยประมาณระดับจังหวัด)"); the original seed
 * teams don't say "จังหวัด..." explicitly but do name the district/province
 * in plain text (e.g. "...อำเภอเมืองเชียงใหม่") -- a substring match on the
 * province name covers both without needing a dedicated column. */
function teamMatchesProvince(team: RescueTeam, province: string): boolean {
  if (!province) return true
  return team.base.address.includes(province)
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
  const t = useT()

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
  const [teamQuery, setTeamQuery] = useState('')
  const [teamProvinceFilter, setTeamProvinceFilter] = useState('')
  const [supportTeamQuery, setSupportTeamQuery] = useState('')
  const [supportProvinceFilter, setSupportProvinceFilter] = useState('')
  const [showCloseAdvice, setShowCloseAdvice] = useState(false)
  const [closeAdviceNote, setCloseAdviceNote] = useState('')
  const [closeAdviceLoading, setCloseAdviceLoading] = useState(false)
  const [escalateConfirmOpen, setEscalateConfirmOpen] = useState(false)
  const [escalating, setEscalating] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

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
      <AppShell variant="dashboard" title={t('รายละเอียดเคส')}>
        <ErrorState title={t('ไม่พบเคสนี้')} description={t('เคสนี้อาจถูกลบหรือไม่มีอยู่ในระบบ')} />
      </AppShell>
    )
  }

  const c = emergencyCase
  const details = c.incidentDetails
  const selectedTeam = recommendation.ranked.find((r) => r.team.id === selectedTeamId)?.team ?? null
  const supportTeam = includeSupport && recommendation.needsSupport ? recommendation.support?.team ?? null : null
  const healthIssues = checkCaseConsistency(c)

  function handleStartFinding() {
    setFindingLoading(true)
    setTimeout(() => {
      startFindingRescue(id!)
      setFindingLoading(false)
      toast({
        title: t('เริ่มค้นหาหน่วยกู้ชีพแล้ว'),
        message: t('เคส {caseNumber} กำลังค้นหาหน่วยกู้ชีพที่พร้อมปฏิบัติงาน', { caseNumber: c.caseNumber }),
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
      toast({ title: t('ปิดเคสแล้ว'), message: t('บันทึกว่าให้คำแนะนำทางโทรศัพท์ ไม่ต้องส่งหน่วยกู้ชีพ'), tone: 'success' })
      navigate('/dispatch/dashboard')
    }, 400)
  }

  const escalateLevel = c.assignedVehicle?.level ? nextLevelUp(c.assignedVehicle.level) : null

  // Reused wherever a "close without dispatch" option applies -- both when
  // there's no assessment yet, and (below) when the assessed severity turns
  // out to be non-urgent -- so the note/confirm markup exists in one place.
  const closeAdviceBlock = !showCloseAdvice ? (
    <Button variant="outline" fullWidth icon={<XCircle className="size-4" />} onClick={() => setShowCloseAdvice(true)}>
      {t('ปิดเคส (ให้คำแนะนำแล้ว)')}
    </Button>
  ) : (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <p className="text-sm font-semibold text-ink">{t('บันทึกคำแนะนำที่ให้ทางโทรศัพท์')}</p>
      <Textarea
        value={closeAdviceNote}
        onChange={(e) => setCloseAdviceNote(e.target.value)}
        rows={2}
        placeholder={t('เช่น ให้คำแนะนำการปฐมพยาบาลเบื้องต้น ไม่ต้องส่งหน่วยกู้ชีพ')}
      />
      <div className="flex gap-2">
        <Button fullWidth disabled={!closeAdviceNote.trim()} loading={closeAdviceLoading} onClick={handleCloseAdvice}>
          {t('ยืนยันปิดเคส')}
        </Button>
        <Button variant="outline" onClick={() => setShowCloseAdvice(false)} disabled={closeAdviceLoading}>
          {t('ยกเลิก')}
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
        title: t('มอบหมายหน่วยกู้ชีพสำเร็จ'),
        message: supportTeam
          ? t('{team1} และ {team2} ได้รับมอบหมายเคส {caseNumber} แล้ว', { team1: selectedTeam.name, team2: supportTeam.name, caseNumber: c.caseNumber })
          : t('{team} ได้รับมอบหมายเคส {caseNumber} แล้ว', { team: selectedTeam.name, caseNumber: c.caseNumber }),
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
      toast({ title: t('เพิ่มหน่วยสนับสนุนแล้ว'), message: t('{team} เข้าร่วมช่วยเหลือเคสนี้', { team: team.name }), tone: 'success' })
    }, 500)
  }

  return (
    <AppShell variant="dashboard" title={t('รายละเอียดเคส')}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-lg font-extrabold text-primary">{c.caseNumber}</p>
          <p className="text-sm text-muted">{t('สร้างเคสเมื่อ {date}', { date: new Date(c.createdAt).toLocaleString('th-TH') })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {c.assessment && <SeverityBadge severity={c.assessment.severity} />}
          <span className="inline-flex items-center gap-1.5" aria-label={t('สถานะเคสอัปเดตแบบเรียลไทม์')}>
            <PulseRing
              tone={c.status === 'completed' ? 'success' : c.status === 'called-1669' ? 'emergency' : 'primary'}
              size="sm"
            />
            <StatusBadge status={c.status} />
          </span>
          <Button variant="outline" size="sm" icon={<Share2 className="size-4" />} onClick={() => setShareOpen(true)}>
            {t('แชร์ QR/ลิงก์')}
          </Button>
        </div>
      </div>

      {healthIssues.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/[0.06] p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="min-w-0">
            <p className="font-bold text-ink">{t('ข้อมูลเคสไม่สอดคล้องกัน')}</p>
            <p className="mt-0.5 text-sm text-muted">
              {t('เคสนี้มีข้อมูลไม่สอดคล้องกับสถานะปัจจุบัน อาจทำให้ไม่เห็นขั้นตอนถัดไป — ลองแก้ไขข้อมูลที่เกี่ยวข้องอีกครั้ง')}
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink">
              {healthIssues.map((issue) => (
                <li key={issue.key}>{t(issue.message)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 text-base font-bold text-ink">{t('รายละเอียดเหตุการณ์')}</h2>
            {details ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-2.5">
                  <Activity className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted">{t('ประเภทเหตุการณ์')}</p>
                    <p className="text-sm font-semibold text-ink">{details.incidentType}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Users className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted">{t('จำนวนผู้ป่วย')}</p>
                    <p className="text-sm font-semibold text-ink">{t('{n} คน', { n: details.patientCount })}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <User className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted">{t('ระดับความรู้สึกตัว')}</p>
                    <p className="text-sm font-semibold text-ink">{t(CONSCIOUS_LABEL[details.conscious] ?? details.conscious)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted">{t('เบอร์ติดต่อกลับ')}</p>
                    <p className="text-sm font-semibold text-ink">{details.callbackPhone}</p>
                  </div>
                </div>
                {details.notes && (
                  <div className="flex items-start gap-2.5 sm:col-span-2">
                    <StickyNote className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-muted">{t('หมายเหตุเพิ่มเติม')}</p>
                      <p className="text-sm font-semibold text-ink">{details.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">{t('ยังไม่ได้กรอกรายละเอียดเหตุการณ์')}</p>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-ink">{t('การประเมินความรุนแรง (ศูนย์ 1669)')}</h2>
              {c.assessment && c.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Pencil className="size-4" />}
                  onClick={() => navigate(`/dispatch/emergency-details/${id}`)}
                >
                  {t('แก้ไขการประเมิน')}
                </Button>
              )}
            </div>
            {c.assessment ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted">{t('ลักษณะการบาดเจ็บ')}</p>
                    <p className="text-sm font-semibold text-ink">{c.assessment.injuryDescription}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted">{t('ยังไม่มีการประเมินระดับความรุนแรงจากศูนย์ 1669')}</p>
                <Button
                  size="sm"
                  icon={<ClipboardList className="size-4" />}
                  onClick={() => navigate(`/dispatch/emergency-details/${id}`)}
                >
                  {t('กรอกรายละเอียดเหตุการณ์')}
                </Button>
              </div>
            )}
          </Card>

          {c.rescueSeverityProposal && (
            <Card className="border-warning/30 bg-warning/5">
              <h2 className="mb-3 flex items-center gap-1.5 text-base font-bold text-ink">
                <AlertTriangle className="size-4 text-warning" />
                {t('หน่วยกู้ชีพเสนอปรับระดับความรุนแรง')}
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                {c.assessment && (
                  <div className="flex flex-col items-start gap-1">
                    <p className="text-xs text-muted">{t('เดิม')}</p>
                    <SeverityBadge severity={c.assessment.severity} />
                  </div>
                )}
                <div className="flex flex-col items-start gap-1">
                  <p className="text-xs text-muted">{t('เสนอโดยหน่วยกู้ชีพ')}</p>
                  <SeverityBadge severity={c.rescueSeverityProposal.severity} />
                </div>
              </div>
              {c.rescueSeverityProposal.note && (
                <p className="mt-3 text-sm text-ink">{c.rescueSeverityProposal.note}</p>
              )}
              <div className="mt-4 flex gap-2">
                <Button fullWidth onClick={() => handleConfirmSeverity(true)}>
                  {t('ยืนยันระดับสี')}
                </Button>
                <Button variant="outline" fullWidth onClick={() => handleConfirmSeverity(false)}>
                  {t('ไม่ยืนยัน')}
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
                    label: t('จุดเกิดเหตุ'),
                    kind: 'incident',
                  },
                ]}
                height="280px"
              />
              <p className="p-4 text-sm text-muted">{c.location.address}</p>
            </Card>
          )}

          <Card>
            <h2 className="mb-4 text-base font-bold text-ink">{t('ไทม์ไลน์เคส')}</h2>
            <CaseTimeline timeline={c.timeline} currentStatus={c.status} />
          </Card>
        </div>

        <div className="order-first flex flex-col gap-6 lg:order-none lg:sticky lg:top-6 lg:self-start">
          <Card>
            <h2 className="mb-4 text-base font-bold text-ink">{t('การดำเนินการ')}</h2>

            {c.status === 'received' && !c.assessment && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">{t('กรุณากรอกรายละเอียดเหตุการณ์และประเมินระดับความรุนแรงก่อนค้นหาหน่วยกู้ชีพ')}</p>
                <Button fullWidth icon={<ClipboardList className="size-4" />} onClick={() => navigate(`/dispatch/emergency-details/${id}`)}>
                  {t('กรอกรายละเอียดเหตุการณ์')}
                </Button>

                {closeAdviceBlock}
              </div>
            )}

            {c.status === 'received' && c.assessment && (
              <div className="flex flex-col gap-3">
                {c.assessment.severity === 5 ? (
                  <>
                    <p className="text-sm text-muted">
                      {t('เคสนี้ประเมินเป็นระดับไม่ฉุกเฉิน — พิจารณาปิดเคสโดยไม่ต้องส่งหน่วยกู้ชีพ หรือค้นหาหน่วยกู้ชีพตามปกติก็ได้')}
                    </p>
                    <Button fullWidth variant="outline" loading={findingLoading} onClick={handleStartFinding}>
                      {t('ค้นหาหน่วยกู้ชีพ')}
                    </Button>
                    {closeAdviceBlock}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted">{t('เคสนี้ประเมินความรุนแรงแล้ว พร้อมค้นหาหน่วยกู้ชีพที่ใกล้ที่สุด')}</p>
                    <Button fullWidth loading={findingLoading} onClick={handleStartFinding}>
                      {t('ค้นหาหน่วยกู้ชีพ')}
                    </Button>
                  </>
                )}
              </div>
            )}

            {c.status === 'finding-rescue' && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">
                  {t('เลือกหน่วยกู้ชีพที่ต้องการมอบหมายให้เคสนี้ — เรียงตามความพร้อมและระยะทางที่ใกล้ที่สุด')}
                </p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  <Input
                    value={teamQuery}
                    onChange={(e) => setTeamQuery(e.target.value)}
                    placeholder={t('ค้นหาชื่อหน่วยกู้ชีพ')}
                    className="pl-11"
                  />
                </div>
                <SearchableSelect
                  label={t('กรองตามจังหวัด (ไม่บังคับ)')}
                  value={teamProvinceFilter}
                  onChange={setTeamProvinceFilter}
                  placeholder={t('พิมพ์ชื่อจังหวัดเพื่อค้นหา')}
                  emptyLabel={t('ไม่พบจังหวัดที่ค้นหา')}
                  options={PROVINCE_OPTIONS}
                />
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-ink">{t('กรองตามระดับรถ (ไม่บังคับ)')}</p>
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
                            : 'border-border bg-surface text-muted hover:border-primary/40',
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
                    {t('เหตุนี้ต้องการอุปกรณ์: {list}', { list: recommendation.requiredEquipment.join(', ') })}
                  </p>
                )}
                <div className="flex flex-col gap-3">
                  {(() => {
                    // The ranking already sorts available-first, so the top
                    // available team is the actual recommendation -- never
                    // spotlight an unavailable one just because it's first
                    // in the raw array (only happens if every team is busy).
                    const filtered = recommendation.ranked.filter((r) => {
                      if (teamQuery.trim() && !r.team.name.toLowerCase().includes(teamQuery.trim().toLowerCase())) return false
                      return teamMatchesProvince(r.team, teamProvinceFilter)
                    })
                    const topAvailableId = filtered.find((r) => r.available)?.team.id
                    // Rendering every ranked team is fine for a handful of
                    // local branches but not for the full NDEMS import
                    // (thousands nationwide) -- available-first sorting
                    // already means the nearest usable options survive the
                    // cap; anything further down is either far away or busy.
                    const RENDER_LIMIT = 20
                    const visibleRanked = filtered.slice(0, RENDER_LIMIT)
                    const overflowCount = filtered.length - visibleRanked.length
                    if (filtered.length === 0) {
                      return <p className="py-4 text-center text-sm text-muted">{t('ไม่พบหน่วยกู้ชีพที่ตรงกับคำค้นหาหรือจังหวัดที่เลือก')}</p>
                    }
                    return (
                      <>
                        {visibleRanked.map((r) => {
                      const isTop = r.team.id === topAvailableId
                      return (
                        <RadioCard
                          key={r.team.id}
                          selected={selectedTeamId === r.team.id}
                          onClick={() => r.available && setSelectedTeamId(r.team.id)}
                          icon={<Truck className={isTop ? 'size-6 text-primary' : 'size-5 text-primary'} />}
                          title={r.team.name}
                          description={t('{km} กม. · {n} รถ/ทีม', { km: r.distanceKm.toFixed(1), n: r.team.vehicles.length }) + (!r.available ? ` · ${t('ไม่ว่าง')}` : '')}
                          className={clsx(
                            !r.available && 'pointer-events-none opacity-50',
                            isTop && 'border-primary/50 bg-skyblue-light/40 p-5 shadow-card-lg sm:p-6',
                          )}
                          badge={
                            <span className="flex flex-col items-end gap-1">
                              {isTop && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">
                                  {t('แนะนำที่สุด')}
                                </span>
                              )}
                              {selectedLevel && (
                                <span
                                  className={clsx(
                                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
                                    r.hasVehicleAtLevel ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning',
                                  )}
                                >
                                  {r.hasVehicleAtLevel ? t('มีรถระดับ {level}', { level: selectedLevel }) : t('ไม่มีรถระดับ {level}', { level: selectedLevel })}
                                </span>
                              )}
                            </span>
                          }
                        />
                          )
                        })}
                        {overflowCount > 0 && (
                          <p className="text-center text-xs text-muted">
                            {t('แสดง {limit} หน่วยที่ใกล้ที่สุด จากทั้งหมด {total} หน่วย', {
                              limit: RENDER_LIMIT,
                              total: filtered.length.toLocaleString('th-TH'),
                            })}
                          </p>
                        )}
                      </>
                    )
                  })()}
                </div>

                {recommendation.needsSupport && recommendation.support && (
                  <div className="flex flex-col gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3.5">
                    <p className="flex items-start gap-2 text-sm font-semibold text-ink">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                      {t('หน่วยที่ใกล้ที่สุดไม่มีอุปกรณ์ที่เหมาะสม แนะนำให้มอบหมายร่วมกับหน่วยที่มีอุปกรณ์')}
                    </p>
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={includeSupport}
                        onChange={(e) => setIncludeSupport(e.target.checked)}
                        className="size-4 accent-primary"
                      />
                      {t('มอบหมายร่วมกับ {team} ({km} กม.)', { team: recommendation.support.team.name, km: recommendation.support.distanceKm.toFixed(1) })}
                    </label>
                  </div>
                )}

                <Button fullWidth disabled={!selectedTeamId} onClick={() => setConfirmOpen(true)}>
                  {supportTeam ? t('มอบหมายทั้ง 2 หน่วย') : t('มอบหมายหน่วยนี้')}
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
                    {t('มอบหมายหน่วยกู้ชีพสำเร็จแล้ว')}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-start gap-2.5">
                    <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-muted">{t('หน่วยกู้ชีพที่รับผิดชอบ')}</p>
                      <p className="text-sm font-semibold text-ink">{c.assignedRescueTeam.name}</p>
                    </div>
                  </div>
                  {c.assignedVehicle ? (
                    <>
                      <div className="flex items-start gap-2.5">
                        <Hash className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div>
                          <p className="text-xs text-muted">{t('รหัสรถ/ทีม')}</p>
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                            {c.assignedVehicle.unitCode}
                            <VehicleLevelBadge level={c.assignedVehicle.level} />
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Activity className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div>
                          <p className="text-xs text-muted">{t('ยานพาหนะ')}</p>
                          <p className="text-sm font-semibold text-ink">
                            {t('{vehicle} · {n} คน', { vehicle: c.assignedVehicle.vehicle, n: c.assignedVehicleCrewCount ?? c.assignedVehicle.members })}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted">{t('หน่วยกู้ชีพยังไม่ได้เลือกรถ/ทีมที่รับผิดชอบ')}</p>
                  )}
                  <div className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-muted">{t('เบอร์ติดต่อ')}</p>
                      <p className="text-sm font-semibold text-ink">{c.assignedRescueTeam.phone}</p>
                    </div>
                  </div>
                  {c.status !== 'rescue-assigned' && c.assignedVehicle?.driverName && (
                    <div className="flex items-start gap-2.5">
                      <IdCard className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-xs text-muted">{t('คนขับ · ทะเบียนรถ')}</p>
                        <p className="text-sm font-semibold text-ink">
                          {t('{driver} · {plate} · สังกัด {unit}', {
                            driver: c.assignedVehicle.driverName,
                            plate: c.assignedVehicle.plateNumber ?? '',
                            unit: c.assignedVehicle.unitCode,
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {c.supportingRescueTeam && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-border p-3">
                    <Wrench className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-muted">{t('หน่วยสนับสนุน (มีอุปกรณ์เฉพาะทาง)')}</p>
                      <p className="text-sm font-semibold text-ink">{c.supportingRescueTeam.name}</p>
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
                    {t('เพิ่มหน่วยสนับสนุนที่มีอุปกรณ์')}
                  </Button>
                )}

                {canAddSupport && showAddSupport && (
                  <div className="flex flex-col gap-2.5 rounded-xl border border-border p-3">
                    <p className="text-sm font-semibold text-ink">
                      {escalating ? t('เลือกหน่วยสนับสนุนระดับสูงขึ้น (แนะนำ ALS/CLS)') : t('เลือกหน่วยสนับสนุน')}
                    </p>
                    {requiredEquipment.length > 0 && (
                      <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                        <Wrench className="size-3.5 text-primary" />
                        {t('ต้องการอุปกรณ์: {list}', { list: requiredEquipment.join(', ') })}
                      </p>
                    )}
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                      <Input
                        value={supportTeamQuery}
                        onChange={(e) => setSupportTeamQuery(e.target.value)}
                        placeholder={t('ค้นหาชื่อหน่วยกู้ชีพ')}
                        className="pl-11"
                      />
                    </div>
                    <SearchableSelect
                      label={t('กรองตามจังหวัด (ไม่บังคับ)')}
                      value={supportProvinceFilter}
                      onChange={setSupportProvinceFilter}
                      placeholder={t('พิมพ์ชื่อจังหวัดเพื่อค้นหา')}
                      emptyLabel={t('ไม่พบจังหวัดที่ค้นหา')}
                      options={PROVINCE_OPTIONS}
                    />
                    <div className="flex flex-col gap-2">
                      {(() => {
                        const filteredSupport = supportCandidates.filter((r) => {
                          if (supportTeamQuery.trim() && !r.team.name.toLowerCase().includes(supportTeamQuery.trim().toLowerCase()))
                            return false
                          return teamMatchesProvince(r.team, supportProvinceFilter)
                        })
                        if (filteredSupport.length === 0) {
                          return <p className="py-2 text-center text-sm text-muted">{t('ไม่พบหน่วยกู้ชีพที่ตรงกับคำค้นหาหรือจังหวัดที่เลือก')}</p>
                        }
                        return (
                          <>
                            {filteredSupport.slice(0, 20).map((r) => (
                              <RadioCard
                                key={r.team.id}
                                selected={addSupportTeamId === r.team.id}
                                onClick={() => r.available && setAddSupportTeamId(r.team.id)}
                                title={r.team.name}
                                description={t('{km} กม. · {n} รถ/ทีม', { km: r.distanceKm.toFixed(1), n: r.team.vehicles.length }) + (!r.available ? ` · ${t('ไม่ว่าง')}` : '')}
                                className={clsx(!r.available && 'pointer-events-none opacity-50')}
                                badge={
                                  <span className="flex flex-col items-end gap-1">
                                    <VehicleLevelBadge level={bestTeamLevel(r.team)} />
                                  </span>
                                }
                              />
                            ))}
                            {filteredSupport.length > 20 && (
                              <p className="text-center text-xs text-muted">
                                {t('แสดง {limit} หน่วยที่ใกล้ที่สุด จากทั้งหมด {total} หน่วย', {
                                  limit: 20,
                                  total: filteredSupport.length.toLocaleString('th-TH'),
                                })}
                              </p>
                            )}
                          </>
                        )
                      })()}
                    </div>
                    <div className="flex gap-2">
                      <Button fullWidth disabled={!addSupportTeamId} loading={addSupportLoading} onClick={handleAddSupport}>
                        {t('ยืนยันเพิ่มหน่วยสนับสนุน')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddSupport(false)
                          setEscalating(false)
                        }}
                        disabled={addSupportLoading}
                      >
                        {t('ยกเลิก')}
                      </Button>
                    </div>
                  </div>
                )}
                <p className="rounded-xl bg-skyblue-light px-3 py-2.5 text-xs font-medium text-muted">
                  {t('หน่วยกู้ชีพรับผิดชอบเคสนี้แล้ว')}
                </p>
              </div>
            )}

            {c.status === 'completed' && (
              <SuccessState title={t('เคสเสร็จสิ้นแล้ว')} description={t('กระบวนการช่วยเหลือฉุกเฉินเสร็จสมบูรณ์')} />
            )}
          </Card>
        </div>
      </div>

      <ConfirmationModal
        open={confirmOpen}
        title={t('ยืนยันการมอบหมายหน่วยกู้ชีพ')}
        message={selectedTeam ? t('ต้องการมอบหมาย "{team}" ให้รับผิดชอบเคส {caseNumber} ใช่หรือไม่', { team: selectedTeam.name, caseNumber: c.caseNumber }) : ''}
        confirmLabel={t('ยืนยันมอบหมาย')}
        confirmLoading={assignLoading}
        onConfirm={handleConfirmAssign}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmationModal
        open={escalateConfirmOpen}
        title={t('ต้องการมอบหมายหน่วยสนับสนุนระดับสูงขึ้นหรือไม่')}
        message={
          escalateLevel
            ? t('ระดับความรุนแรงเพิ่มขึ้น — ต้องการมอบหมายหน่วยสนับสนุนระดับ {level} เพิ่มเติมหรือไม่', { level: escalateLevel })
            : ''
        }
        confirmLabel={t('มอบหมายหน่วยสนับสนุน')}
        cancelLabel={t('ไม่ต้อง')}
        onConfirm={() => {
          setEscalateConfirmOpen(false)
          setEscalating(true)
          setShowAddSupport(true)
        }}
        onCancel={() => setEscalateConfirmOpen(false)}
      />

      <ShareCaseModal
        open={shareOpen}
        url={`${window.location.origin}${import.meta.env.BASE_URL}public/case/${c.id}`}
        onClose={() => setShareOpen(false)}
        title={t('แชร์ลิงก์ติดตามเคส')}
        description={t('สแกน QR หรือคัดลอกลิงก์เพื่อส่งให้ผู้แจ้งเหตุ ญาติ หรือหน่วยงานที่เกี่ยวข้องดูสถานะแบบเรียลไทม์')}
      />
        </div>
      </div>
    </AppShell>
  )
}
