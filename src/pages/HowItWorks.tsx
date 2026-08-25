import { Fragment, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  PhoneCall,
  Camera,
  Ambulance,
  Hospital,
  Users,
  ArrowRight,
  ChevronDown,
} from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { InteractiveMapGrid } from '@/components/backgrounds/InteractiveMapGrid'
import { Button } from '@/components/ui/Button'

interface StepData {
  title: string
  description: string
  action: string
}

const STEPS: StepData[] = [
  {
    title: 'ติดต่อเจ้าหน้าที่',
    description: 'กดปุ่มวงกลมสีแดงบนหน้าหลักเพื่อเริ่มกระบวนการขอความช่วยเหลือฉุกเฉินได้ทันที',
    action: 'กดปุ่ม "ติดต่อเจ้าหน้าที่" แล้วยืนยันเพื่อเริ่มต้น',
  },
  {
    title: 'ถ่ายรูปจุดเกิดเหตุ',
    description: 'ถ่ายภาพบริเวณที่เกิดเหตุเพื่อช่วยให้เจ้าหน้าที่ประเมินสถานการณ์ได้แม่นยำขึ้น หรือข้ามขั้นตอนนี้ได้หากไม่สะดวก',
    action: 'ถ่ายภาพจุดเกิดเหตุ หรือกด "ข้ามขั้นตอน" เพื่อไปต่อ',
  },
  {
    title: 'โทร 1669',
    description: 'ระบบจะเชื่อมต่อไปยังสายด่วนการแพทย์ฉุกเฉิน 1669 เพื่อแจ้งเหตุกับเจ้าหน้าที่โดยตรง',
    action: 'รอการเชื่อมต่อสายและแจ้งอาการเบื้องต้นกับเจ้าหน้าที่',
  },
  {
    title: 'ส่งรายละเอียดเหตุการณ์',
    description: 'กรอกตำแหน่ง อาการ และรายละเอียดของผู้บาดเจ็บ เพื่อส่งให้ศูนย์ 1669 และหน่วยกู้ภัยที่เกี่ยวข้อง',
    action: 'กรอกแบบฟอร์มรายละเอียดเหตุการณ์ให้ครบถ้วนแล้วกดส่งข้อมูล',
  },
  {
    title: 'หน่วยกู้ภัยเข้าช่วยเหลือ',
    description: 'หน่วยกู้ภัยที่ได้รับมอบหมายจะเดินทางไปยังจุดเกิดเหตุ พร้อมระบบติดตามตำแหน่งและเวลาถึงโดยประมาณ',
    action: 'ติดตามสถานะและตำแหน่งของหน่วยกู้ภัยแบบเรียลไทม์',
  },
  {
    title: 'นำส่งโรงพยาบาล',
    description: 'หน่วยกู้ภัยนำผู้บาดเจ็บส่งโรงพยาบาลที่เตรียมทีมรักษาไว้ล่วงหน้า และยืนยันการรับตัวผู้ป่วย',
    action: 'ตรวจสอบสถานะ "ผู้ป่วยถึงแล้ว" เพื่อยืนยันว่าการช่วยเหลือเสร็จสมบูรณ์',
  },
]

const CONNECTION_NODES = [
  {
    key: 'public',
    label: 'บุคคลทั่วไป',
    icon: <Users className="size-5" />,
    detail: 'แจ้งเหตุ ถ่ายรูป และติดตามสถานะการช่วยเหลือ',
  },
  {
    key: 'center',
    label: 'ศูนย์ 1669',
    icon: <PhoneCall className="size-5" />,
    detail: 'รับแจ้งเหตุ ประเมินความรุนแรง และมอบหมายหน่วยกู้ภัย',
  },
  {
    key: 'rescue',
    label: 'หน่วยกู้ภัย',
    icon: <Ambulance className="size-5" />,
    detail: 'เดินทางไปช่วยเหลือ บันทึกอาการ และนำส่งโรงพยาบาล',
  },
  {
    key: 'hospital',
    label: 'โรงพยาบาล',
    icon: <Hospital className="size-5" />,
    detail: 'เตรียมทีมรักษาและยืนยันการรับผู้ป่วย',
  },
]

function StepPreview({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-[140px] items-center justify-center rounded-full bg-emergency text-white shadow-red-glow animate-pulse-glow">
          <PhoneCall className="size-10" strokeWidth={2.2} />
        </div>
        <p className="text-sm font-bold text-navy">ติดต่อเจ้าหน้าที่</p>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="flex w-full max-w-[240px] flex-col items-center gap-3">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-navy">
          <span className="absolute left-2 top-2 size-5 border-l-2 border-t-2 border-white/70" aria-hidden="true" />
          <span className="absolute right-2 top-2 size-5 border-r-2 border-t-2 border-white/70" aria-hidden="true" />
          <span className="absolute bottom-2 left-2 size-5 border-b-2 border-l-2 border-white/70" aria-hidden="true" />
          <span className="absolute bottom-2 right-2 size-5 border-b-2 border-r-2 border-white/70" aria-hidden="true" />
          <Camera className="absolute inset-0 m-auto size-10 text-white/70" />
        </div>
        <div className="flex h-9 w-32 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
          ถ่ายรูป
        </div>
        <div className="w-full rounded-lg bg-warning/10 px-3 py-2 text-center text-[11px] leading-relaxed text-warning">
          โปรดถ่ายภาพเฉพาะจุดเกิดเหตุ ไม่ถ่ายใบหน้าผู้บาดเจ็บ
        </div>
      </div>
    )
  }

  if (step === 2) {
    const bars = [10, 18, 26, 16, 22]
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
          1669
        </div>
        <p className="text-sm font-semibold text-navy">กำลังติดต่อเจ้าหน้าที่ 1669</p>
        <p className="font-mono text-xs text-muted">00:14</p>
        <div className="flex h-8 items-end gap-1" aria-hidden="true">
          {bars.map((h, i) => (
            <span
              key={i}
              className="w-1.5 animate-pulse rounded-full bg-primary"
              style={{ height: h, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="flex w-full max-w-[260px] flex-col gap-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-skyblue-light">
          <div className="h-full w-3/4 rounded-full bg-primary" />
        </div>
        <div className="h-3 w-full rounded bg-skyblue-light" />
        <div className="h-3 w-5/6 rounded bg-skyblue-light" />
        <div className="h-3 w-2/3 rounded bg-skyblue-light" />
        <div className="mt-2 flex h-10 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white">
          ส่งข้อมูล
        </div>
      </div>
    )
  }

  if (step === 4) {
    return (
      <div className="relative h-52 w-full max-w-[280px] overflow-hidden rounded-2xl border border-border">
        <InteractiveMapGrid className="absolute inset-0" />
        <div className="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-emergency text-white shadow-red-glow">
          <Ambulance className="size-5" />
        </div>
        <div className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-navy shadow-card">
          ถึงใน 5 นาที
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex size-14 items-center justify-center rounded-full bg-skyblue-light text-primary">
        <Hospital className="size-7" />
      </div>
      <p className="text-sm font-bold text-navy">โรงพยาบาลจุฬาลงกรณ์</p>
      <p className="text-xs text-muted">ผู้ป่วยถึงแล้ว</p>
      <div className="flex size-10 items-center justify-center rounded-full bg-success text-white animate-scale-in">
        <Check className="size-5" />
      </div>
    </div>
  )
}

function ConnectionFlow() {
  const [active, setActive] = useState<number | null>(null)

  return (
    <div className="flex flex-col items-stretch gap-1 sm:flex-row sm:items-start sm:gap-1">
      {CONNECTION_NODES.map((node, i) => (
        <Fragment key={node.key}>
          <div className="flex flex-1 flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setActive((a) => (a === i ? null : i))}
              aria-expanded={active === i}
              aria-label={`${node.label}: ดูรายละเอียดบทบาท`}
              className={clsx(
                'flex min-h-[48px] w-full flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
                active === i
                  ? 'border-primary bg-skyblue-light shadow-card-lg'
                  : 'border-border bg-white hover:border-primary/40 hover:shadow-card-lg',
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                {node.icon}
              </span>
              <span className="text-xs font-bold text-navy sm:text-sm">{node.label}</span>
            </button>
            <div
              className={clsx(
                'overflow-hidden px-1 text-center transition-all duration-300',
                active === i ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0',
              )}
            >
              <p className="text-xs leading-relaxed text-muted">{node.detail}</p>
            </div>
          </div>
          {i < CONNECTION_NODES.length - 1 && (
            <div className="flex items-center justify-center py-1 sm:mt-5 sm:py-0">
              <ArrowRight aria-hidden="true" className="hidden size-5 shrink-0 animate-pulse text-primary/60 sm:block" />
              <ChevronDown aria-hidden="true" className="size-5 shrink-0 animate-pulse text-primary/60 sm:hidden" />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  )
}

function StepIndicator({ step, onSelect }: { step: number; onSelect: (i: number) => void }): ReactNode {
  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="flex min-w-max items-start gap-1 sm:min-w-0">
        {STEPS.map((s, i) => (
          <Fragment key={s.title}>
            <div className="flex w-16 shrink-0 flex-col items-center gap-2 sm:w-auto sm:flex-1">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={i === step ? 'step' : undefined}
                aria-label={`ไปยังขั้นตอนที่ ${i + 1}: ${s.title}`}
                className={clsx(
                  'flex size-12 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
                  i < step && 'border-primary bg-primary text-white',
                  i === step && 'border-primary bg-primary text-white animate-pulse-glow',
                  i > step && 'border-border bg-white text-muted hover:border-primary/40',
                )}
              >
                {i < step ? <Check className="size-5" /> : i + 1}
              </button>
              <span className="text-center text-[11px] font-medium leading-tight text-navy">{s.title}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={clsx(
                  'mt-6 h-1 w-8 shrink-0 rounded-full transition-colors duration-300 sm:w-auto sm:flex-1 sm:shrink',
                  i < step ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

export default function HowItWorks() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <AppShell variant="public" title="การทำงานของ ResQ">
      <section className="relative overflow-hidden px-4 py-14 sm:px-6 sm:py-16">
        <AnimatedBackground variant="howto" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold leading-tight text-navy sm:text-4xl">การทำงานของ ResQ</h1>
          <p className="mt-3 text-muted">เชื่อมต่อทุกการช่วยเหลือ ตั้งแต่แจ้งเหตุจนถึงโรงพยาบาล</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">
        <StepIndicator step={step} onSelect={setStep} />
        <p className="mt-4 text-center text-sm font-semibold text-muted">
          ขั้นตอนที่ {step + 1} จาก {STEPS.length}
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center lg:gap-10">
          <div>
            <span className="inline-flex items-center rounded-full bg-skyblue-light px-3 py-1 text-xs font-bold text-primary">
              ขั้นตอนที่ {step + 1}
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-navy">{current.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{current.description}</p>
            <div className="mt-4 rounded-xl border border-border bg-skyblue-pale/60 p-4">
              <p className="text-xs font-bold text-primary">การดำเนินการ</p>
              <p className="mt-1 text-sm font-medium text-navy">{current.action}</p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                  ขั้นตอนก่อนหน้า
                </Button>
              )}
              {isLast ? (
                <Button variant="primary" onClick={() => navigate('/')}>
                  เริ่มต้นใช้งาน
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
                  ขั้นตอนถัดไป
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => navigate('/public/emergency-photo')}
                icon={<PhoneCall className="size-4" />}
              >
                ติดต่อเจ้าหน้าที่
              </Button>
            </div>
          </div>

          <div
            key={step}
            className="flex min-h-[280px] w-full flex-col items-center justify-center rounded-3xl border border-border bg-white p-6 shadow-card animate-fade-in"
          >
            <StepPreview step={step} />
          </div>
        </div>
      </section>

      <section className="bg-skyblue-pale/60 px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-xl font-bold text-navy sm:text-2xl">การเชื่อมต่อทุกฝ่ายในระบบ ResQ</h2>
          <p className="mt-2 text-center text-sm text-muted">กดที่แต่ละจุดเพื่อดูบทบาทของแต่ละฝ่าย</p>
          <div className="mt-8">
            <ConnectionFlow />
          </div>
        </div>
      </section>
    </AppShell>
  )
}
