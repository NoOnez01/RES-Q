import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ScanLine } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { RadioCard } from '@/components/ui/RadioCard'
import { SpeechToTextPanel } from '@/components/SpeechToTextPanel'
import { AudioRecorder } from '@/components/AudioRecorder'
import { IdCardScannerModal } from '@/components/IdCardScannerModal'
import { ErrorState } from '@/components/States'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { uploadCaseAudio } from '@/lib/storageUploads'
import { SEVERITY_OPTIONS } from '@/lib/severityOptions'
import { gcsTotal } from '@/lib/types'
import type {
  PatientInfo,
  VitalSigns,
  PrimarySurvey,
  PrimarySurveyFindingKey,
  Responsiveness,
  HemorrhageClass,
  GcsScore,
  Severity,
} from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'A - รู้สึกตัวดี': 'A - Alert',
  'V - ตอบสนองต่อเสียงเรียก': 'V - Responds to Voice',
  'P - ตอบสนองต่อความเจ็บปวด': 'P - Responds to Pain',
  'U - ไม่ตอบสนอง': 'U - Unresponsive',
  '4 - ลืมตาเอง': '4 - Spontaneous',
  '3 - ลืมตาเมื่อเรียก': '3 - To voice',
  '2 - ลืมตาเมื่อเจ็บ': '2 - To pain',
  '1 - ไม่ลืมตา': '1 - None',
  '5 - พูดคุยรู้เรื่อง': '5 - Oriented',
  '4 - พูดสับสน': '4 - Confused',
  '3 - พูดเป็นคำๆ': '3 - Inappropriate words',
  '2 - ส่งเสียงไม่เป็นคำ': '2 - Incomprehensible sounds',
  '1 - ไม่ส่งเสียง': '1 - None',
  '6 - ทำตามคำสั่ง': '6 - Obeys commands',
  '5 - ปัดตำแหน่งที่เจ็บได้': '5 - Localizes pain',
  '4 - ชักแขนขาหนีเจ็บ': '4 - Withdraws from pain',
  '3 - งอแขนขาผิดปกติ': '3 - Abnormal flexion',
  '2 - เหยียดแขนขาผิดปกติ': '2 - Abnormal extension',
  '1 - ไม่ขยับ': '1 - None',
  'เสียเลือด < 750 มล. · ชีพจรและความดันปกติ': 'Blood loss < 750 mL · normal pulse and blood pressure',
  'เสียเลือด 750-1500 มล. · ชีพจรเร็วขึ้น เริ่มกระสับกระส่าย': 'Blood loss 750-1500 mL · increasing pulse, mild anxiety',
  'เสียเลือด 1500-2000 มล. · ความดันตก ชีพจรเบาเร็ว สับสน': 'Blood loss 1500-2000 mL · falling blood pressure, weak rapid pulse, confusion',
  'เสียเลือด > 2000 มล. · ความดันตกมาก ซึมลงมาก อันตรายถึงชีวิต': 'Blood loss > 2000 mL · severe hypotension, obtunded, life-threatening',
  'ภาพรวมผู้ป่วย (General Impression)': 'General Impression',
  'ลักษณะทั่วไปของผู้ป่วยที่พบเมื่อแรกเห็น เช่น นอนซึม ผิวซีด หายใจเร็ว': "General appearance of the patient on first contact, e.g. lethargic, pale, rapid breathing",
  'การห้ามเลือด (Exsanguinating Hemorrhage)': 'Exsanguinating Hemorrhage',
  สำรวจผู้ป่วยและห้ามเลือดจุดที่จะเกิดภาวะคุกคามชีวิต: 'Survey the patient and control any life-threatening bleeding',
  'ทางเดินหายใจ (Airway)': 'Airway',
  ตรวจสอบและจัดการทางเดินหายใจให้โล่งและเปิดอยู่เสมอ: 'Check and maintain an open, clear airway',
  'การหายใจ (Breathing)': 'Breathing',
  'ประเมินว่าการหายใจปกติหรือไม่ อัตราเหมาะสมหรือมีอาการหอบเหนื่อยหรือไม่':
    'Assess whether breathing is normal, at an appropriate rate, or labored',
  'การไหลเวียนโลหิต (Circulation)': 'Circulation',
  'ตรวจสอบชีพจร สีของผิวหนัง ความดันโลหิต': 'Check pulse, skin color, and blood pressure',
  'สิ่งแวดล้อม (Exposure/Environment)': 'Exposure/Environment',
  'ป้องกันการสูญเสียความร้อนของร่างกาย และประเมินสิ่งแวดล้อมรอบตัวเพื่อหาปัจจัยเสี่ยง':
    'Prevent heat loss and assess the surrounding environment for risk factors',
  กู้คืนข้อมูลที่กรอกไว้ล่าสุดแล้ว: 'Restored your last saved draft',
  บันทึกข้อมูลผู้ป่วย: 'Record patient data',
  ไม่พบเคสนี้: 'Case not found',
  เคสอาจถูกลบหรือไม่มีอยู่ในระบบ: 'This case may have been deleted or does not exist',
  กลับแดชบอร์ด: 'Back to dashboard',
  บันทึกเสียงแล้ว: 'Audio saved',
  อัปโหลดเสียงไม่สำเร็จ: 'Failed to upload audio',
  กรุณาระบุการปฐมพยาบาลเบื้องต้น: 'Please describe the first aid given',
  บันทึกข้อมูลผู้ป่วยแล้ว: 'Patient data saved',
  'เคส {caseNumber} พร้อมสำหรับขั้นตอนต่อไป': 'Case {caseNumber} is ready for the next step',
  ข้อมูลผู้ป่วย: 'Patient information',
  สแกนบัตรประชาชน: 'Scan ID card',
  ชื่อผู้ป่วย: "Patient's name",
  ไม่ทราบชื่อ: 'Name unknown',
  เลขบัตรประชาชน: 'National ID number',
  ไม่ทราบ: 'Unknown',
  อายุ: 'Age',
  'เช่น 45': 'e.g. 45',
  เพศ: 'Gender',
  ไม่ระบุ: 'Unspecified',
  ชาย: 'Male',
  หญิง: 'Female',
  นำข้อมูลจากบัตรมาใช้แล้ว: 'Applied data from the ID card',
  กรุณาตรวจสอบความถูกต้องอีกครั้ง: 'Please double-check the details',
  'การประเมินเบื้องต้น (G-R-X-A-B-C-D-E)': 'Primary Survey (G-R-X-A-B-C-D-E)',
  พิมพ์หรือพูดเพื่อบันทึก: 'Type or speak to record',
  'การรักษาที่ให้ไปแล้ว (ถ้ามี)': 'Treatment already given (if any)',
  'R/D - การตอบสนองและระบบประสาท (Responsiveness/Disability)': 'R/D - Responsiveness/Disability',
  'ประเมินการตอบสนองของผู้ป่วยต่อเสียง การสัมผัส หรือสิ่งเร้าต่างๆ พร้อมรายละเอียดการทำงานของระบบประสาท เช่น การตอบสนองของลูกตา การเคลื่อนไหว':
    "Assess the patient's response to voice, touch, or other stimuli, along with neurological details such as pupil response and movement",
  'Glasgow Coma Scale (GCS) — ไม่บังคับ': 'Glasgow Coma Scale (GCS) — optional',
  'รวม {n}/15': 'Total {n}/15',
  'คะแนนแยกจาก AVPU ด้านบน ใช้เสริมการประเมินระดับความรู้สึกตัวให้ละเอียดขึ้น':
    'A separate score from the AVPU above, used to refine the consciousness assessment',
  'E - การลืมตา (Eye)': 'E - Eye Opening',
  'V - การพูด (Verbal)': 'V - Verbal Response',
  'M - การเคลื่อนไหว (Motor)': 'M - Motor Response',
  สัญญาณชีพ: 'Vital signs',
  ความดันโลหิต: 'Blood pressure',
  'ชีพจร (ครั้ง/นาที)': 'Pulse (bpm)',
  'อุณหภูมิ (°C)': 'Temperature (°C)',
  'อัตราการหายใจ (ครั้ง/นาที)': 'Respiration rate (breaths/min)',
  'ออกซิเจนในเลือด (%)': 'Oxygen saturation (%)',
  การปฐมพยาบาล: 'First aid',
  'การปฐมพยาบาลเบื้องต้น (พิมพ์หรือพูด)': 'First aid given (type or speak)',
  'เสนอปรับระดับความรุนแรง (ถ้าจำเป็น)': 'Propose a severity change (if needed)',
  'เลือกเฉพาะเมื่อการประเมินจากที่เกิดเหตุจริงต่างจากที่ศูนย์ 1669 ประเมินไว้ทางโทรศัพท์':
    'Select only if the on-scene assessment differs from what Center 1669 assessed over the phone',
  '— ไม่เลือกหมายถึงเห็นด้วยกับระดับเดิม': '— leaving this unselected means you agree with the original level',
  'เหตุผลที่เสนอปรับระดับ (พิมพ์หรือพูด)': 'Reason for the proposed change (type or speak)',
  'บันทึกเสียงเพิ่มเติม (ถ้ามี)': 'Record additional audio (if any)',
})

function SectionHeader({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
        {index}
      </span>
      <h3 className="font-bold text-ink">{title}</h3>
    </div>
  )
}

/** Shared "pick one of N" grid for this page's plain title-only option
 * lists (AVPU responsiveness, GCS eye/verbal/motor) -- all four use the
 * same active/inactive color logic, just at two different sizes (AVPU is
 * the primary triage control; the three GCS sub-scores are secondary,
 * stacked, and deliberately more compact). Not used for
 * HEMORRHAGE_CLASS_OPTIONS below, which needs its own title+description
 * layout and a different active-state treatment. */
function OptionButtonGrid<V>({
  options,
  value,
  onChange,
  columns,
  size = 'md',
}: {
  options: { value: V; title: string }[]
  value: V | undefined
  onChange: (value: V) => void
  columns: string
  size?: 'md' | 'sm'
}) {
  const t = useT()
  return (
    <div className={clsx('grid gap-2', columns)}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={clsx(
            'border font-semibold transition-colors',
            size === 'md' ? 'rounded-xl px-3 py-2.5 text-sm' : 'rounded-lg px-2.5 py-1.5 text-xs',
            value === opt.value
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-surface text-ink hover:border-primary hover:text-primary',
          )}
        >
          {t(opt.title)}
        </button>
      ))}
    </div>
  )
}

const emptyVitals: VitalSigns = {
  bloodPressure: '',
  pulse: '',
  temperature: '',
  respiration: '',
  oxygenSat: '',
}

const emptyPrimarySurvey: PrimarySurvey = {
  generalImpression: '',
  responsiveness: undefined,
  exsanguinatingHemorrhage: '',
  hemorrhageClass: undefined,
  airway: '',
  breathing: '',
  circulation: '',
  exposure: '',
  treatments: {},
}

const RESPONSIVENESS_OPTIONS: { value: Responsiveness; title: string }[] = [
  { value: 'A', title: 'A - รู้สึกตัวดี' },
  { value: 'V', title: 'V - ตอบสนองต่อเสียงเรียก' },
  { value: 'P', title: 'P - ตอบสนองต่อความเจ็บปวด' },
  { value: 'U', title: 'U - ไม่ตอบสนอง' },
]

const GCS_EYE_OPTIONS: { value: GcsScore['eye']; title: string }[] = [
  { value: 4, title: '4 - ลืมตาเอง' },
  { value: 3, title: '3 - ลืมตาเมื่อเรียก' },
  { value: 2, title: '2 - ลืมตาเมื่อเจ็บ' },
  { value: 1, title: '1 - ไม่ลืมตา' },
]

const GCS_VERBAL_OPTIONS: { value: GcsScore['verbal']; title: string }[] = [
  { value: 5, title: '5 - พูดคุยรู้เรื่อง' },
  { value: 4, title: '4 - พูดสับสน' },
  { value: 3, title: '3 - พูดเป็นคำๆ' },
  { value: 2, title: '2 - ส่งเสียงไม่เป็นคำ' },
  { value: 1, title: '1 - ไม่ส่งเสียง' },
]

const GCS_MOTOR_OPTIONS: { value: GcsScore['motor']; title: string }[] = [
  { value: 6, title: '6 - ทำตามคำสั่ง' },
  { value: 5, title: '5 - ปัดตำแหน่งที่เจ็บได้' },
  { value: 4, title: '4 - ชักแขนขาหนีเจ็บ' },
  { value: 3, title: '3 - งอแขนขาผิดปกติ' },
  { value: 2, title: '2 - เหยียดแขนขาผิดปกติ' },
  { value: 1, title: '1 - ไม่ขยับ' },
]

// Standard ATLS/PHTLS hemorrhagic shock classification -- estimated blood
// loss and the clinical signs that go with each class, so rescue can pick
// a level instead of just describing it in free text.
const HEMORRHAGE_CLASS_OPTIONS: { value: HemorrhageClass; title: string; description: string }[] = [
  { value: 1, title: 'Class I (< 15%)', description: 'เสียเลือด < 750 มล. · ชีพจรและความดันปกติ' },
  { value: 2, title: 'Class II (15-30%)', description: 'เสียเลือด 750-1500 มล. · ชีพจรเร็วขึ้น เริ่มกระสับกระส่าย' },
  { value: 3, title: 'Class III (30-40%)', description: 'เสียเลือด 1500-2000 มล. · ความดันตก ชีพจรเบาเร็ว สับสน' },
  { value: 4, title: 'Class IV (> 40%)', description: 'เสียเลือด > 2000 มล. · ความดันตกมาก ซึมลงมาก อันตรายถึงชีวิต' },
]

const PRIMARY_SURVEY_FIELDS: {
  key: PrimarySurveyFindingKey
  letter: string
  label: string
  hint: string
}[] = [
  {
    key: 'generalImpression',
    letter: 'G',
    label: 'ภาพรวมผู้ป่วย (General Impression)',
    hint: 'ลักษณะทั่วไปของผู้ป่วยที่พบเมื่อแรกเห็น เช่น นอนซึม ผิวซีด หายใจเร็ว',
  },
  {
    key: 'exsanguinatingHemorrhage',
    letter: 'X',
    label: 'การห้ามเลือด (Exsanguinating Hemorrhage)',
    hint: 'สำรวจผู้ป่วยและห้ามเลือดจุดที่จะเกิดภาวะคุกคามชีวิต',
  },
  {
    key: 'airway',
    letter: 'A',
    label: 'ทางเดินหายใจ (Airway)',
    hint: 'ตรวจสอบและจัดการทางเดินหายใจให้โล่งและเปิดอยู่เสมอ',
  },
  {
    key: 'breathing',
    letter: 'B',
    label: 'การหายใจ (Breathing)',
    hint: 'ประเมินว่าการหายใจปกติหรือไม่ อัตราเหมาะสมหรือมีอาการหอบเหนื่อยหรือไม่',
  },
  {
    key: 'circulation',
    letter: 'C',
    label: 'การไหลเวียนโลหิต (Circulation)',
    hint: 'ตรวจสอบชีพจร สีของผิวหนัง ความดันโลหิต',
  },
  {
    key: 'exposure',
    letter: 'E',
    label: 'สิ่งแวดล้อม (Exposure/Environment)',
    hint: 'ป้องกันการสูญเสียความร้อนของร่างกาย และประเมินสิ่งแวดล้อมรอบตัวเพื่อหาปัจจัยเสี่ยง',
  },
]

// A rescue crew fills this in on a moving vehicle's phone -- an accidental
// refresh, a dropped connection reload, or the browser just reclaiming
// memory on a long call must not silently wipe minutes of recorded vitals
// and assessment. Drafted to localStorage per case, cleared only once the
// real submission succeeds.
interface PatientRecordDraft {
  name: string
  age: string
  gender: string
  idNumber: string
  primarySurvey: PrimarySurvey
  gcs: Partial<GcsScore>
  vitals: VitalSigns
  firstAid: string
  proposedSeverity: Severity | null
  severityNote: string
}

function draftKey(caseId: string): string {
  return `resq-patient-record-draft-${caseId}`
}

function loadDraft(caseId: string): PatientRecordDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(caseId))
    return raw ? (JSON.parse(raw) as PatientRecordDraft) : null
  } catch {
    return null
  }
}

function clearDraft(caseId: string): void {
  try {
    localStorage.removeItem(draftKey(caseId))
  } catch {
    // Private-mode/storage-disabled browsers throw on access -- nothing to
    // clean up in that case anyway, since a draft was never written either.
  }
}

export default function RescuePatientRecord() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const c = useStore((s) => (id ? s.cases[id] : undefined))
  const submitPatientInfo = useStore((s) => s.submitPatientInfo)
  const addAudioRecording = useStore((s) => s.addAudioRecording)
  const t = useT()

  const draft = useMemo(() => (id ? loadDraft(id) : null), [id])

  const [name, setName] = useState(draft?.name ?? '')
  const [age, setAge] = useState(draft?.age ?? '')
  const [gender, setGender] = useState(draft?.gender ?? '')
  const [idNumber, setIdNumber] = useState(draft?.idNumber ?? '')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [primarySurvey, setPrimarySurvey] = useState<PrimarySurvey>(draft?.primarySurvey ?? emptyPrimarySurvey)
  const [gcs, setGcs] = useState<Partial<GcsScore>>(draft?.gcs ?? {})
  const [vitals, setVitals] = useState<VitalSigns>(draft?.vitals ?? emptyVitals)
  const [firstAid, setFirstAid] = useState(draft?.firstAid ?? '')
  const [firstAidError, setFirstAidError] = useState('')
  const [proposedSeverity, setProposedSeverity] = useState<Severity | null>(draft?.proposedSeverity ?? null)
  const [severityNote, setSeverityNote] = useState(draft?.severityNote ?? '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (draft) toast({ title: t('กู้คืนข้อมูลที่กรอกไว้ล่าสุดแล้ว'), tone: 'info' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!id) return
    const data: PatientRecordDraft = {
      name,
      age,
      gender,
      idNumber,
      primarySurvey,
      gcs,
      vitals,
      firstAid,
      proposedSeverity,
      severityNote,
    }
    try {
      localStorage.setItem(draftKey(id), JSON.stringify(data))
    } catch {
      // Private-mode/storage-disabled browsers throw on write -- the form
      // still works for this session, it just can't survive a refresh.
    }
  }, [id, name, age, gender, idNumber, primarySurvey, gcs, vitals, firstAid, proposedSeverity, severityNote])

  if (!id || !c) {
    return (
      <AppShell variant="dashboard" title={t('บันทึกข้อมูลผู้ป่วย')}>
        <ErrorState
          title={t('ไม่พบเคสนี้')}
          description={t('เคสอาจถูกลบหรือไม่มีอยู่ในระบบ')}
          onRetry={() => navigate('/rescue/dashboard')}
          retryLabel={t('กลับแดชบอร์ด')}
        />
      </AppShell>
    )
  }

  function updateVital(key: keyof VitalSigns, value: string) {
    setVitals((v) => ({ ...v, [key]: value }))
  }

  function updatePrimarySurvey(key: PrimarySurveyFindingKey, value: string) {
    setPrimarySurvey((p) => ({ ...p, [key]: value }))
  }

  function updateTreatment(key: PrimarySurveyFindingKey, value: string) {
    setPrimarySurvey((p) => ({ ...p, treatments: { ...p.treatments, [key]: value } }))
  }

  async function handleSaveAudio(blob: Blob, seconds: number) {
    if (!c) return
    try {
      const url = await uploadCaseAudio(c.caseNumber, blob)
      addAudioRecording(c.id, url, seconds, 'rescue')
      toast({ title: t('บันทึกเสียงแล้ว'), tone: 'success' })
    } catch {
      toast({ title: t('อัปโหลดเสียงไม่สำเร็จ'), tone: 'error' })
    }
  }

  function handleSubmit() {
    if (!firstAid.trim()) {
      setFirstAidError(t('กรุณาระบุการปฐมพยาบาลเบื้องต้น'))
      return
    }
    setFirstAidError('')
    // A partial GCS total would be clinically misleading -- only attach it
    // once all three sub-scores are actually recorded.
    const fullGcs =
      gcs.eye !== undefined && gcs.verbal !== undefined && gcs.motor !== undefined
        ? { eye: gcs.eye, verbal: gcs.verbal, motor: gcs.motor }
        : undefined
    const info: PatientInfo = {
      name: name || undefined,
      age: age || undefined,
      gender: gender || undefined,
      idNumber: idNumber || undefined,
      primarySurvey: fullGcs ? { ...primarySurvey, gcs: fullGcs } : primarySurvey,
      vitals,
      firstAid,
    }
    // Only worth proposing when it actually differs from what 1669 already
    // has -- no point sending a no-op re-assessment.
    const severityProposal =
      proposedSeverity && proposedSeverity !== c!.assessment?.severity
        ? { severity: proposedSeverity, note: severityNote.trim() || undefined }
        : undefined
    setLoading(true)
    setTimeout(() => {
      submitPatientInfo(c!.id, info, severityProposal)
      clearDraft(c!.id)
      setLoading(false)
      toast({ title: t('บันทึกข้อมูลผู้ป่วยแล้ว'), message: t('เคส {caseNumber} พร้อมสำหรับขั้นตอนต่อไป', { caseNumber: c!.caseNumber }), tone: 'success' })
      navigate(`/rescue/case/${c!.id}`)
    }, 600)
  }

  return (
    <AppShell variant="dashboard" title={t('บันทึกข้อมูลผู้ป่วย')}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-5">
        <Card className="animate-fade-in-up space-y-4" style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionHeader index={1} title={t('ข้อมูลผู้ป่วย')} />
            <Button variant="outline" size="sm" icon={<ScanLine className="size-4" />} onClick={() => setScannerOpen(true)}>
              {t('สแกนบัตรประชาชน')}
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t('ชื่อผู้ป่วย')} placeholder={t('ไม่ทราบชื่อ')} value={name} onChange={(e) => setName(e.target.value)} />
            <Input label={t('เลขบัตรประชาชน')} placeholder={t('ไม่ทราบ')} value={idNumber} onChange={(e) => setIdNumber(e.target.value)} maxLength={13} />
            <Input label={t('อายุ')} placeholder={t('เช่น 45')} value={age} onChange={(e) => setAge(e.target.value)} />
            <Select label={t('เพศ')} value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">{t('ไม่ระบุ')}</option>
              <option value="ชาย">{t('ชาย')}</option>
              <option value="หญิง">{t('หญิง')}</option>
              <option value="ไม่ทราบ">{t('ไม่ทราบ')}</option>
            </Select>
          </div>
        </Card>

        <IdCardScannerModal
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onApply={({ name: scannedName, idNumber: scannedId }) => {
            if (scannedName) setName(scannedName)
            if (scannedId) setIdNumber(scannedId)
            toast({ title: t('นำข้อมูลจากบัตรมาใช้แล้ว'), message: t('กรุณาตรวจสอบความถูกต้องอีกครั้ง'), tone: 'info' })
          }}
        />

        <Card className="animate-fade-in-up space-y-4" style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}>
          <SectionHeader index={2} title={t('การประเมินเบื้องต้น (G-R-X-A-B-C-D-E)')} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink">{PRIMARY_SURVEY_FIELDS[0].letter} - {t(PRIMARY_SURVEY_FIELDS[0].label)}</label>
            <p className="text-xs text-muted">{t(PRIMARY_SURVEY_FIELDS[0].hint)}</p>
            <SpeechToTextPanel
              value={primarySurvey.generalImpression ?? ''}
              onChange={(v) => updatePrimarySurvey('generalImpression', v)}
              label={t('พิมพ์หรือพูดเพื่อบันทึก')}
            />
            <Input
              label={t('การรักษาที่ให้ไปแล้ว (ถ้ามี)')}
              value={primarySurvey.treatments?.generalImpression ?? ''}
              onChange={(e) => updateTreatment('generalImpression', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink">{t('R/D - การตอบสนองและระบบประสาท (Responsiveness/Disability)')}</label>
            <p className="text-xs text-muted">
              {t('ประเมินการตอบสนองของผู้ป่วยต่อเสียง การสัมผัส หรือสิ่งเร้าต่างๆ พร้อมรายละเอียดการทำงานของระบบประสาท เช่น การตอบสนองของลูกตา การเคลื่อนไหว')}
            </p>
            <OptionButtonGrid
              options={RESPONSIVENESS_OPTIONS}
              value={primarySurvey.responsiveness}
              onChange={(v) => setPrimarySurvey((p) => ({ ...p, responsiveness: v }))}
              columns="grid-cols-2 sm:grid-cols-4"
            />
          </div>

          {PRIMARY_SURVEY_FIELDS.slice(1).map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink">{f.letter} - {t(f.label)}</label>
              <p className="text-xs text-muted">{t(f.hint)}</p>
              {f.key === 'exsanguinatingHemorrhage' && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {HEMORRHAGE_CLASS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPrimarySurvey((p) => ({ ...p, hemorrhageClass: opt.value }))}
                      className={clsx(
                        'rounded-xl border px-3 py-2 text-left text-xs transition-colors',
                        primarySurvey.hemorrhageClass === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-surface hover:border-primary/40',
                      )}
                    >
                      <p className="font-bold text-ink">{opt.title}</p>
                      <p className="text-muted">{t(opt.description)}</p>
                    </button>
                  ))}
                </div>
              )}
              <SpeechToTextPanel
                value={primarySurvey[f.key] ?? ''}
                onChange={(v) => updatePrimarySurvey(f.key, v)}
                label={t('พิมพ์หรือพูดเพื่อบันทึก')}
              />
              <Input
                label={t('การรักษาที่ให้ไปแล้ว (ถ้ามี)')}
                value={primarySurvey.treatments?.[f.key] ?? ''}
                onChange={(e) => updateTreatment(f.key, e.target.value)}
              />
            </div>
          ))}

          <div className="flex flex-col gap-1.5 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-ink">{t('Glasgow Coma Scale (GCS) — ไม่บังคับ')}</label>
              {gcs.eye !== undefined && gcs.verbal !== undefined && gcs.motor !== undefined && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                  {t('รวม {n}/15', { n: gcsTotal({ eye: gcs.eye, verbal: gcs.verbal, motor: gcs.motor }) })}
                </span>
              )}
            </div>
            <p className="text-xs text-muted">{t('คะแนนแยกจาก AVPU ด้านบน ใช้เสริมการประเมินระดับความรู้สึกตัวให้ละเอียดขึ้น')}</p>
            {(
              [
                ['E - การลืมตา (Eye)', GCS_EYE_OPTIONS, gcs.eye, (v: GcsScore['eye']) => setGcs((g) => ({ ...g, eye: v }))],
                ['V - การพูด (Verbal)', GCS_VERBAL_OPTIONS, gcs.verbal, (v: GcsScore['verbal']) => setGcs((g) => ({ ...g, verbal: v }))],
                ['M - การเคลื่อนไหว (Motor)', GCS_MOTOR_OPTIONS, gcs.motor, (v: GcsScore['motor']) => setGcs((g) => ({ ...g, motor: v }))],
              ] as const
            ).map(([label, options, current, setValue]) => (
              <div key={label} className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted">{t(label)}</p>
                <OptionButtonGrid
                  options={options}
                  value={current}
                  onChange={(v) => setValue(v as never)}
                  columns="grid-cols-2 sm:grid-cols-3"
                  size="sm"
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="animate-fade-in-up space-y-4" style={{ animationDelay: '140ms', animationFillMode: 'backwards' }}>
          <SectionHeader index={3} title={t('สัญญาณชีพ')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('ความดันโลหิต')}
              placeholder="120/80"
              value={vitals.bloodPressure}
              onChange={(e) => updateVital('bloodPressure', e.target.value)}
            />
            <Input label={t('ชีพจร (ครั้ง/นาที)')} placeholder="80" value={vitals.pulse} onChange={(e) => updateVital('pulse', e.target.value)} />
            <Input
              label={t('อุณหภูมิ (°C)')}
              placeholder="36.5"
              value={vitals.temperature}
              onChange={(e) => updateVital('temperature', e.target.value)}
            />
            <Input
              label={t('อัตราการหายใจ (ครั้ง/นาที)')}
              placeholder="18"
              value={vitals.respiration}
              onChange={(e) => updateVital('respiration', e.target.value)}
            />
            <Input
              label={t('ออกซิเจนในเลือด (%)')}
              placeholder="98"
              value={vitals.oxygenSat}
              onChange={(e) => updateVital('oxygenSat', e.target.value)}
            />
          </div>
        </Card>

        <Card className="animate-fade-in-up space-y-3" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
          <SectionHeader index={4} title={t('การปฐมพยาบาล')} />
          <SpeechToTextPanel value={firstAid} onChange={setFirstAid} label={t('การปฐมพยาบาลเบื้องต้น (พิมพ์หรือพูด)')} />
          {firstAidError && <p className="text-xs font-medium text-emergency">{firstAidError}</p>}
        </Card>

        <Card className="animate-fade-in-up space-y-3" style={{ animationDelay: '230ms', animationFillMode: 'backwards' }}>
          <SectionHeader index={5} title={t('เสนอปรับระดับความรุนแรง (ถ้าจำเป็น)')} />
          <p className="text-xs text-muted">
            {t('เลือกเฉพาะเมื่อการประเมินจากที่เกิดเหตุจริงต่างจากที่ศูนย์ 1669 ประเมินไว้ทางโทรศัพท์')}
            {c.assessment && ` ${t('— ไม่เลือกหมายถึงเห็นด้วยกับระดับเดิม')}`}
          </p>
          <div className="flex flex-col gap-2.5">
            {SEVERITY_OPTIONS.map((opt) => (
              <RadioCard
                key={opt.value}
                selected={proposedSeverity === opt.value}
                onClick={() => setProposedSeverity((cur) => (cur === opt.value ? null : opt.value))}
                title={t(opt.title)}
                description={opt.description ? t(opt.description) : undefined}
                tone={opt.tone}
              />
            ))}
          </div>
          {proposedSeverity && (
            <SpeechToTextPanel
              value={severityNote}
              onChange={setSeverityNote}
              label={t('เหตุผลที่เสนอปรับระดับ (พิมพ์หรือพูด)')}
            />
          )}
        </Card>

        <div className="animate-fade-in-up" style={{ animationDelay: '260ms', animationFillMode: 'backwards' }}>
          <AudioRecorder label={t('บันทึกเสียงเพิ่มเติม (ถ้ามี)')} onSave={handleSaveAudio} />
        </div>

        <Button variant="primary" size="lg" fullWidth loading={loading} onClick={handleSubmit}>
          {t('บันทึกข้อมูลผู้ป่วย')}
        </Button>
        </div>
      </div>
    </AppShell>
  )
}
