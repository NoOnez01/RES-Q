import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
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
import { Button } from '@/components/ui/Button'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ติดต่อเจ้าหน้าที่: 'Contact responders',
  แตะปุ่มวงกลมสีแดงบนหน้าหลักเพื่อเริ่มขอความช่วยเหลือฉุกเฉินได้ทันที:
    'Tap the red circle button on the home page to start requesting emergency help right away',
  'แตะปุ่ม "ติดต่อเจ้าหน้าที่" และยืนยันเพื่อเริ่มต้น': 'Tap "Contact responders" and confirm to begin',
  ถ่ายภาพจุดเกิดเหตุ: 'Photograph the scene',
  'ถ่ายภาพบริเวณที่เกิดเหตุเพื่อช่วยให้เจ้าหน้าที่ประเมินสถานการณ์ได้แม่นยำขึ้น หรือข้ามขั้นตอนนี้ได้หากไม่สะดวก':
    'Take a photo of the scene to help responders assess the situation more accurately, or skip this step if you can\'t',
  'ถ่ายภาพจุดเกิดเหตุ หรือแตะ "ข้ามขั้นตอนนี้" เพื่อดำเนินการต่อ': 'Photograph the scene, or tap "Skip" to continue',
  'โทร 1669': 'Call 1669',
  'ระบบจะเชื่อมต่อไปยังสายด่วนการแพทย์ฉุกเฉิน 1669 เพื่อแจ้งเหตุกับเจ้าหน้าที่โดยตรง':
    'The app connects you directly to the 1669 emergency medical hotline to report the incident',
  'รอการเชื่อมต่อสาย แล้วแจ้งอาการเบื้องต้นแก่เจ้าหน้าที่': 'Wait for the call to connect and describe the situation to the responder',
  ส่งรายละเอียดเหตุการณ์: 'Send incident details',
  'กรอกตำแหน่ง อาการ และรายละเอียดของผู้บาดเจ็บ เพื่อส่งให้ศูนย์สั่งการ 1669 และหน่วยกู้ชีพที่เกี่ยวข้อง':
    "Fill in the location, condition, and details of the injured person to send to Center 1669 and the assigned rescue team",
  กรอกแบบฟอร์มรายละเอียดเหตุการณ์ให้ครบถ้วนแล้วกดส่งข้อมูล: 'Fill out the incident form completely and submit it',
  หน่วยกู้ชีพเข้าช่วยเหลือ: 'Rescue team responds',
  'หน่วยกู้ชีพที่ได้รับมอบหมายจะเดินทางไปยังจุดเกิดเหตุ พร้อมระบบติดตามตำแหน่งและเวลาถึงโดยประมาณ':
    'The assigned rescue team travels to the scene, with live location tracking and an estimated arrival time',
  ติดตามสถานะและตำแหน่งของหน่วยกู้ชีพได้ตามเวลาจริง: "Track the rescue team's status and location in real time",
  นำส่งโรงพยาบาล: 'Transport to hospital',
  'หน่วยกู้ชีพนำผู้บาดเจ็บส่งโรงพยาบาลที่เตรียมทีมรักษาไว้ล่วงหน้า และยืนยันการรับตัวผู้ป่วย':
    'The rescue team transports the patient to a hospital that has already prepared its care team, and confirms admission',
  'ตรวจสอบสถานะ "ผู้ป่วยถึงแล้ว" เพื่อยืนยันว่าการช่วยเหลือเสร็จสมบูรณ์':
    'Check the "patient arrived" status to confirm the response is complete',
  บุคคลทั่วไป: 'Public',
  'แจ้งเหตุ ถ่ายภาพ และติดตามสถานะการช่วยเหลือ': 'Reports incidents, takes photos, and tracks help status',
  'ศูนย์สั่งการ 1669': 'Dispatch Center 1669',
  'รับแจ้งเหตุ ประเมินความรุนแรง และมอบหมายหน่วยกู้ชีพ': 'Takes reports, assesses severity, and assigns rescue teams',
  หน่วยกู้ชีพ: 'Rescue team',
  'เดินทางไปช่วยเหลือ บันทึกอาการ และนำส่งโรงพยาบาล': 'Travels to help, records the patient condition, and transports to hospital',
  โรงพยาบาล: 'Hospital',
  เตรียมทีมรักษาและยืนยันการรับผู้ป่วย: 'Prepares the care team and confirms patient admission',
  'กรุณาถ่ายภาพเฉพาะจุดเกิดเหตุ ไม่ถ่ายใบหน้าผู้บาดเจ็บ': "Please photograph only the scene, not the injured person's face",
  ถ่ายภาพ: 'Take photo',
  'กำลังติดต่อศูนย์สั่งการ 1669': 'Contacting 1669',
  ส่งข้อมูล: 'Submit',
  'ถึงใน 5 นาที': 'Arriving in 5 min',
  โรงพยาบาลจุฬาลงกรณ์: 'Chulalongkorn Hospital',
  ผู้ป่วยถึงแล้ว: 'Patient arrived',
  '{label}: ดูรายละเอียดบทบาท': "{label}: view this role's details",
  'ไปยังขั้นตอนที่ {n}: {title}': 'Go to step {n}: {title}',
  'การทำงานของ ResQ': 'How ResQ works',
  'เชื่อมต่อทุกการช่วยเหลือ ตั้งแต่แจ้งเหตุจนถึงโรงพยาบาล': 'Connecting every step of the response, from report to hospital',
  'ขั้นตอนที่ {n} จาก {total}': 'Step {n} of {total}',
  'ขั้นตอนที่ {n}': 'Step {n}',
  การดำเนินการ: 'Actions',
  ขั้นตอนก่อนหน้า: 'Previous step',
  เริ่มต้นใช้งาน: 'Get started',
  ขั้นตอนถัดไป: 'Next step',
  'การเชื่อมต่อทุกฝ่ายในระบบ ResQ': 'How everyone connects in ResQ',
  แตะที่แต่ละจุดเพื่อดูบทบาทของแต่ละฝ่าย: 'Tap a point to see each role',
})

interface StepData {
  title: string
  description: string
  action: string
}

const STEPS: StepData[] = [
  {
    title: 'ติดต่อเจ้าหน้าที่',
    description: 'แตะปุ่มวงกลมสีแดงบนหน้าหลักเพื่อเริ่มขอความช่วยเหลือฉุกเฉินได้ทันที',
    action: 'แตะปุ่ม "ติดต่อเจ้าหน้าที่" และยืนยันเพื่อเริ่มต้น',
  },
  {
    title: 'ถ่ายภาพจุดเกิดเหตุ',
    description: 'ถ่ายภาพบริเวณที่เกิดเหตุเพื่อช่วยให้เจ้าหน้าที่ประเมินสถานการณ์ได้แม่นยำขึ้น หรือข้ามขั้นตอนนี้ได้หากไม่สะดวก',
    action: 'ถ่ายภาพจุดเกิดเหตุ หรือแตะ "ข้ามขั้นตอนนี้" เพื่อดำเนินการต่อ',
  },
  {
    title: 'โทร 1669',
    description: 'ระบบจะเชื่อมต่อไปยังสายด่วนการแพทย์ฉุกเฉิน 1669 เพื่อแจ้งเหตุกับเจ้าหน้าที่โดยตรง',
    action: 'รอการเชื่อมต่อสาย แล้วแจ้งอาการเบื้องต้นแก่เจ้าหน้าที่',
  },
  {
    title: 'ส่งรายละเอียดเหตุการณ์',
    description: 'กรอกตำแหน่ง อาการ และรายละเอียดของผู้บาดเจ็บ เพื่อส่งให้ศูนย์สั่งการ 1669 และหน่วยกู้ชีพที่เกี่ยวข้อง',
    action: 'กรอกแบบฟอร์มรายละเอียดเหตุการณ์ให้ครบถ้วนแล้วกดส่งข้อมูล',
  },
  {
    title: 'หน่วยกู้ชีพเข้าช่วยเหลือ',
    description: 'หน่วยกู้ชีพที่ได้รับมอบหมายจะเดินทางไปยังจุดเกิดเหตุ พร้อมระบบติดตามตำแหน่งและเวลาถึงโดยประมาณ',
    action: 'ติดตามสถานะและตำแหน่งของหน่วยกู้ชีพได้ตามเวลาจริง',
  },
  {
    title: 'นำส่งโรงพยาบาล',
    description: 'หน่วยกู้ชีพนำผู้บาดเจ็บส่งโรงพยาบาลที่เตรียมทีมรักษาไว้ล่วงหน้า และยืนยันการรับตัวผู้ป่วย',
    action: 'ตรวจสอบสถานะ "ผู้ป่วยถึงแล้ว" เพื่อยืนยันว่าการช่วยเหลือเสร็จสมบูรณ์',
  },
]

const CONNECTION_NODES = [
  {
    key: 'public',
    label: 'บุคคลทั่วไป',
    icon: <Users className="size-5" />,
    detail: 'แจ้งเหตุ ถ่ายภาพ และติดตามสถานะการช่วยเหลือ',
  },
  {
    key: 'center',
    label: 'ศูนย์สั่งการ 1669',
    icon: <PhoneCall className="size-5" />,
    detail: 'รับแจ้งเหตุ ประเมินความรุนแรง และมอบหมายหน่วยกู้ชีพ',
  },
  {
    key: 'rescue',
    label: 'หน่วยกู้ชีพ',
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
  const t = useT()
  if (step === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-[132px] items-center justify-center rounded-full bg-emergency text-white shadow-red-glow ring-8 ring-emergency/[0.08]">
          <PhoneCall className="size-9" strokeWidth={2} />
        </div>
        <p className="text-sm font-semibold text-ink">{t('ติดต่อเจ้าหน้าที่')}</p>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="flex w-full max-w-[240px] flex-col items-center gap-3">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-navy">
          <span className="absolute left-2 top-2 size-5 border-l-2 border-t-2 border-white/70" aria-hidden="true" />
          <span className="absolute right-2 top-2 size-5 border-r-2 border-t-2 border-white/70" aria-hidden="true" />
          <span className="absolute bottom-2 left-2 size-5 border-b-2 border-l-2 border-white/70" aria-hidden="true" />
          <span className="absolute bottom-2 right-2 size-5 border-b-2 border-r-2 border-white/70" aria-hidden="true" />
          <Camera className="absolute inset-0 m-auto size-10 text-white/70" />
        </div>
        <div className="flex h-9 w-32 items-center justify-center rounded-lg bg-primary-fill text-xs font-medium text-white">
          {t('ถ่ายภาพ')}
        </div>
        <div className="w-full rounded-lg border border-warning/30 bg-warning/[0.08] px-3 py-2 text-center text-[11px] leading-relaxed text-warning-ink">
          {t('กรุณาถ่ายภาพเฉพาะจุดเกิดเหตุ ไม่ถ่ายใบหน้าผู้บาดเจ็บ')}
        </div>
      </div>
    )
  }

  if (step === 2) {
    const bars = [10, 18, 26, 16, 22]
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-full border border-primary/25 text-sm font-semibold tabular-nums text-primary">
          1669
        </div>
        <p className="text-sm font-semibold text-ink">{t('กำลังติดต่อศูนย์สั่งการ 1669')}</p>
        <p className="font-mono text-xs text-muted">00:14</p>
        <div className="flex h-8 items-end gap-1" aria-hidden="true">
          {bars.map((h, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-primary/70"
              style={{ height: h }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="flex w-full max-w-[260px] flex-col gap-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-skyblue-light">
          <div className="h-full w-3/4 rounded-full bg-primary" />
        </div>
        <div className="h-3 w-full rounded bg-skyblue-light" />
        <div className="h-3 w-5/6 rounded bg-skyblue-light" />
        <div className="h-3 w-2/3 rounded bg-skyblue-light" />
        <div className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-primary-fill text-sm font-medium text-white">
          {t('ส่งข้อมูล')}
        </div>
      </div>
    )
  }

  if (step === 4) {
    return (
      <div className="relative h-52 w-full max-w-[280px] overflow-hidden rounded-xl border border-border bg-surface-alt">
        {/* A schematic street map: a few roads and the route along them. */}
        <svg className="absolute inset-0 size-full text-border" viewBox="0 0 280 208" preserveAspectRatio="none" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="10" fill="none">
            <path d="M0 60 H280" />
            <path d="M0 150 H280" />
            <path d="M70 0 V208" />
            <path d="M200 0 V208" />
          </g>
          <path d="M70 208 V150 H200 V60 H280" fill="none" stroke="rgb(var(--color-primary))" strokeWidth="3" strokeLinejoin="round" />
        </svg>
        <div className="absolute left-[71%] top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-emergency text-white ring-4 ring-surface">
          <Ambulance className="size-4" />
        </div>
        <div className="absolute right-2 top-2 rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink">
          {t('ถึงใน 5 นาที')}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex size-12 items-center justify-center rounded-full border border-border text-primary">
        <Hospital className="size-6" />
      </div>
      <p className="text-sm font-semibold text-ink">{t('โรงพยาบาลจุฬาลงกรณ์')}</p>
      <p className="text-xs text-muted">{t('ผู้ป่วยถึงแล้ว')}</p>
      <div className="flex size-9 items-center justify-center rounded-full bg-success-ink text-white animate-scale-in">
        <Check className="size-5" />
      </div>
    </div>
  )
}

function ConnectionFlow() {
  const [active, setActive] = useState<number | null>(null)
  const t = useT()

  return (
    <div className="flex flex-col items-stretch gap-1 sm:flex-row sm:items-start sm:gap-1">
      {CONNECTION_NODES.map((node, i) => (
        <Fragment key={node.key}>
          <div className="flex flex-1 flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setActive((a) => (a === i ? null : i))}
              aria-expanded={active === i}
              aria-label={t('{label}: ดูรายละเอียดบทบาท', { label: t(node.label) })}
              className={clsx(
                'flex min-h-[48px] w-full flex-col items-center gap-2 rounded-xl border px-3 py-3.5 transition-colors',
                active === i ? 'border-primary bg-primary/[0.04] ring-1 ring-primary' : 'border-border bg-surface hover:border-input hover:bg-surface-alt',
              )}
            >
              <span className="text-primary [&>svg]:size-5">{node.icon}</span>
              <span className="text-xs font-semibold text-ink sm:text-sm">{t(node.label)}</span>
            </button>
            <div
              className={clsx(
                'overflow-hidden px-1 text-center transition-all duration-300',
                active === i ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0',
              )}
            >
              <p className="text-xs leading-relaxed text-muted">{t(node.detail)}</p>
            </div>
          </div>
          {i < CONNECTION_NODES.length - 1 && (
            <div className="flex items-center justify-center py-1 sm:mt-5 sm:py-0">
              <ArrowRight aria-hidden="true" className="hidden size-4 shrink-0 text-muted/60 sm:block" />
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted/60 sm:hidden" />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  )
}

function StepIndicator({ step, onSelect }: { step: number; onSelect: (i: number) => void }): ReactNode {
  const activeRef = useRef<HTMLButtonElement>(null)
  const t = useT()

  // On narrow screens this row overflows and scrolls (no-scrollbar hides the
  // native scrollbar for looks) -- without this, advancing past whichever
  // steps fit in the initial viewport scrolls the highlighted dot out of
  // view, so the indicator looks like it lost track of progress even though
  // the step content below is correct.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [step])

  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="flex min-w-max items-start gap-1 sm:min-w-0">
        {STEPS.map((s, i) => (
          <Fragment key={s.title}>
            <div className="flex w-16 shrink-0 flex-col items-center gap-2 sm:w-auto sm:flex-1">
              <button
                ref={i === step ? activeRef : undefined}
                type="button"
                onClick={() => onSelect(i)}
                aria-current={i === step ? 'step' : undefined}
                aria-label={t('ไปยังขั้นตอนที่ {n}: {title}', { n: i + 1, title: t(s.title) })}
                className={clsx(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold tabular-nums transition-colors',
                  i < step && 'border-primary bg-primary-fill text-white',
                  i === step && 'border-primary bg-surface text-primary ring-4 ring-primary/15',
                  i > step && 'border-input bg-surface text-muted hover:border-muted hover:text-ink',
                )}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </button>
              <span className={clsx('text-center text-[11px] leading-tight', i === step ? 'font-semibold text-ink' : 'font-medium text-muted')}>
                {t(s.title)}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={clsx(
                  'mt-4 h-px w-8 shrink-0 transition-colors duration-300 sm:w-auto sm:flex-1 sm:shrink',
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
  const t = useT()

  return (
    <AppShell variant="public">
      <section className="border-b border-border bg-surface px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-[1.75rem] font-bold leading-snug tracking-tight text-ink sm:text-display">{t('การทำงานของ ResQ')}</h1>
          <p className="mt-2 max-w-2xl text-body text-muted">{t('เชื่อมต่อทุกการช่วยเหลือ ตั้งแต่แจ้งเหตุจนถึงโรงพยาบาล')}</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-8 pt-10 sm:px-6">
        <StepIndicator step={step} onSelect={setStep} />
        <p className="mt-4 text-center text-meta font-medium text-muted">
          {t('ขั้นตอนที่ {n} จาก {total}', { n: step + 1, total: STEPS.length })}
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center lg:gap-10">
          <div>
            <h2 className="text-title text-ink">
              <span className="mr-2 tabular-nums text-muted">{step + 1}.</span>
              {t(current.title)}
            </h2>
            <p className="mt-3 text-body text-muted">{t(current.description)}</p>
            <div className="mt-5 rounded-xl border border-border bg-surface p-4">
              <p className="text-meta font-medium text-muted">{t('การดำเนินการ')}</p>
              <p className="mt-1 text-sm font-medium text-ink">{t(current.action)}</p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                  {t('ขั้นตอนก่อนหน้า')}
                </Button>
              )}
              {isLast ? (
                <Button variant="primary" onClick={() => navigate('/')}>
                  {t('เริ่มต้นใช้งาน')}
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
                  {t('ขั้นตอนถัดไป')}
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => navigate('/public/emergency-photo')}
                icon={<PhoneCall className="size-4" />}
              >
                {t('ติดต่อเจ้าหน้าที่')}
              </Button>
            </div>
          </div>

          <div
            key={step}
            className="flex min-h-[280px] w-full flex-col items-center justify-center rounded-2xl border border-border bg-surface p-6 animate-fade-in"
          >
            <StepPreview step={step} />
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface px-4 py-12 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-[1.375rem] font-bold leading-snug text-ink">{t('การเชื่อมต่อทุกฝ่ายในระบบ ResQ')}</h2>
          <p className="mt-2 text-small text-muted">{t('แตะที่แต่ละจุดเพื่อดูบทบาทของแต่ละฝ่าย')}</p>
          <div className="mt-8">
            <ConnectionFlow />
          </div>
        </div>
      </section>
    </AppShell>
  )
}
