import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { SuccessState } from '@/components/States'
import { registerAccount } from '@/lib/auth'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'กรุณากรอกชื่อ-นามสกุลเจ้าหน้าที่': "Please enter the staff member's full name",
  'กรุณากรอกหน่วยงาน/ศูนย์': 'Please enter the organization/center',
  กรุณากรอกเบอร์ติดต่อ: 'Please enter a contact number',
  กรุณากรอกอีเมล: 'Please enter your email',
  กรุณากรอกรหัสผ่าน: 'Please enter your password',
  'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร': 'Password must be at least 6 characters',
  สมัครสมาชิกไม่สำเร็จ: 'Sign-up failed',
  สมัครสมาชิกศูนย์สั่งการ: 'Dispatch center sign-up',
  สมัครสมาชิกสำเร็จ: 'Sign-up successful',
  'บัญชีของคุณรอการอนุมัติก่อนเข้าใช้งานได้ (บัญชีศูนย์สั่งการที่มีอยู่แล้ว หรือผู้ดูแลระบบ เป็นผู้อนุมัติ)':
    'Your account is pending approval before you can log in (approved by an existing dispatch account or an admin)',
  ไปหน้าเข้าสู่ระบบ: 'Go to login',
  'ชื่อ-นามสกุลเจ้าหน้าที่': "Staff member's full name",
  'หน่วยงาน/ศูนย์': 'Organization/center',
  เบอร์ติดต่อ: 'Contact number',
  อีเมล: 'Email',
  รหัสผ่าน: 'Password',
  'อย่างน้อย 6 ตัวอักษร': 'At least 6 characters',
  สมัครสมาชิก: 'Sign up',
  บัญชีศูนย์สั่งการต้องได้รับการอนุมัติก่อนเข้าใช้งานได้เช่นกัน: 'Dispatch accounts must also be approved before they can log in',
})

interface FormState {
  fullName: string
  organization: string
  phone: string
  email: string
  password: string
}

export default function RegisterDispatch() {
  const navigate = useNavigate()
  const t = useT()

  const [form, setForm] = useState<FormState>({
    fullName: '',
    organization: '',
    phone: '',
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function validate() {
    const next: typeof errors = {}
    if (!form.fullName.trim()) next.fullName = t('กรุณากรอกชื่อ-นามสกุลเจ้าหน้าที่')
    if (!form.organization.trim()) next.organization = t('กรุณากรอกหน่วยงาน/ศูนย์')
    if (!form.phone.trim()) next.phone = t('กรุณากรอกเบอร์ติดต่อ')
    if (!form.email.trim()) next.email = t('กรุณากรอกอีเมล')
    if (!form.password) next.password = t('กรุณากรอกรหัสผ่าน')
    else if (form.password.length < 6) next.password = t('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || loading) return
    setLoading(true)
    try {
      await registerAccount({
        email: form.email.trim(),
        password: form.password,
        name: form.fullName.trim(),
        phone: form.phone.trim(),
        role: 'dispatch',
      })
      setSubmitted(true)
    } catch (err) {
      toast({ title: t('สมัครสมาชิกไม่สำเร็จ'), message: err instanceof Error ? err.message : undefined, tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <AppShell variant="public" title={t('สมัครสมาชิกศูนย์สั่งการ')}>
        <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
          <SuccessState
            title={t('สมัครสมาชิกสำเร็จ')}
            description={t('บัญชีของคุณรอการอนุมัติก่อนเข้าใช้งานได้ (บัญชีศูนย์สั่งการที่มีอยู่แล้ว หรือผู้ดูแลระบบ เป็นผู้อนุมัติ)')}
            action={
              <Button variant="outline" onClick={() => navigate('/login')}>
                {t('ไปหน้าเข้าสู่ระบบ')}
              </Button>
            }
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell variant="public" title={t('สมัครสมาชิกศูนย์สั่งการ')}>
      <div className="relative">
        <AnimatedBackground variant="auth" />
        <div className="relative z-10 mx-auto max-w-md px-4 py-10 sm:px-6">
          <Card className="animate-fade-in-up">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <Input
                label={t('ชื่อ-นามสกุลเจ้าหน้าที่')}
                required
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                error={errors.fullName}
              />
              <Input
                label={t('หน่วยงาน/ศูนย์')}
                required
                value={form.organization}
                onChange={(e) => update('organization', e.target.value)}
                error={errors.organization}
              />
              <Input
                label={t('เบอร์ติดต่อ')}
                required
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                error={errors.phone}
              />
              <Input
                label={t('อีเมล')}
                type="email"
                required
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                error={errors.email}
              />
              <Input
                label={t('รหัสผ่าน')}
                type="password"
                required
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                error={errors.password}
                hint={t('อย่างน้อย 6 ตัวอักษร')}
              />
              <Button type="submit" fullWidth loading={loading}>
                {t('สมัครสมาชิก')}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted">
              {t('บัญชีศูนย์สั่งการต้องได้รับการอนุมัติก่อนเข้าใช้งานได้เช่นกัน')}
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
