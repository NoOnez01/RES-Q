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
    if (!form.name.trim()) next.name = 'กรุณากรอกชื่อ-นามสกุล'
    if (!form.phone.trim()) next.phone = 'กรุณากรอกเบอร์ติดต่อ'
    if (!form.rescueTeamId) next.rescueTeamId = 'กรุณาเลือกหน่วยกู้ชีพ'
    if (creatingNew) {
      if (!form.newTeamName.trim()) next.newTeamName = 'กรุณากรอกชื่อหน่วยกู้ชีพ'
      if (!form.newTeamUnitCode.trim()) next.newTeamUnitCode = 'กรุณากรอกรหัสหน่วย'
      if (!form.newTeamPhone.trim()) next.newTeamPhone = 'กรุณากรอกเบอร์หน่วย'
      if (!form.newTeamMembers.trim()) next.newTeamMembers = 'กรุณากรอกจำนวนเจ้าหน้าที่'
      else if (Number.isNaN(Number(form.newTeamMembers)) || Number(form.newTeamMembers) <= 0)
        next.newTeamMembers = 'กรุณากรอกจำนวนเป็นตัวเลขที่มากกว่า 0'
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
              <SearchableSelect
                label="หน่วยกู้ชีพ"
                required
                value={form.rescueTeamId}
                onChange={(v) => update('rescueTeamId', v)}
                error={errors.rescueTeamId}
                placeholder="พิมพ์ชื่อหน่วยกู้ชีพเพื่อค้นหา"
                emptyLabel="ไม่พบหน่วยกู้ชีพที่ค้นหา"
                options={[
                  ...[...rescueTeams].sort((a, b) => a.name.localeCompare(b.name, 'th')).map((t) => ({ value: t.id, label: t.name })),
                  { value: NEW_TEAM_VALUE, label: '+ หน่วยของฉันไม่มีในรายการ' },
                ]}
              />
              {creatingNew && (
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg p-3.5">
                  <Input
                    label="ชื่อหน่วยกู้ชีพ"
                    required
                    value={form.newTeamName}
                    onChange={(e) => update('newTeamName', e.target.value)}
                    error={errors.newTeamName}
                  />
                  <Input
                    label="เบอร์หน่วย"
                    required
                    value={form.newTeamPhone}
                    onChange={(e) => update('newTeamPhone', e.target.value)}
                    error={errors.newTeamPhone}
                  />
                  <p className="text-xs font-semibold text-muted">รถ/ทีมคันแรกของหน่วย (เพิ่มคันอื่นๆ ได้ภายหลัง)</p>
                  <Input
                    label="รหัสรถ/ทีม"
                    required
                    value={form.newTeamUnitCode}
                    onChange={(e) => update('newTeamUnitCode', e.target.value)}
                    error={errors.newTeamUnitCode}
                  />
                  <Input
                    label="จำนวนเจ้าหน้าที่"
                    type="number"
                    required
                    value={form.newTeamMembers}
                    onChange={(e) => update('newTeamMembers', e.target.value)}
                    error={errors.newTeamMembers}
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
