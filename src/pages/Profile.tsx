import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCircle2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/States'
import { useStore } from '@/lib/store'
import { updateProfile } from '@/lib/auth'
import { roleLabel } from '@/lib/nav'
import { toast } from '@/lib/toast'

export default function Profile() {
  const navigate = useNavigate()
  const currentUser = useStore((s) => s.currentUser)
  const setUser = useStore((s) => s.setUser)
  const rescueTeams = useStore((s) => s.rescueTeams)
  const hospitals = useStore((s) => s.hospitals)

  const [name, setName] = useState(currentUser?.name ?? '')
  const [phone, setPhone] = useState(currentUser?.phone ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!currentUser) {
    return (
      <AppShell variant="dashboard" title="ข้อมูลส่วนตัว">
        <ErrorState title="ยังไม่ได้เข้าสู่ระบบ" description="กรุณาเข้าสู่ระบบเพื่อแก้ไขข้อมูลส่วนตัว" onRetry={() => navigate('/login')} />
      </AppShell>
    )
  }

  const orgName =
    currentUser.role === 'rescue'
      ? rescueTeams.find((t) => t.id === currentUser.rescueTeamId)?.name
      : currentUser.role === 'hospital'
        ? hospitals.find((h) => h.id === currentUser.hospitalId)?.name
        : undefined

  async function handleSave() {
    if (!currentUser) return
    if (!name.trim()) {
      setError('กรุณากรอกชื่อ-นามสกุล')
      return
    }
    setError('')
    setLoading(true)
    try {
      await updateProfile(currentUser.id, { name: name.trim(), phone: phone.trim() || undefined })
      setUser({ ...currentUser, name: name.trim(), phone: phone.trim() || undefined })
      toast({ title: 'บันทึกข้อมูลส่วนตัวแล้ว', tone: 'success' })
    } catch {
      toast({ title: 'บันทึกไม่สำเร็จ', tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell variant="dashboard" title="ข้อมูลส่วนตัว">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 mx-auto max-w-md">
          <Card className="space-y-4 animate-fade-in-up">
            <h3 className="flex items-center gap-2 font-bold text-navy">
              <UserCircle2 className="size-4 text-primary" /> แก้ไขข้อมูลส่วนตัว
            </h3>

            <div className="rounded-xl bg-skyblue-pale p-3 text-sm">
              <p className="text-muted">บทบาท</p>
              <p className="font-semibold text-navy">
                {roleLabel(currentUser.role)}
                {orgName && ` · ${orgName}`}
              </p>
            </div>

            <Input label="ชื่อ-นามสกุล" required value={name} onChange={(e) => setName(e.target.value)} error={error} />
            <Input label="เบอร์ติดต่อ" value={phone} onChange={(e) => setPhone(e.target.value)} />

            <Button fullWidth loading={loading} onClick={handleSave}>
              บันทึกการเปลี่ยนแปลง
            </Button>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
