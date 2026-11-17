import { useState } from 'react'
import { PhoneCall, Siren } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ConfirmationModal } from './ConfirmationModal'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ติดต่อเจ้าหน้าที่เพื่อขอความช่วยเหลือฉุกเฉิน: 'Contact responders for emergency help',
  ติดต่อเจ้าหน้าที่: 'Contact responders',
  เพื่อขอความช่วยเหลือฉุกเฉิน: 'For emergency help',
  แตะปุ่มนี้เพื่อติดต่อเจ้าหน้าที่: 'Tap this button to start contacting responders',
  ยืนยันการติดต่อเจ้าหน้าที่: 'Confirm contacting responders',
  ยืนยัน: 'Confirm',
  ยกเลิก: 'Cancel',
})

/** The citizen's one emergency control -- the only round, red, shadowed
 * element on the public pages, so it can't be mistaken for anything else. */
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
          relative flex size-[216px] shrink-0 flex-col items-center justify-center gap-2 rounded-full
          bg-emergency text-white shadow-red-glow ring-[10px] ring-emergency/[0.08]
          transition-[background-color,box-shadow] duration-200
          hover:bg-emergency-dark hover:shadow-red-glow-lg
          active:bg-emergency-dark
          focus-visible:outline-none focus-visible:ring-emergency/40
          md:size-[256px] lg:size-[288px]
        "
      >
        <PhoneCall className="size-11 md:size-12" strokeWidth={2} />
        <span className="text-xl font-bold leading-snug md:text-2xl">{t('ติดต่อเจ้าหน้าที่')}</span>
        <span className="text-xs font-medium text-white/85 md:text-sm">{t('เพื่อขอความช่วยเหลือฉุกเฉิน')}</span>
      </button>
      <p className="text-sm text-muted">{t('แตะปุ่มนี้เพื่อติดต่อเจ้าหน้าที่')}</p>

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
          <span className="flex size-9 items-center justify-center rounded-full bg-emergency/10 text-emergency">
            <Siren className="size-[18px]" />
          </span>
        }
      />
    </div>
  )
}
