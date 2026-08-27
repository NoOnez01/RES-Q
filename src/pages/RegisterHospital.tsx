import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { SuccessState } from '@/components/States'
import { useStore } from '@/lib/store'
import { registerAccount } from '@/lib/auth'
import { createHospital } from '@/lib/orgs'
import { toast } from '@/lib/toast'

const NEW_HOSPITAL_VALUE = '__new__'

interface FormState {
  name: string
  phone: string
  hospitalId: string
  newHospitalName: string
  newHospitalPhone: string
  newHospitalAddress: string
  email: string
  password: string
}

export default function RegisterHospital() {
  const navigate = useNavigate()
  const hospitals = useStore((s) => s.hospitals)

  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    hospitalId: '',
    newHospitalName: '',
    newHospitalPhone: '',
    newHospitalAddress: '',
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const creatingNew = form.hospitalId === NEW_HOSPITAL_VALUE

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function validate() {
    const next: typeof errors = {}
    if (!form.name.trim()) next.name = 'กรุณากรอกชื่อ-นามสกุล'
    if (!form.phone.trim()) next.phone = 'กรุณากรอกเบอร์ติดต่อ'
    if (!form.hospitalId) next.hospitalId = 'กรุณาเลือกโรงพยาบาล'
    if (creatingNew) {
      if (!form.newHospitalName.trim()) next.newHospitalName = 'กรุณากรอกชื่อโรงพยาบาล'
      if (!form.newHospitalPhone.trim()) next.newHospitalPhone = 'กรุณากรอกเบอร์โรงพยาบาล'
      if (!form.newHospitalAddress.trim()) next.newHospitalAddress = 'กรุณากรอกที่อยู่โรงพยาบาล'
    }
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
      const hospitalId = creatingNew
        ? await createHospital({
            name: form.newHospitalName.trim(),
            phone: form.newHospitalPhone.trim(),
            address: form.newHospitalAddress.trim(),
          })
        : form.hospitalId
      await registerAccount({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: 'hospital',
        hospitalId,
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
      <AppShell variant="public" title="สมัครสมาชิกโรงพยาบาล">
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
    <AppShell variant="public" title="สมัครสมาชิกโรงพยาบาล">
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
                label="โรงพยาบาล"
                required
                value={form.hospitalId}
                onChange={(e) => update('hospitalId', e.target.value)}
                error={errors.hospitalId}
              >
                <option value="">เลือกโรงพยาบาล</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
                <option value={NEW_HOSPITAL_VALUE}>+ โรงพยาบาลของฉันไม่มีในรายการ</option>
              </Select>
              {creatingNew && (
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg p-3.5">
                  <Input
                    label="ชื่อโรงพยาบาล"
                    required
                    value={form.newHospitalName}
                    onChange={(e) => update('newHospitalName', e.target.value)}
                    error={errors.newHospitalName}
                  />
                  <Input
                    label="เบอร์โรงพยาบาล"
                    required
                    value={form.newHospitalPhone}
                    onChange={(e) => update('newHospitalPhone', e.target.value)}
                    error={errors.newHospitalPhone}
                  />
                  <Input
                    label="ที่อยู่โรงพยาบาล"
                    required
                    value={form.newHospitalAddress}
                    onChange={(e) => update('newHospitalAddress', e.target.value)}
                    error={errors.newHospitalAddress}
                  />
                </div>
              )}
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
