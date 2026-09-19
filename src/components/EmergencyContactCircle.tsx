import { useState } from 'react'
import { PhoneCall, Siren } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ConfirmationModal } from './ConfirmationModal'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ติดต่อเจ้าหน้าที่เพื่อขอความช่วยเหลือฉุกเฉิน: 'Contact responders for emergency help',
  ติดต่อเจ้าหน้าที่: 'Contact responders',
  เพื่อขอความช่วยเหลือฉุกเฉิน: 'For emergency help',
  กดปุ่มนี้เพื่อเริ่มติดต่อเจ้าหน้าที่: 'Tap this button to start contacting responders',
  ยืนยันการติดต่อเจ้าหน้าที่: 'Confirm contacting responders',
  ยืนยัน: 'Confirm',
  ยกเลิก: 'Cancel',
})

export function EmergencyContactCircle() {
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const t = useT()

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
        aria-label={t('ติดต่อเจ้าหน้าที่เพื่อขอความช่วยเหลือฉุกเฉิน')}
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
        <span className="text-xl font-extrabold leading-tight md:text-2xl lg:text-3xl">{t('ติดต่อเจ้าหน้าที่')}</span>
        <span className="text-xs font-medium text-white/85 md:text-sm">{t('เพื่อขอความช่วยเหลือฉุกเฉิน')}</span>
      </button>
      <p className="text-sm font-medium text-muted">{t('กดปุ่มนี้เพื่อเริ่มติดต่อเจ้าหน้าที่')}</p>

      <ConfirmationModal
        open={confirmOpen}
        title={t('ยืนยันการติดต่อเจ้าหน้าที่')}
        confirmLabel={t('ยืนยัน')}
        cancelLabel={t('ยกเลิก')}
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
