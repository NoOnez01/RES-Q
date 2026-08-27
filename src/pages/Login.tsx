import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { Role } from '@/lib/types'

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'public', label: 'ประชาชน' },
  { value: 'dispatch', label: 'ศูนย์สั่งการ 1669' },
  { value: 'rescue', label: 'หน่วยกู้ชีพ' },
  { value: 'hospital', label: 'โรงพยาบาล' },
]

const ROLE_NAME: Record<Role, string> = {
  public: 'ผู้ใช้งานทั่วไป',
  dispatch: 'เจ้าหน้าที่ศูนย์สั่งการ',
  rescue: 'เจ้าหน้าที่หน่วยกู้ชีพ',
  hospital: 'เจ้าหน้าที่โรงพยาบาล',
}

const ROLE_PATH: Record<Role, string> = {
  public: '/',
  dispatch: '/dispatch/dashboard',
  rescue: '/rescue/dashboard',
  hospital: '/hospital/dashboard',
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useStore((s) => s.setUser)
  const preselectedRole = (location.state as { role?: Role } | null)?.role

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>(preselectedRole ?? 'public')
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const next: typeof errors = {}
    if (!identifier.trim()) next.identifier = 'กรุณากรอกอีเมลหรือชื่อผู้ใช้'
    if (!password) next.password = 'กรุณากรอกรหัสผ่าน'
    else if (password.length < 4) next.password = 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || loading) return
    setLoading(true)
    setTimeout(() => {
      setUser({ id: crypto.randomUUID(), name: ROLE_NAME[role], role })
      toast({ title: 'เข้าสู่ระบบสำเร็จ', message: `ยินดีต้อนรับ ${ROLE_NAME[role]}`, tone: 'success' })
      setLoading(false)
      navigate(ROLE_PATH[role])
    }, 700)
  }

  return (
    <AppShell variant="public" title="เข้าสู่ระบบ">
      <div className="relative">
        <AnimatedBackground variant="auth" />
        <div className="relative z-10 mx-auto max-w-md px-4 py-10 sm:px-6">
          <Card className="animate-fade-in-up">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <Input
                label="อีเมลหรือชื่อผู้ใช้"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                error={errors.identifier}
                placeholder="you@example.com"
              />
              <Input
                label="รหัสผ่าน"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                placeholder="อย่างน้อย 4 ตัวอักษร"
              />
              <Select label="เข้าสู่ระบบในฐานะ" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Button type="submit" fullWidth loading={loading}>
                เข้าสู่ระบบ
              </Button>
            </form>
            <div className="mt-5 flex flex-col items-center gap-3 border-t border-border pt-5">
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-sm font-semibold text-primary hover:underline"
              >
                ยังไม่มีบัญชี? สมัครสมาชิก
              </button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                เข้าใช้งานแบบไม่ต้องเข้าสู่ระบบ
              </Button>
            </div>
          </Card>
          <p className="mt-4 text-center text-xs text-muted">
            ระบบนี้เป็นต้นแบบสำหรับการสาธิตและการวิจัย ไม่จำเป็นต้องกรอกข้อมูลจริง
          </p>
        </div>
      </div>
    </AppShell>
  )
}
