import clsx from 'clsx'
import { CheckCircle2, Clock, Loader2, Siren } from 'lucide-react'
import type { CaseStatus } from '@/lib/types'
import { statusMeta } from '@/lib/types'
import { PulseRing } from './backgrounds/PulseRing'

function toneFor(status: CaseStatus): { classes: string; icon: React.ElementType } {
  if (status === 'completed') return { classes: 'bg-success/10 text-success border-success/30', icon: CheckCircle2 }
  if (status === 'received' || status === 'finding-rescue')
    return { classes: 'bg-warning/10 text-warning border-warning/30', icon: Loader2 }
  if (status === 'contacted' || status === 'photos-taken' || status === 'called-1669')
    return { classes: 'bg-emergency/10 text-emergency-dark border-emergency/30', icon: Siren }
  return { classes: 'bg-primary/10 text-primary border-primary/30', icon: Clock }
}

const LIVE_STATUSES: CaseStatus[] = [
  'finding-rescue',
  'rescue-assigned',
  'rescue-en-route',
  'rescue-arrived',
  'assisted',
  'transporting',
  'hospital-arrived',
]

export function StatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  const meta = statusMeta(status)
  const { classes, icon: Icon } = toneFor(status)
  const spinning = status === 'finding-rescue' || status === 'rescue-en-route' || status === 'transporting'
  const isLive = LIVE_STATUSES.includes(status)
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap',
        classes,
        className,
      )}
    >
      {isLive && <PulseRing tone="primary" size="sm" />}
      <Icon className={clsx('size-3.5', spinning && 'animate-spin-slow')} />
      {meta.label}
    </span>
  )
}
