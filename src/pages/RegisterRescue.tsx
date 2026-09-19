import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Input, SearchableSelect } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { SuccessState } from '@/components/States'
import { useStore } from '@/lib/store'
import { registerAccount } from '@/lib/auth'
import { createRescueTeam } from '@/lib/orgs'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'กรุณากรอกชื่อ-นามสกุล': 'Please enter your full name',
  กรุณากรอกเบอร์ติดต่อ: 'Please enter a contact number',
  กรุณาเลือกหน่วยกู้ชีพ: 'Please select a rescue team',
  กรุณากรอกชื่อหน่วยกู้ชีพ: 'Please enter the rescue team name',
  กรุณากรอกรหัสหน่วย: 'Please enter the unit code',
  กรุณากรอกเบอร์หน่วย: "Please enter the unit's phone number",
  กรุณากรอกจำนวนเจ้าหน้าที่: 'Please enter the number of staff',
  'กรุณากรอกจำนวนเป็นตัวเลขที่มากกว่า 0': 'Please enter a number greater than 0',
  กรุณากรอกอีเมล: 'Please enter your email',
  กรุณากรอกรหัสผ่าน: 'Please enter your password',
  'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร': 'Password must be at least 6 characters',
  สมัครสมาชิกไม่สำเร็จ: 'Sign-up failed',
  สมัครสมาชิกหน่วยกู้ชีพ: 'Rescue team sign-up',
  สมัครสมาชิกสำเร็จ: 'Sign-up successful',
  'บัญชีของคุณรอการอนุมัติจากศูนย์สั่งการ 1669 ก่อนเข้าใช้งานได้': 'Your account is pending approval from Dispatch Center 1669 before you can log in',
  ไปหน้าเข้าสู่ระบบ: 'Go to login',
  'ชื่อ-นามสกุล': 'Full name',
  เบอร์ติดต่อ: 'Contact number',
  หน่วยกู้ชีพ: 'Rescue team',
  พิมพ์ชื่อหน่วยกู้ชีพเพื่อค้นหา: 'Type a rescue team name to search',
  ไม่พบหน่วยกู้ชีพที่ค้นหา: 'No matching rescue team found',
  'หน่วยของฉันไม่มีในรายการ': "My team isn't in the list",
  ชื่อหน่วยกู้ชีพ: 'Rescue team name',
  เบอร์หน่วย: "Unit's phone number",
  'รถ/ทีมคันแรกของหน่วย (เพิ่มคันอื่นๆ ได้ภายหลัง)': "The team's first vehicle/crew (more can be added later)",
  'รหัสรถ/ทีม': 'Vehicle/crew code',
  จำนวนเจ้าหน้าที่: 'Number of staff',
  อีเมล: 'Email',
  รหัสผ่าน: 'Password',
  'อย่างน้อย 6 ตัวอักษร': 'At least 6 characters',
  สมัครสมาชิก: 'Sign up',
  'บัญชีต้องได้รับการอนุมัติจากศูนย์สั่งการ 1669 ก่อนเข้าใช้งานได้': 'Accounts must be approved by Dispatch Center 1669 before they can log in',
})

const NEW_TEAM_VALUE = '__new__'

interface FormState {
  name: string
  phone: string
  rescueTeamId: string
  newTeamName: string
  newTeamUnitCode: string
  newTeamPhone: string
  newTeamMembers: string
  email: string
  password: string
}

export default function RegisterRescue() {
  const navigate = useNavigate()
  const rescueTeams = useStore((s) => s.rescueTeams)
  const t = useT()

  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    rescueTeamId: '',
    newTeamName: '',
    newTeamUnitCode: '',
    newTeamPhone: '',
    newTeamMembers: '',
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const creatingNew = form.rescueTeamId === NEW_TEAM_VALUE

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function validate() {
    const next: typeof errors = {}
    if (!form.name.trim()) next.name = t('กรุณากรอกชื่อ-นามสกุล')
    if (!form.phone.trim()) next.phone = t('กรุณากรอกเบอร์ติดต่อ')
    if (!form.rescueTeamId) next.rescueTeamId = t('กรุณาเลือกหน่วยกู้ชีพ')
    if (creatingNew) {
      if (!form.newTeamName.trim()) next.newTeamName = t('กรุณากรอกชื่อหน่วยกู้ชีพ')
      if (!form.newTeamUnitCode.trim()) next.newTeamUnitCode = t('กรุณากรอกรหัสหน่วย')
      if (!form.newTeamPhone.trim()) next.newTeamPhone = t('กรุณากรอกเบอร์หน่วย')
      if (!form.newTeamMembers.trim()) next.newTeamMembers = t('กรุณากรอกจำนวนเจ้าหน้าที่')
      else if (Number.isNaN(Number(form.newTeamMembers)) || Number(form.newTeamMembers) <= 0)
        next.newTeamMembers = t('กรุณากรอกจำนวนเป็นตัวเลขที่มากกว่า 0')
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
      const rescueTeamId = creatingNew
        ? await createRescueTeam({
            name: form.newTeamName.trim(),
            phone: form.newTeamPhone.trim(),
            initialVehicle: {
              unitCode: form.newTeamUnitCode.trim(),
              members: Number(form.newTeamMembers),
            },
          })
        : form.rescueTeamId
      await registerAccount({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: 'rescue',
        rescueTeamId,
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
      <AppShell variant="public" title={t('สมัครสมาชิกหน่วยกู้ชีพ')}>
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
    <AppShell variant="public" title={t('สมัครสมาชิกหน่วยกู้ชีพ')}>
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
              <SearchableSelect
                label={t('หน่วยกู้ชีพ')}
                required
                value={form.rescueTeamId}
                onChange={(v) => update('rescueTeamId', v)}
                error={errors.rescueTeamId}
                placeholder={t('พิมพ์ชื่อหน่วยกู้ชีพเพื่อค้นหา')}
                emptyLabel={t('ไม่พบหน่วยกู้ชีพที่ค้นหา')}
                options={[
                  ...[...rescueTeams].sort((a, b) => a.name.localeCompare(b.name, 'th')).map((team) => ({ value: team.id, label: team.name })),
                  { value: NEW_TEAM_VALUE, label: `+ ${t('หน่วยของฉันไม่มีในรายการ')}` },
                ]}
              />
              {creatingNew && (
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg p-3.5">
                  <Input
                    label={t('ชื่อหน่วยกู้ชีพ')}
                    required
                    value={form.newTeamName}
                    onChange={(e) => update('newTeamName', e.target.value)}
                    error={errors.newTeamName}
                  />
                  <Input
                    label={t('เบอร์หน่วย')}
                    required
                    value={form.newTeamPhone}
                    onChange={(e) => update('newTeamPhone', e.target.value)}
                    error={errors.newTeamPhone}
                  />
                  <p className="text-xs font-semibold text-muted">{t('รถ/ทีมคันแรกของหน่วย (เพิ่มคันอื่นๆ ได้ภายหลัง)')}</p>
                  <Input
                    label={t('รหัสรถ/ทีม')}
                    required
                    value={form.newTeamUnitCode}
                    onChange={(e) => update('newTeamUnitCode', e.target.value)}
                    error={errors.newTeamUnitCode}
                  />
                  <Input
                    label={t('จำนวนเจ้าหน้าที่')}
                    type="number"
                    required
                    value={form.newTeamMembers}
                    onChange={(e) => update('newTeamMembers', e.target.value)}
                    error={errors.newTeamMembers}
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
