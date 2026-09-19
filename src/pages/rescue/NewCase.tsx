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
import { ErrorState } from '@/components/States'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { INCIDENT_TYPES, DEFAULT_INCIDENT_LOCATION } from '@/lib/mockData'
import { reverseGeocode, type Coords } from '@/lib/geolocation'
import { SEVERITY_OPTIONS } from '@/lib/severityOptions'
import type { Severity } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'มีสติ (Conscious)': 'Conscious',
  'ไม่มีสติ (Unconscious)': 'Unconscious',
  'ไม่ทราบ (Unknown)': 'Unknown',
  'กรุณาเลือกเหตุการณ์ที่เกิดขึ้น (Please select an incident type)': 'Please select an incident type',
  'กรุณาระบุจุดเกิดเหตุ (Please specify the incident location)': 'Please specify the incident location',
  'กรุณาระบุจำนวนผู้ป่วยอย่างน้อย 1 คน (Please enter at least 1 patient)': 'Please enter at least 1 patient',
  'กรุณาเลือกระดับความรู้สึกตัวของผู้ป่วย (Please select the consciousness level)': 'Please select the consciousness level',
  'กรุณาเลือกระดับความรุนแรง (Please select a severity level)': 'Please select a severity level',
  'กรุณาระบุลักษณะการบาดเจ็บ (Please describe the injury)': 'Please describe the injury',
  'เหตุการณ์ที่เกิดขึ้น (Incident Type)': 'Incident Type',
  'พิมพ์คำค้นหรือหมายเลข CBD เพื่อเลือกประเภทเหตุการณ์': 'Type a search term or CBD code to select an incident type',
  ไม่พบประเภทเหตุการณ์ที่ค้นหา: 'No matching incident type found',
  'จุดเกิดเหตุ (Incident Location)': 'Incident Location',
  'ปักหมุดตำแหน่งบนแผนที่ (Pin location on map)': 'Pin location on map',
  'จำนวนผู้ป่วย (Number of Patients)': 'Number of Patients',
  'ผู้ป่วยยังมีสติหรือไม่ (Is the Patient Conscious?)': 'Is the Patient Conscious?',
  'เลือกระดับความรู้สึกตัว (Select consciousness level)': 'Select consciousness level',
  'หมายเหตุเพิ่มเติม (Additional Notes)': 'Additional Notes',
  พิมพ์หรือพูดเพื่อบันทึก: 'Type or speak to record',
  'ไม่บังคับ (Optional)': 'Optional',
  'ระดับความรุนแรง (Severity Level)': 'Severity Level',
  'ลักษณะการบาดเจ็บ (Injury Description)': 'Injury Description',
  '{cur}/{max} ตัวอักษร (characters)': '{cur}/{max} characters',
  'ยกเลิก (Cancel)': 'Cancel',
  'พบเหตุด้วยตนเอง (Case I Found)': 'Case I Found',
  'ไม่พบหน่วยกู้ชีพของคุณ (Your team could not be found)': 'Your team could not be found',
  "บัญชีของคุณยังไม่ได้ผูกกับหน่วยกู้ชีพ กรุณาติดต่อผู้ดูแลระบบ (Your account isn't linked to a rescue team yet — contact an administrator)":
    "Your account isn't linked to a rescue team yet — contact an administrator",
  'บันทึกเคสแล้ว (Case logged)': 'Case logged',
  'เคสถูกสร้างและมอบหมายให้หน่วยของคุณโดยอัตโนมัติ (Case created and assigned to your team)': 'Case created and assigned to your team',
  'บันทึกเหตุที่พบด้วยตนเอง (Log an Incident You Found)': 'Log an Incident You Found',
  'สำหรับเหตุที่หน่วยของคุณพบเองระหว่างปฏิบัติงาน โดยไม่มีการแจ้งเหตุหรือมอบหมายจากศูนย์สั่งการมาก่อน — ระบบจะสร้างเคสและมอบหมายให้หน่วย':
    "For incidents your team finds on its own during operations, with no prior report or assignment from dispatch — the system will create a case and assign it to",
  'ทันที': 'immediately',
  'บันทึกเคสและมอบหมายให้หน่วยของฉัน (Log Case & Assign to My Team)': 'Log Case & Assign to My Team',
})

type Conscious = '' | 'conscious' | 'unconscious' | 'unknown'

const CONSCIOUS_LABEL: Record<Exclude<Conscious, ''>, string> = {
  conscious: 'มีสติ (Conscious)',
  unconscious: 'ไม่มีสติ (Unconscious)',
  unknown: 'ไม่ทราบ (Unknown)',
}

const INJURY_SOFT_LIMIT = 500

export default function RescueNewCase() {
  const navigate = useNavigate()
  const currentUser = useStore((s) => s.currentUser)
  const rescueTeams = useStore((s) => s.rescueTeams)
  const createRescueFoundCase = useStore((s) => s.createRescueFoundCase)

  const myTeam = rescueTeams.find((team) => team.id === currentUser?.rescueTeamId)
  const t = useT()

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

  if (!myTeam) {
    return (
      <AppShell variant="dashboard" title={t('พบเหตุด้วยตนเอง (Case I Found)')}>
        <ErrorState
          title={t('ไม่พบหน่วยกู้ชีพของคุณ (Your team could not be found)')}
          description={t(
            "บัญชีของคุณยังไม่ได้ผูกกับหน่วยกู้ชีพ กรุณาติดต่อผู้ดูแลระบบ (Your account isn't linked to a rescue team yet — contact an administrator)",
          )}
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
    const errs: Record<string, string> = {}
    if (!incidentType) errs.incidentType = t('กรุณาเลือกเหตุการณ์ที่เกิดขึ้น (Please select an incident type)')
    if (!location.trim()) errs.location = t('กรุณาระบุจุดเกิดเหตุ (Please specify the incident location)')
    const countNum = Number(patientCount)
    if (!patientCount.trim() || Number.isNaN(countNum) || countNum < 1) {
      errs.patientCount = t('กรุณาระบุจำนวนผู้ป่วยอย่างน้อย 1 คน (Please enter at least 1 patient)')
    }
    if (!conscious) errs.conscious = t('กรุณาเลือกระดับความรู้สึกตัวของผู้ป่วย (Please select the consciousness level)')
    if (!severity) errs.severity = t('กรุณาเลือกระดับความรุนแรง (Please select a severity level)')
    if (!injuryDescription.trim()) errs.injuryDescription = t('กรุณาระบุลักษณะการบาดเจ็บ (Please describe the injury)')
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      setHighlight(true)
      window.setTimeout(() => setHighlight(false), 900)
      return
    }
    if (!severity || !myTeam) return

    const finalCoords = coords ?? DEFAULT_INCIDENT_LOCATION

    setSubmitting(true)
    setTimeout(() => {
      const id = createRescueFoundCase({
        incidentType,
        patientCount: countNum,
        conscious: conscious as Exclude<Conscious, ''>,
        notes: notes.trim() ? notes : undefined,
        severity,
        injuryDescription: injuryDescription.trim(),
        location: { lat: finalCoords.lat, lng: finalCoords.lng, address: location },
        team: myTeam,
      })
      setSubmitting(false)
      toast({
        title: t('บันทึกเคสแล้ว (Case logged)'),
        message: t('เคสถูกสร้างและมอบหมายให้หน่วยของคุณโดยอัตโนมัติ (Case created and assigned to your team)'),
        tone: 'success',
      })
      navigate(`/rescue/case/${id}`)
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
    <AppShell variant="dashboard" title={t('พบเหตุด้วยตนเอง (Case I Found)')}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-5">
          <div>
            <h1 className="text-xl font-bold text-ink">{t('บันทึกเหตุที่พบด้วยตนเอง (Log an Incident You Found)')}</h1>
            <p className="mt-1.5 text-sm text-muted">
              {t('สำหรับเหตุที่หน่วยของคุณพบเองระหว่างปฏิบัติงาน โดยไม่มีการแจ้งเหตุหรือมอบหมายจากศูนย์สั่งการมาก่อน — ระบบจะสร้างเคสและมอบหมายให้หน่วย')}{' '}
              <span className="font-semibold text-ink">{myTeam.name}</span> {t('ทันที')}
            </p>
          </div>

          <SearchableSelect
            label={t('เหตุการณ์ที่เกิดขึ้น (Incident Type)')}
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
              label={t('จุดเกิดเหตุ (Incident Location)')}
              required
              rows={2}
              value={location}
              error={errors.location}
              onChange={(e) => setLocationText(e.target.value)}
              className={clsx(highlight && errors.location && 'animate-pulse')}
            />
            <Button variant="outline" size="sm" icon={<MapPin className="size-4" />} onClick={() => setShowMap((v) => !v)}>
              {t('ปักหมุดตำแหน่งบนแผนที่ (Pin location on map)')}
            </Button>
            {showMap && (
              <MapPanel pins={[incidentPin]} center={[incidentPin.lat, incidentPin.lng]} height="200px" onPickLocation={handlePickOnMap} />
            )}
          </div>

          <Input
            label={t('จำนวนผู้ป่วย (Number of Patients)')}
            type="number"
            min={1}
            required
            value={patientCount}
            error={errors.patientCount}
            onChange={(e) => setPatientCount(e.target.value)}
            className={clsx(highlight && errors.patientCount && 'animate-pulse')}
          />

          <Select
            label={t('ผู้ป่วยยังมีสติหรือไม่ (Is the Patient Conscious?)')}
            required
            value={conscious}
            error={errors.conscious}
            onChange={(e) => setConscious(e.target.value as Conscious)}
            className={clsx(highlight && errors.conscious && 'animate-pulse')}
          >
            <option value="">{t('เลือกระดับความรู้สึกตัว (Select consciousness level)')}</option>
            <option value="conscious">{t(CONSCIOUS_LABEL.conscious)}</option>
            <option value="unconscious">{t(CONSCIOUS_LABEL.unconscious)}</option>
            <option value="unknown">{t(CONSCIOUS_LABEL.unknown)}</option>
          </Select>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink">{t('หมายเหตุเพิ่มเติม (Additional Notes)')}</label>
            <SpeechToTextPanel value={notes} onChange={setNotes} label={t('พิมพ์หรือพูดเพื่อบันทึก')} />
            <p className="text-xs text-muted">{t('ไม่บังคับ (Optional)')}</p>
          </div>

          <Card className={clsx('flex flex-col gap-2 transition-all', highlight && errors.severity && 'animate-pulse')}>
            <label className="text-sm font-semibold text-ink">
              {t('ระดับความรุนแรง (Severity Level)')}<span className="ml-0.5 text-emergency">*</span>
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
                {t('ลักษณะการบาดเจ็บ (Injury Description)')}<span className="ml-0.5 text-emergency">*</span>
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
              {t('{cur}/{max} ตัวอักษร (characters)', { cur: injuryDescription.length, max: INJURY_SOFT_LIMIT })}
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
              {t('บันทึกเคสและมอบหมายให้หน่วยของฉัน (Log Case & Assign to My Team)')}
            </Button>
            <Button variant="outline" size="lg" fullWidth disabled={submitting} onClick={() => navigate('/rescue/dashboard')}>
              {t('ยกเลิก (Cancel)')}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
