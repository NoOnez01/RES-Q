import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { SpeechToTextPanel } from '@/components/SpeechToTextPanel'
import { AudioRecorder } from '@/components/AudioRecorder'
import { ErrorState } from '@/components/States'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { uploadCaseAudio } from '@/lib/storageUploads'
import type { PatientInfo, VitalSigns, PrimarySurvey, Responsiveness } from '@/lib/types'

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
  airway: '',
  breathing: '',
  circulation: '',
  exposure: '',
}

const RESPONSIVENESS_OPTIONS: { value: Responsiveness; title: string }[] = [
  { value: 'A', title: 'A - รู้สึกตัวดี' },
  { value: 'V', title: 'V - ตอบสนองต่อเสียงเรียก' },
  { value: 'P', title: 'P - ตอบสนองต่อความเจ็บปวด' },
  { value: 'U', title: 'U - ไม่ตอบสนอง' },
]

const PRIMARY_SURVEY_FIELDS: {
  key: Exclude<keyof PrimarySurvey, 'responsiveness'>
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
  const [primarySurvey, setPrimarySurvey] = useState<PrimarySurvey>(emptyPrimarySurvey)
  const [vitals, setVitals] = useState<VitalSigns>(emptyVitals)
  const [firstAid, setFirstAid] = useState('')
  const [firstAidError, setFirstAidError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!id || !c) {
    return (
      <AppShell variant="dashboard" title="บันทึกข้อมูลผู้ป่วย">
        <ErrorState title="ไม่พบเคสนี้" description="เคสอาจถูกลบหรือไม่มีอยู่ในระบบ" onRetry={() => navigate('/rescue/dashboard')} />
      </AppShell>
    )
  }

  function updateVital(key: keyof VitalSigns, value: string) {
    setVitals((v) => ({ ...v, [key]: value }))
  }

  function updatePrimarySurvey(key: Exclude<keyof PrimarySurvey, 'responsiveness'>, value: string) {
    setPrimarySurvey((p) => ({ ...p, [key]: value }))
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
    const info: PatientInfo = {
      name: name || undefined,
      age: age || undefined,
      gender: gender || undefined,
      primarySurvey,
      vitals,
      firstAid,
    }
    setLoading(true)
    setTimeout(() => {
      submitPatientInfo(c!.id, info)
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
          <SectionHeader index={1} title="ข้อมูลผู้ป่วย" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="ชื่อผู้ป่วย" placeholder="ไม่ทราบชื่อ" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="อายุ" placeholder="เช่น 45" value={age} onChange={(e) => setAge(e.target.value)} />
            <Select label="เพศ" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">ไม่ระบุ</option>
              <option value="ชาย">ชาย</option>
              <option value="หญิง">หญิง</option>
              <option value="ไม่ทราบ">ไม่ทราบ</option>
            </Select>
          </div>
        </Card>

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
          </div>

          {PRIMARY_SURVEY_FIELDS.slice(1).map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-navy">{f.letter} - {f.label}</label>
              <p className="text-xs text-muted">{f.hint}</p>
              <SpeechToTextPanel
                value={primarySurvey[f.key] ?? ''}
                onChange={(v) => updatePrimarySurvey(f.key, v)}
                label="พิมพ์หรือพูดเพื่อบันทึก"
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
