import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card, Checkbox } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { SuccessState } from '@/components/States'
import { useStore } from '@/lib/store'
import { registerAccount, signIn } from '@/lib/auth'
import { toast } from '@/lib/toast'

interface FormState {
  fullName: string
  phone: string
  email: string
  password: string
  confirmPassword: string
}

export default function RegisterPublic() {
  const navigate = useNavigate()
  const setUser = useStore((s) => s.setUser)

  const [form, setForm] = useState<FormState>({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'agree', string>>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function validate() {
    const next: typeof errors = {}
    if (!form.fullName.trim()) next.fullName = 'กรุณากรอกชื่อ-นามสกุล'
    if (!form.phone.trim()) next.phone = 'กรุณากรอกเบอร์โทรศัพท์'
    if (!form.email.trim()) next.email = 'กรุณากรอกอีเมล'
    if (!form.password) next.password = 'กรุณากรอกรหัสผ่าน'
    else if (form.password.length < 6) next.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
    if (!form.confirmPassword) next.confirmPassword = 'กรุณายืนยันรหัสผ่าน'
    else if (form.confirmPassword !== form.password) next.confirmPassword = 'รหัสผ่านไม่ตรงกัน'
    if (!agree) next.agree = 'กรุณายอมรับเงื่อนไขการใช้งาน'
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
        role: 'public',
      })
      // Public accounts are auto-approved -- log them straight in rather
      // than making them do it a second time right after registering.
      try {
        const user = await signIn(form.email.trim(), form.password)
        if (user) setUser(user)
      } catch {
        // Project has email confirmation on -- registration still
        // succeeded, they'll just need to log in normally afterward.
      }
      toast({ title: 'สมัครสมาชิกสำเร็จ', message: `ยินดีต้อนรับ ${form.fullName}`, tone: 'success' })
      setSubmitted(true)
      setTimeout(() => navigate('/'), 800)
    } catch (err) {
      toast({ title: 'สมัครสมาชิกไม่สำเร็จ', message: err instanceof Error ? err.message : undefined, tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <AppShell variant="public" title="สมัครสมาชิกประชาชน">
        <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
          <SuccessState title="สมัครสมาชิกสำเร็จ" description={`ยินดีต้อนรับ ${form.fullName}`} />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell variant="public" title="สมัครสมาชิกประชาชน">
      <div className="relative">
        <AnimatedBackground variant="auth" />
        <div className="relative z-10 mx-auto max-w-md px-4 py-10 sm:px-6">
          <Card className="animate-fade-in-up">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <Input
                label="ชื่อ-นามสกุล"
                required
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                error={errors.fullName}
              />
              <Input
                label="เบอร์โทรศัพท์"
                required
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                error={errors.phone}
              />
              <Input
                label="อีเมล"
                type="email"
                required
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                error={errors.email}
              />
              <Input
                label="รหัสผ่าน"
                type="password"
                required
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                error={errors.password}
                hint="อย่างน้อย 6 ตัวอักษร"
              />
              <Input
                label="ยืนยันรหัสผ่าน"
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                error={errors.confirmPassword}
              />
              <Checkbox checked={agree} onChange={setAgree} label="ยอมรับเงื่อนไขการใช้งาน" />
              {errors.agree && (
                <p className="animate-fade-in text-xs font-medium text-emergency">{errors.agree}</p>
              )}
              <Button type="submit" fullWidth loading={loading}>
                สมัครสมาชิก
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
