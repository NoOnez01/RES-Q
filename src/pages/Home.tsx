import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Accessibility,
  Activity,
  Ambulance,
  ArrowRight,
  Building2,
  Camera,
  Clock,
  Facebook,
  Lock,
  MessageCircle,
  PhoneCall,
  PhoneIncoming,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { HeroSection } from '@/components/HeroSection'
import { EmergencyContactCircle } from '@/components/EmergencyContactCircle'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { InfoModal } from '@/components/ui/InfoModal'
import { useInView } from '@/lib/useInView'
import { useCountUp } from '@/lib/useCountUp'
import { FAVICON_URL } from '@/lib/utils'

const FEATURES = [
  {
    id: 'contact',
    icon: <PhoneCall className="size-5" />,
    title: 'ติดต่อเจ้าหน้าที่',
    description: 'เริ่มต้นการขอความช่วยเหลือได้อย่างรวดเร็ว',
    extra: 'กดปุ่มเดียว ระบบพาไปยังขั้นตอนแจ้งเหตุทันที',
  },
  {
    id: 'photo',
    icon: <Camera className="size-5" />,
    title: 'ถ่ายรูปจุดเกิดเหตุ',
    description: 'ส่งข้อมูลภาพเพื่อช่วยให้เจ้าหน้าที่ประเมินสถานการณ์',
    extra: 'ถ่ายรูปหรือข้ามขั้นตอนนี้ได้ทันที',
  },
  {
    id: 'call1669',
    icon: <PhoneIncoming className="size-5" />,
    title: 'โทร 1669',
    description: 'เชื่อมต่อศูนย์รับแจ้งเหตุการแพทย์ฉุกเฉิน',
    extra: 'สายด่วนการแพทย์ฉุกเฉินพร้อมรับสายตลอด 24 ชั่วโมง',
  },
  {
    id: 'tracking',
    icon: <Activity className="size-5" />,
    title: 'ติดตามสถานะเคส',
    description: 'ดูความคืบหน้าตั้งแต่รับแจ้งเหตุจนเสร็จสิ้น',
    extra: 'อัปเดตสถานะอัตโนมัติทุกขั้นตอนแบบเรียลไทม์',
  },
] as const

const CONNECTION_NODES = [
  {
    key: 'public',
    label: 'บุคคลทั่วไป',
    icon: <Users className="size-5" />,
    detail: 'แจ้งเหตุ ถ่ายรูป และติดตามสถานะการช่วยเหลือ',
    count: 7,
  },
  {
    key: 'center',
    label: 'ศูนย์ 1669',
    icon: <PhoneCall className="size-5" />,
    detail: 'รับแจ้งเหตุ ประเมินความรุนแรง และมอบหมายหน่วยกู้ชีพ',
    count: 24,
  },
  {
    key: 'rescue',
    label: 'หน่วยกู้ชีพ',
    icon: <Ambulance className="size-5" />,
    detail: 'เดินทางไปช่วยเหลือ บันทึกอาการ และนำส่งโรงพยาบาล',
    count: 18,
  },
  {
    key: 'hospital',
    label: 'โรงพยาบาล',
    icon: <Building2 className="size-5" />,
    detail: 'เตรียมทีมรักษาและยืนยันการรับผู้ป่วย',
    count: 12,
  },
] as const

// `href: null` means the real account doesn't exist yet -- shows as a
// disabled "เร็วๆ นี้" chip instead of linking somewhere fake. Fill in the
// real LINE OA / Facebook Page link here once it exists.
const CONTACT_LINKS: { key: string; label: string; href: string | null; icon: ReactNode }[] = [
  { key: 'line', label: 'LINE Official', href: null, icon: <MessageCircle className="size-5" /> },
  { key: 'facebook', label: 'Facebook', href: null, icon: <Facebook className="size-5" /> },
]

const TRUST_POINTS = [
  { icon: <Shield className="size-5" />, text: 'ระบบออกแบบเพื่อการประสานงานฉุกเฉิน' },
  { icon: <Lock className="size-5" />, text: 'มีการแบ่งสิทธิ์ตามบทบาทผู้ใช้งาน' },
  { icon: <ShieldCheck className="size-5" />, text: 'ข้อมูลผู้ป่วยควรได้รับการปกป้อง' },
  { icon: <Clock className="size-5" />, text: 'มีการแสดงสถานะและประวัติการดำเนินงาน' },
  { icon: <Accessibility className="size-5" />, text: 'ออกแบบให้ใช้งานง่ายบนมือถือ' },
] as const

function openHeroCta() {
  const el = document.getElementById('hero-emergency-btn')
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  window.setTimeout(() => el.click(), 400)
}

function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode
  delayMs?: number
  className?: string
}) {
  const [ref, inView] = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={clsx(inView ? 'animate-fade-in-up' : 'opacity-0', className)}
      style={inView ? { animationDelay: `${delayMs}ms`, animationFillMode: 'backwards' } : undefined}
    >
      {children}
    </div>
  )
}

/** One step in the case journey (contact -> photo -> 1669 -> rescue ->
 * patient record -> tracking) -- rendered as a row along a connecting
 * spine rather than an identical icon-card, since the six items aren't
 * independent options, they're a sequence, and the layout should say so.
 * The detail text used to only reveal on :hover, which never fires on a
 * touch device -- it's always visible now so phone users get the same
 * information as desktop. */
function FlowStep({
  index,
  icon,
  title,
  description,
  extra,
  onClick,
}: {
  index: number
  icon: ReactNode
  title: string
  description: string
  extra: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative z-10 flex w-full items-start gap-4 rounded-2xl p-3 text-left transition-colors duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 sm:gap-5 sm:p-4"
    >
      <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-primary/25 bg-white text-primary shadow-card transition-colors duration-200 group-hover:border-primary group-hover:bg-primary group-hover:text-white sm:size-16">
        {icon}
        <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-navy text-[10px] font-extrabold text-white shadow-card">
          {index}
        </span>
      </span>
      <span className="flex flex-1 flex-col gap-1 pt-1.5 sm:pt-2.5">
        <span className="font-bold text-navy">{title}</span>
        <span className="text-sm leading-relaxed text-muted">{description}</span>
        <span className="text-xs font-medium leading-relaxed text-primary/80">{extra}</span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="mt-4 size-4 shrink-0 -translate-x-1 text-primary opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 sm:mt-5"
      />
    </button>
  )
}

function OrbitRing({
  sizePct,
  rotate,
  scaleY,
  opacity,
  spin,
}: {
  sizePct: number
  rotate: number
  scaleY: number
  opacity: number
  spin: 'animate-orbit-slow' | 'animate-orbit-slower'
}) {
  return (
    <span
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary"
      style={{
        width: `${sizePct}%`,
        height: `${sizePct}%`,
        transform: `translate(-50%, -50%) rotate(${rotate}deg) scaleY(${scaleY})`,
        borderColor: `rgba(11, 110, 189, ${opacity})`,
      }}
    >
      <span className={clsx('bg-fx absolute inset-0', spin)}>
        <span className="absolute -top-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary/50" />
      </span>
    </span>
  )
}

const HUB_SATELLITE_LAYOUT = [
  { style: { top: '-2%', left: '16%' }, float: 'animate-float-a' as const, delay: '0s' },
  { style: { top: '6%', right: '-4%' }, float: 'animate-float-b' as const, delay: '1s' },
  { style: { bottom: '2%', left: '-6%' }, float: 'animate-float-c' as const, delay: '2s' },
  { style: { bottom: '-4%', right: '10%' }, float: 'animate-float-a' as const, delay: '1.5s' },
]

function HubSatellite({
  icon,
  count,
  label,
  style,
  float,
  delay,
  onClick,
}: {
  icon: ReactNode
  count: number
  label: string
  style: { top?: string; bottom?: string; left?: string; right?: string }
  float: 'animate-float-a' | 'animate-float-b' | 'animate-float-c'
  delay: string
  onClick: () => void
}) {
  const value = useCountUp(count, true)
  return (
    <span className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={style}>
      <span className={clsx('bg-fx block', float)} style={{ animationDelay: delay }}>
        <button
          type="button"
          onClick={onClick}
          aria-label={`${label}: ดูรายละเอียด`}
          className="relative flex size-11 items-center justify-center rounded-full bg-white text-primary shadow-card transition-shadow duration-200 hover:bg-skyblue-light hover:shadow-card-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 sm:size-12"
        >
          {icon}
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold tabular-nums text-white shadow-card">
            {String(value).padStart(2, '0')}
          </span>
        </button>
      </span>
    </span>
  )
}

function LogoHub({ onSelect }: { onSelect: (node: (typeof CONNECTION_NODES)[number]) => void }) {
  return (
    <div className="hero-grid-hub mt-4 flex flex-col items-center gap-3">
      <div className="relative mx-auto flex size-64 items-center justify-center sm:size-72 lg:size-80">
        <div className="bg-fx-layer" aria-hidden="true">
          <span className="bg-fx absolute inset-12 rounded-full bg-primary/10 blur-2xl" />
          <OrbitRing sizePct={60} rotate={-12} scaleY={0.55} opacity={0.22} spin="animate-orbit-slow" />
          <OrbitRing sizePct={82} rotate={16} scaleY={0.6} opacity={0.15} spin="animate-orbit-slower" />
          <OrbitRing sizePct={100} rotate={-24} scaleY={0.65} opacity={0.1} spin="animate-orbit-slow" />
        </div>

        {CONNECTION_NODES.map((node, i) => (
          <HubSatellite
            key={node.key}
            icon={node.icon}
            count={node.count}
            label={node.label}
            onClick={() => onSelect(node)}
            {...HUB_SATELLITE_LAYOUT[i]}
          />
        ))}

        <div
          className="relative z-10 flex size-24 items-center justify-center rounded-full bg-white/90 shadow-card-lg backdrop-blur-sm sm:size-28 lg:size-32"
          aria-hidden="true"
        >
          <span className="bg-fx absolute inset-0 rounded-full bg-primary/15 animate-ping-slow" />
          <img src={FAVICON_URL} alt="" className="relative size-14 sm:size-16 lg:size-[72px]" />
        </div>
      </div>
      <p className="text-center text-xs text-muted">กดที่แต่ละจุดเพื่อดูรายละเอียด · ข้อมูลจำลองสำหรับต้นแบบ</p>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeHubNode, setActiveHubNode] = useState<(typeof CONNECTION_NODES)[number] | null>(null)

  useEffect(() => {
    if (!location.hash) return
    const el = document.getElementById(location.hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  function handleFeatureClick(id: string) {
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
      <div className="relative bg-gradient-to-b from-skyblue-light via-skyblue-pale to-bg">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute left-[-10%] top-[22%] size-[560px] rounded-full bg-primary/[0.08] blur-3xl" />
          <div className="absolute right-[-10%] top-[50%] size-[460px] rounded-full bg-primary/[0.08] blur-3xl" />
          <div className="absolute left-[-8%] top-[76%] size-96 rounded-full bg-primary/[0.08] blur-3xl" />
        </div>

        <HeroSection wide background={false} fullScreen decoration={<AnimatedBackground variant="home" />}>
        <div className="hero-grid relative z-10 w-full">
          <div className="hero-grid-headline flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
            <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight text-navy sm:text-4xl lg:text-5xl">
              เชื่อมต่อทุกการช่วยเหลืออย่างรวดเร็วและปลอดภัย
            </h1>
          </div>

          <div id="emergency-circle" className="hero-grid-circle flex items-center justify-center">
            <EmergencyContactCircle />
          </div>

          <LogoHub onSelect={setActiveHubNode} />

          <div className="hero-grid-actions flex flex-col items-center gap-5 lg:items-start">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 lg:justify-start">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Clock className="size-4 text-primary" />
                พร้อมช่วยเหลือ 24 ชม.
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Activity className="size-4 text-primary" />
                ติดตามสถานะแบบ Real-time
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                เข้าสู่ระบบ
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/register')}>
                สมัครสมาชิก
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/how-it-works')}>
                ดูวิธีการใช้งาน
              </Button>
            </div>
          </div>
        </div>
      </HeroSection>

      <section id="features" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Reveal className="text-center">
          <h2 className="text-2xl font-bold text-navy sm:text-3xl">ช่วยให้ทุกขั้นตอนการช่วยเหลือเชื่อมต่อกัน</h2>
          <p className="mt-2 text-sm text-muted">ตั้งแต่แจ้งเหตุจนถึงติดตามผล ทุกฝ่ายเห็นข้อมูลชุดเดียวกัน</p>
        </Reveal>

        <div className="relative mt-12">
          <div
            aria-hidden="true"
            className="absolute bottom-8 left-10 top-8 w-px bg-gradient-to-b from-primary/30 via-primary/15 to-transparent sm:left-12"
          />
          <div className="flex flex-col gap-1">
            {FEATURES.map((f, i) => (
              <Reveal key={f.id} delayMs={i * 80}>
                <FlowStep
                  index={i + 1}
                  icon={f.icon}
                  title={f.title}
                  description={f.description}
                  extra={f.extra}
                  onClick={() => handleFeatureClick(f.id)}
                />
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delayMs={FEATURES.length * 80} className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={openHeroCta} iconRight={<ArrowRight className="size-4" />}>
            เริ่มต้นใช้งานทันที
          </Button>
          <Button variant="outline" onClick={() => navigate('/how-it-works')}>
            ดูรายละเอียดทั้งหมด
          </Button>
        </Reveal>
      </section>

      <section id="trust" className="bg-skyblue-pale/60 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center">
            <h2 className="text-2xl font-bold text-navy sm:text-3xl">ความปลอดภัยและความน่าเชื่อถือ</h2>
          </Reveal>

          <Reveal delayMs={80}>
            <Card className="mt-8 flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
              {TRUST_POINTS.map((t) => (
                <div key={t.text} className="flex flex-1 items-center gap-3 px-2 py-4 text-left sm:flex-col sm:gap-2.5 sm:px-4 sm:text-center">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-skyblue-light text-primary">
                    {t.icon}
                  </span>
                  <p className="text-sm font-medium leading-snug text-navy">{t.text}</p>
                </div>
              ))}
            </Card>
          </Reveal>

          <p className="mx-auto mt-8 max-w-xl text-center text-xs leading-relaxed text-muted">
            ระบบนี้เป็นต้นแบบสำหรับการสาธิตและการวิจัย ไม่ทดแทนการประเมินทางการแพทย์
          </p>
        </div>
      </section>

      <section id="contact" className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <h2 className="text-xl font-bold text-navy sm:text-2xl">ติดต่อเรา</h2>
            <p className="mt-2 text-sm text-muted">
              สอบถามหรือติดต่อทีมงาน ResQ ได้ผ่านช่องทางด้านล่าง (สำหรับเหตุฉุกเฉิน กรุณาใช้ปุ่ม "ติดต่อเจ้าหน้าที่" ด้านบนแทน)
            </p>
          </Reveal>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {CONTACT_LINKS.map((link) =>
              link.href ? (
                <a
                  key={link.key}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-sm font-semibold text-navy shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-lg"
                >
                  {link.icon}
                  {link.label}
                </a>
              ) : (
                <span
                  key={link.key}
                  aria-disabled="true"
                  className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-white/60 px-5 py-3 text-sm font-semibold text-muted"
                >
                  {link.icon}
                  {link.label}
                  <span className="text-xs font-normal">(เร็วๆ นี้)</span>
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-4 py-8 text-center sm:px-6">
        <p className="text-xs text-muted">ข้อมูลในระบบเป็นข้อมูลจำลองและไม่ใช่ข้อมูลผู้ป่วยจริง</p>
        <button
          type="button"
          onClick={() => navigate('/all-screens')}
          className="mt-2 text-xs font-semibold text-primary hover:underline"
        >
          ดูหน้าทั้งหมด (สำหรับนักพัฒนา)
        </button>
      </footer>
      </div>

      <InfoModal
        open={activeHubNode !== null}
        title={activeHubNode?.label ?? ''}
        message={activeHubNode?.detail ?? ''}
        icon={
          activeHubNode && (
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              {activeHubNode.icon}
            </span>
          )
        }
        onClose={() => setActiveHubNode(null)}
      />
    </AppShell>
  )
}
