import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/States'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ไม่พบหน้านี้: 'Page not found',
  'ลิงก์นี้อาจไม่ถูกต้อง หรือหน้าที่คุณกำลังมองหาอาจถูกย้ายไปแล้ว': 'This link may be incorrect, or the page you are looking for may have moved',
})

export default function NotFound() {
  const t = useT()
  return (
    <AppShell variant="public" title={t('ไม่พบหน้านี้')}>
      <div className="relative">
        <AnimatedBackground variant="auth" />
        <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
          <EmptyState
            icon={<Compass className="size-6" />}
            title={t('ไม่พบหน้านี้')}
            description={t('ลิงก์นี้อาจไม่ถูกต้อง หรือหน้าที่คุณกำลังมองหาอาจถูกย้ายไปแล้ว')}
            action={
              <Link to="/">
                <Button variant="outline" size="sm">
                  {t('กลับหน้าหลัก')}
                </Button>
              </Link>
            }
          />
        </div>
      </div>
    </AppShell>
  )
}
