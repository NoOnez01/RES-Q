import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT, registerTranslations } from '@/lib/i18n'
import { RadioCard } from '@/components/ui/RadioCard'
import { Button } from '@/components/ui/Button'

registerTranslations({
  ยินดีต้อนรับสู่: 'Welcome to',
  'เลือกภาษาที่ใช้งาน เปลี่ยนได้ทุกเมื่อภายหลังในหน้าตั้งค่า': 'Pick your language — you can change it anytime later in Settings.',
  ภาษา: 'Language',
  เริ่มใช้งาน: 'Get started',
})

/**
 * Shown once, on a visitor's very first time in the web app (gated by the
 * persisted `onboardingSeen` flag -- see store.ts) -- lets them pick a
 * language before they land anywhere else. Applies live via the store as
 * soon as it's tapped (useT reacts to the same state), so this doubles as a
 * live preview, not just a form. Dismissing without an explicit choice
 * keeps the sensible default (Thai) -- this is a convenience prompt, not a
 * gate. Appearance/theme is intentionally not asked here -- the app always
 * starts in light mode and dark mode is opt-in from Settings only.
 */
export function FirstVisitSetup() {
  const onboardingSeen = useStore((s) => s.onboardingSeen)
  const setOnboardingSeen = useStore((s) => s.setOnboardingSeen)
  const language = useStore((s) => s.language)
  const setLanguage = useStore((s) => s.setLanguage)
  const t = useT()

  const open = !onboardingSeen

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  function finish() {
    setOnboardingSeen(true)
  }

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-navy/50 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-visit-title"
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-card-lg animate-scale-in sm:max-w-md sm:rounded-3xl"
      >
        <div className="mb-1 flex items-center gap-2 text-primary">
          <Sparkles className="size-5" />
          <p className="text-xs font-bold uppercase tracking-wide">{t('ยินดีต้อนรับสู่')} ResQ</p>
        </div>
        <h2 id="first-visit-title" className="text-lg font-bold text-ink">
          {t('เลือกภาษาที่ใช้งาน เปลี่ยนได้ทุกเมื่อภายหลังในหน้าตั้งค่า')}
        </h2>

        <div className="mt-5 space-y-2">
          <p className="text-sm font-semibold text-ink">{t('ภาษา')}</p>
          <RadioCard selected={language === 'th'} onClick={() => setLanguage('th')} title="ไทย" description="Thai" />
          <RadioCard selected={language === 'en'} onClick={() => setLanguage('en')} title="English" description="อังกฤษ" />
        </div>

        <Button variant="primary" fullWidth className="mt-6" onClick={finish}>
          {t('เริ่มใช้งาน')}
        </Button>
      </div>
    </div>,
    document.body,
  )
}
