import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Activity, MapPin, Phone, ClipboardCheck, Image as ImageIcon } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select, SearchableSelect, Textarea } from '@/components/ui/Field'
import { RadioCard } from '@/components/ui/RadioCard'
import { MapPanel } from '@/components/MapPanel'
import { SpeechToTextPanel } from '@/components/SpeechToTextPanel'
import { ErrorState } from '@/components/States'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
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
  'กรอกรายละเอียดเหตุการณ์': 'Fill in incident details',
  'ไม่พบเคสนี้': 'Case not found',
  'เคสนี้อาจถูกลบหรือไม่มีอยู่ในระบบ':
    'This case may have been deleted or does not exist',
  'รายละเอียดเหตุการณ์และการประเมิน': 'Incident Details & Assessment',
  'เคส {caseNumber} — กรอกรายละเอียดจากการสนทนากับผู้แจ้งเหตุ พร้อมประเมินระดับความรุนแรง':
    "Case {caseNumber} — fill in details from the conversation with the reporter, and assess severity",
  'ข้อมูลจากผู้แจ้งเหตุ': 'Reporter Information',
  'ยังไม่ระบุเบอร์ติดต่อกลับ': 'No callback number provided',
  'รูปภาพที่แนบ ({n})': 'Attached photos ({n})',
  ภาพจุดเกิดเหตุ: 'Scene photo',
  'ตำแหน่งที่ตรวจพบโดยประมาณจาก GPS ผู้แจ้ง ตรวจสอบและแก้ไขได้':
    'Approximate GPS location — verify and edit as needed',
  'ผู้แจ้งเหตุระบุว่า: {label} — แก้ไขได้หากประเมินจากภาพแล้วต่างออกไป': 'The reporter said: {label} — editable if the photos suggest otherwise',
  'แก้ไขข้อมูลแล้ว': 'Changes saved',
  'บันทึกรายละเอียดและการประเมินแล้ว': 'Details & assessment saved',
  'เคส {caseNumber} พร้อมค้นหาหน่วยกู้ชีพแล้ว': 'Case {caseNumber} is ready to search for rescue units',
  'บันทึกการแก้ไข': 'Save Changes',
  'บันทึกรายละเอียดและการประเมิน': 'Save Details & Assessment',
})

type Conscious = '' | 'conscious' | 'unconscious' | 'unknown'

const CONSCIOUS_LABEL: Record<Exclude<Conscious, ''>, string> = {
  conscious: 'มีสติ',
  unconscious: 'ไม่มีสติ',
  unknown: 'ไม่ทราบ',
}

const INJURY_SOFT_LIMIT = 500

export default function DispatchEmergencyAssessment() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const c = useStore((s) => (id ? s.cases[id] : undefined))
  const submitDispatcherAssessment = useStore((s) => s.submitDispatcherAssessment)
  const setCaseLocation = useStore((s) => s.setLocation)
  const t = useT()

  const details = c?.incidentDetails
  const isEditing = !!details

  const [incidentType, setIncidentType] = useState(details?.incidentType ?? '')
  const [location, setLocationText] = useState(details?.location ?? c?.location?.address ?? '')
  const [coords, setCoords] = useState<Coords | null>(c?.location ? { lat: c.location.lat, lng: c.location.lng } : null)
  const [showMap, setShowMap] = useState(false)
  const [patientCount, setPatientCount] = useState(details ? String(details.patientCount) : '1')
  // Prefilled from what the reporter said during the photo step (they're
  // the one actually with the patient) -- still fully editable here, e.g.
  // if the photos suggest otherwise.
  const [conscious, setConscious] = useState<Conscious>(details?.conscious ?? c?.reporterConsciousness ?? '')
  const [notes, setNotes] = useState(details?.notes ?? '')
  const [severity, setSeverity] = useState<Severity | null>(c?.assessment?.severity ?? null)
  const [injuryDescription, setInjuryDescription] = useState(c?.assessment?.injuryDescription ?? '')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [highlight, setHighlight] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!id || !c) {
    return (
      <AppShell variant="dashboard" title={t('กรอกรายละเอียดเหตุการณ์')}>
        <ErrorState
          title={t('ไม่พบเคสนี้')}
          description={t('เคสนี้อาจถูกลบหรือไม่มีอยู่ในระบบ')}
        />
      </AppShell>
    )
  }

  async function handlePickOnMap(lat: number, lng: number) {
    const pos = { lat, lng }
    setCoords(pos)
    const address = await reverseGeocode(pos).catch(() => `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    setLocationText(address)
  }

  function handleSubmit() {
    if (!id || !c) return
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

    const finalCoords = coords ?? c.location ?? DEFAULT_INCIDENT_LOCATION
    setCaseLocation(id, { lat: finalCoords.lat, lng: finalCoords.lng, address: location })

    setSubmitting(true)
    setTimeout(() => {
      submitDispatcherAssessment(id, {
        incidentType,
        location,
        patientCount: countNum,
        conscious: conscious as Exclude<Conscious, ''>,
        notes: notes.trim() ? notes : undefined,
        severity,
        injuryDescription: injuryDescription.trim(),
      })
      setSubmitting(false)
      toast({
        title: isEditing ? t('แก้ไขข้อมูลแล้ว') : t('บันทึกรายละเอียดและการประเมินแล้ว'),
        message: t('เคส {caseNumber} พร้อมค้นหาหน่วยกู้ชีพแล้ว', { caseNumber: c.caseNumber }),
        tone: 'success',
      })
      navigate(`/dispatch/case/${id}`)
    }, 600)
  }

  const incidentPin = {
    id: 'incident',
    lat: coords?.lat ?? c.location?.lat ?? DEFAULT_INCIDENT_LOCATION.lat,
    lng: coords?.lng ?? c.location?.lng ?? DEFAULT_INCIDENT_LOCATION.lng,
    label: t('จุดเกิดเหตุ'),
    kind: 'incident' as const,
  }

  return (
    <AppShell variant="dashboard" title={t('กรอกรายละเอียดเหตุการณ์')}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-5">
          <div>
            <h1 className="text-xl font-bold text-ink">{t('รายละเอียดเหตุการณ์และการประเมิน')}</h1>
            <p className="mt-1.5 text-sm text-muted">
              {t('เคส {caseNumber} — กรอกรายละเอียดจากการสนทนากับผู้แจ้งเหตุ พร้อมประเมินระดับความรุนแรง', { caseNumber: c.caseNumber })}
            </p>
          </div>

          <Card className="space-y-3">
            <h2 className="text-sm font-bold text-ink">{t('ข้อมูลจากผู้แจ้งเหตุ')}</h2>
            <div className="flex items-start gap-2 text-sm">
              <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-ink">{c.reporterPhone || t('ยังไม่ระบุเบอร์ติดต่อกลับ')}</span>
            </div>
            {c.photos.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs text-muted">
                  <ImageIcon className="size-3.5" /> {t('รูปภาพที่แนบ ({n})', { n: c.photos.length })}
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {c.photos.map((p) => (
                    <img
                      key={p.id}
                      src={p.dataUrl}
                      alt={t('ภาพจุดเกิดเหตุ')}
                      className="aspect-square rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
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
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <PulseRing tone="primary" size="sm" />
              <span>{t('ตำแหน่งที่ตรวจพบโดยประมาณจาก GPS ผู้แจ้ง ตรวจสอบและแก้ไขได้')}</span>
            </div>
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
            hint={
              !errors.conscious && c.reporterConsciousness
                ? t('ผู้แจ้งเหตุระบุว่า: {label} — แก้ไขได้หากประเมินจากภาพแล้วต่างออกไป', { label: t(CONSCIOUS_LABEL[c.reporterConsciousness]) })
                : undefined
            }
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

          <Card
            className={clsx('flex flex-col gap-2 transition-all', highlight && errors.severity && 'animate-pulse')}
          >
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
              icon={<ClipboardCheck className="size-5" />}
              loading={submitting}
              onClick={handleSubmit}
            >
              {isEditing ? t('บันทึกการแก้ไข') : t('บันทึกรายละเอียดและการประเมิน')}
            </Button>
            <Button variant="outline" size="lg" fullWidth disabled={submitting} onClick={() => navigate(`/dispatch/case/${id}`)}>
              {t('ยกเลิก')}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
