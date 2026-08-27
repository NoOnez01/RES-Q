import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { SuccessState } from '@/components/States'
import { registerAccount } from '@/lib/auth'
import { MOCK_RESCUE_TEAMS } from '@/lib/mockData'
import { toast } from '@/lib/toast'

interface FormState {
  name: string
  phone: string
  rescueTeamId: string
  email: string
  password: string
}

export default function RegisterRescue() {
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    rescueTeamId: '',
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
    if (!form.name.trim()) next.name = 'กรุณากรอกชื่อ-นามสกุล'
    if (!form.phone.trim()) next.phone = 'กรุณากรอกเบอร์ติดต่อ'
    if (!form.rescueTeamId) next.rescueTeamId = 'กรุณาเลือกหน่วยกู้ชีพ'
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
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: 'rescue',
        rescueTeamId: form.rescueTeamId,
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
      <AppShell variant="public" title="สมัครสมาชิกหน่วยกู้ชีพ">
        <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
          <SuccessState
            title="สมัครสมาชิกสำเร็จ"
            description="บัญชีของคุณรอการอนุมัติจากศูนย์สั่งการ 1669 ก่อนเข้าใช้งานได้"
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
    <AppShell variant="public" title="สมัครสมาชิกหน่วยกู้ชีพ">
      <div className="relative">
        <AnimatedBackground variant="auth" />
        <div className="relative z-10 mx-auto max-w-md px-4 py-10 sm:px-6">
          <Card className="animate-fade-in-up">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <Input
                label="ชื่อ-นามสกุล"
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                error={errors.name}
              />
              <Input
                label="เบอร์ติดต่อ"
                required
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                error={errors.phone}
              />
              <Select
                label="หน่วยกู้ชีพ"
                required
                value={form.rescueTeamId}
                onChange={(e) => update('rescueTeamId', e.target.value)}
                error={errors.rescueTeamId}
              >
                <option value="">เลือกหน่วยกู้ชีพ</option>
                {MOCK_RESCUE_TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.unitCode} — {t.name}
                  </option>
                ))}
              </Select>
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
              บัญชีต้องได้รับการอนุมัติจากศูนย์สั่งการ 1669 ก่อนเข้าใช้งานได้
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
