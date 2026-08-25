import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, PhoneIncoming, Ambulance, Building2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RoleCard } from '@/components/RoleCard'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { Role } from '@/lib/types'

const ROLES: { role: Role; icon: JSX.Element; title: string; description: string; name: string; path: string }[] = [
  {
    role: 'public',
    icon: <User className="size-6" />,
    title: 'ประชาชน',
    description: 'ขอความช่วยเหลือฉุกเฉินและติดตามเคส',
    name: 'ผู้ใช้งานทั่วไป',
    path: '/',
  },
  {
    role: 'dispatch',
    icon: <PhoneIncoming className="size-6" />,
    title: 'ศูนย์สั่งการ 1669',
    description: 'รับแจ้งเหตุและมอบหมายหน่วยกู้ภัย',
    name: 'เจ้าหน้าที่ศูนย์สั่งการ',
    path: '/dispatch/dashboard',
  },
  {
    role: 'rescue',
    icon: <Ambulance className="size-6" />,
    title: 'หน่วยกู้ภัย',
    description: 'รับเคสและนำส่งผู้ป่วย',
    name: 'เจ้าหน้าที่หน่วยกู้ภัย',
    path: '/rescue/dashboard',
  },
  {
    role: 'hospital',
    icon: <Building2 className="size-6" />,
    title: 'โรงพยาบาล',
    description: 'รับข้อมูลและยืนยันการรับผู้ป่วย',
    name: 'เจ้าหน้าที่โรงพยาบาล',
    path: '/hospital/dashboard',
  },
]

export default function RoleSelection() {
  const navigate = useNavigate()
  const setUser = useStore((s) => s.setUser)
  const [loadingRole, setLoadingRole] = useState<Role | null>(null)

  function handleSelect(item: (typeof ROLES)[number]) {
    if (loadingRole) return
    setLoadingRole(item.role)
    setTimeout(() => {
      setUser({ id: crypto.randomUUID(), name: item.name, role: item.role })
      toast({ title: `เข้าสู่ระบบในฐานะ${item.title}แล้ว`, tone: 'success' })
      setLoadingRole(null)
      navigate(item.path)
    }, 600)
  }

  return (
    <AppShell variant="public" title="เลือกบทบาทผู้ใช้งาน">
      <div className="relative">
        <AnimatedBackground variant="auth" />
        <div className="relative z-10 mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <p className="text-sm text-muted">
            หน้านี้เป็นตัวสลับบทบาทสำหรับการสาธิต ใช้เพื่อทดลองมุมมองของผู้ใช้งานแต่ละประเภทในระบบ ResQ โดยไม่ต้องสมัครสมาชิกจริง
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {ROLES.map((item, i) => (
              <div
                key={item.role}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
              >
                <RoleCard
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                  onClick={() => handleSelect(item)}
                  className={loadingRole === item.role ? 'opacity-60' : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
