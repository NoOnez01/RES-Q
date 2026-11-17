import clsx from 'clsx'
import type { CaseStatus } from '@/lib/types'
import { statusMeta } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ติดต่อเจ้าหน้าที่แล้ว: 'Contacted responders',
  ถ่ายภาพจุดเกิดเหตุแล้ว: 'Photographed the scene',
  'ติดต่อศูนย์ 1669 แล้ว': 'Contacted 1669',
  รับแจ้งเหตุแล้ว: 'Report received',
  กำลังค้นหาหน่วยกู้ชีพ: 'Finding a rescue team',
  มอบหมายหน่วยกู้ชีพแล้ว: 'Rescue team assigned',
  หน่วยกู้ชีพกำลังเดินทาง: 'Rescue team en route',
  ถึงจุดเกิดเหตุแล้ว: 'Arrived at the scene',
  เข้าช่วยเหลือแล้ว: 'Assisting',
  กำลังนำส่งโรงพยาบาล: 'Transporting to hospital',
  ถึงโรงพยาบาลแล้ว: 'Arrived at the hospital',
  โรงพยาบาลรับผู้ป่วยแล้ว: 'Hospital admitted patient',
  เสร็จสิ้น: 'Completed',
  ประชาชน: 'Public',
  'ศูนย์สั่งการ 1669': 'Dispatch Center 1669',
  หน่วยกู้ชีพ: 'Rescue team',
  โรงพยาบาล: 'Hospital',
  ระบบ: 'System',
})

/** Text + dot tone per stage: red while the report is still reaching
 * 1669, amber while 1669 is finding a team, blue while help is under way,
 * green once it's done. */
function toneFor(status: CaseStatus): { classes: string; dot: string } {
  if (status === 'completed') return { classes: 'bg-success/10 text-success-ink border-success/25', dot: 'bg-success' }
  if (status === 'received' || status === 'finding-rescue')
    return { classes: 'bg-warning/10 text-warning-ink border-warning/25', dot: 'bg-warning' }
  if (status === 'contacted' || status === 'photos-taken' || status === 'called-1669')
    return { classes: 'bg-emergency/[0.07] text-emergency-dark border-emergency/25 dark:text-emergency', dot: 'bg-emergency' }
  return { classes: 'bg-primary/[0.07] text-primary border-primary/20', dot: 'bg-primary' }
}

export function StatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  const meta = statusMeta(status)
  const { classes, dot } = toneFor(status)
  const t = useT()
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold leading-5',
        classes,
        className,
      )}
    >
      <span className={clsx('size-1.5 shrink-0 rounded-full', dot)} aria-hidden="true" />
      {t(meta.label)}
    </span>
  )
}
