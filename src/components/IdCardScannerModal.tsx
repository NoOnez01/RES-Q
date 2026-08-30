import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, CameraOff, X, ScanLine, RotateCcw, Check, Upload, AlertTriangle } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Field'

interface IdCardScannerModalProps {
  open: boolean
  onApply: (result: { name?: string; idNumber?: string }) => void
  onClose: () => void
}

interface ExtractedFields {
  name: string
  idNumber: string
  rawText: string
}

/** Best-effort heuristics for Thai national ID cards -- printed layout
 * usually has a 13-digit number near the top and "ชื่อ"/"สกุล" labels
 * ahead of the first/last name. OCR on a photographed card is never
 * perfect, so this only ever pre-fills a review step the user must
 * confirm -- never applied silently. */
function extractFields(rawText: string): ExtractedFields {
  const idMatch = rawText.match(/\d[\s-]?\d{4}[\s-]?\d{5}[\s-]?\d{2}[\s-]?\d/)
  const idNumber = idMatch ? idMatch[0].replace(/[\s-]/g, '') : ''

  const firstNameMatch = rawText.match(/ชื่อ[\s:]*([ก-๙]+)/)
  const lastNameMatch = rawText.match(/สกุล[\s:]*([ก-๙]+)/)
  const name = [firstNameMatch?.[1], lastNameMatch?.[1]].filter(Boolean).join(' ')

  return { name, idNumber: idNumber.length === 13 ? idNumber : '', rawText }
}

type Mode = 'camera' | 'processing' | 'review'

const OCR_STATUS_LABEL: Record<string, string> = {
  'loading tesseract core': 'กำลังดาวน์โหลดโมดูลอ่านข้อความ...',
  'initializing tesseract': 'กำลังเตรียมระบบอ่านข้อความ...',
  'loading language traineddata': 'กำลังดาวน์โหลดข้อมูลภาษา...',
  'initializing api': 'กำลังเตรียมระบบอ่านข้อความ...',
  'recognizing text': 'กำลังอ่านข้อความจากบัตร...',
}

export function IdCardScannerModal({ open, onApply, onClose }: IdCardScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'starting' | 'ready' | 'unavailable'>('idle')
  const [mode, setMode] = useState<Mode>('camera')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [ocrError, setOcrError] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedFields | null>(null)
  const [editName, setEditName] = useState('')
  const [editIdNumber, setEditIdNumber] = useState('')
  const [ocrProgress, setOcrProgress] = useState<{ status: string; progress: number } | null>(null)

  useEffect(() => {
    if (!open || mode !== 'camera') return
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus('unavailable')
        return
      }
      setCameraStatus('starting')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setCameraStatus('ready')
      } catch {
        if (!cancelled) setCameraStatus('unavailable')
      }
    }

    void start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setCameraStatus('idle')
    }
  }, [open, mode])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  // Reset to a clean camera state every time the modal reopens.
  useEffect(() => {
    if (open) {
      setMode('camera')
      setCapturedImage(null)
      setOcrError(false)
      setExtracted(null)
    }
  }, [open])

  if (!open) return null

  async function runOcr(imageSource: string) {
    setCapturedImage(imageSource)
    setMode('processing')
    setOcrError(false)
    setOcrProgress({ status: 'กำลังเริ่มต้น...', progress: 0 })
    try {
      const { createWorker } = await import('tesseract.js')
      // First run downloads the WASM engine + Thai/English language data from
      // a CDN (several MB) -- on a rescue vehicle's mobile connection this can
      // be slow or, with no signal at all, hang indefinitely. Without a
      // timeout and progress feedback, that reads as "the scanner is broken"
      // rather than "still downloading" or "no signal right now."
      const worker = await createWorker('tha+eng', undefined, {
        logger: (m: { status: string; progress: number }) => {
          setOcrProgress({ status: OCR_STATUS_LABEL[m.status] ?? m.status, progress: m.progress })
        },
      })
      const recognize = worker.recognize(imageSource).finally(() => void worker.terminate())
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('ocr-timeout')), 25000)
      })
      const {
        data: { text },
      } = await Promise.race([recognize, timeout])
      const fields = extractFields(text)
      setExtracted(fields)
      setEditName(fields.name)
      setEditIdNumber(fields.idNumber)
      setMode('review')
    } catch {
      setOcrError(true)
      setMode('review')
    } finally {
      setOcrProgress(null)
    }
  }

  function handleCapture() {
    if (cameraStatus !== 'ready' || !videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    void runOcr(canvas.toDataURL('image/jpeg', 0.9))
  }

  function handleFileFallback(files: FileList | null) {
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') void runOcr(reader.result)
    }
    reader.readAsDataURL(file)
  }

  function handleRetry() {
    setMode('camera')
    setCapturedImage(null)
    setOcrError(false)
    setExtracted(null)
  }

  function handleApply() {
    onApply({ name: editName.trim() || undefined, idNumber: editIdNumber.trim() || undefined })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/90 p-4">
      <div role="dialog" aria-modal="true" className="relative w-full max-w-sm animate-scale-in">
        <button
          onClick={onClose}
          aria-label="ปิด"
          className="absolute -top-11 right-0 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X className="size-5" />
        </button>

        <div className="mb-3 text-center text-white">
          <p className="mt-1 text-lg font-bold">สแกนบัตรประชาชน</p>
          <p className="mt-0.5 text-sm text-white/70">
            {mode === 'camera' && 'ถ่ายรูปบัตรให้เห็นข้อความชัดเจน'}
            {mode === 'processing' && 'กำลังอ่านข้อมูลจากบัตร...'}
            {mode === 'review' && 'ตรวจสอบและแก้ไขข้อมูลก่อนใช้'}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-navy">
          {mode === 'camera' && (
            <div className="relative aspect-[4/3] w-full">
              <video
                ref={videoRef}
                className={cameraStatus === 'ready' ? 'size-full object-cover' : 'hidden'}
                muted
                playsInline
                autoPlay
              />
              {(cameraStatus === 'idle' || cameraStatus === 'starting') && (
                <div className="flex size-full flex-col items-center justify-center gap-3 text-white/70">
                  <Camera className="size-10 animate-pulse" />
                  <p className="text-sm">กำลังเปิดกล้อง...</p>
                </div>
              )}
              {cameraStatus === 'unavailable' && (
                <div className="flex size-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-navy to-primary/80 p-6 text-center text-white/85">
                  <CameraOff className="size-10" />
                  <p className="text-sm font-medium">ไม่พบกล้องหรือไม่ได้รับอนุญาตให้ใช้กล้อง</p>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {mode === 'processing' && capturedImage && (
            <div className="relative aspect-[4/3] w-full">
              <img src={capturedImage} alt="" className="size-full object-cover opacity-40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-white">
                <ScanLine className="size-10 animate-pulse" />
                <p className="text-sm font-medium">{ocrProgress?.status ?? 'กำลังอ่านข้อมูลจากบัตร...'}</p>
                <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-primary-bright transition-[width] duration-300"
                    style={{ width: `${Math.round((ocrProgress?.progress ?? 0) * 100)}%` }}
                  />
                </div>
                <p className="text-center text-xs text-white/50">
                  ครั้งแรกอาจใช้เวลาสักครู่หากสัญญาณอินเทอร์เน็ตช้า
                </p>
              </div>
            </div>
          )}

          {mode === 'review' && (
            <div className="flex flex-col gap-3 bg-white p-4">
              {ocrError ? (
                <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-navy">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  อ่านข้อมูลจากบัตรไม่สำเร็จ กรุณากรอกข้อมูลด้วยตนเอง
                </div>
              ) : (
                <p className="flex items-start gap-2 rounded-xl border border-primary/20 bg-skyblue-pale p-3 text-xs text-navy">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  ข้อมูลที่อ่านได้อาจไม่ถูกต้อง 100% กรุณาตรวจสอบกับบัตรจริงก่อนใช้งาน
                </p>
              )}
              <Input label="ชื่อ-นามสกุล" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <Input
                label="เลขบัตรประชาชน"
                value={editIdNumber}
                onChange={(e) => setEditIdNumber(e.target.value)}
                maxLength={13}
              />
              {extracted?.rawText && (
                <details className="text-xs text-muted">
                  <summary className="cursor-pointer font-semibold">ข้อความทั้งหมดที่อ่านได้</summary>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-bg p-2">{extracted.rawText}</p>
                </details>
              )}
              <div className="flex gap-2">
                <Button size="sm" fullWidth icon={<Check className="size-4" />} onClick={handleApply}>
                  ใช้ข้อมูลนี้
                </Button>
                <Button size="sm" variant="outline" icon={<RotateCcw className="size-4" />} onClick={handleRetry}>
                  สแกนใหม่
                </Button>
              </div>
            </div>
          )}

          {mode === 'camera' && (
            <div className="flex flex-col gap-2 bg-navy p-3">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleCapture}
                disabled={cameraStatus !== 'ready'}
                icon={<Camera className="size-5" />}
              >
                ถ่ายรูปบัตร
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  handleFileFallback(e.target.files)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-1 text-xs font-semibold text-white/70 hover:text-white"
              >
                <Upload className="size-3.5" />
                หรืออัปโหลดรูปบัตรแทนการถ่าย
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
