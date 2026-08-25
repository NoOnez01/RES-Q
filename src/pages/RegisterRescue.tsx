import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { SuccessState } from '@/components/States'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'

interface FormState {
  unitName: string
  unitCode: string
  phone: string
  memberCount: string
  email: string
  password: string
}

export default function RegisterRescue() {
  const navigate = useNavigate()
  const setUser = useStore((s) => s.setUser)

  const [form, setForm] = useState<FormState>({
    unitName: '',
    unitCode: '',
    phone: '',
    memberCount: '',
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
    if (!form.unitName.trim()) next.unitName = 'กรุณากรอกชื่อหน่วยกู้ภัย'
    if (!form.unitCode.trim()) next.unitCode = 'กรุณากรอกรหัสหน่วย'
    if (!form.phone.trim()) next.phone = 'กรุณากรอกเบอร์ติดต่อ'
    if (!form.memberCount.trim()) next.memberCount = 'กรุณากรอกจำนวนเจ้าหน้าที่'
    else if (Number.isNaN(Number(form.memberCount)) || Number(form.memberCount) <= 0)
      next.memberCount = 'กรุณากรอกจำนวนเป็นตัวเลขที่มากกว่า 0'
    if (!form.email.trim()) next.email = 'กรุณากรอกอีเมล'
    if (!form.password) next.password = 'กรุณากรอกรหัสผ่าน'
    else if (form.password.length < 4) next.password = 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || loading) return
    setLoading(true)
    setTimeout(() => {
      setUser({
        id: crypto.randomUUID(),
        name: form.unitName,
        role: 'rescue',
        phone: form.phone,
        org: form.unitName,
      })
      toast({ title: 'สมัครสมาชิกสำเร็จ', message: `ยินดีต้อนรับ ${form.unitName}`, tone: 'success' })
      setLoading(false)
      setSubmitted(true)
      setTimeout(() => {
        navigate('/rescue/dashboard')
      }, 800)
    }, 700)
  }

  if (submitted) {
    return (
      <AppShell variant="public" title="สมัครสมาชิกหน่วยกู้ภัย">
        <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
          <SuccessState title="สมัครสมาชิกสำเร็จ" description={`ยินดีต้อนรับ ${form.unitName}`} />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell variant="public" title="สมัครสมาชิกหน่วยกู้ภัย">
      <div className="relative">
        <AnimatedBackground variant="auth" />
        <div className="relative z-10 mx-auto max-w-md px-4 py-10 sm:px-6">
          <Card className="animate-fade-in-up">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <Input
                label="ชื่อหน่วยกู้ภัย"
                required
                value={form.unitName}
                onChange={(e) => update('unitName', e.target.value)}
                error={errors.unitName}
              />
              <Input
                label="รหัสหน่วย"
                required
                value={form.unitCode}
                onChange={(e) => update('unitCode', e.target.value)}
                error={errors.unitCode}
              />
              <Input
                label="เบอร์ติดต่อ"
                required
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                error={errors.phone}
              />
              <Input
                label="จำนวนเจ้าหน้าที่"
                type="number"
                required
                value={form.memberCount}
                onChange={(e) => update('memberCount', e.target.value)}
                error={errors.memberCount}
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
                hint="อย่างน้อย 4 ตัวอักษร"
              />
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
