import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, MapPin, ClipboardPlus } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select, SearchableSelect, Textarea } from '@/components/ui/Field'
import { RadioCard } from '@/components/ui/RadioCard'
import { MapPanel } from '@/components/MapPanel'
import { SpeechToTextPanel } from '@/components/SpeechToTextPanel'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { INCIDENT_TYPES, DEFAULT_INCIDENT_LOCATION } from '@/lib/mockData'
import { reverseGeocode, type Coords } from '@/lib/geolocation'
import { SEVERITY_OPTIONS } from '@/lib/severityOptions'
import type { Severity } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'มีสติ': 'Conscious',
  'ไม่มีสติ': 'Unconscious',
  'ไม่ทราบ': 'Unknown',
  'กรุณาเลือกเหตุการณ์ที่เกิดขึ้น': 'Please select an incident type',
  'กรุณาระบุจุดเกิดเหตุ': 'Please specify the incident location',
  'กรุณาระบุจำนวนผู้ป่วยอย่างน้อย 1 คน': 'Please enter at least 1 patient',
  'กรุณาเลือกระดับความรู้สึกตัวของผู้ป่วย': 'Please select the consciousness level',
  'กรุณาเลือกระดับความรุนแรง': 'Please select a severity level',
  'กรุณาระบุลักษณะการบาดเจ็บ': 'Please describe the injury',
  'บันทึกเคสใหม่แล้ว': 'Case logged',
  'เคสพร้อมค้นหาหน่วยกู้ชีพแล้ว': 'Case ready to search for rescue units',
  'บันทึกเคสใหม่': 'Log new case',
  'บันทึกเคสที่รับแจ้งทางโทรศัพท์': 'Log a Phone-In Case',
  'สำหรับเหตุที่รับแจ้งโดยตรง ไม่ได้ผ่านแอปประชาชน — กรอกรายละเอียดจากการสนทนากับผู้แจ้งเหตุ':
    'For incidents reported directly, not through the citizen app — fill in details from the conversation with the reporter',
  'ข้อมูลผู้แจ้งเหตุ': 'Reporter Information',
  'ชื่อผู้แจ้งเหตุ': 'Reporter Name',
  'เบอร์ติดต่อกลับ': 'Callback number',
  'ไม่บังคับ — กรอกไว้หากติดต่อกลับได้':
    'Optional — fill in if a callback number is available',
  'เหตุการณ์ที่เกิดขึ้น': 'Incident Type',
  'พิมพ์คำค้นหรือหมายเลข CBD เพื่อเลือกประเภทเหตุการณ์': 'Type a search term or CBD code to select an incident type',
  ไม่พบประเภทเหตุการณ์ที่ค้นหา: 'No matching incident type found',
  'จุดเกิดเหตุ': 'Incident location',
  'ปักหมุดตำแหน่งบนแผนที่': 'Pin location on map',
  'จำนวนผู้ป่วย': 'Number of patients',
  'ผู้ป่วยยังมีสติหรือไม่': 'Is the patient conscious?',
  'เลือกระดับความรู้สึกตัว': 'Select consciousness level',
  'หมายเหตุเพิ่มเติม': 'Additional notes',
  พิมพ์หรือพูดเพื่อบันทึก: 'Type or speak to record',
  'ไม่บังคับ': 'Optional',
  'ระดับความรุนแรง': 'Severity Level',
  'ลักษณะการบาดเจ็บ': 'Nature of injury',
  '{cur}/{max} ตัวอักษร': '{cur}/{max} characters',
  'ยกเลิก': 'Cancel',
})

type Conscious = '' | 'conscious' | 'unconscious' | 'unknown'

const CONSCIOUS_LABEL: Record<Exclude<Conscious, ''>, string> = {
  conscious: 'มีสติ',
  unconscious: 'ไม่มีสติ',
  unknown: 'ไม่ทราบ',
}

const INJURY_SOFT_LIMIT = 500

export default function DispatchNewCase() {
  const navigate = useNavigate()
  const createDispatchCase = useStore((s) => s.createDispatchCase)
  const t = useT()

  const [reporterName, setReporterName] = useState('')
  const [reporterPhone, setReporterPhone] = useState('')
  const [incidentType, setIncidentType] = useState('')
  const [location, setLocationText] = useState('')
  const [coords, setCoords] = useState<Coords | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [patientCount, setPatientCount] = useState('1')
  const [conscious, setConscious] = useState<Conscious>('')
  const [notes, setNotes] = useState('')
  const [severity, setSeverity] = useState<Severity | null>(null)
  const [injuryDescription, setInjuryDescription] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [highlight, setHighlight] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handlePickOnMap(lat: number, lng: number) {
    const pos = { lat, lng }
    setCoords(pos)
    const address = await reverseGeocode(pos).catch(() => `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    setLocationText(address)
  }

  function handleSubmit() {
    const errs: Record<string, string> = {}
    if (!incidentType) errs.incidentType = t('กรุณาเลือกเหตุการณ์ที่เกิดขึ้น')
    if (!location.trim()) errs.location = t('กรุณาระบุจุดเกิดเหตุ')
    const countNum = Number(patientCount)
    if (!patientCount.trim() || Number.isNaN(countNum) || countNum < 1) {
      errs.patientCount = t('กรุณาระบุจำนวนผู้ป่วยอย่างน้อย 1 คน')
    }
    if (!conscious) errs.conscious = t('กรุณาเลือกระดับความรู้สึกตัวของผู้ป่วย')
    if (!severity) errs.severity = t('กรุณาเลือกระดับความรุนแรง')
    if (!injuryDescription.trim()) errs.injuryDescription = t('กรุณาระบุลักษณะการบาดเจ็บ')
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      setHighlight(true)
      window.setTimeout(() => setHighlight(false), 900)
      return
    }
    if (!severity) return

    const finalCoords = coords ?? DEFAULT_INCIDENT_LOCATION

    setSubmitting(true)
    setTimeout(() => {
      const id = createDispatchCase({
        incidentType,
        patientCount: countNum,
        conscious: conscious as Exclude<Conscious, ''>,
        notes: notes.trim() ? notes : undefined,
        severity,
        injuryDescription: injuryDescription.trim(),
        location: { lat: finalCoords.lat, lng: finalCoords.lng, address: location },
        reporterName: reporterName.trim() ? reporterName.trim() : undefined,
        reporterPhone: reporterPhone.trim() ? reporterPhone.trim() : undefined,
      })
      setSubmitting(false)
      toast({
        title: t('บันทึกเคสใหม่แล้ว'),
        message: t('เคสพร้อมค้นหาหน่วยกู้ชีพแล้ว'),
        tone: 'success',
      })
      navigate(`/dispatch/case/${id}`)
    }, 600)
  }

  const incidentPin = {
    id: 'incident',
    lat: coords?.lat ?? DEFAULT_INCIDENT_LOCATION.lat,
    lng: coords?.lng ?? DEFAULT_INCIDENT_LOCATION.lng,
    label: t('จุดเกิดเหตุ'),
    kind: 'incident' as const,
  }

  return (
    <AppShell variant="dashboard" title={t('บันทึกเคสใหม่')}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-5">
          <div>
            <h1 className="text-xl font-bold text-ink">{t('บันทึกเคสที่รับแจ้งทางโทรศัพท์')}</h1>
            <p className="mt-1.5 text-sm text-muted">
              {t('สำหรับเหตุที่รับแจ้งโดยตรง ไม่ได้ผ่านแอปประชาชน — กรอกรายละเอียดจากการสนทนากับผู้แจ้งเหตุ')}
            </p>
          </div>

          <Card className="space-y-3">
            <h2 className="text-sm font-bold text-ink">{t('ข้อมูลผู้แจ้งเหตุ')}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label={t('ชื่อผู้แจ้งเหตุ')} value={reporterName} onChange={(e) => setReporterName(e.target.value)} />
              <Input
                label={t('เบอร์ติดต่อกลับ')}
                value={reporterPhone}
                onChange={(e) => setReporterPhone(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted">{t('ไม่บังคับ — กรอกไว้หากติดต่อกลับได้')}</p>
          </Card>

          <SearchableSelect
            label={t('เหตุการณ์ที่เกิดขึ้น')}
            required
            value={incidentType}
            error={errors.incidentType}
            onChange={setIncidentType}
            options={INCIDENT_TYPES}
            placeholder={t('พิมพ์คำค้นหรือหมายเลข CBD เพื่อเลือกประเภทเหตุการณ์')}
            emptyLabel={t('ไม่พบประเภทเหตุการณ์ที่ค้นหา')}
            className={clsx(highlight && errors.incidentType && 'animate-pulse')}
          />

          <div className="flex flex-col gap-2">
            <Textarea
              label={t('จุดเกิดเหตุ')}
              required
              rows={2}
              value={location}
              error={errors.location}
              onChange={(e) => setLocationText(e.target.value)}
              className={clsx(highlight && errors.location && 'animate-pulse')}
            />
            <Button variant="outline" size="sm" icon={<MapPin className="size-4" />} onClick={() => setShowMap((v) => !v)}>
              {t('ปักหมุดตำแหน่งบนแผนที่')}
            </Button>
            {showMap && (
              <MapPanel pins={[incidentPin]} center={[incidentPin.lat, incidentPin.lng]} height="200px" onPickLocation={handlePickOnMap} />
            )}
          </div>

          <Input
            label={t('จำนวนผู้ป่วย')}
            type="number"
            min={1}
            required
            value={patientCount}
            error={errors.patientCount}
            onChange={(e) => setPatientCount(e.target.value)}
            className={clsx(highlight && errors.patientCount && 'animate-pulse')}
          />

          <Select
            label={t('ผู้ป่วยยังมีสติหรือไม่')}
            required
            value={conscious}
            error={errors.conscious}
            onChange={(e) => setConscious(e.target.value as Conscious)}
            className={clsx(highlight && errors.conscious && 'animate-pulse')}
          >
            <option value="">{t('เลือกระดับความรู้สึกตัว')}</option>
            <option value="conscious">{t(CONSCIOUS_LABEL.conscious)}</option>
            <option value="unconscious">{t(CONSCIOUS_LABEL.unconscious)}</option>
            <option value="unknown">{t(CONSCIOUS_LABEL.unknown)}</option>
          </Select>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink">{t('หมายเหตุเพิ่มเติม')}</label>
            <SpeechToTextPanel value={notes} onChange={setNotes} label={t('พิมพ์หรือพูดเพื่อบันทึก')} />
            <p className="text-xs text-muted">{t('ไม่บังคับ')}</p>
          </div>

          <Card className={clsx('flex flex-col gap-2 transition-all', highlight && errors.severity && 'animate-pulse')}>
            <label className="text-sm font-semibold text-ink">
              {t('ระดับความรุนแรง')}<span className="ml-0.5 text-emergency">*</span>
            </label>
            <div className="flex flex-col gap-2.5">
              {SEVERITY_OPTIONS.map((opt) => (
                <RadioCard
                  key={opt.value}
                  selected={severity === opt.value}
                  onClick={() => setSeverity(opt.value)}
                  title={t(opt.title)}
                  description={opt.description ? t(opt.description) : undefined}
                  tone={opt.tone}
                  className={clsx('transition-transform duration-200', severity === opt.value && 'scale-[1.02] shadow-card-lg')}
                />
              ))}
            </div>
            {errors.severity && <p className="text-xs font-medium text-emergency">{errors.severity}</p>}
          </Card>

          <Card className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Activity className="size-4 text-primary" />
              <label className="text-sm font-semibold text-ink">
                {t('ลักษณะการบาดเจ็บ')}<span className="ml-0.5 text-emergency">*</span>
              </label>
            </div>
            <SpeechToTextPanel
              value={injuryDescription}
              onChange={setInjuryDescription}
              label={t('พิมพ์หรือพูดเพื่อบันทึก')}
              error={errors.injuryDescription}
              textareaClassName={clsx(highlight && errors.injuryDescription && 'animate-pulse')}
            />
            <p className="self-end text-xs text-muted">
              {t('{cur}/{max} ตัวอักษร', { cur: injuryDescription.length, max: INJURY_SOFT_LIMIT })}
            </p>
          </Card>

          <div className="flex flex-col gap-2.5 pb-4 sm:flex-row-reverse">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<ClipboardPlus className="size-5" />}
              loading={submitting}
              onClick={handleSubmit}
            >
              {t('บันทึกเคสใหม่')}
            </Button>
            <Button variant="outline" size="lg" fullWidth disabled={submitting} onClick={() => navigate('/dispatch/dashboard')}>
              {t('ยกเลิก')}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
