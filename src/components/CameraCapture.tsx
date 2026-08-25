import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { Button } from './ui/Button'

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
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

  function handleCapture() {
    if (status !== 'ready' || !videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    onCapture(canvas.toDataURL('image/jpeg', 0.85))
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

      <div className="flex justify-center bg-navy p-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleCapture}
          disabled={status !== 'ready'}
          icon={<Camera className="size-5" />}
        >
          ถ่ายรูป
        </Button>
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
