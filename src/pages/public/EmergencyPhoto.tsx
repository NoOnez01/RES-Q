import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Pause, Play, ShieldAlert, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { CameraCapture } from '@/components/CameraCapture'
import { ImageUploader } from '@/components/ImageUploader'
import { AudioRecorder } from '@/components/AudioRecorder'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { formatDuration } from '@/lib/utils'
import { DEFAULT_INCIDENT_LOCATION } from '@/lib/mockData'
import { getCurrentPosition, reverseGeocode } from '@/lib/geolocation'
import { uploadCasePhoto, uploadCaseAudio } from '@/lib/storageUploads'
import type { AudioRecording } from '@/lib/types'

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
  const removePhoto = useStore((s) => s.removePhoto)
  const addAudioRecording = useStore((s) => s.addAudioRecording)
  const removeAudioRecording = useStore((s) => s.removeAudioRecording)
  const finishPhotoStep = useStore((s) => s.finishPhotoStep)
  const setLocation = useStore((s) => s.setLocation)

  const resolvedRef = useRef<string | null>(null)
  const [caseId, setCaseId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [flash, setFlash] = useState(false)
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'ready' | 'failed'>('locating')

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
      // Best-effort real GPS as the initial guess; falls back to the demo
      // default if location access is denied/unavailable. The reporter can
      // still refine or re-pick this later on the details step.
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

  function proceed() {
    if (!caseId || submitting) return
    setSubmitting(true)
    setTimeout(() => {
      finishPhotoStep(caseId)
      navigate('/public/call-1669')
    }, 600)
  }

  async function handleAddPhoto(dataUrl: string) {
    if (!caseId || !activeCase) return
    setUploadingPhoto(true)
    try {
      const url = await uploadCasePhoto(activeCase.caseNumber, dataUrl)
      addPhoto(caseId, url)
      toast({ title: 'บันทึกรูปภาพแล้ว', tone: 'success' })
    } catch {
      toast({ title: 'อัปโหลดรูปภาพไม่สำเร็จ', tone: 'error' })
    } finally {
      setUploadingPhoto(false)
    }
  }

  function handleCameraCapture(dataUrl: string) {
    setFlash(true)
    window.setTimeout(() => setFlash(false), 150)
    void handleAddPhoto(dataUrl)
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

  function handleConfirmRemove() {
    if (caseId && removeTargetId) {
      removePhoto(caseId, removeTargetId)
    }
    setRemoveTargetId(null)
  }

  if (!caseId || !activeCase) {
    return (
      <AppShell variant="flow" title="ถ่ายรูปจุดเกิดเหตุ" showBack>
        <div className="py-16 text-center text-sm text-muted">กำลังเตรียมข้อมูล...</div>
      </AppShell>
    )
  }

  const audioRecordings = activeCase.audioRecordings ?? []

  return (
    <AppShell variant="flow" title="ถ่ายรูปจุดเกิดเหตุ" showBack>
      <div className="relative">
        <AnimatedBackground variant="emergency" />

        <div className="relative z-10 flex flex-col gap-5 pb-28">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-navy">ถ่ายรูปจุดเกิดเหตุ</h1>
              <p className="mt-1.5 text-sm text-muted">
                รูปภาพจะช่วยให้เจ้าหน้าที่เข้าใจสถานการณ์และเตรียมความช่วยเหลือได้เหมาะสม
              </p>
            </div>
            <span
              key={activeCase.photos.length}
              className="inline-flex shrink-0 animate-count-pop items-center gap-1.5 rounded-full border border-primary/30 bg-skyblue-light px-3 py-1.5 text-xs font-bold text-primary whitespace-nowrap"
            >
              รูปภาพ: {activeCase.photos.length}
            </span>
          </div>

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

          <div className="relative">
            <CameraCapture onCapture={handleCameraCapture} />

            <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/3] w-full overflow-hidden rounded-t-2xl">
              <span className="absolute left-3 top-3 size-6 rounded-tl-lg border-l-2 border-t-2 border-primary-bright/70" />
              <span className="absolute right-3 top-3 size-6 rounded-tr-lg border-r-2 border-t-2 border-primary-bright/70" />
              <span className="absolute bottom-3 left-3 size-6 rounded-bl-lg border-b-2 border-l-2 border-primary-bright/70" />
              <span className="absolute bottom-3 right-3 size-6 rounded-br-lg border-b-2 border-r-2 border-primary-bright/70" />
              <div className="absolute inset-x-0 top-0 h-10 animate-scan-line bg-gradient-to-b from-transparent via-primary-bright/40 to-transparent" />
              <div
                className={clsx(
                  'absolute inset-0 bg-white transition-opacity duration-300',
                  flash ? 'opacity-90' : 'opacity-0',
                )}
              />
            </div>
          </div>

          <div className="animate-fade-in">
            <ImageUploader
              photos={activeCase.photos}
              onAdd={handleAddPhoto}
              onRemove={(id) => setRemoveTargetId(id)}
            />
            {uploadingPhoto && <p className="mt-2 text-xs font-medium text-primary">กำลังอัปโหลดรูปภาพ...</p>}
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

          <p className="text-center text-xs text-muted">หากไม่สะดวกถ่ายรูป สามารถข้ามขั้นตอนนี้ได้</p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mt-2 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <Button variant="primary" size="lg" fullWidth loading={submitting} onClick={proceed}>
            ไปต่อเพื่อโทร 1669
          </Button>
          <Button variant="ghost" size="md" fullWidth onClick={proceed} disabled={submitting}>
            ข้ามขั้นตอนนี้
          </Button>
        </div>
      </div>

      <ConfirmationModal
        open={!!removeTargetId}
        title="ลบรูปภาพนี้หรือไม่?"
        message="รูปภาพที่ลบแล้วจะไม่สามารถกู้คืนได้"
        confirmLabel="ลบรูปภาพ"
        cancelLabel="ยกเลิก"
        tone="danger"
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveTargetId(null)}
      />
    </AppShell>
  )
}
