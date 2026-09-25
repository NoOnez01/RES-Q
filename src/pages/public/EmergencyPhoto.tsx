import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, MapPin, Pause, Play, ShieldAlert, Trash2, Upload } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Field'
import { PhotoCaptureModal, type PhotoSlotConfig } from '@/components/PhotoCaptureModal'
import { AudioRecorder } from '@/components/AudioRecorder'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { formatDuration } from '@/lib/utils'
import { DEFAULT_INCIDENT_LOCATION } from '@/lib/mockData'
import { watchPosition, reverseGeocode } from '@/lib/geolocation'
import { uploadCasePhoto, uploadCaseAudio } from '@/lib/storageUploads'
import { supabaseEnabled } from '@/lib/supabase'
import type { AudioRecording, Consciousness, PhotoCategory } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'มีสติ รู้สึกตัวดี': 'Conscious, alert',
  'ไม่มีสติ / ไม่รู้สึกตัว': 'Unconscious / unresponsive',
  ไม่แน่ใจ: 'Not sure',
  'ลักษณะจุดเกิดเหตุ/ผู้บาดเจ็บ': 'Scene / injured person',
  'อาการหรือลักษณะผู้บาดเจ็บที่จุดเกิดเหตุ': 'Condition or appearance of the injured person at the scene',
  สภาพแวดล้อมโดยรอบ: 'Surrounding environment',
  ภาพกว้างของสภาพแวดล้อมบริเวณที่เกิดเหตุ: 'A wide shot of the surrounding area',
  จุดสังเกตของสถานที่: 'Landmark',
  ป้ายหรือจุดสังเกตที่ช่วยระบุตำแหน่งได้ง่าย: 'A sign or landmark that helps identify the location',
  หยุดชั่วคราว: 'Pause',
  เล่นเสียง: 'Play',
  'บันทึกเสียง {duration}': 'Recording {duration}',
  ลบการบันทึกเสียง: 'Delete recording',
  กรุณาระบุว่าผู้ป่วยยังมีสติหรือไม่: 'Please indicate whether the patient is conscious',
  บันทึกรูปภาพแล้ว: 'Photo saved',
  อัปโหลดรูปภาพไม่สำเร็จ: 'Failed to upload photo',
  บันทึกเสียงแล้ว: 'Audio saved',
  อัปโหลดเสียงไม่สำเร็จ: 'Failed to upload audio',
  ถ่ายรูปจุดเกิดเหตุ: 'Photograph the scene',
  'กำลังเตรียมข้อมูล...': 'Preparing...',
  'กดเริ่มถ่ายภาพ แล้วทำตามหัวข้อทีละขั้นตอน': 'Tap to start, then follow each step',
  'รูปภาพ: {n}/{total}': 'Photos: {n}/{total}',
  ข้ามขั้นตอนนี้: 'Skip this step',
  'กำลังค้นหาตำแหน่ง...': 'Locating...',
  'สัญญาณ GPS พร้อมใช้งาน': 'GPS signal ready',
  ใช้ตำแหน่งโดยประมาณ: 'Using an approximate location',
  ผู้ป่วยยังมีสติหรือไม่: 'Is the patient conscious?',
  'ช่วยให้ศูนย์ 1669 ประเมินความรุนแรงได้เร็วขึ้น': 'Helps Center 1669 assess severity faster',
  เลือกระดับความรู้สึกตัว: 'Select consciousness level',
  ถ่ายใหม่: 'Retake',
  ถ่าย: 'Take photo',
  เริ่มถ่ายภาพ: 'Start taking photos',
  ถ่ายภาพต่อ: 'Continue taking photos',
  ถ่ายภาพใหม่ทั้งหมด: 'Retake all photos',
  'กำลังอัปโหลดรูปภาพ...': 'Uploading photo...',
  หรืออัปโหลดรูปจากอุปกรณ์แทนการถ่าย: 'Or upload a photo from your device instead',
  'บันทึกเสียงอธิบายเหตุการณ์ (ถ้ามี)': 'Record audio describing the incident (if any)',
  'เสียง: {n}': 'Audio: {n}',
  กดเพื่อเริ่มบันทึกเสียงอธิบายสถานการณ์: 'Tap to start recording audio describing the situation',
  'กำลังอัปโหลดเสียง...': 'Uploading audio...',
  'ถ่ายรูปเฉพาะเมื่ออยู่ในจุดที่ปลอดภัย อย่าเข้าใกล้จุดเกิดเหตุหากมีความเสี่ยง':
    'Only take photos when you are somewhere safe — do not approach the scene if there is any risk',
  'ไปต่อเพื่อโทร 1669': 'Continue to call 1669',
})

const CONSCIOUSNESS_LABEL: Record<Consciousness, string> = {
  conscious: 'มีสติ รู้สึกตัวดี',
  unconscious: 'ไม่มีสติ / ไม่รู้สึกตัว',
  unknown: 'ไม่แน่ใจ',
}

const PHOTO_CATEGORIES: PhotoSlotConfig[] = [
  { key: 'scene', label: 'ลักษณะจุดเกิดเหตุ/ผู้บาดเจ็บ', hint: 'อาการหรือลักษณะผู้บาดเจ็บที่จุดเกิดเหตุ' },
  { key: 'environment', label: 'สภาพแวดล้อมโดยรอบ', hint: 'ภาพกว้างของสภาพแวดล้อมบริเวณที่เกิดเหตุ' },
  { key: 'landmark', label: 'จุดสังเกตของสถานที่', hint: 'ป้ายหรือจุดสังเกตที่ช่วยระบุตำแหน่งได้ง่าย' },
]

function AudioRecordingRow({ recording, onRemove }: { recording: AudioRecording; onRemove: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const t = useT()

  function toggle() {
    if (!audioRef.current) return
    if (playing) audioRef.current.pause()
    else audioRef.current.play()
    setPlaying(!playing)
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t('หยุดชั่วคราว') : t('เล่นเสียง')}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-skyblue-light text-primary"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
      <span className="text-sm text-ink">{t('บันทึกเสียง {duration}', { duration: formatDuration(recording.durationSec) })}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('ลบการบันทึกเสียง')}
        className="ml-auto text-muted hover:text-emergency"
      >
        <Trash2 className="size-4" />
      </button>
      <audio ref={audioRef} src={recording.url} onEnded={() => setPlaying(false)} className="hidden" />
    </div>
  )
}

export default function EmergencyPhoto() {
  const navigate = useNavigate()
  const activeCaseId = useStore((s) => s.activeCaseId)
  const cases = useStore((s) => s.cases)
  const createCase = useStore((s) => s.createCase)
  const addPhoto = useStore((s) => s.addPhoto)
  const addAudioRecording = useStore((s) => s.addAudioRecording)
  const removeAudioRecording = useStore((s) => s.removeAudioRecording)
  const finishPhotoStep = useStore((s) => s.finishPhotoStep)
  const setLocation = useStore((s) => s.setLocation)
  const deleteCase = useStore((s) => s.deleteCase)
  const setReporterConsciousness = useStore((s) => s.setReporterConsciousness)
  const currentUser = useStore((s) => s.currentUser)
  const loggedIn = !!currentUser && !currentUser.isAnonymous
  const t = useT()

  const resolvedRef = useRef<string | null>(null)
  const [caseId, setCaseId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'ready' | 'failed'>('locating')
  const [captureKey, setCaptureKey] = useState<PhotoCategory | null>(null)
  const [consciousness, setConsciousnessInput] = useState<Consciousness | ''>('')
  const [consciousnessError, setConsciousnessError] = useState<string>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (resolvedRef.current) return
    const preFlow = new Set(['contacted', 'photos-taken', 'called-1669'])
    let id: string
    if (activeCaseId && cases[activeCaseId] && preFlow.has(cases[activeCaseId].status)) {
      id = activeCaseId
    } else {
      // createCase() stamps reporterUserId from the current session (see
      // store.ts), which Supabase's insert policy requires to be set -- if
      // this runs before App.tsx's session bootstrap resolves (e.g. a cold
      // load straight into this page), reporterUserId would be null and the
      // case would be created locally but silently rejected on sync. Wait
      // for a session first; the bootstrap is normally near-instant, and
      // this effect re-runs (via the `currentUser` dependency below) the
      // moment it resolves.
      if (supabaseEnabled && !currentUser) return
      id = createCase(loggedIn ? currentUser?.name : undefined, loggedIn ? currentUser?.phone : undefined)
    }
    resolvedRef.current = id
    setCaseId(id)
    const c = useStore.getState().cases[id]
    if (c?.reporterConsciousness) setConsciousnessInput(c.reporterConsciousness)
    // Instant placeholder so the UI never shows "no location" while the
    // first real GPS fix comes in via the watch effect below.
    if (c && !c.location) setLocation(id, DEFAULT_INCIDENT_LOCATION)
    // Only `currentUser` is a real dependency (to retry once the session
    // resolves) -- activeCaseId/cases/etc are deliberately read once at
    // whatever they are when this settles, not re-watched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  // Keeps GPS live for as long as the reporter is on this page, instead of
  // one fix-and-forget lookup -- useful if they're describing the scene
  // while still moving (e.g. walking toward the patient). Reverse-geocoding
  // is throttled to once every few seconds regardless of how often the GPS
  // itself ticks, since Nominatim's free API asks callers not to hammer it.
  useEffect(() => {
    if (!caseId) return
    let lastCallTime = 0
    const MIN_INTERVAL_MS = 5000
    const stopWatching = watchPosition(
      (pos) => {
        const now = Date.now()
        if (now - lastCallTime < MIN_INTERVAL_MS) return
        lastCallTime = now
        setGpsStatus('ready')
        reverseGeocode(pos)
          .then((address) => setLocation(caseId, { ...pos, address }))
          .catch(() => setLocation(caseId, { ...pos, address: `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` }))
      },
      () => setGpsStatus('failed'),
    )
    return stopWatching
  }, [caseId, setLocation])

  const activeCase = caseId ? cases[caseId] : null

  function handleBack() {
    if (caseId) deleteCase(caseId)
    navigate(-1)
  }

  function proceed() {
    if (!caseId || submitting) return
    // The callback number and family contacts are asked after the call
    // (public/ContactInfo.tsx) -- nothing extra to type before reaching 1669.
    if (!consciousness) {
      setConsciousnessError(t('กรุณาระบุว่าผู้ป่วยยังมีสติหรือไม่'))
      return
    }
    setConsciousnessError(undefined)
    setSubmitting(true)
    setReporterConsciousness(caseId, consciousness)
    setTimeout(() => {
      finishPhotoStep(caseId)
      navigate('/public/call-1669')
    }, 600)
  }

  const slots = PHOTO_CATEGORIES.map((cat) => ({
    ...cat,
    photo: activeCase?.photos.find((p) => p.category === cat.key) ?? null,
  }))
  const filledCount = slots.filter((s) => s.photo).length
  const activeSlot = slots.find((s) => s.key === captureKey) ?? null
  const activeSlotIndex = activeSlot ? PHOTO_CATEGORIES.findIndex((c) => c.key === activeSlot.key) : -1

  // With a starting key, only the *other* categories need checking -- the
  // stale `slots` closure this reads (captured before the store update from
  // the capture that just happened commits) still shows `key` itself as
  // unfilled, so re-checking it here would wrongly reopen the same slot
  // forever instead of closing the modal once all three are done.
  function nextUnfilledAfter(key: PhotoCategory | null): PhotoCategory | null {
    const startIdx = key ? PHOTO_CATEGORIES.findIndex((c) => c.key === key) : -1
    const checks = key ? PHOTO_CATEGORIES.length - 1 : PHOTO_CATEGORIES.length
    for (let i = 1; i <= checks; i++) {
      const cat = PHOTO_CATEGORIES[(startIdx + i) % PHOTO_CATEGORIES.length]
      if (!slots.find((s) => s.key === cat.key)?.photo) return cat.key
    }
    return null
  }

  function startCapture() {
    const target = nextUnfilledAfter(null) ?? PHOTO_CATEGORIES[0].key
    setCaptureKey(target)
  }

  async function handleAddPhoto(dataUrl: string, category: PhotoCategory) {
    if (!caseId || !activeCase) return
    setUploadingPhoto(true)
    try {
      const url = await uploadCasePhoto(activeCase.caseNumber, dataUrl)
      addPhoto(caseId, url, category)
      toast({ title: t('บันทึกรูปภาพแล้ว'), tone: 'success' })
      const next = nextUnfilledAfter(category)
      setCaptureKey(next)
    } catch {
      toast({ title: t('อัปโหลดรูปภาพไม่สำเร็จ'), tone: 'error' })
      setCaptureKey(null)
    } finally {
      setUploadingPhoto(false)
    }
  }

  function handleUploadFallback(files: FileList | null) {
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const nextEmpty = nextUnfilledAfter(null)
    if (!nextEmpty) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') void handleAddPhoto(reader.result, nextEmpty)
    }
    reader.readAsDataURL(file)
  }

  async function handleSaveAudio(blob: Blob, seconds: number) {
    if (!caseId || !activeCase) return
    setUploadingAudio(true)
    try {
      const url = await uploadCaseAudio(activeCase.caseNumber, blob)
      addAudioRecording(caseId, url, seconds)
      toast({ title: t('บันทึกเสียงแล้ว'), tone: 'success' })
    } catch {
      toast({ title: t('อัปโหลดเสียงไม่สำเร็จ'), tone: 'error' })
    } finally {
      setUploadingAudio(false)
    }
  }

  if (!caseId || !activeCase) {
    return (
      <AppShell variant="flow" title={t('ถ่ายรูปจุดเกิดเหตุ')} showBack>
        <div className="py-16 text-center text-sm text-muted">{t('กำลังเตรียมข้อมูล...')}</div>
      </AppShell>
    )
  }

  const audioRecordings = activeCase.audioRecordings ?? []

  return (
    <AppShell variant="flow" title={t('ถ่ายรูปจุดเกิดเหตุ')} showBack onBack={handleBack}>
      <div className="relative">
        <AnimatedBackground variant="emergency" />

        <div className="relative z-10 flex flex-col gap-5 pb-28">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-ink">{t('ถ่ายรูปจุดเกิดเหตุ')}</h1>
              <p className="mt-1.5 text-sm text-muted">{t('กดเริ่มถ่ายภาพ แล้วทำตามหัวข้อทีละขั้นตอน')}</p>
            </div>
            <span
              key={filledCount}
              className="inline-flex shrink-0 animate-count-pop items-center gap-1.5 rounded-full border border-primary/30 bg-skyblue-light px-3 py-1.5 text-xs font-bold text-primary whitespace-nowrap"
            >
              {t('รูปภาพ: {n}/{total}', { n: filledCount, total: PHOTO_CATEGORIES.length })}
            </span>
          </div>

          <Button variant="ghost" size="sm" className="self-start" onClick={proceed} disabled={submitting}>
            {t('ข้ามขั้นตอนนี้')}
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-3.5">
            <div className="flex items-center gap-2 text-sm text-ink">
              <MapPin
                className={clsx('size-4 shrink-0 text-primary', gpsStatus === 'locating' && 'animate-bounce')}
                style={{ animationDuration: '2s' }}
              />
              <span>{activeCase?.location?.address ?? DEFAULT_INCIDENT_LOCATION.address}</span>
            </div>
            {gpsStatus === 'locating' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning whitespace-nowrap">
                {t('กำลังค้นหาตำแหน่ง...')}
              </span>
            )}
            {gpsStatus === 'ready' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-bold text-success whitespace-nowrap">
                {t('สัญญาณ GPS พร้อมใช้งาน')}
              </span>
            )}
            {gpsStatus === 'failed' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-muted/30 bg-muted/10 px-2.5 py-1 text-xs font-bold text-muted whitespace-nowrap">
                {t('ใช้ตำแหน่งโดยประมาณ')}
              </span>
            )}
          </div>

          <Card>
            <Select
              label={t('ผู้ป่วยยังมีสติหรือไม่')}
              required
              value={consciousness}
              error={consciousnessError}
              hint={t('ช่วยให้ศูนย์ 1669 ประเมินความรุนแรงได้เร็วขึ้น')}
              onChange={(e) => {
                setConsciousnessInput(e.target.value as Consciousness)
                if (consciousnessError) setConsciousnessError(undefined)
              }}
            >
              <option value="">{t('เลือกระดับความรู้สึกตัว')}</option>
              <option value="conscious">{t(CONSCIOUSNESS_LABEL.conscious)}</option>
              <option value="unconscious">{t(CONSCIOUSNESS_LABEL.unconscious)}</option>
              <option value="unknown">{t(CONSCIOUSNESS_LABEL.unknown)}</option>
            </Select>
          </Card>

          <div className="flex flex-col gap-2.5">
            {slots.map((slot, i) => (
              <button
                key={slot.key}
                type="button"
                onClick={() => setCaptureKey(slot.key)}
                className={clsx(
                  'flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                  slot.photo ? 'border-success/30 bg-success/5' : 'border-border bg-surface hover:border-primary/40',
                )}
              >
                {slot.photo ? (
                  <img src={slot.photo.dataUrl} alt={t(slot.label)} className="size-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-skyblue-light text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                    {t(slot.label)}
                    {slot.photo && <Check className="size-3.5 text-success" />}
                  </p>
                  <p className="truncate text-xs text-muted">{t(slot.hint)}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-primary">{slot.photo ? t('ถ่ายใหม่') : t('ถ่าย')}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="primary" size="lg" fullWidth icon={<Camera className="size-5" />} onClick={startCapture}>
              {filledCount === 0 ? t('เริ่มถ่ายภาพ') : filledCount < PHOTO_CATEGORIES.length ? t('ถ่ายภาพต่อ') : t('ถ่ายภาพใหม่ทั้งหมด')}
            </Button>
            {uploadingPhoto && <p className="text-center text-xs font-medium text-primary">{t('กำลังอัปโหลดรูปภาพ...')}</p>}
            {filledCount < PHOTO_CATEGORIES.length && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleUploadFallback(e.target.files)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Upload className="size-3.5" />
                  {t('หรืออัปโหลดรูปจากอุปกรณ์แทนการถ่าย')}
                </button>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-ink">{t('บันทึกเสียงอธิบายเหตุการณ์ (ถ้ามี)')}</p>
              {audioRecordings.length > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-skyblue-light px-3 py-1.5 text-xs font-bold text-primary">
                  {t('เสียง: {n}', { n: audioRecordings.length })}
                </span>
              )}
            </div>
            <AudioRecorder label={t('กดเพื่อเริ่มบันทึกเสียงอธิบายสถานการณ์')} onSave={handleSaveAudio} resetAfterSave />
            {uploadingAudio && <p className="text-xs font-medium text-primary">{t('กำลังอัปโหลดเสียง...')}</p>}
            {audioRecordings.length > 0 && (
              <div className="flex flex-col gap-2">
                {audioRecordings.map((recording) => (
                  <AudioRecordingRow
                    key={recording.id}
                    recording={recording}
                    onRemove={() => caseId && removeAudioRecording(caseId, recording.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 animate-pulse text-warning" />
            <p className="text-sm font-medium text-ink">
              {t('ถ่ายรูปเฉพาะเมื่ออยู่ในจุดที่ปลอดภัย อย่าเข้าใกล้จุดเกิดเหตุหากมีความเสี่ยง')}
            </p>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mt-2 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <Button variant="primary" size="lg" fullWidth loading={submitting} onClick={proceed}>
            {t('ไปต่อเพื่อโทร 1669')}
          </Button>
        </div>
      </div>

      <PhotoCaptureModal
        open={captureKey !== null}
        slot={activeSlot}
        stepIndex={activeSlotIndex + 1}
        totalSteps={PHOTO_CATEGORIES.length}
        onCapture={handleAddPhoto}
        onClose={() => setCaptureKey(null)}
      />
    </AppShell>
  )
}
