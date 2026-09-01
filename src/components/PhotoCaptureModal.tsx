import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, CameraOff, SwitchCamera, X } from 'lucide-react'
import { Button } from './ui/Button'
import type { PhotoCategory } from '@/lib/types'

export interface PhotoSlotConfig {
  key: PhotoCategory
  label: string
  hint: string
}

interface PhotoCaptureModalProps {
  open: boolean
  slot: PhotoSlotConfig | null
  stepIndex: number
  totalSteps: number
  onCapture: (dataUrl: string, key: PhotoCategory) => void
  onClose: () => void
}

/**
 * Camera only opens while this modal is actually up, one category at a time
 * -- the caller advances `slot` to the next unfilled category after each
 * capture (or closes once all are done), so the stream doesn't sit open the
 * whole time the reporter is on the photo step.
 */
export function PhotoCaptureModal({ open, slot, stepIndex, totalSteps, onCapture, onClose }: PhotoCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<'idle' | 'starting' | 'ready' | 'unavailable'>('idle')
  const [flash, setFlash] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable')
        return
      }
      setStatus('starting')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('unavailable')
      }
    }

    void start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setStatus('idle')
    }
  }, [open, slot?.key, facingMode])

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

  if (!open || !slot) return null

  function handleCapture() {
    if (status !== 'ready' || !videoRef.current || !canvasRef.current || !slot) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 150)
    onCapture(canvas.toDataURL('image/jpeg', 0.85), slot.key)
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
          <p className="text-xs font-bold text-white/60">
            รูปที่ {stepIndex} จาก {totalSteps}
          </p>
          <p className="mt-1 text-lg font-bold">{slot.label}</p>
          <p className="mt-0.5 text-sm text-white/70">{slot.hint}</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-navy">
          <div className="relative aspect-[4/3] w-full">
            <video
              ref={videoRef}
              className={status === 'ready' ? 'size-full object-cover' : 'hidden'}
              muted
              playsInline
              autoPlay
            />

            {(status === 'idle' || status === 'starting') && (
              <div className="flex size-full flex-col items-center justify-center gap-3 text-white/70">
                <Camera className="size-10 animate-pulse" />
                <p className="text-sm">กำลังเปิดกล้อง...</p>
              </div>
            )}

            {status === 'unavailable' && (
              <div className="flex size-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-navy to-primary/80 text-white/85 p-6 text-center">
                <CameraOff className="size-10" />
                <p className="text-sm font-medium">ไม่พบกล้องหรือไม่ได้รับอนุญาตให้ใช้กล้อง</p>
              </div>
            )}

            {status === 'ready' && (
              <button
                type="button"
                onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
                aria-label="สลับกล้องหน้า/หลัง"
                className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-navy/60 text-white backdrop-blur-sm transition-colors hover:bg-navy/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              >
                <SwitchCamera className="size-5" />
              </button>
            )}

            <div
              className="pointer-events-none absolute inset-0 bg-white transition-opacity duration-150"
              style={{ opacity: flash ? 0.85 : 0 }}
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex justify-center bg-navy p-3">
            {status === 'unavailable' ? (
              <Button variant="secondary" size="lg" fullWidth onClick={onClose}>
                ปิดแล้วอัปโหลดรูปจากอุปกรณ์แทน
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleCapture}
                disabled={status !== 'ready'}
                icon={<Camera className="size-5" />}
              >
                ถ่ายรูป
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
