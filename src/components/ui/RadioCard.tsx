import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

interface RadioCardProps {
  selected: boolean
  onClick: () => void
  title: string
  description?: string
  icon?: ReactNode
  /** Small pill rendered next to the title, e.g. an equipment-match status. */
  badge?: ReactNode
  tone?: 'default' | 'emergency' | 'warning' | 'moderate' | 'success'
  className?: string
}

const toneRing: Record<NonNullable<RadioCardProps['tone']>, string> = {
  default: 'border-primary bg-primary/[0.04] ring-1 ring-primary',
  emergency: 'border-emergency bg-emergency/[0.04] ring-1 ring-emergency',
  warning: 'border-warning bg-warning/[0.06] ring-1 ring-warning',
  moderate: 'border-moderate bg-moderate/10 ring-1 ring-moderate',
  success: 'border-success bg-success/[0.05] ring-1 ring-success',
}

export function RadioCard({
  selected,
  onClick,
  title,
  description,
  icon,
  badge,
  tone = 'default',
  className,
}: RadioCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        'relative flex w-full items-start gap-3 rounded-xl border bg-surface p-3.5 text-left transition-colors',
        selected ? toneRing[tone] : 'border-input hover:border-muted/50 hover:bg-surface-alt',
        className,
      )}
    >
      {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold text-ink">{title}</p>
          {badge}
        </div>
        {description && <p className="mt-0.5 text-small text-muted">{description}</p>}
      </div>
      <div
        className={clsx(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-primary bg-primary' : 'border-input bg-surface',
        )}
        aria-hidden="true"
      >
        {selected && <Check className="size-3 text-white" strokeWidth={3} />}
      </div>
    </button>
  )
}
