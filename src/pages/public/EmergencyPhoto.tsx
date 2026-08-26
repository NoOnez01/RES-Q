import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Pause, Play, ShieldAlert, Trash2, Upload } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { CameraCapture, type PhotoSlotConfig } from '@/components/CameraCapture'
import { AudioRecorder } from '@/components/AudioRecorder'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { formatDuration } from '@/lib/utils'
import { DEFAULT_INCIDENT_LOCATION } from '@/lib/mockData'
import { getCurrentPosition, reverseGeocode } from '@/lib/geolocation'
import { uploadCasePhoto, uploadCaseAudio } from '@/lib/storageUploads'
import type { AudioRecording, PhotoCategory } from '@/lib/types'

const PHOTO_CATEGORIES: PhotoSlotConfig[] = [
  { key: 'scene', label: 'ลักษณะจุดเกิดเหตุ/ผู้บาดเจ็บ', hint: 'อาการหรือลักษณะผู้บาดเจ็บที่จุดเกิดเหตุ' },
  { key: 'environment', label: 'สภาพแวดล้อมโดยรอบ', hint: 'ภาพกว้างของสภาพแวดล้อมบริเวณที่เกิดเหตุ' },
  { key: 'landmark', label: 'จุดสังเกตของสถานที่', hint: 'ป้ายหรือจุดสังเกตที่ช่วยระบุตำแหน่งได้ง่าย' },
]

function AudioRecordingRow({ recording, onRemove }: { recording: AudioRecording; onRemove: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  function toggle() {
    if (!audioRef.current) return
    if (playing) audioRef.current.pause()
    else audioRef.current.play()
    setPlaying(!playing)
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'หยุดชั่วคราว' : 'เล่นเสียง'}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-skyblue-light text-primary"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
      <span className="text-sm text-navy">บันทึกเสียง {formatDuration(recording.durationSec)}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="ลบการบันทึกเสียง"
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

  const resolvedRef = useRef<string | null>(null)
  const [caseId, setCaseId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'ready' | 'failed'>('locating')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (resolvedRef.current) return
    const preFlow = new Set(['contacted', 'photos-taken', 'called-1669'])
    let id: string
    if (activeCaseId && cases[activeCaseId] && preFlow.has(cases[activeCaseId].status)) {
      id = activeCaseId
    } else {
      id = createCase()
    }
    resolvedRef.current = id
    setCaseId(id)
    const c = useStore.getState().cases[id]
    if (c && !c.location) {
      // Real GPS via the browser's Geolocation API as the initial guess;
      // falls back to the demo default if location access is denied/
      // unavailable. The reporter can still refine or re-pick this later on
      // the details step.
      setLocation(id, DEFAULT_INCIDENT_LOCATION)
      getCurrentPosition()
        .then(async (pos) => {
          const address = await reverseGeocode(pos).catch(() => `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`)
          setLocation(id, { ...pos, address })
          setGpsStatus('ready')
        })
        .catch(() => {
          // keep the default; the details step lets them fix it manually
          setGpsStatus('failed')
        })
    } else {
      setGpsStatus('ready')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeCase = caseId ? cases[caseId] : null

  function handleBack() {
    if (caseId) deleteCase(caseId)
    navigate(-1)
  }

  function proceed() {
    if (!caseId || submitting) return
    setSubmitting(true)
    setTimeout(() => {
      finishPhotoStep(caseId)
      navigate('/public/call-1669')
    }, 600)
  }

  async function handleAddPhoto(dataUrl: string, category: PhotoCategory) {
    if (!caseId || !activeCase) return
    setUploadingPhoto(true)
    try {
      const url = await uploadCasePhoto(activeCase.caseNumber, dataUrl)
      addPhoto(caseId, url, category)
      toast({ title: 'บันทึกรูปภาพแล้ว', tone: 'success' })
    } catch {
      toast({ title: 'อัปโหลดรูปภาพไม่สำเร็จ', tone: 'error' })
    } finally {
      setUploadingPhoto(false)
    }
  }

  function handleUploadFallback(files: FileList | null) {
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const nextEmpty = PHOTO_CATEGORIES.find((cat) => !slots.find((s) => s.key === cat.key)?.photo)
    if (!nextEmpty) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') void handleAddPhoto(reader.result, nextEmpty.key)
    }
    reader.readAsDataURL(file)
  }

  async function handleSaveAudio(blob: Blob, seconds: number) {
    if (!caseId || !activeCase) return
    setUploadingAudio(true)
    try {
      const url = await uploadCaseAudio(activeCase.caseNumber, blob)
      addAudioRecording(caseId, url, seconds)
      toast({ title: 'บันทึกเสียงแล้ว', tone: 'success' })
    } catch {
      toast({ title: 'อัปโหลดเสียงไม่สำเร็จ', tone: 'error' })
    } finally {
      setUploadingAudio(false)
    }
  }

  if (!caseId || !activeCase) {
    return (
      <AppShell variant="flow" title="ถ่ายรูปจุดเกิดเหตุ" showBack>
        <div className="py-16 text-center text-sm text-muted">กำลังเตรียมข้อมูล...</div>
      </AppShell>
    )
  }

  const audioRecordings = activeCase.audioRecordings ?? []
  const slots = PHOTO_CATEGORIES.map((cat) => ({
    ...cat,
    photo: activeCase.photos.find((p) => p.category === cat.key) ?? null,
  }))
  const filledCount = slots.filter((s) => s.photo).length

  return (
    <AppShell variant="flow" title="ถ่ายรูปจุดเกิดเหตุ" showBack onBack={handleBack}>
      <div className="relative">
        <AnimatedBackground variant="emergency" />

        <div className="relative z-10 flex flex-col gap-5 pb-28">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-navy">ถ่ายรูปจุดเกิดเหตุ</h1>
              <p className="mt-1.5 text-sm text-muted">ถ่ายรูปตามหัวข้อด้านล่างเพื่อช่วยให้เจ้าหน้าที่ประเมินสถานการณ์ได้แม่นยำขึ้น</p>
            </div>
            <span
              key={filledCount}
              className="inline-flex shrink-0 animate-count-pop items-center gap-1.5 rounded-full border border-primary/30 bg-skyblue-light px-3 py-1.5 text-xs font-bold text-primary whitespace-nowrap"
            >
              รูปภาพ: {filledCount}/{PHOTO_CATEGORIES.length}
            </span>
          </div>

          <Button variant="ghost" size="sm" className="self-start" onClick={proceed} disabled={submitting}>
            ข้ามขั้นตอนนี้
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-white p-3.5">
            <div className="flex items-center gap-2 text-sm text-navy">
              <MapPin
                className={clsx(
                  'size-4 shrink-0 text-primary',
                  gpsStatus === 'locating' && 'animate-bounce',
                )}
                style={{ animationDuration: '2s' }}
              />
              <span>{activeCase?.location?.address ?? DEFAULT_INCIDENT_LOCATION.address}</span>
            </div>
            {gpsStatus === 'locating' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning whitespace-nowrap">
                กำลังค้นหาตำแหน่ง...
              </span>
            )}
            {gpsStatus === 'ready' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-bold text-success whitespace-nowrap">
                สัญญาณ GPS พร้อมใช้งาน
              </span>
            )}
            {gpsStatus === 'failed' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-muted/30 bg-muted/10 px-2.5 py-1 text-xs font-bold text-muted whitespace-nowrap">
                ใช้ตำแหน่งโดยประมาณ
              </span>
            )}
          </div>

          <div className="animate-fade-in">
            <CameraCapture slots={slots} onCapture={handleAddPhoto} />
            {uploadingPhoto && <p className="mt-2 text-xs font-medium text-primary">กำลังอัปโหลดรูปภาพ...</p>}
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
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Upload className="size-3.5" />
                  หรืออัปโหลดรูปจากอุปกรณ์แทนการถ่าย
                </button>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-navy">บันทึกเสียงอธิบายเหตุการณ์ (ถ้ามี)</p>
              {audioRecordings.length > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-skyblue-light px-3 py-1.5 text-xs font-bold text-primary">
                  เสียง: {audioRecordings.length}
                </span>
              )}
            </div>
            <AudioRecorder label="กดเพื่อเริ่มบันทึกเสียงอธิบายสถานการณ์" onSave={handleSaveAudio} />
            {uploadingAudio && <p className="text-xs font-medium text-primary">กำลังอัปโหลดเสียง...</p>}
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
            <p className="text-sm font-medium text-navy">
              ถ่ายรูปเฉพาะเมื่ออยู่ในจุดที่ปลอดภัย อย่าเข้าใกล้จุดเกิดเหตุหากมีความเสี่ยง
            </p>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mt-2 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <Button variant="primary" size="lg" fullWidth loading={submitting} onClick={proceed}>
            ไปต่อเพื่อโทร 1669
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
