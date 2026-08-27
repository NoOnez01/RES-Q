import clsx from 'clsx'
import { AlertTriangle, AlertOctagon, AlertCircle, Info, CheckCircle2 } from 'lucide-react'
import type { Severity } from '@/lib/types'
import { SEVERITY_SHORT_LABEL } from '@/lib/types'
import { PulseRing } from './backgrounds/PulseRing'

const config: Record<Severity, { classes: string; icon: React.ElementType }> = {
  1: { classes: 'bg-emergency/10 text-emergency-dark border-emergency/30', icon: AlertOctagon },
  2: { classes: 'bg-warning/10 text-warning border-warning/30', icon: AlertTriangle },
  3: { classes: 'bg-moderate/15 text-[#8a6d00] border-moderate/40', icon: AlertCircle },
  4: { classes: 'bg-primary/10 text-primary border-primary/30', icon: Info },
  5: { classes: 'bg-muted/10 text-muted border-border', icon: CheckCircle2 },
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const { classes, icon: Icon } = config[severity]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap',
        classes,
        className,
      )}
    >
      {severity === 1 && <PulseRing tone="emergency" size="sm" />}
      <Icon className="size-3.5" />
      {SEVERITY_SHORT_LABEL[severity]}
    </span>
  )
}
