import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Activity, MapPin, Phone, User, Users, ClipboardCheck } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Field'
import { RadioCard } from '@/components/ui/RadioCard'
import { ErrorState } from '@/components/States'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { Severity } from '@/lib/types'

const CONSCIOUS_LABEL: Record<string, string> = {
  conscious: 'รู้สึกตัวดี',
  unconscious: 'หมดสติ',
  unknown: 'ไม่ทราบ',
}

const INJURY_SOFT_LIMIT = 500

const SEVERITY_OPTIONS: { value: Severity; title: string; tone: 'emergency' | 'warning' | 'moderate' | 'default' }[] = [
  { value: 1, title: 'ระดับ 1: วิกฤต', tone: 'emergency' },
  { value: 2, title: 'ระดับ 2: ฉุกเฉินสูง', tone: 'warning' },
  { value: 3, title: 'ระดับ 3: ฉุกเฉินปานกลาง', tone: 'moderate' },
  { value: 4, title: 'ระดับ 4: เร่งด่วนต่ำ', tone: 'default' },
]

export default function DispatchEmergencyAssessment() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const c = useStore((s) => (id ? s.cases[id] : undefined))
  const submitDispatcherAssessment = useStore((s) => s.submitDispatcherAssessment)

  const [severity, setSeverity] = useState<Severity | null>(c?.assessment?.severity ?? null)
  const [injuryDescription, setInjuryDescription] = useState(c?.assessment?.injuryDescription ?? '')
  const [errors, setErrors] = useState<{ severity?: string; injuryDescription?: string }>({})
  const [highlight, setHighlight] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!id || !c) {
    return (
      <AppShell variant="dashboard" title="กรอกรายละเอียดเหตุการณ์">
        <ErrorState title="ไม่พบเคสนี้" description="เคสนี้อาจถูกลบหรือไม่มีอยู่ในระบบ" />
      </AppShell>
    )
  }

  const details = c.incidentDetails
  const isEditing = !!c.assessment

  function handleSubmit() {
    if (!id || !c) return
    const errs: { severity?: string; injuryDescription?: string } = {}
    if (!severity) errs.severity = 'กรุณาเลือกระดับความรุนแรง'
    if (!injuryDescription.trim()) errs.injuryDescription = 'กรุณาระบุลักษณะการบาดเจ็บ'
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      setHighlight(true)
      window.setTimeout(() => setHighlight(false), 900)
      return
    }
    if (!severity) return
    setSubmitting(true)
    setTimeout(() => {
      submitDispatcherAssessment(id, { severity, injuryDescription: injuryDescription.trim() })
      setSubmitting(false)
      toast({
        title: isEditing ? 'แก้ไขการประเมินแล้ว' : 'บันทึกการประเมินแล้ว',
        message: `เคส ${c.caseNumber} พร้อมค้นหาหน่วยกู้ภัยแล้ว`,
        tone: 'success',
      })
      navigate(`/dispatch/case/${id}`)
    }, 600)
  }

  return (
    <AppShell variant="dashboard" title="กรอกรายละเอียดเหตุการณ์">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-5">
          <div>
            <h1 className="text-xl font-bold text-navy">ประเมินระดับความรุนแรง</h1>
            <p className="mt-1.5 text-sm text-muted">
              เคส {c.caseNumber} — กรอกระดับความรุนแรงและลักษณะการบาดเจ็บก่อนค้นหาหน่วยกู้ภัย
            </p>
          </div>

          {details && (
            <Card className="space-y-3">
              <h2 className="text-sm font-bold text-navy">ข้อมูลที่ประชาชนแจ้ง</h2>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <Activity className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-navy">{details.incidentType}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-navy">ผู้ป่วย {details.patientCount} คน</span>
                </div>
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-navy">{CONSCIOUS_LABEL[details.conscious] ?? details.conscious}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-navy">{details.callbackPhone}</span>
                </div>
                <div className="flex items-start gap-2 sm:col-span-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-navy">{c.location?.address ?? details.location}</span>
                </div>
              </div>
              {c.photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 border-t border-border pt-3 sm:grid-cols-6">
                  {c.photos.map((p) => (
                    <img
                      key={p.id}
                      src={p.dataUrl}
                      alt="ภาพจุดเกิดเหตุ"
                      className="aspect-square rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card
            className={clsx('flex flex-col gap-2 transition-all', highlight && errors.severity && 'animate-pulse')}
          >
            <label className="text-sm font-semibold text-navy">
              ระดับความรุนแรง<span className="ml-0.5 text-emergency">*</span>
            </label>
            <div className="flex flex-col gap-2.5">
              {SEVERITY_OPTIONS.map((opt) => (
                <RadioCard
                  key={opt.value}
                  selected={severity === opt.value}
                  onClick={() => setSeverity(opt.value)}
                  title={opt.title}
                  tone={opt.tone}
                  className={clsx(
                    'transition-transform duration-200',
                    severity === opt.value && 'scale-[1.02] shadow-card-lg',
                  )}
                />
              ))}
            </div>
            {errors.severity && <p className="text-xs font-medium text-emergency">{errors.severity}</p>}
          </Card>

          <Card className="flex flex-col gap-1">
            <Textarea
              label="ลักษณะการบาดเจ็บ"
              required
              value={injuryDescription}
              error={errors.injuryDescription}
              onChange={(e) => setInjuryDescription(e.target.value)}
              className={clsx(highlight && errors.injuryDescription && 'animate-pulse')}
            />
            <p className="self-end text-xs text-muted">
              {injuryDescription.length}/{INJURY_SOFT_LIMIT} ตัวอักษร
            </p>
          </Card>

          <div className="flex flex-col gap-2.5 pb-4 sm:flex-row-reverse">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<ClipboardCheck className="size-5" />}
              loading={submitting}
              onClick={handleSubmit}
            >
              {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกการประเมิน'}
            </Button>
            <Button variant="outline" size="lg" fullWidth disabled={submitting} onClick={() => navigate(`/dispatch/case/${id}`)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
