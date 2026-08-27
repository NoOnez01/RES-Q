import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { UserCircle2, ShieldCheck, Trash2, Home, Radio, Ambulance, Building2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { useStore } from '@/lib/store'
import { roleLabel } from '@/lib/nav'
import { toast } from '@/lib/toast'
import { clearAllSupabaseCases } from '@/lib/supabaseCaseSync'
import type { Role } from '@/lib/types'

const ROLE_OPTIONS: { role: Role; label: string; mockName: string; icon: React.ElementType }[] = [
  { role: 'public', label: 'ประชาชน', mockName: 'คุณสมชาย ใจดี', icon: Home },
  { role: 'dispatch', label: 'ศูนย์สั่งการ', mockName: 'เจ้าหน้าที่ศูนย์สั่งการ 1669', icon: Radio },
  { role: 'rescue', label: 'หน่วยกู้ชีพ', mockName: 'หน่วยกู้ชีพ อาสาเมตตา 1', icon: Ambulance },
  { role: 'hospital', label: 'โรงพยาบาล', mockName: 'เจ้าหน้าที่โรงพยาบาลจุฬาลงกรณ์', icon: Building2 },
]

const NOTICES = [
  'ระบบนี้เป็นต้นแบบสำหรับการสาธิตและการวิจัย',
  'ข้อมูลในระบบเป็นข้อมูลจำลองและไม่ใช่ข้อมูลผู้ป่วยจริง',
  'ระบบไม่ทดแทนการประเมินทางการแพทย์',
]

export default function Settings() {
  const currentUser = useStore((s) => s.currentUser)
  const setUser = useStore((s) => s.setUser)
  const resetAll = useStore((s) => s.resetAll)
  const navigate = useNavigate()

  const [resetOpen, setResetOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  function handleSwitchRole(option: (typeof ROLE_OPTIONS)[number]) {
    setUser({ id: crypto.randomUUID(), name: option.mockName, role: option.role })
    toast({ title: 'สลับบทบาทแล้ว', message: `เปลี่ยนเป็น ${roleLabel(option.role)}`, tone: 'success' })
  }

  async function handleReset() {
    setResetLoading(true)
    resetAll()
    // Cases sync to Supabase, so clearing only local state means a reload
    // (or another tab/device) would just pull all of it right back.
    await clearAllSupabaseCases()
    setResetLoading(false)
    setResetOpen(false)
    toast({ title: 'ล้างข้อมูลทั้งหมดแล้ว', tone: 'success' })
    navigate('/')
  }

  return (
    <AppShell variant="dashboard" title="ตั้งค่า">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 flex flex-col gap-5">
        <Card className="space-y-4 animate-fade-in-up">
          <h3 className="flex items-center gap-2 font-bold text-navy">
            <UserCircle2 className="size-4 text-primary" /> ข้อมูลผู้ใช้งาน
          </h3>
          <div className="rounded-xl bg-skyblue-pale p-4">
            <p className="font-semibold text-navy">{currentUser?.name ?? 'ยังไม่ได้เข้าสู่ระบบ'}</p>
            <p className="text-sm text-muted">{roleLabel(currentUser?.role ?? null)}</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-navy">สลับบทบาท (สำหรับสาธิต)</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ROLE_OPTIONS.map((option) => {
                const Icon = option.icon
                const active = currentUser?.role === option.role
                return (
                  <span
                    key={active ? `${option.role}-active` : option.role}
                    className={clsx(
                      'block rounded-xl',
                      active && 'animate-scale-in ring-2 ring-primary/40 ring-offset-2 ring-offset-bg',
                    )}
                  >
                    <Button
                      variant={active ? 'primary' : 'outline'}
                      size="sm"
                      fullWidth
                      icon={<Icon className="size-4" />}
                      aria-pressed={active}
                      onClick={() => handleSwitchRole(option)}
                    >
                      {option.label}
                    </Button>
                  </span>
                )
              })}
            </div>
          </div>
        </Card>

        <Card className="space-y-3 animate-fade-in-up" style={{ animationDelay: '60ms', animationFillMode: 'backwards' }}>
          <h3 className="flex items-center gap-2 font-bold text-navy">
            <ShieldCheck className="size-4 text-primary" /> ข้อควรทราบ
          </h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
            {NOTICES.map((notice) => (
              <li key={notice}>{notice}</li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col items-start gap-3 border-emergency/30 bg-emergency/5 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up" style={{ animationDelay: '120ms', animationFillMode: 'backwards' }}>
          <div>
            <p className="font-bold text-navy">ล้างข้อมูลตัวอย่าง</p>
            <p className="text-sm text-muted">ลบเคสทั้งหมด (รวมข้อมูลที่ซิงค์ไว้ทุกอุปกรณ์) และข้อมูลผู้ใช้ในเบราว์เซอร์นี้</p>
          </div>
          <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setResetOpen(true)}>
            ล้างข้อมูลตัวอย่างทั้งหมด
          </Button>
        </Card>
        </div>
      </div>

      <ConfirmationModal
        open={resetOpen}
        tone="danger"
        title="ล้างข้อมูลทั้งหมด"
        message="การดำเนินการนี้จะลบเคสทั้งหมดทั้งในเบราว์เซอร์นี้และในฐานข้อมูลที่ซิงค์ไว้ (ทุกอุปกรณ์) รวมถึงข้อมูลผู้ใช้ในเบราว์เซอร์นี้ ไม่สามารถย้อนกลับได้"
        confirmLabel="ล้างข้อมูลทั้งหมด"
        confirmLoading={resetLoading}
        onConfirm={handleReset}
        onCancel={() => setResetOpen(false)}
      />
    </AppShell>
  )
}
