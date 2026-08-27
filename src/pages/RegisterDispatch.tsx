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

interface FormState {
  fullName: string
  organization: string
  phone: string
  email: string
  password: string
}

export default function RegisterDispatch() {
  const navigate = useNavigate()

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
    if (!form.fullName.trim()) next.fullName = 'กรุณากรอกชื่อ-นามสกุลเจ้าหน้าที่'
    if (!form.organization.trim()) next.organization = 'กรุณากรอกหน่วยงาน/ศูนย์'
    if (!form.phone.trim()) next.phone = 'กรุณากรอกเบอร์ติดต่อ'
    if (!form.email.trim()) next.email = 'กรุณากรอกอีเมล'
    if (!form.password) next.password = 'กรุณากรอกรหัสผ่าน'
    else if (form.password.length < 6) next.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
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
      toast({ title: 'สมัครสมาชิกไม่สำเร็จ', message: err instanceof Error ? err.message : undefined, tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <AppShell variant="public" title="สมัครสมาชิกศูนย์สั่งการ">
        <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
          <SuccessState
            title="สมัครสมาชิกสำเร็จ"
            description="บัญชีของคุณรอการอนุมัติก่อนเข้าใช้งานได้ (บัญชีศูนย์สั่งการที่มีอยู่แล้ว หรือผู้ดูแลระบบ เป็นผู้อนุมัติ)"
            action={
              <Button variant="outline" onClick={() => navigate('/login')}>
                ไปหน้าเข้าสู่ระบบ
              </Button>
            }
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell variant="public" title="สมัครสมาชิกศูนย์สั่งการ">
      <div className="relative">
        <AnimatedBackground variant="auth" />
        <div className="relative z-10 mx-auto max-w-md px-4 py-10 sm:px-6">
          <Card className="animate-fade-in-up">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <Input
                label="ชื่อ-นามสกุลเจ้าหน้าที่"
                required
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                error={errors.fullName}
              />
              <Input
                label="หน่วยงาน/ศูนย์"
                required
                value={form.organization}
                onChange={(e) => update('organization', e.target.value)}
                error={errors.organization}
              />
              <Input
                label="เบอร์ติดต่อ"
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
              <Button type="submit" fullWidth loading={loading}>
                สมัครสมาชิก
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted">
              บัญชีศูนย์สั่งการต้องได้รับการอนุมัติก่อนเข้าใช้งานได้เช่นกัน
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
