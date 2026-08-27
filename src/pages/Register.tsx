import { useNavigate } from 'react-router-dom'
import { User, Ambulance, PhoneIncoming, Building2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RoleCard } from '@/components/RoleCard'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'

const OPTIONS = [
  {
    icon: <User className="size-6" />,
    title: 'ประชาชน',
    description: 'สมัครเพื่อขอความช่วยเหลือฉุกเฉินและติดตามเคสของคุณ',
    path: '/register/public',
  },
  {
    icon: <Ambulance className="size-6" />,
    title: 'หน่วยกู้ชีพ',
    description: 'สมัครสำหรับหน่วยกู้ชีพที่รับเคสและนำส่งผู้ป่วย',
    path: '/register/rescue',
  },
  {
    icon: <PhoneIncoming className="size-6" />,
    title: 'ศูนย์สั่งการ 1669',
    description: 'สมัครสำหรับเจ้าหน้าที่ศูนย์สั่งการที่รับแจ้งเหตุและมอบหมายหน่วยกู้ชีพ',
    path: '/register/dispatch',
  },
  {
    icon: <Building2 className="size-6" />,
    title: 'โรงพยาบาล',
    description: 'สมัครสำหรับโรงพยาบาลที่รับข้อมูลและยืนยันการรับผู้ป่วย',
    path: '/register/hospital',
  },
]

export default function Register() {
  const navigate = useNavigate()

  return (
    <AppShell variant="public" title="สมัครสมาชิก">
      <div className="relative">
        <AnimatedBackground variant="auth" />
        <div className="relative z-10 mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <p className="text-sm text-muted">เลือกประเภทบัญชีที่ตรงกับการใช้งานของคุณเพื่อเริ่มสมัครสมาชิก</p>
          <div className="mt-6 flex flex-col gap-3">
            {OPTIONS.map((o, i) => (
              <div
                key={o.path}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
              >
                <RoleCard
                  icon={o.icon}
                  title={o.title}
                  description={o.description}
                  onClick={() => navigate(o.path)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
