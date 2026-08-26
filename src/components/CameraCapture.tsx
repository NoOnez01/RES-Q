import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Check, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { Button } from './ui/Button'
import type { EmergencyPhoto, PhotoCategory } from '@/lib/types'

export interface PhotoSlotConfig {
  key: PhotoCategory
  label: string
  hint: string
}

interface CameraCaptureProps {
  slots: (PhotoSlotConfig & { photo: EmergencyPhoto | null })[]
  onCapture: (dataUrl: string, key: PhotoCategory) => void
}

/**
 * One shared camera preview with a guided checklist of shots underneath --
 * each slot is its own shutter button until filled, then becomes a thumbnail
 * with a retake action. Replaces the old single generic "ถ่ายรูป" button so
 * reporters capture exactly the 3 angles that actually help triage (the
 * scene/patient, the surroundings, a landmark), instead of an arbitrary pile
 * of photos.
 */
export function CameraCapture({ slots, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<'idle' | 'starting' | 'ready' | 'unavailable'>('idle')

  useEffect(() => {
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable')
        return
      }
      setStatus('starting')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
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

    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function handleCapture(key: PhotoCategory) {
    if (status !== 'ready' || !videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    onCapture(canvas.toDataURL('image/jpeg', 0.85), key)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-navy">
      <div className="relative aspect-[4/3] w-full">
        <video
          ref={videoRef}
          className={clsx('size-full object-cover', status !== 'ready' && 'hidden')}
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
            <p className="text-xs text-white/60">คุณยังสามารถอัปโหลดรูปภาพจากอุปกรณ์ได้ด้านล่าง</p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex flex-col gap-2 bg-navy p-3">
        {slots.map((slot, i) => (
          <div
            key={slot.key}
            className={clsx(
              'flex items-center gap-3 rounded-xl border p-2.5 transition-colors',
              slot.photo ? 'border-success/30 bg-success/10' : 'border-white/15 bg-white/5',
            )}
          >
            {slot.photo ? (
              <img src={slot.photo.dataUrl} alt={slot.label} className="size-11 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white/70">
                {i + 1}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                {slot.label}
                {slot.photo && <Check className="size-3.5 text-success" />}
              </p>
              <p className="truncate text-xs text-white/60">{slot.hint}</p>
            </div>
            <Button
              variant={slot.photo ? 'outline' : 'primary'}
              size="sm"
              onClick={() => handleCapture(slot.key)}
              disabled={status !== 'ready'}
              icon={slot.photo ? <RotateCcw className="size-4" /> : <Camera className="size-4" />}
            >
              {slot.photo ? 'ถ่ายใหม่' : 'กดเพื่อถ่าย'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RetakeHint() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted">
      <RotateCcw className="size-3.5" /> สามารถถ่ายใหม่ได้หากภาพไม่ชัดเจน
    </p>
  )
}
