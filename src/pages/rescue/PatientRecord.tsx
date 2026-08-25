import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { SpeechToTextPanel } from '@/components/SpeechToTextPanel'
import { AudioRecorder } from '@/components/AudioRecorder'
import { ErrorState } from '@/components/States'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { PatientInfo, VitalSigns } from '@/lib/types'

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
  consciousness: '',
}

export default function RescuePatientRecord() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const c = useStore((s) => (id ? s.cases[id] : undefined))
  const submitPatientInfo = useStore((s) => s.submitPatientInfo)

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [vitals, setVitals] = useState<VitalSigns>(emptyVitals)
  const [firstAid, setFirstAid] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
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
      vitals,
      firstAid,
      additionalNotes: additionalNotes || undefined,
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
          <SectionHeader index={2} title="สัญญาณชีพ" />
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
            <Input
              label="ระดับความรู้สึกตัว"
              placeholder="รู้สึกตัวดี"
              value={vitals.consciousness}
              onChange={(e) => updateVital('consciousness', e.target.value)}
            />
          </div>
        </Card>

        <Card className="animate-fade-in-up space-y-3" style={{ animationDelay: '160ms', animationFillMode: 'backwards' }}>
          <SectionHeader index={3} title="การปฐมพยาบาล" />
          <SpeechToTextPanel value={firstAid} onChange={setFirstAid} label="การปฐมพยาบาลเบื้องต้น (พิมพ์หรือพูด)" />
          {firstAidError && <p className="text-xs font-medium text-emergency">{firstAidError}</p>}
        </Card>

        <Card className="animate-fade-in-up space-y-2" style={{ animationDelay: '220ms', animationFillMode: 'backwards' }}>
          <Textarea
            label="หมายเหตุเพิ่มเติม"
            hint="ไม่บังคับ"
            placeholder="ข้อมูลเพิ่มเติมเกี่ยวกับผู้ป่วยหรือสถานการณ์"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
          />
        </Card>

        <div className="animate-fade-in-up" style={{ animationDelay: '280ms', animationFillMode: 'backwards' }}>
          <AudioRecorder label="บันทึกเสียงเพิ่มเติม (ถ้ามี)" />
        </div>

        <Button variant="primary" size="lg" fullWidth loading={loading} onClick={handleSubmit}>
          บันทึกข้อมูลผู้ป่วย
        </Button>
        </div>
      </div>
    </AppShell>
  )
}
