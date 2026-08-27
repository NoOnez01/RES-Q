import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserCircle2, ShieldCheck, Trash2, LogOut, Radio, Ambulance, Building2, ShieldAlert } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { useStore } from '@/lib/store'
import { roleLabel } from '@/lib/nav'
import { toast } from '@/lib/toast'
import { clearAllSupabaseCases } from '@/lib/supabaseCaseSync'

const NOTICES = [
  'ระบบนี้เป็นต้นแบบสำหรับการสาธิตและการวิจัย',
  'ข้อมูลในระบบเป็นข้อมูลจำลองและไม่ใช่ข้อมูลผู้ป่วยจริง',
  'ระบบไม่ทดแทนการประเมินทางการแพทย์',
]

const ADMIN_VIEWS = [
  { path: '/dispatch/dashboard', label: 'ศูนย์สั่งการ', icon: Radio },
  { path: '/rescue/dashboard', label: 'หน่วยกู้ชีพ (ทุกหน่วย)', icon: Ambulance },
  { path: '/hospital/dashboard', label: 'โรงพยาบาล (ทุกแห่ง)', icon: Building2 },
]

export default function Settings() {
  const currentUser = useStore((s) => s.currentUser)
  const logout = useStore((s) => s.logout)
  const resetAll = useStore((s) => s.resetAll)
  const navigate = useNavigate()

  const [resetOpen, setResetOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  async function handleReset() {
    setResetLoading(true)
    resetAll()
    // Cases sync to Supabase, so clearing only local state means a reload
    // (or another tab/device) would just pull all of it right back. Under
    // the scoped RLS policies this only actually deletes anything for a
    // dispatch/admin account -- other roles are correctly limited to their
    // own cases.
    await clearAllSupabaseCases()
    setResetLoading(false)
    setResetOpen(false)
    toast({ title: 'ล้างข้อมูลทั้งหมดแล้ว', tone: 'success' })
    navigate('/')
  }

  function handleLogout() {
    logout()
    toast({ title: 'ออกจากระบบแล้ว', tone: 'info' })
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

          {currentUser && currentUser.role !== 'public' && (
            <Button variant="outline" size="sm" icon={<LogOut className="size-4" />} onClick={handleLogout}>
              ออกจากระบบ
            </Button>
          )}
        </Card>

        {currentUser?.isAdmin && (
          <Card className="space-y-3 animate-fade-in-up border-primary/30 bg-skyblue-pale">
            <h3 className="flex items-center gap-2 font-bold text-navy">
              <ShieldAlert className="size-4 text-primary" /> มุมมองผู้ดูแลระบบ
            </h3>
            <p className="text-sm text-muted">เข้าดูแดชบอร์ดของแต่ละหน่วยงานแบบไม่จำกัดขอบเขต (เห็นทุกหน่วยกู้ชีพ/ทุกโรงพยาบาล)</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {ADMIN_VIEWS.map((v) => (
                <Link key={v.path} to={v.path}>
                  <Button variant="outline" size="sm" fullWidth icon={<v.icon className="size-4" />}>
                    {v.label}
                  </Button>
                </Link>
              ))}
            </div>
          </Card>
        )}

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
