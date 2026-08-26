import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image as ImageIcon, MapPin } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { MapPanel } from '@/components/MapPanel'
import { SuccessState } from '@/components/States'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { INCIDENT_TYPES, DEFAULT_INCIDENT_LOCATION } from '@/lib/mockData'
import { getCurrentPosition, reverseGeocode, GeolocationError, type Coords } from '@/lib/geolocation'
import type { IncidentDetails } from '@/lib/types'

type Conscious = '' | 'conscious' | 'unconscious' | 'unknown'

const CONSCIOUS_LABEL: Record<Exclude<Conscious, ''>, string> = {
  conscious: 'มีสติ',
  unconscious: 'ไม่มีสติ',
  unknown: 'ไม่ทราบ',
}

const NOTES_SOFT_LIMIT = 500

export default function EmergencyDetails() {
  const navigate = useNavigate()
  const activeCaseId = useStore((s) => s.activeCaseId)
  const cases = useStore((s) => s.cases)
  const submitIncidentDetails = useStore((s) => s.submitIncidentDetails)
  const setCaseLocation = useStore((s) => s.setLocation)
  const deleteCase = useStore((s) => s.deleteCase)

  const caseId = activeCaseId
  const activeCase = caseId ? cases[caseId] : null

  const [incidentType, setIncidentType] = useState('')
  const [location, setLocation] = useState(activeCase?.location?.address ?? DEFAULT_INCIDENT_LOCATION.address)
  const [coords, setCoords] = useState<Coords | null>(
    activeCase?.location ? { lat: activeCase.location.lat, lng: activeCase.location.lng } : null,
  )
  const [locating, setLocating] = useState(false)
  const [patientCount, setPatientCount] = useState('1')
  const [conscious, setConscious] = useState<Conscious>('')
  const [callbackPhone, setCallbackPhone] = useState(activeCase?.reporterPhone ?? '')
  const [notes, setNotes] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [highlightErrors, setHighlightErrors] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!caseId || !activeCase) {
    return (
      <AppShell variant="flow" title="รายละเอียดเหตุการณ์" showBack>
        <div className="py-16 text-center text-sm text-muted">ไม่พบข้อมูลเคส</div>
      </AppShell>
    )
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!incidentType) errs.incidentType = 'กรุณาเลือกเหตุการณ์ที่เกิดขึ้น'
    if (!location.trim()) errs.location = 'กรุณาระบุจุดเกิดเหตุ'
    const countNum = Number(patientCount)
    if (!patientCount.trim() || Number.isNaN(countNum) || countNum < 1) {
      errs.patientCount = 'กรุณาระบุจำนวนผู้ป่วยอย่างน้อย 1 คน'
    }
    if (!conscious) errs.conscious = 'กรุณาเลือกระดับความรู้สึกตัวของผู้ป่วย'
    const digits = callbackPhone.replace(/\D/g, '')
    if (!callbackPhone.trim()) errs.callbackPhone = 'กรุณาระบุเบอร์โทรศัพท์สำหรับติดต่อกลับ'
    else if (digits.length < 9 || digits.length > 10) errs.callbackPhone = 'เบอร์โทรศัพท์ไม่ถูกต้อง'
    return errs
  }

  async function handleUseCurrentLocation() {
    setLocating(true)
    try {
      const pos = await getCurrentPosition()
      setCoords(pos)
      setShowMap(true)
      const address = await reverseGeocode(pos).catch(() => `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`)
      setLocation(address)
      if (caseId) setCaseLocation(caseId, { ...pos, address })
      toast({ title: 'ระบุตำแหน่งปัจจุบันแล้ว', tone: 'success' })
    } catch (err) {
      const message = err instanceof GeolocationError ? err.message : 'ไม่สามารถระบุตำแหน่งได้ในขณะนี้'
      toast({ title: 'ระบุตำแหน่งไม่สำเร็จ', message, tone: 'warning' })
    } finally {
      setLocating(false)
    }
  }

  async function handlePickOnMap(lat: number, lng: number) {
    const pos = { lat, lng }
    setCoords(pos)
    const address = await reverseGeocode(pos).catch(() => `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    setLocation(address)
    if (caseId) setCaseLocation(caseId, { ...pos, address })
  }

  function handleSaveDraft() {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast({ title: 'บันทึกข้อมูลชั่วคราวแล้ว', tone: 'success' })
    }, 500)
  }

  function handleReview() {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length === 0) {
      setReviewMode(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setHighlightErrors(true)
      window.setTimeout(() => setHighlightErrors(false), 900)
    }
  }

  function handleFinalSubmit() {
    if (submitting || !caseId) return
    setSubmitting(true)
    const details: IncidentDetails = {
      incidentType,
      location,
      patientCount: Number(patientCount),
      conscious: conscious as Exclude<Conscious, ''>,
      callbackPhone,
      notes: notes.trim() ? notes : undefined,
    }
    // Keep the case's structured GeoLocation (used by every map downstream)
    // in sync with whatever address ended up in the text field.
    const finalCoords = coords ?? activeCase?.location ?? DEFAULT_INCIDENT_LOCATION
    setCaseLocation(caseId, { lat: finalCoords.lat, lng: finalCoords.lng, address: location })
    setTimeout(() => {
      submitIncidentDetails(caseId, details)
      setSubmitting(false)
      setSubmitted(true)
      setTimeout(() => {
        navigate(`/public/case/${caseId}`)
      }, 1200)
    }, 700)
  }

  function handleBack() {
    if (reviewMode) {
      setReviewMode(false)
    } else {
      if (caseId) deleteCase(caseId)
      navigate(-1)
    }
  }

  if (submitted) {
    return (
      <AppShell variant="flow" title="รายละเอียดเหตุการณ์" showBack={false}>
        <SuccessState title="ส่งข้อมูลสำเร็จ" description="เจ้าหน้าที่ได้รับแจ้งเหตุของคุณแล้ว" />
      </AppShell>
    )
  }

  const incidentPin = {
    id: 'incident',
    lat: coords?.lat ?? activeCase.location?.lat ?? DEFAULT_INCIDENT_LOCATION.lat,
    lng: coords?.lng ?? activeCase.location?.lng ?? DEFAULT_INCIDENT_LOCATION.lng,
    label: 'จุดเกิดเหตุ',
    kind: 'incident' as const,
  }

  const requiredFieldValues = [
    incidentType,
    location.trim(),
    patientCount.trim() && !Number.isNaN(Number(patientCount)) && Number(patientCount) >= 1 ? patientCount : '',
    conscious,
    callbackPhone.trim(),
  ]
  const filledRequiredCount = requiredFieldValues.filter(Boolean).length
  const totalRequiredCount = requiredFieldValues.length
  const progressPct = Math.round((filledRequiredCount / totalRequiredCount) * 100)

  return (
    <AppShell variant="flow" title="รายละเอียดเหตุการณ์" showBack onBack={handleBack}>
      <div className="relative">
        <AnimatedBackground variant="emergency" />

        <div className="relative z-10 flex flex-col gap-5 pb-8">
          <div>
            <h1 className="text-xl font-bold text-navy">รายละเอียดเหตุการณ์</h1>
            <p className="mt-1.5 text-sm text-muted">
              {reviewMode ? 'ตรวจสอบข้อมูลก่อนส่งให้เจ้าหน้าที่' : 'กรอกรายละเอียดเพื่อให้เจ้าหน้าที่เตรียมความช่วยเหลือได้ตรงจุด'}
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-semibold text-muted whitespace-nowrap">
                {filledRequiredCount}/{totalRequiredCount} ข้อบังคับ
              </span>
            </div>
          </div>

          {reviewMode ? (
            <Card className="flex flex-col gap-4 animate-fade-in-up">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-navy">หมายเลขเคส {activeCase.caseNumber}</span>
                <span className="rounded-full bg-skyblue-light px-3 py-1 text-xs font-bold text-primary">
                  รอการประเมินจากเจ้าหน้าที่
                </span>
              </div>
              <dl className="flex flex-col gap-2.5 text-sm">
                <Row label="เหตุการณ์ที่เกิดขึ้น" value={incidentType} />
                <div className="flex items-start justify-between gap-3">
                  <dt className="flex shrink-0 items-center gap-1.5 text-muted">
                    <PulseRing tone="primary" size="sm" />
                    จุดเกิดเหตุ
                  </dt>
                  <dd className="text-right font-medium text-navy">{location}</dd>
                </div>
                <Row label="จำนวนผู้ป่วย" value={`${patientCount} คน`} />
                <Row label="ระดับความรู้สึกตัว" value={conscious ? CONSCIOUS_LABEL[conscious] : '-'} />
                <Row label="เบอร์โทรติดต่อกลับ" value={callbackPhone} />
                {notes && <Row label="หมายเหตุเพิ่มเติม" value={notes} />}
                <Row label="รูปภาพแนบ" value={`${activeCase.photos.length} รูป`} />
              </dl>
              {activeCase.photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {activeCase.photos.map((p) => (
                    <img
                      key={p.id}
                      src={p.dataUrl}
                      alt="รูปภาพจุดเกิดเหตุ"
                      className="aspect-square rounded-xl border border-border object-cover"
                    />
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-2.5 pt-1 sm:flex-row-reverse">
                <Button variant="primary" size="lg" fullWidth loading={submitting} onClick={handleFinalSubmit}>
                  ส่งข้อมูลให้เจ้าหน้าที่
                </Button>
                <Button variant="outline" size="lg" fullWidth onClick={handleBack} disabled={submitting}>
                  ย้อนกลับไปแก้ไข
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <Select
                label="เหตุการณ์ที่เกิดขึ้น"
                required
                value={incidentType}
                error={errors.incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className={clsx(highlightErrors && errors.incidentType && 'animate-pulse')}
              >
                <option value="">เลือกประเภทเหตุการณ์</option>
                {INCIDENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <PulseRing tone="primary" size="sm" />
                  <span>ตำแหน่งที่ตรวจพบโดยประมาณ ตรวจสอบและแก้ไขได้ก่อนส่งข้อมูล</span>
                </div>
                <Textarea
                  label="จุดเกิดเหตุ"
                  required
                  rows={2}
                  value={location}
                  error={errors.location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={clsx(highlightErrors && errors.location && 'animate-pulse')}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<MapPin className="size-4" />}
                    loading={locating}
                    onClick={handleUseCurrentLocation}
                  >
                    ใช้ตำแหน่งปัจจุบัน
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowMap((v) => !v)}>
                    ปักหมุดตำแหน่งเอง
                  </Button>
                </div>
                {showMap && (
                  <>
                    <p className="text-xs text-muted">แตะบนแผนที่เพื่อปักหมุดตำแหน่งจุดเกิดเหตุ</p>
                    <MapPanel pins={[incidentPin]} center={[incidentPin.lat, incidentPin.lng]} height="200px" onPickLocation={handlePickOnMap} />
                  </>
                )}
              </div>

              <Input
                label="จำนวนผู้ป่วย"
                type="number"
                min={1}
                required
                value={patientCount}
                error={errors.patientCount}
                onChange={(e) => setPatientCount(e.target.value)}
                className={clsx(highlightErrors && errors.patientCount && 'animate-pulse')}
              />

              <Select
                label="ผู้ป่วยยังมีสติหรือไม่"
                required
                value={conscious}
                error={errors.conscious}
                onChange={(e) => setConscious(e.target.value as Conscious)}
                className={clsx(highlightErrors && errors.conscious && 'animate-pulse')}
              >
                <option value="">เลือกระดับความรู้สึกตัว</option>
                <option value="conscious">มีสติ</option>
                <option value="unconscious">ไม่มีสติ</option>
                <option value="unknown">ไม่ทราบ</option>
              </Select>

              <Input
                label="เบอร์โทรศัพท์สำหรับติดต่อกลับ"
                type="tel"
                required
                value={callbackPhone}
                error={errors.callbackPhone}
                onChange={(e) => setCallbackPhone(e.target.value)}
                className={clsx(highlightErrors && errors.callbackPhone && 'animate-pulse')}
              />

              <div className="flex flex-col gap-1">
                <Textarea
                  label="หมายเหตุเพิ่มเติม"
                  hint="ไม่บังคับ"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <p className="self-end text-xs text-muted">
                  {notes.length}/{NOTES_SOFT_LIMIT} ตัวอักษร
                </p>
              </div>

              {activeCase.photos.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    icon={<ImageIcon className="size-4" />}
                    onClick={() => setShowGallery((v) => !v)}
                  >
                    ดูรูปภาพที่แนบ ({activeCase.photos.length})
                  </Button>
                  {showGallery && (
                    <Card className="grid grid-cols-3 gap-2 sm:grid-cols-4 animate-fade-in-up">
                      {activeCase.photos.map((p) => (
                        <img
                          key={p.id}
                          src={p.dataUrl}
                          alt="รูปภาพจุดเกิดเหตุ"
                          className="aspect-square rounded-xl border border-border object-cover"
                        />
                      ))}
                    </Card>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2.5 pt-1 sm:flex-row-reverse">
                <Button variant="primary" size="lg" fullWidth onClick={handleReview}>
                  ตรวจสอบข้อมูล
                </Button>
                <Button variant="outline" size="lg" fullWidth loading={saving} onClick={handleSaveDraft}>
                  บันทึกข้อมูล
                </Button>
              </div>

              <Button variant="ghost" fullWidth onClick={handleBack}>
                ย้อนกลับ
              </Button>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right font-medium text-navy">{value}</dd>
    </div>
  )
}
