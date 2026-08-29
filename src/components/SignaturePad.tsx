import { useEffect, useRef, useState } from 'react'
import { Eraser, PenLine } from 'lucide-react'
import { Button } from './ui/Button'

/**
 * A canvas-drawn signature -- for documenting a relative's informed refusal
 * of hospital transport (see HospitalSelectionPage). Controlled the same
 * way AudioRecorder/SpeechToTextPanel are: this component owns the capture
 * mechanics, the parent just gets the result via onChange (a PNG data URL,
 * or null once cleared/empty).
 */
export function SignaturePad({
  label = 'ลงชื่อรับทราบ',
  onChange,
}: {
  label?: string
  onChange: (dataUrl: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const hasStrokeRef = useRef(false)
  const [hasStroke, setHasStroke] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Backing store at device pixel ratio so strokes stay crisp, while CSS
    // size stays fixed -- otherwise a signature drawn on a high-DPI screen
    // looks blurry once exported.
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#12304A'
  }, [])

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = pointFromEvent(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    drawingRef.current = true
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { x, y } = pointFromEvent(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!hasStrokeRef.current) {
      hasStrokeRef.current = true
      setHasStroke(true)
    }
  }

  function handlePointerUp() {
    if (!drawingRef.current) return
    drawingRef.current = false
    if (hasStrokeRef.current) onChange(canvasRef.current?.toDataURL('image/png') ?? null)
  }

  function handleClear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasStrokeRef.current = false
    setHasStroke(false)
    onChange(null)
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
          <PenLine className="size-4 text-primary" />
          {label}
        </p>
        {hasStroke && (
          <Button variant="ghost" size="sm" icon={<Eraser className="size-3.5" />} onClick={handleClear}>
            ล้าง
          </Button>
        )}
      </div>
      <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-skyblue-pale/40">
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          aria-label={label}
        />
        {!hasStroke && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted">
            เซ็นชื่อด้วยนิ้วหรือเมาส์ในกรอบนี้
          </p>
        )}
      </div>
    </div>
  )
}
