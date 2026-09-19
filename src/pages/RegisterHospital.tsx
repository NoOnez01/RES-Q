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
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'กรุณากรอกชื่อ-นามสกุล': 'Please enter your full name',
  กรุณากรอกเบอร์ติดต่อ: 'Please enter a contact number',
  กรุณาเลือกโรงพยาบาล: 'Please select a hospital',
  กรุณากรอกชื่อโรงพยาบาล: 'Please enter the hospital name',
  กรุณากรอกเบอร์โรงพยาบาล: "Please enter the hospital's phone number",
  กรุณากรอกที่อยู่โรงพยาบาล: "Please enter the hospital's address",
  กรุณากรอกอีเมล: 'Please enter your email',
  กรุณากรอกรหัสผ่าน: 'Please enter your password',
  'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร': 'Password must be at least 6 characters',
  สมัครสมาชิกไม่สำเร็จ: 'Sign-up failed',
  สมัครสมาชิกโรงพยาบาล: 'Hospital sign-up',
  สมัครสมาชิกสำเร็จ: 'Sign-up successful',
  'บัญชีของคุณรอการอนุมัติจากศูนย์สั่งการ 1669 ก่อนเข้าใช้งานได้': 'Your account is pending approval from Dispatch Center 1669 before you can log in',
  ไปหน้าเข้าสู่ระบบ: 'Go to login',
  'ชื่อ-นามสกุล': 'Full name',
  เบอร์ติดต่อ: 'Contact number',
  โรงพยาบาล: 'Hospital',
  เลือกโรงพยาบาล: 'Select a hospital',
  'โรงพยาบาลของฉันไม่มีในรายการ': "My hospital isn't in the list",
  ชื่อโรงพยาบาล: 'Hospital name',
  เบอร์โรงพยาบาล: "Hospital's phone number",
  ที่อยู่โรงพยาบาล: "Hospital's address",
  อีเมล: 'Email',
  รหัสผ่าน: 'Password',
  'อย่างน้อย 6 ตัวอักษร': 'At least 6 characters',
  สมัครสมาชิก: 'Sign up',
  'บัญชีต้องได้รับการอนุมัติจากศูนย์สั่งการ 1669 ก่อนเข้าใช้งานได้': 'Accounts must be approved by Dispatch Center 1669 before they can log in',
})

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
  const t = useT()

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
    if (!form.name.trim()) next.name = t('กรุณากรอกชื่อ-นามสกุล')
    if (!form.phone.trim()) next.phone = t('กรุณากรอกเบอร์ติดต่อ')
    if (!form.hospitalId) next.hospitalId = t('กรุณาเลือกโรงพยาบาล')
    if (creatingNew) {
      if (!form.newHospitalName.trim()) next.newHospitalName = t('กรุณากรอกชื่อโรงพยาบาล')
      if (!form.newHospitalPhone.trim()) next.newHospitalPhone = t('กรุณากรอกเบอร์โรงพยาบาล')
      if (!form.newHospitalAddress.trim()) next.newHospitalAddress = t('กรุณากรอกที่อยู่โรงพยาบาล')
    }
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
      toast({ title: t('สมัครสมาชิกไม่สำเร็จ'), message: err instanceof Error ? err.message : undefined, tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <AppShell variant="public" title={t('สมัครสมาชิกโรงพยาบาล')}>
        <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
          <SuccessState
            title={t('สมัครสมาชิกสำเร็จ')}
            description={t('บัญชีของคุณรอการอนุมัติจากศูนย์สั่งการ 1669 ก่อนเข้าใช้งานได้')}
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
    <AppShell variant="public" title={t('สมัครสมาชิกโรงพยาบาล')}>
      <div className="relative">
        <AnimatedBackground variant="auth" />
        <div className="relative z-10 mx-auto max-w-md px-4 py-10 sm:px-6">
          <Card className="animate-fade-in-up">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <Input
                label={t('ชื่อ-นามสกุล')}
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                error={errors.name}
              />
              <Input
                label={t('เบอร์ติดต่อ')}
                required
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                error={errors.phone}
              />
              <Select
                label={t('โรงพยาบาล')}
                required
                value={form.hospitalId}
                onChange={(e) => update('hospitalId', e.target.value)}
                error={errors.hospitalId}
              >
                <option value="">{t('เลือกโรงพยาบาล')}</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
                <option value={NEW_HOSPITAL_VALUE}>+ {t('โรงพยาบาลของฉันไม่มีในรายการ')}</option>
              </Select>
              {creatingNew && (
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg p-3.5">
                  <Input
                    label={t('ชื่อโรงพยาบาล')}
                    required
                    value={form.newHospitalName}
                    onChange={(e) => update('newHospitalName', e.target.value)}
                    error={errors.newHospitalName}
                  />
                  <Input
                    label={t('เบอร์โรงพยาบาล')}
                    required
                    value={form.newHospitalPhone}
                    onChange={(e) => update('newHospitalPhone', e.target.value)}
                    error={errors.newHospitalPhone}
                  />
                  <Input
                    label={t('ที่อยู่โรงพยาบาล')}
                    required
                    value={form.newHospitalAddress}
                    onChange={(e) => update('newHospitalAddress', e.target.value)}
                    error={errors.newHospitalAddress}
                  />
                </div>
              )}
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
              {t('บัญชีต้องได้รับการอนุมัติจากศูนย์สั่งการ 1669 ก่อนเข้าใช้งานได้')}
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
