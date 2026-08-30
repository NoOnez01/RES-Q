import { useState } from 'react'
import { PhoneCall, Siren } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ConfirmationModal } from './ConfirmationModal'

export function EmergencyContactCircle() {
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleConfirm() {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setConfirmOpen(false)
      navigate('/public/emergency-photo')
    }, 450)
  }

  return (
    <div className="relative flex flex-col items-center gap-4">
      <button
        id="hero-emergency-btn"
        onClick={() => setConfirmOpen(true)}
        aria-label="ติดต่อเจ้าหน้าที่เพื่อขอความช่วยเหลือฉุกเฉิน"
        className="
          group relative flex size-[220px] shrink-0 flex-col items-center justify-center gap-2
          rounded-full bg-emergency text-white
          shadow-red-glow animate-pulse-glow
          transition-transform duration-200 ease-out
          hover:scale-[1.04] hover:shadow-red-glow-lg
          active:scale-[0.97]
          focus-visible:outline-none focus-visible:ring-[6px] focus-visible:ring-emergency/40
          md:size-[300px]
          lg:size-[360px]
        "
      >
        <span className="absolute inset-0 rounded-full bg-white/0 transition-colors duration-200 group-hover:bg-white/5" />
        <PhoneCall className="size-12 md:size-14 lg:size-16" strokeWidth={2.2} />
        <span className="text-xl font-extrabold leading-tight md:text-2xl lg:text-3xl">ติดต่อเจ้าหน้าที่</span>
        <span className="text-xs font-medium text-white/85 md:text-sm">เพื่อขอความช่วยเหลือฉุกเฉิน</span>
      </button>
      <p className="text-sm font-medium text-muted">กดปุ่มนี้เพื่อเริ่มติดต่อเจ้าหน้าที่</p>

      <ConfirmationModal
        open={confirmOpen}
        title="ยืนยันการติดต่อเจ้าหน้าที่"
        confirmLabel="ยืนยัน"
        cancelLabel="ยกเลิก"
        tone="danger"
        confirmLoading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        icon={
          <span className="flex size-11 items-center justify-center rounded-full bg-emergency/10 text-emergency">
            <Siren className="size-5" />
          </span>
        }
      />
    </div>
  )
}
