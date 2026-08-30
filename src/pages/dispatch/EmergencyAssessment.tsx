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
import { ErrorState } from '@/components/States'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { INCIDENT_TYPES, DEFAULT_INCIDENT_LOCATION } from '@/lib/mockData'
import { reverseGeocode, type Coords } from '@/lib/geolocation'
import { SEVERITY_OPTIONS } from '@/lib/severityOptions'
import type { Severity } from '@/lib/types'

type Conscious = '' | 'conscious' | 'unconscious' | 'unknown'

const CONSCIOUS_LABEL: Record<Exclude<Conscious, ''>, string> = {
  conscious: 'มีสติ (Conscious)',
  unconscious: 'ไม่มีสติ (Unconscious)',
  unknown: 'ไม่ทราบ (Unknown)',
}

const INJURY_SOFT_LIMIT = 500

export default function DispatchEmergencyAssessment() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const c = useStore((s) => (id ? s.cases[id] : undefined))
  const submitDispatcherAssessment = useStore((s) => s.submitDispatcherAssessment)
  const setCaseLocation = useStore((s) => s.setLocation)

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
      <AppShell variant="dashboard" title="กรอกรายละเอียดเหตุการณ์ (Incident Details)">
        <ErrorState
          title="ไม่พบเคสนี้ (Case Not Found)"
          description="เคสนี้อาจถูกลบหรือไม่มีอยู่ในระบบ (This case may have been deleted or does not exist)"
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
    if (!incidentType) errs.incidentType = 'กรุณาเลือกเหตุการณ์ที่เกิดขึ้น (Please select an incident type)'
    if (!location.trim()) errs.location = 'กรุณาระบุจุดเกิดเหตุ (Please specify the incident location)'
    const countNum = Number(patientCount)
    if (!patientCount.trim() || Number.isNaN(countNum) || countNum < 1) {
      errs.patientCount = 'กรุณาระบุจำนวนผู้ป่วยอย่างน้อย 1 คน (Please enter at least 1 patient)'
    }
    if (!conscious) errs.conscious = 'กรุณาเลือกระดับความรู้สึกตัวของผู้ป่วย (Please select the consciousness level)'
    if (!severity) errs.severity = 'กรุณาเลือกระดับความรุนแรง (Please select a severity level)'
    if (!injuryDescription.trim()) errs.injuryDescription = 'กรุณาระบุลักษณะการบาดเจ็บ (Please describe the injury)'
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
        title: isEditing ? 'แก้ไขข้อมูลแล้ว (Changes saved)' : 'บันทึกรายละเอียดและการประเมินแล้ว (Details & assessment saved)',
        message: `เคส ${c.caseNumber} พร้อมค้นหาหน่วยกู้ชีพแล้ว (Case ready to search for rescue units)`,
        tone: 'success',
      })
      navigate(`/dispatch/case/${id}`)
    }, 600)
  }

  const incidentPin = {
    id: 'incident',
    lat: coords?.lat ?? c.location?.lat ?? DEFAULT_INCIDENT_LOCATION.lat,
    lng: coords?.lng ?? c.location?.lng ?? DEFAULT_INCIDENT_LOCATION.lng,
    label: 'จุดเกิดเหตุ',
    kind: 'incident' as const,
  }

  return (
    <AppShell variant="dashboard" title="กรอกรายละเอียดเหตุการณ์ (Incident Details)">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col gap-5">
          <div>
            <h1 className="text-xl font-bold text-navy">รายละเอียดเหตุการณ์และการประเมิน (Incident Details & Assessment)</h1>
            <p className="mt-1.5 text-sm text-muted">
              เคส {c.caseNumber} — กรอกรายละเอียดจากการสนทนากับผู้แจ้งเหตุ พร้อมประเมินระดับความรุนแรง
            </p>
          </div>

          <Card className="space-y-3">
            <h2 className="text-sm font-bold text-navy">ข้อมูลจากผู้แจ้งเหตุ (Reporter Information)</h2>
            <div className="flex items-start gap-2 text-sm">
              <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-navy">{c.reporterPhone || 'ยังไม่ระบุเบอร์ติดต่อกลับ (No callback number provided)'}</span>
            </div>
            {c.photos.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs text-muted">
                  <ImageIcon className="size-3.5" /> รูปภาพที่แนบ (Attached photos) ({c.photos.length})
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {c.photos.map((p) => (
                    <img
                      key={p.id}
                      src={p.dataUrl}
                      alt="ภาพจุดเกิดเหตุ"
                      className="aspect-square rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </Card>

          <SearchableSelect
            label="เหตุการณ์ที่เกิดขึ้น (Incident Type)"
            required
            value={incidentType}
            error={errors.incidentType}
            onChange={setIncidentType}
            options={INCIDENT_TYPES}
            placeholder="พิมพ์คำค้นหรือหมายเลข CBD เพื่อเลือกประเภทเหตุการณ์"
            emptyLabel="ไม่พบประเภทเหตุการณ์ที่ค้นหา"
            className={clsx(highlight && errors.incidentType && 'animate-pulse')}
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <PulseRing tone="primary" size="sm" />
              <span>ตำแหน่งที่ตรวจพบโดยประมาณจาก GPS ผู้แจ้ง ตรวจสอบและแก้ไขได้ (Approximate GPS location — verify and edit as needed)</span>
            </div>
            <Textarea
              label="จุดเกิดเหตุ (Incident Location)"
              required
              rows={2}
              value={location}
              error={errors.location}
              onChange={(e) => setLocationText(e.target.value)}
              className={clsx(highlight && errors.location && 'animate-pulse')}
            />
            <Button variant="outline" size="sm" icon={<MapPin className="size-4" />} onClick={() => setShowMap((v) => !v)}>
              ปักหมุดตำแหน่งบนแผนที่ (Pin location on map)
            </Button>
            {showMap && (
              <MapPanel pins={[incidentPin]} center={[incidentPin.lat, incidentPin.lng]} height="200px" onPickLocation={handlePickOnMap} />
            )}
          </div>

          <Input
            label="จำนวนผู้ป่วย (Number of Patients)"
            type="number"
            min={1}
            required
            value={patientCount}
            error={errors.patientCount}
            onChange={(e) => setPatientCount(e.target.value)}
            className={clsx(highlight && errors.patientCount && 'animate-pulse')}
          />

          <Select
            label="ผู้ป่วยยังมีสติหรือไม่ (Is the Patient Conscious?)"
            required
            value={conscious}
            error={errors.conscious}
            hint={
              !errors.conscious && c.reporterConsciousness
                ? `ผู้แจ้งเหตุระบุว่า: ${CONSCIOUS_LABEL[c.reporterConsciousness]} — แก้ไขได้หากประเมินจากภาพแล้วต่างออกไป`
                : undefined
            }
            onChange={(e) => setConscious(e.target.value as Conscious)}
            className={clsx(highlight && errors.conscious && 'animate-pulse')}
          >
            <option value="">เลือกระดับความรู้สึกตัว (Select consciousness level)</option>
            <option value="conscious">{CONSCIOUS_LABEL.conscious}</option>
            <option value="unconscious">{CONSCIOUS_LABEL.unconscious}</option>
            <option value="unknown">{CONSCIOUS_LABEL.unknown}</option>
          </Select>

          <Textarea
            label="หมายเหตุเพิ่มเติม (Additional Notes)"
            hint="ไม่บังคับ (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Card
            className={clsx('flex flex-col gap-2 transition-all', highlight && errors.severity && 'animate-pulse')}
          >
            <label className="text-sm font-semibold text-navy">
              ระดับความรุนแรง (Severity Level)<span className="ml-0.5 text-emergency">*</span>
            </label>
            <div className="flex flex-col gap-2.5">
              {SEVERITY_OPTIONS.map((opt) => (
                <RadioCard
                  key={opt.value}
                  selected={severity === opt.value}
                  onClick={() => setSeverity(opt.value)}
                  title={opt.title}
                  description={opt.description}
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
              <label className="text-sm font-semibold text-navy">
                ลักษณะการบาดเจ็บ (Injury Description)<span className="ml-0.5 text-emergency">*</span>
              </label>
            </div>
            <Textarea
              required
              value={injuryDescription}
              error={errors.injuryDescription}
              onChange={(e) => setInjuryDescription(e.target.value)}
              className={clsx(highlight && errors.injuryDescription && 'animate-pulse')}
            />
            <p className="self-end text-xs text-muted">
              {injuryDescription.length}/{INJURY_SOFT_LIMIT} ตัวอักษร (characters)
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
              {isEditing ? 'บันทึกการแก้ไข (Save Changes)' : 'บันทึกรายละเอียดและการประเมิน (Save Details & Assessment)'}
            </Button>
            <Button variant="outline" size="lg" fullWidth disabled={submitting} onClick={() => navigate(`/dispatch/case/${id}`)}>
              ยกเลิก (Cancel)
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
