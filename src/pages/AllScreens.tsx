import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { ChevronRight, Lock } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useStore } from '@/lib/store'

interface ScreenEntry {
  label: string
  path: string
}

const STATIC_GROUPS: { title: string; items: ScreenEntry[] }[] = [
  {
    title: 'สาธารณะและการเข้าสู่ระบบ',
    items: [
      { label: 'หน้าหลัก', path: '/' },
      { label: 'เลือกบทบาท', path: '/role-selection' },
      { label: 'เข้าสู่ระบบ', path: '/login' },
      { label: 'สมัครสมาชิก', path: '/register' },
      { label: 'สมัครสมาชิก (ประชาชน)', path: '/register/public' },
      { label: 'สมัครสมาชิก (หน่วยกู้ภัย)', path: '/register/rescue' },
      { label: 'สมัครสมาชิก (ศูนย์สั่งการ)', path: '/register/dispatch' },
      { label: 'สมัครสมาชิก (โรงพยาบาล)', path: '/register/hospital' },
    ],
  },
  {
    title: 'การแจ้งเหตุฉุกเฉิน',
    items: [
      { label: 'ถ่ายรูปจุดเกิดเหตุ', path: '/public/emergency-photo' },
      { label: 'ติดต่อ 1669', path: '/public/call-1669' },
      { label: 'กรอกรายละเอียดเหตุการณ์', path: '/public/emergency-details' },
    ],
  },
  {
    title: 'ศูนย์สั่งการ 1669',
    items: [
      { label: 'แดชบอร์ดศูนย์สั่งการ', path: '/dispatch/dashboard' },
      { label: 'สายเรียกเข้า', path: '/dispatch/incoming-call' },
    ],
  },
  {
    title: 'หน่วยกู้ภัย',
    items: [{ label: 'แดชบอร์ดหน่วยกู้ภัย', path: '/rescue/dashboard' }],
  },
  {
    title: 'โรงพยาบาล',
    items: [{ label: 'แดชบอร์ดโรงพยาบาล', path: '/hospital/dashboard' }],
  },
  {
    title: 'อื่น ๆ',
    items: [
      { label: 'เลือกโรงพยาบาล', path: '/hospital-selection' },
      { label: 'การแจ้งเตือน', path: '/notifications' },
      { label: 'ตั้งค่า', path: '/settings' },
      { label: 'ประวัติเคส', path: '/case-history' },
      { label: 'หน้าทั้งหมด', path: '/all-screens' },
    ],
  },
]

function caseScreens(caseId: string): ScreenEntry[] {
  return [
    { label: 'ติดตามเคส (ประชาชน)', path: `/public/case/${caseId}` },
    { label: 'รายละเอียดเคส (ศูนย์สั่งการ)', path: `/dispatch/case/${caseId}` },
    { label: 'กรอกรายละเอียดเหตุการณ์ (ศูนย์สั่งการ)', path: `/dispatch/emergency-details/${caseId}` },
    { label: 'รายละเอียดเคส (หน่วยกู้ภัย)', path: `/rescue/case/${caseId}` },
    { label: 'รายละเอียดเคส (โรงพยาบาล)', path: `/hospital/case/${caseId}` },
    { label: 'บันทึกข้อมูลผู้ป่วย', path: `/rescue/patient-record/${caseId}` },
    { label: 'แผนที่นำทาง', path: `/navigation/${caseId}` },
  ]
}

export default function AllScreens() {
  const navigate = useNavigate()
  const cases = useStore((s) => s.cases)

  const latestCaseId = useMemo(() => {
    const all = Object.values(cases).sort((a, b) => b.createdAt - a.createdAt)
    return all[0]?.id
  }, [cases])

  const caseItems = latestCaseId ? caseScreens(latestCaseId) : null

  return (
    <AppShell variant="public" title="หน้าทั้งหมด">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        {STATIC_GROUPS.map((group, gi) => (
          <section
            key={group.title}
            className="animate-fade-in-up"
            style={{ animationDelay: `${gi * 50}ms`, animationFillMode: 'backwards' }}
          >
            <h2 className="mb-3 text-lg font-bold text-navy">{group.title}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {group.items.map((item, ii) => (
                <ScreenButton
                  key={item.path}
                  label={item.label}
                  onClick={() => navigate(item.path)}
                  delayMs={ii * 30}
                />
              ))}
            </div>
          </section>
        ))}

        <section
          className="animate-fade-in-up"
          style={{ animationDelay: `${STATIC_GROUPS.length * 50}ms`, animationFillMode: 'backwards' }}
        >
          <h2 className="mb-3 text-lg font-bold text-navy">ตัวอย่างเคส</h2>
          {caseItems ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {caseItems.map((item, ii) => (
                <ScreenButton
                  key={item.path}
                  label={item.label}
                  onClick={() => navigate(item.path)}
                  delayMs={ii * 30}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {caseScreens('demo').map((item, ii) => (
                <ScreenButton
                  key={item.path}
                  label={item.label}
                  disabled
                  note="ต้องมีเคสตัวอย่างก่อน — ลองเริ่มจากปุ่มติดต่อเจ้าหน้าที่ที่หน้าหลัก"
                  delayMs={ii * 30}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}

function ScreenButton({
  label,
  onClick,
  disabled,
  note,
  delayMs = 0,
}: {
  label: string
  onClick?: () => void
  disabled?: boolean
  note?: string
  delayMs?: number
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={note ? `${label} — ${note}` : label}
      className={clsx(
        'flex w-full min-h-[48px] items-center gap-3 rounded-xl border border-border bg-white p-4 text-left shadow-card transition-all animate-fade-in-up',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30',
        disabled
          ? 'cursor-not-allowed opacity-60'
          : 'hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-card-lg active:scale-[0.98]',
      )}
      style={{ animationDelay: `${delayMs}ms`, animationFillMode: 'backwards' }}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-navy">{label}</p>
        {note && <p className="mt-1 text-xs text-muted">{note}</p>}
      </div>
      {disabled ? (
        <Lock className="size-4 shrink-0 text-muted" />
      ) : (
        <ChevronRight className="size-4 shrink-0 text-muted" />
      )}
    </button>
  )
}
