import { useState } from 'react'
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

function SectionHeader({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
        {index}
      </span>
      <h3 className="font-bold text-navy">{title}</h3>
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

export default function RescuePatientRecord() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const c = useStore((s) => (id ? s.cases[id] : undefined))
  const submitPatientInfo = useStore((s) => s.submitPatientInfo)
  const addAudioRecording = useStore((s) => s.addAudioRecording)

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [primarySurvey, setPrimarySurvey] = useState<PrimarySurvey>(emptyPrimarySurvey)
  const [gcs, setGcs] = useState<Partial<GcsScore>>({})
  const [vitals, setVitals] = useState<VitalSigns>(emptyVitals)
  const [firstAid, setFirstAid] = useState('')
  const [firstAidError, setFirstAidError] = useState('')
  const [proposedSeverity, setProposedSeverity] = useState<Severity | null>(null)
  const [severityNote, setSeverityNote] = useState('')
  const [loading, setLoading] = useState(false)

  if (!id || !c) {
    return (
      <AppShell variant="dashboard" title="บันทึกข้อมูลผู้ป่วย">
        <ErrorState
          title="ไม่พบเคสนี้"
          description="เคสอาจถูกลบหรือไม่มีอยู่ในระบบ"
          onRetry={() => navigate('/rescue/dashboard')}
          retryLabel="กลับแดชบอร์ด"
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
      toast({ title: 'บันทึกเสียงแล้ว', tone: 'success' })
    } catch {
      toast({ title: 'อัปโหลดเสียงไม่สำเร็จ', tone: 'error' })
    }
  }

  function handleSubmit() {
    if (!firstAid.trim()) {
      setFirstAidError('กรุณาระบุการปฐมพยาบาลเบื้องต้น')
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
      setLoading(false)
      toast({ title: 'บันทึกข้อมูลผู้ป่วยแล้ว', message: `เคส ${c!.caseNumber} พร้อมสำหรับขั้นตอนต่อไป`, tone: 'success' })
      navigate(`/rescue/case/${c!.id}`)
    }, 600)
  }

  return (
    <AppShell variant="dashboard" title="บันทึกข้อมูลผู้ป่วย">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-5">
        <Card className="animate-fade-in-up space-y-4" style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionHeader index={1} title="ข้อมูลผู้ป่วย" />
            <Button variant="outline" size="sm" icon={<ScanLine className="size-4" />} onClick={() => setScannerOpen(true)}>
              สแกนบัตรประชาชน
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="ชื่อผู้ป่วย" placeholder="ไม่ทราบชื่อ" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="เลขบัตรประชาชน" placeholder="ไม่ทราบ" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} maxLength={13} />
            <Input label="อายุ" placeholder="เช่น 45" value={age} onChange={(e) => setAge(e.target.value)} />
            <Select label="เพศ" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">ไม่ระบุ</option>
              <option value="ชาย">ชาย</option>
              <option value="หญิง">หญิง</option>
              <option value="ไม่ทราบ">ไม่ทราบ</option>
            </Select>
          </div>
        </Card>

        <IdCardScannerModal
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onApply={({ name: scannedName, idNumber: scannedId }) => {
            if (scannedName) setName(scannedName)
            if (scannedId) setIdNumber(scannedId)
            toast({ title: 'นำข้อมูลจากบัตรมาใช้แล้ว', message: 'กรุณาตรวจสอบความถูกต้องอีกครั้ง', tone: 'info' })
          }}
        />

        <Card className="animate-fade-in-up space-y-4" style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}>
          <SectionHeader index={2} title="การประเมินเบื้องต้น (G-R-X-A-B-C-D-E)" />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-navy">{PRIMARY_SURVEY_FIELDS[0].letter} - {PRIMARY_SURVEY_FIELDS[0].label}</label>
            <p className="text-xs text-muted">{PRIMARY_SURVEY_FIELDS[0].hint}</p>
            <SpeechToTextPanel
              value={primarySurvey.generalImpression ?? ''}
              onChange={(v) => updatePrimarySurvey('generalImpression', v)}
              label="พิมพ์หรือพูดเพื่อบันทึก"
            />
            <Input
              label="การรักษาที่ให้ไปแล้ว (ถ้ามี)"
              value={primarySurvey.treatments?.generalImpression ?? ''}
              onChange={(e) => updateTreatment('generalImpression', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-navy">R/D - การตอบสนองและระบบประสาท (Responsiveness/Disability)</label>
            <p className="text-xs text-muted">
              ประเมินการตอบสนองของผู้ป่วยต่อเสียง การสัมผัส หรือสิ่งเร้าต่างๆ พร้อมรายละเอียดการทำงานของระบบประสาท เช่น
              การตอบสนองของลูกตา การเคลื่อนไหว
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RESPONSIVENESS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrimarySurvey((p) => ({ ...p, responsiveness: opt.value }))}
                  className={clsx(
                    'rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
                    primarySurvey.responsiveness === opt.value
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-white text-navy hover:border-primary hover:text-primary',
                  )}
                >
                  {opt.title}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-navy">Glasgow Coma Scale (GCS) — ไม่บังคับ</p>
              {gcs.eye !== undefined && gcs.verbal !== undefined && gcs.motor !== undefined && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                  รวม {gcsTotal({ eye: gcs.eye, verbal: gcs.verbal, motor: gcs.motor })}/15
                </span>
              )}
            </div>
            {(
              [
                ['E - การลืมตา (Eye)', GCS_EYE_OPTIONS, gcs.eye, (v: GcsScore['eye']) => setGcs((g) => ({ ...g, eye: v }))],
                ['V - การพูด (Verbal)', GCS_VERBAL_OPTIONS, gcs.verbal, (v: GcsScore['verbal']) => setGcs((g) => ({ ...g, verbal: v }))],
                ['M - การเคลื่อนไหว (Motor)', GCS_MOTOR_OPTIONS, gcs.motor, (v: GcsScore['motor']) => setGcs((g) => ({ ...g, motor: v }))],
              ] as const
            ).map(([label, options, current, setValue]) => (
              <div key={label} className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted">{label}</p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue(opt.value as never)}
                      className={clsx(
                        'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                        current === opt.value
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-white text-navy hover:border-primary hover:text-primary',
                      )}
                    >
                      {opt.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {PRIMARY_SURVEY_FIELDS.slice(1).map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-navy">{f.letter} - {f.label}</label>
              <p className="text-xs text-muted">{f.hint}</p>
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
                          : 'border-border bg-white hover:border-primary/40',
                      )}
                    >
                      <p className="font-bold text-navy">{opt.title}</p>
                      <p className="text-muted">{opt.description}</p>
                    </button>
                  ))}
                </div>
              )}
              <SpeechToTextPanel
                value={primarySurvey[f.key] ?? ''}
                onChange={(v) => updatePrimarySurvey(f.key, v)}
                label="พิมพ์หรือพูดเพื่อบันทึก"
              />
              <Input
                label="การรักษาที่ให้ไปแล้ว (ถ้ามี)"
                value={primarySurvey.treatments?.[f.key] ?? ''}
                onChange={(e) => updateTreatment(f.key, e.target.value)}
              />
            </div>
          ))}
        </Card>

        <Card className="animate-fade-in-up space-y-4" style={{ animationDelay: '140ms', animationFillMode: 'backwards' }}>
          <SectionHeader index={3} title="สัญญาณชีพ" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="ความดันโลหิต"
              placeholder="120/80"
              value={vitals.bloodPressure}
              onChange={(e) => updateVital('bloodPressure', e.target.value)}
            />
            <Input label="ชีพจร (ครั้ง/นาที)" placeholder="80" value={vitals.pulse} onChange={(e) => updateVital('pulse', e.target.value)} />
            <Input
              label="อุณหภูมิ (°C)"
              placeholder="36.5"
              value={vitals.temperature}
              onChange={(e) => updateVital('temperature', e.target.value)}
            />
            <Input
              label="อัตราการหายใจ (ครั้ง/นาที)"
              placeholder="18"
              value={vitals.respiration}
              onChange={(e) => updateVital('respiration', e.target.value)}
            />
            <Input
              label="ออกซิเจนในเลือด (%)"
              placeholder="98"
              value={vitals.oxygenSat}
              onChange={(e) => updateVital('oxygenSat', e.target.value)}
            />
          </div>
        </Card>

        <Card className="animate-fade-in-up space-y-3" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
          <SectionHeader index={4} title="การปฐมพยาบาล" />
          <SpeechToTextPanel value={firstAid} onChange={setFirstAid} label="การปฐมพยาบาลเบื้องต้น (พิมพ์หรือพูด)" />
          {firstAidError && <p className="text-xs font-medium text-emergency">{firstAidError}</p>}
        </Card>

        <Card className="animate-fade-in-up space-y-3" style={{ animationDelay: '230ms', animationFillMode: 'backwards' }}>
          <SectionHeader index={5} title="เสนอปรับระดับความรุนแรง (ถ้าจำเป็น)" />
          <p className="text-xs text-muted">
            เลือกเฉพาะเมื่อการประเมินจากที่เกิดเหตุจริงต่างจากที่ศูนย์ 1669 ประเมินไว้ทางโทรศัพท์
            {c.assessment && ' — ไม่เลือกหมายถึงเห็นด้วยกับระดับเดิม'}
          </p>
          <div className="flex flex-col gap-2.5">
            {SEVERITY_OPTIONS.map((opt) => (
              <RadioCard
                key={opt.value}
                selected={proposedSeverity === opt.value}
                onClick={() => setProposedSeverity((cur) => (cur === opt.value ? null : opt.value))}
                title={opt.title}
                description={opt.description}
                tone={opt.tone}
              />
            ))}
          </div>
          {proposedSeverity && (
            <SpeechToTextPanel
              value={severityNote}
              onChange={setSeverityNote}
              label="เหตุผลที่เสนอปรับระดับ (พิมพ์หรือพูด)"
            />
          )}
        </Card>

        <div className="animate-fade-in-up" style={{ animationDelay: '260ms', animationFillMode: 'backwards' }}>
          <AudioRecorder label="บันทึกเสียงเพิ่มเติม (ถ้ามี)" onSave={handleSaveAudio} />
        </div>

        <Button variant="primary" size="lg" fullWidth loading={loading} onClick={handleSubmit}>
          บันทึกข้อมูลผู้ป่วย
        </Button>
        </div>
      </div>
    </AppShell>
  )
}
