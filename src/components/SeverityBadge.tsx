import clsx from 'clsx'
import { AlertTriangle, AlertOctagon, AlertCircle, Info, CheckCircle2 } from 'lucide-react'
import type { Severity } from '@/lib/types'
import { SEVERITY_SHORT_LABEL } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  วิกฤต: 'Critical',
  ฉุกเฉิน: 'Emergency',
  เร่งด่วน: 'Urgent',
  ไม่เร่งด่วน: 'Less urgent',
  ทั่วไป: 'General',
})

const config: Record<Severity, { classes: string; icon: React.ElementType }> = {
  1: { classes: 'bg-emergency text-white border-emergency', icon: AlertOctagon },
  2: { classes: 'bg-warning/10 text-warning-ink border-warning/30', icon: AlertTriangle },
  3: { classes: 'bg-moderate/15 text-moderate-ink border-moderate/40', icon: AlertCircle },
  4: { classes: 'bg-primary/[0.07] text-primary border-primary/20', icon: Info },
  5: { classes: 'bg-surface-alt text-muted border-border', icon: CheckCircle2 },
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const { classes, icon: Icon } = config[severity]
  const t = useT()
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold leading-5',
        classes,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {t(SEVERITY_SHORT_LABEL[severity])}
    </span>
  )
}
