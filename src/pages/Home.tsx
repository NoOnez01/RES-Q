import { useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Accessibility,
  Activity,
  Ambulance,
  ArrowRight,
  Building2,
  Camera,
  ChevronRight,
  Clock,
  ExternalLink,
  Facebook,
  Lock,
  MessageCircle,
  PhoneCall,
  PhoneIncoming,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EmergencyContactCircle } from '@/components/EmergencyContactCircle'
import { Button } from '@/components/ui/Button'
import { useT, registerTranslations } from '@/lib/i18n'
import { PrivacyLink } from '@/components/PrivacyLink'
import { PRIVACY_NOTE_GENERAL } from '@/lib/privacyNotice'

registerTranslations({
  ติดต่อเจ้าหน้าที่: 'Contact responders',
  เริ่มต้นการขอความช่วยเหลือได้อย่างรวดเร็ว: 'Start requesting help quickly',
  'แตะปุ่มเดียว ระบบจะนำไปสู่ขั้นตอนการแจ้งเหตุทันที': 'One tap takes you straight into the report flow',
  ถ่ายภาพจุดเกิดเหตุ: 'Photograph the scene',
  ส่งภาพเพื่อช่วยให้เจ้าหน้าที่ประเมินสถานการณ์: 'Send photos to help responders assess the situation',
  'ถ่ายภาพ หรือข้ามขั้นตอนนี้ได้': 'Take a photo or skip this step',
  'โทร 1669': 'Call 1669',
  เชื่อมต่อศูนย์รับแจ้งเหตุและสั่งการการแพทย์ฉุกเฉิน: 'Connect to the emergency medical dispatch center',
  'สายด่วนการแพทย์ฉุกเฉินพร้อมรับสายตลอด 24 ชั่วโมง': 'The emergency medical hotline is staffed 24 hours a day',
  ติดตามสถานะการช่วยเหลือ: 'Track the response',
  ดูความคืบหน้าตั้งแต่รับแจ้งเหตุจนเสร็จสิ้น: 'See progress from the report through to completion',
  แสดงสถานะทุกขั้นตอนโดยอัตโนมัติตามเวลาจริง: 'Every stage updates automatically, in real time',
  บุคคลทั่วไป: 'Public',
  'แจ้งเหตุ ถ่ายภาพ และติดตามสถานะการช่วยเหลือ': 'Reports incidents, takes photos, and tracks help status',
  'ศูนย์สั่งการ 1669': 'Dispatch Center 1669',
  'รับแจ้งเหตุ ประเมินความรุนแรง และมอบหมายหน่วยกู้ชีพ': 'Takes reports, assesses severity, and assigns rescue teams',
  หน่วยกู้ชีพ: 'Rescue team',
  'เดินทางไปช่วยเหลือ บันทึกอาการ และนำส่งโรงพยาบาล': 'Travels to help, records the patient condition, and transports to hospital',
  โรงพยาบาล: 'Hospital',
  เตรียมทีมรักษาและยืนยันการรับผู้ป่วย: 'Prepares the care team and confirms patient admission',
  ระบบออกแบบเพื่อการประสานงานฉุกเฉิน: 'Built for emergency coordination',
  มีการแบ่งสิทธิ์ตามบทบาทผู้ใช้งาน: 'Access is scoped by user role',
  ข้อมูลผู้ป่วยควรได้รับการปกป้อง: 'Patient data is meant to be protected',
  มีการแสดงสถานะและประวัติการดำเนินงาน: 'Status and history are visible throughout',
  ออกแบบให้ใช้งานง่ายบนมือถือ: 'Designed to be easy to use on mobile',
  เชื่อมต่อทุกการช่วยเหลืออย่างรวดเร็วและปลอดภัย: 'Connecting every step of emergency help, fast and safely',
  'พร้อมให้ความช่วยเหลือตลอด 24 ชั่วโมง': 'Available 24/7',
  ติดตามสถานะตามเวลาจริง: 'Real-time status tracking',
  เข้าสู่ระบบ: 'Log in',
  สมัครสมาชิก: 'Sign up',
  ดูวิธีการใช้งาน: 'How it works',
  ช่วยให้ทุกขั้นตอนการช่วยเหลือเชื่อมต่อกัน: 'Keeping every step of the response connected',
  'ตั้งแต่แจ้งเหตุจนถึงติดตามผล ทุกฝ่ายเห็นข้อมูลชุดเดียวกัน': 'From the first report to the final follow-up, everyone sees the same data',
  ขั้นตอนการขอความช่วยเหลือ: 'Getting help, step by step',
  เริ่มต้นใช้งานทันที: 'Get started now',
  ดูรายละเอียดทั้งหมด: 'See all the details',
  ความปลอดภัยและความน่าเชื่อถือ: 'Security & trust',
  ติดต่อเรา: 'Contact us',
  'สอบถามหรือติดต่อทีมงาน ResQ ได้ทางช่องทางด้านล่าง (กรณีเหตุฉุกเฉิน กรุณาใช้ปุ่ม "ติดต่อเจ้าหน้าที่" ด้านบน)':
    'Reach the ResQ team through the channels below (for an actual emergency, please use the "Contact responders" button above instead)',
  ข้อมูลในระบบเป็นข้อมูลจำลองและไม่ใช่ข้อมูลผู้ป่วยจริง: 'Data in the system is simulated, not real patient data.',
  'ดูหน้าทั้งหมด (สำหรับนักพัฒนา)': 'View all pages (for developers)',
  'ระบบนี้เป็นต้นแบบสำหรับการสาธิตและการวิจัย ไม่ทดแทนการประเมินทางการแพทย์':
    'This system is a demonstration/research prototype and does not replace professional medical assessment.',
})

const STEPS = [
  {
    id: 'contact',
    icon: PhoneCall,
    title: 'ติดต่อเจ้าหน้าที่',
    description: 'เริ่มต้นการขอความช่วยเหลือได้อย่างรวดเร็ว',
    extra: 'แตะปุ่มเดียว ระบบจะนำไปสู่ขั้นตอนการแจ้งเหตุทันที',
  },
  {
    id: 'photo',
    icon: Camera,
    title: 'ถ่ายภาพจุดเกิดเหตุ',
    description: 'ส่งภาพเพื่อช่วยให้เจ้าหน้าที่ประเมินสถานการณ์',
    extra: 'ถ่ายภาพ หรือข้ามขั้นตอนนี้ได้',
  },
  {
    id: 'call1669',
    icon: PhoneIncoming,
    title: 'โทร 1669',
    description: 'เชื่อมต่อศูนย์รับแจ้งเหตุและสั่งการการแพทย์ฉุกเฉิน',
    extra: 'สายด่วนการแพทย์ฉุกเฉินพร้อมรับสายตลอด 24 ชั่วโมง',
  },
  {
    id: 'tracking',
    icon: Activity,
    title: 'ติดตามสถานะการช่วยเหลือ',
    description: 'ดูความคืบหน้าตั้งแต่รับแจ้งเหตุจนเสร็จสิ้น',
    extra: 'แสดงสถานะทุกขั้นตอนโดยอัตโนมัติตามเวลาจริง',
  },
] as const

/** The response chain the product runs: one case record, four parties. */
const CHAIN = [
  { key: 'public', label: 'บุคคลทั่วไป', icon: Users, detail: 'แจ้งเหตุ ถ่ายภาพ และติดตามสถานะการช่วยเหลือ' },
  { key: 'center', label: 'ศูนย์สั่งการ 1669', icon: PhoneCall, detail: 'รับแจ้งเหตุ ประเมินความรุนแรง และมอบหมายหน่วยกู้ชีพ' },
  { key: 'rescue', label: 'หน่วยกู้ชีพ', icon: Ambulance, detail: 'เดินทางไปช่วยเหลือ บันทึกอาการ และนำส่งโรงพยาบาล' },
  { key: 'hospital', label: 'โรงพยาบาล', icon: Building2, detail: 'เตรียมทีมรักษาและยืนยันการรับผู้ป่วย' },
] as const

// The team's own channels. LINE's /ti/p/ link opens the official account's
// add-friend page (in the LINE app on a phone).
const CONTACT_LINKS: { key: string; label: string; handle: string; href: string; icon: ReactNode }[] = [
  { key: 'line', label: 'LINE Official', handle: '@resq', href: 'https://line.me/R/ti/p/@resq', icon: <MessageCircle className="size-[18px]" /> },
  {
    key: 'facebook',
    label: 'Facebook',
    handle: 'Res-q Prc',
    href: 'https://www.facebook.com/profile.php?id=61592842760131',
    icon: <Facebook className="size-[18px]" />,
  },
]

const TRUST_POINTS = [
  { icon: Shield, text: 'ระบบออกแบบเพื่อการประสานงานฉุกเฉิน' },
  { icon: Lock, text: 'มีการแบ่งสิทธิ์ตามบทบาทผู้ใช้งาน' },
  { icon: ShieldCheck, text: 'ข้อมูลผู้ป่วยควรได้รับการปกป้อง' },
  { icon: Clock, text: 'มีการแสดงสถานะและประวัติการดำเนินงาน' },
  { icon: Accessibility, text: 'ออกแบบให้ใช้งานง่ายบนมือถือ' },
] as const

function openHeroCta() {
  const el = document.getElementById('hero-emergency-btn')
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  window.setTimeout(() => el.click(), 400)
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-[1.375rem] font-bold leading-snug text-ink sm:text-2xl">{title}</h2>
      {description && <p className="mt-2 text-body text-muted">{description}</p>}
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()

  useEffect(() => {
    if (!location.hash) return
    const el = document.getElementById(location.hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  function handleStepClick(id: string) {
    switch (id) {
      case 'contact':
        openHeroCta()
        break
      case 'photo':
        navigate('/public/emergency-photo')
        break
      case 'call1669':
        navigate('/public/call-1669')
        break
      default:
        navigate('/how-it-works')
    }
  }

  return (
    <AppShell variant="public">
      {/* Hero: the claim on the left, the one emergency control on the right
          (above it on a phone, where it's the first thing within reach). */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:py-20">
          <div className="order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
            <h1 className="max-w-xl text-[1.875rem] font-bold leading-[1.3] tracking-tight text-ink sm:text-[2.25rem] lg:text-[2.625rem]">
              {t('เชื่อมต่อทุกการช่วยเหลืออย่างรวดเร็วและปลอดภัย')}
            </h1>
            <p className="mt-4 max-w-lg text-body text-muted sm:text-base">
              {t('ตั้งแต่แจ้งเหตุจนถึงติดตามผล ทุกฝ่ายเห็นข้อมูลชุดเดียวกัน')}
            </p>

            <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-small text-ink/80 lg:justify-start">
              <li className="flex items-center gap-1.5">
                <Clock className="size-4 text-primary" aria-hidden="true" />
                {t('พร้อมให้ความช่วยเหลือตลอด 24 ชั่วโมง')}
              </li>
              <li className="flex items-center gap-1.5">
                <Activity className="size-4 text-primary" aria-hidden="true" />
                {t('ติดตามสถานะตามเวลาจริง')}
              </li>
            </ul>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <Button variant="outline" onClick={() => navigate('/login')}>
                {t('เข้าสู่ระบบ')}
              </Button>
              <Button variant="outline" onClick={() => navigate('/register')}>
                {t('สมัครสมาชิก')}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/how-it-works')} iconRight={<ArrowRight />}>
                {t('ดูวิธีการใช้งาน')}
              </Button>
            </div>
          </div>

          <div id="emergency-circle" className="order-1 flex justify-center lg:order-2">
            <EmergencyContactCircle />
          </div>
        </div>
      </section>

      {/* The chain: four parties on one record, read left to right. */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14 sm:px-6 sm:py-16">
        <SectionHeading
          title={t('ช่วยให้ทุกขั้นตอนการช่วยเหลือเชื่อมต่อกัน')}
          description={t('ตั้งแต่แจ้งเหตุจนถึงติดตามผล ทุกฝ่ายเห็นข้อมูลชุดเดียวกัน')}
        />
        <ol className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {CHAIN.map((node, i) => (
            <li key={node.key} className="flex flex-col gap-3 bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg border border-border text-primary">
                  <node.icon className="size-[18px]" aria-hidden="true" />
                </span>
                {i < CHAIN.length - 1 && <ChevronRight className="hidden size-4 text-muted/60 lg:block" aria-hidden="true" />}
              </div>
              <div>
                <p className="text-subheading text-ink">{t(node.label)}</p>
                <p className="mt-1 text-small text-muted">{t(node.detail)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Getting help: a numbered sequence, because it is one. */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeading title={t('ขั้นตอนการขอความช่วยเหลือ')} />
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={openHeroCta} iconRight={<ArrowRight />}>
                {t('เริ่มต้นใช้งานทันที')}
              </Button>
              <Button variant="outline" onClick={() => navigate('/how-it-works')}>
                {t('ดูรายละเอียดทั้งหมด')}
              </Button>
            </div>
          </div>

          <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {STEPS.map((step, i) => (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className="group flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-surface-alt sm:px-5"
                >
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-input text-xs font-semibold tabular-nums text-muted group-hover:border-primary group-hover:text-primary">
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2 text-subheading text-ink">
                      <step.icon className="size-4 text-primary" aria-hidden="true" />
                      {t(step.title)}
                    </span>
                    <span className="text-small text-muted">{t(step.description)}</span>
                    <span className="text-meta text-ink/60">{t(step.extra)}</span>
                  </span>
                  <ChevronRight
                    className="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="trust" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14 sm:px-6 sm:py-16">
        <SectionHeading title={t('ความปลอดภัยและความน่าเชื่อถือ')} />
        <ul className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
          {TRUST_POINTS.map((point) => (
            <li key={point.text} className="flex items-start gap-3 border-t border-border pt-4 lg:flex-col lg:gap-2.5">
              <point.icon className="size-[18px] shrink-0 text-primary" aria-hidden="true" />
              <p className="text-small font-medium text-ink">{t(point.text)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-2xl text-meta text-muted">
          {t('ระบบนี้เป็นต้นแบบสำหรับการสาธิตและการวิจัย ไม่ทดแทนการประเมินทางการแพทย์')}
        </p>
      </section>

      <section id="contact" className="scroll-mt-16 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            title={t('ติดต่อเรา')}
            description={t('สอบถามหรือติดต่อทีมงาน ResQ ได้ทางช่องทางด้านล่าง (กรณีเหตุฉุกเฉิน กรุณาใช้ปุ่ม "ติดต่อเจ้าหน้าที่" ด้านบน)')}
          />
          <div className="flex flex-wrap gap-2">
            {CONTACT_LINKS.map((link) => (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-w-[12rem] items-center gap-3 rounded-xl border border-input bg-surface px-4 py-2.5 text-left shadow-card transition-colors hover:bg-surface-alt"
              >
                <span className="text-primary">{link.icon}</span>
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-medium text-ink">{link.label}</span>
                  <span className="text-meta text-muted">{link.handle}</span>
                </span>
                <ExternalLink className="size-3.5 text-muted group-hover:text-ink" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <p className="text-meta text-muted">{t('ข้อมูลในระบบเป็นข้อมูลจำลองและไม่ใช่ข้อมูลผู้ป่วยจริง')}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <PrivacyLink note={PRIVACY_NOTE_GENERAL} />
            <button
              type="button"
              onClick={() => navigate('/all-screens')}
              className="-my-2 inline-block py-2 text-meta font-medium text-muted hover:text-ink hover:underline"
            >
              {t('ดูหน้าทั้งหมด (สำหรับนักพัฒนา)')}
            </button>
          </div>
        </div>
      </footer>
    </AppShell>
  )
}
