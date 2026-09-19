import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Sun, Moon, MonitorSmartphone, Sparkles } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT, registerTranslations } from '@/lib/i18n'
import { RadioCard } from '@/components/ui/RadioCard'
import { Button } from '@/components/ui/Button'

registerTranslations({
  ยินดีต้อนรับสู่: 'Welcome to',
  'ตั้งค่าหน้าตาและภาษาที่ใช้งาน เปลี่ยนได้ทุกเมื่อภายหลังในหน้าตั้งค่า': 'Set your look and language — you can change either anytime later in Settings.',
  โหมดการแสดงผล: 'Appearance',
  สว่าง: 'Light',
  มืด: 'Dark',
  ตามอุปกรณ์: 'System',
  ใช้โทนสว่างตลอดเวลา: 'Always use the light palette',
  ใช้โทนมืดตลอดเวลา: 'Always use the dark palette',
  ตามการตั้งค่าของอุปกรณ์คุณ: 'Follows your device setting',
  ภาษา: 'Language',
  เริ่มใช้งาน: 'Get started',
})

/**
 * Shown once, on a visitor's very first time in the web app (gated by the
 * persisted `onboardingSeen` flag -- see store.ts) -- lets them pick a
 * theme and language before they land anywhere else. Both selections apply
 * live via the store as soon as they're tapped (ThemeBridge/useT both react
 * to the same state), so this doubles as a live preview, not just a form.
 * Dismissing without an explicit choice keeps the sensible defaults
 * (system theme, Thai) -- this is a convenience prompt, not a gate.
 */
export function FirstVisitSetup() {
  const onboardingSeen = useStore((s) => s.onboardingSeen)
  const setOnboardingSeen = useStore((s) => s.setOnboardingSeen)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
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
          {t('ตั้งค่าหน้าตาและภาษาที่ใช้งาน เปลี่ยนได้ทุกเมื่อภายหลังในหน้าตั้งค่า')}
        </h2>

        <div className="mt-5 space-y-2">
          <p className="text-sm font-semibold text-ink">{t('โหมดการแสดงผล')}</p>
          <RadioCard
            selected={theme === 'light'}
            onClick={() => setTheme('light')}
            icon={<Sun className="size-5 text-primary" />}
            title={t('สว่าง')}
            description={t('ใช้โทนสว่างตลอดเวลา')}
          />
          <RadioCard
            selected={theme === 'dark'}
            onClick={() => setTheme('dark')}
            icon={<Moon className="size-5 text-primary" />}
            title={t('มืด')}
            description={t('ใช้โทนมืดตลอดเวลา')}
          />
          <RadioCard
            selected={theme === 'system'}
            onClick={() => setTheme('system')}
            icon={<MonitorSmartphone className="size-5 text-primary" />}
            title={t('ตามอุปกรณ์')}
            description={t('ตามการตั้งค่าของอุปกรณ์คุณ')}
          />
        </div>

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
