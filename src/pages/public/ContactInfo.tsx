import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { RelativeContacts } from '@/components/RelativeContacts'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { useStore } from '@/lib/store'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ข้อมูลติดต่อกลับ: 'Callback details',
  'ศูนย์ 1669 และหน่วยกู้ชีพจะใช้เบอร์นี้ติดต่อคุณ หากต้องการข้อมูลเพิ่มเติม':
    'Center 1669 and the rescue team will use this number to reach you if they need more information',
  เบอร์โทรศัพท์สำหรับติดต่อกลับ: 'Callback phone number',
  'กรุณาระบุเบอร์โทรศัพท์สำหรับติดต่อกลับ': 'Please provide a callback phone number',
  เบอร์โทรศัพท์ไม่ถูกต้อง: 'Invalid phone number',
  'ดึงจากโปรไฟล์ของคุณ ({name}) แก้ไขได้หากต้องการเปลี่ยน': 'Pulled from your profile ({name}) — editable if you want to change it',
  ไปหน้าติดตามเคส: 'Go to case tracking',
  ไม่พบข้อมูลเคส: 'Case not found',
})

/**
 * Between the 1669 call ending and the case timeline: the reporter's
 * callback number and the patient's family contacts. Asked here rather than
 * before the call so nothing stands between a citizen and reaching 1669 --
 * the report itself is already submitted by the time this page shows.
 */
export default function ContactInfo() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const c = useStore((s) => (id ? s.cases[id] : undefined))
  const currentUser = useStore((s) => s.currentUser)
  const setReporterPhone = useStore((s) => s.setReporterPhone)
  const loggedIn = !!currentUser && !currentUser.isAnonymous
  const t = useT()

  const [phone, setPhone] = useState(() => c?.reporterPhone ?? (loggedIn ? (currentUser?.phone ?? '') : ''))
  const [phoneError, setPhoneError] = useState<string>()

  if (!id || !c) {
    return (
      <AppShell variant="flow" title={t('ข้อมูลติดต่อกลับ')} showBack={false}>
        <div className="py-16 text-center text-sm text-muted">{t('ไม่พบข้อมูลเคส')}</div>
      </AppShell>
    )
  }

  function proceed() {
    const digits = phone.replace(/\D/g, '')
    if (!phone.trim()) {
      setPhoneError(t('กรุณาระบุเบอร์โทรศัพท์สำหรับติดต่อกลับ'))
      return
    }
    if (digits.length < 9 || digits.length > 10) {
      setPhoneError(t('เบอร์โทรศัพท์ไม่ถูกต้อง'))
      return
    }
    setReporterPhone(id!, phone.trim())
    navigate(`/public/case/${id}`)
  }

  return (
    // No back arrow: the call is over and the report already submitted --
    // there's nothing to go back and change.
    <AppShell variant="flow" title={t('ข้อมูลติดต่อกลับ')} showBack={false}>
      <div className="relative">
        <AnimatedBackground variant="emergency" />

        <div className="relative z-10 flex flex-col gap-5 pb-28">
          <div>
            <h1 className="text-xl font-bold text-ink">{t('ข้อมูลติดต่อกลับ')}</h1>
            <p className="mt-1.5 text-sm text-muted">
              {t('ศูนย์ 1669 และหน่วยกู้ชีพจะใช้เบอร์นี้ติดต่อคุณ หากต้องการข้อมูลเพิ่มเติม')}
            </p>
          </div>

          <Card>
            <Input
              label={t('เบอร์โทรศัพท์สำหรับติดต่อกลับ')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phone}
              error={phoneError}
              hint={
                loggedIn && !phoneError
                  ? t('ดึงจากโปรไฟล์ของคุณ ({name}) แก้ไขได้หากต้องการเปลี่ยน', { name: currentUser?.name ?? '' })
                  : undefined
              }
              onChange={(e) => {
                setPhone(e.target.value)
                if (phoneError) setPhoneError(undefined)
              }}
            />
          </Card>

          <RelativeContacts caseId={id} contacts={c.relativeContacts} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mt-2 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <Button variant="primary" size="lg" fullWidth onClick={proceed}>
            {t('ไปหน้าติดตามเคส')}
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
