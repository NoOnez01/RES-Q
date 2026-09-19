import { useNavigate } from 'react-router-dom'
import { User, Ambulance, PhoneIncoming, Building2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RoleCard } from '@/components/RoleCard'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  สมัครสมาชิก: 'Sign up',
  เลือกประเภทบัญชีที่ตรงกับการใช้งานของคุณเพื่อเริ่มสมัครสมาชิก: 'Choose the account type that matches how you plan to use ResQ',
  ประชาชน: 'Public',
  สมัครเพื่อขอความช่วยเหลือฉุกเฉินและติดตามเคสของคุณ: 'Sign up to request emergency help and track your case',
  หน่วยกู้ชีพ: 'Rescue team',
  สมัครสำหรับหน่วยกู้ชีพที่รับเคสและนำส่งผู้ป่วย: 'For rescue teams that accept cases and transport patients',
  'ศูนย์สั่งการ 1669': 'Dispatch Center 1669',
  สมัครสำหรับเจ้าหน้าที่ศูนย์สั่งการที่รับแจ้งเหตุและมอบหมายหน่วยกู้ชีพ: 'For dispatch staff who take reports and assign rescue teams',
  โรงพยาบาล: 'Hospital',
  สมัครสำหรับโรงพยาบาลที่รับข้อมูลและยืนยันการรับผู้ป่วย: 'For hospitals that receive case data and confirm patient admission',
})

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
  const t = useT()

  return (
    <AppShell variant="public" title={t('สมัครสมาชิก')}>
      <div className="relative">
        <AnimatedBackground variant="auth" />
        <div className="relative z-10 mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <p className="text-sm text-muted">{t('เลือกประเภทบัญชีที่ตรงกับการใช้งานของคุณเพื่อเริ่มสมัครสมาชิก')}</p>
          <div className="mt-6 flex flex-col gap-3">
            {OPTIONS.map((o, i) => (
              <div
                key={o.path}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
              >
                <RoleCard
                  icon={o.icon}
                  title={t(o.title)}
                  description={t(o.description)}
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
