import { useNavigate } from 'react-router-dom'
import { User, Ambulance, PhoneIncoming, Building2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RoleCard } from '@/components/RoleCard'
import { useT, registerTranslations } from '@/lib/i18n'
import { PrivacyLink } from '@/components/PrivacyLink'
import { PRIVACY_NOTE_SIGNUP } from '@/lib/privacyNotice'

registerTranslations({
  สมัครสมาชิก: 'Sign up',
  เลือกประเภทบัญชีที่ตรงกับการใช้งานของคุณเพื่อเริ่มสมัครสมาชิก: 'Choose the account type that matches how you plan to use ResQ',
  ประชาชน: 'Public',
  สมัครเพื่อขอความช่วยเหลือฉุกเฉินและติดตามสถานะการช่วยเหลือ: 'Sign up to request emergency help and track your case',
  หน่วยกู้ชีพ: 'Rescue team',
  สำหรับหน่วยกู้ชีพที่ปฏิบัติงานช่วยเหลือและนำส่งผู้ป่วย: 'For rescue teams that accept cases and transport patients',
  'ศูนย์สั่งการ 1669': 'Dispatch Center 1669',
  สำหรับเจ้าหน้าที่ศูนย์สั่งการที่รับแจ้งเหตุและมอบหมายหน่วยกู้ชีพ: 'For dispatch staff who take reports and assign rescue teams',
  โรงพยาบาล: 'Hospital',
  สำหรับโรงพยาบาลที่รับข้อมูลและยืนยันการรับผู้ป่วย: 'For hospitals that receive case data and confirm patient admission',
})

const OPTIONS = [
  {
    icon: <User className="size-6" />,
    title: 'ประชาชน',
    description: 'สมัครเพื่อขอความช่วยเหลือฉุกเฉินและติดตามสถานะการช่วยเหลือ',
    path: '/register/public',
  },
  {
    icon: <Ambulance className="size-6" />,
    title: 'หน่วยกู้ชีพ',
    description: 'สำหรับหน่วยกู้ชีพที่ปฏิบัติงานช่วยเหลือและนำส่งผู้ป่วย',
    path: '/register/rescue',
  },
  {
    icon: <PhoneIncoming className="size-6" />,
    title: 'ศูนย์สั่งการ 1669',
    description: 'สำหรับเจ้าหน้าที่ศูนย์สั่งการที่รับแจ้งเหตุและมอบหมายหน่วยกู้ชีพ',
    path: '/register/dispatch',
  },
  {
    icon: <Building2 className="size-6" />,
    title: 'โรงพยาบาล',
    description: 'สำหรับโรงพยาบาลที่รับข้อมูลและยืนยันการรับผู้ป่วย',
    path: '/register/hospital',
  },
]

export default function Register() {
  const navigate = useNavigate()
  const t = useT()

  return (
    <AppShell variant="public" title={t('สมัครสมาชิก')}>
      <div className="relative">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <p className="text-small text-muted">{t('เลือกประเภทบัญชีที่ตรงกับการใช้งานของคุณเพื่อเริ่มสมัครสมาชิก')}</p>
          <div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {OPTIONS.map((o) => (
              <div key={o.path}>
                <RoleCard
                  icon={o.icon}
                  title={t(o.title)}
                  description={t(o.description)}
                  onClick={() => navigate(o.path)}
                />
              </div>
            ))}
          </div>
          <PrivacyLink note={PRIVACY_NOTE_SIGNUP} className="mt-5" />
        </div>
      </div>
    </AppShell>
  )
}
