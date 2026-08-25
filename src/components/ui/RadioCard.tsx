import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

interface RadioCardProps {
  selected: boolean
  onClick: () => void
  title: string
  description?: string
  icon?: ReactNode
  tone?: 'default' | 'emergency' | 'warning' | 'moderate' | 'success'
  className?: string
}

const toneRing: Record<NonNullable<RadioCardProps['tone']>, string> = {
  default: 'border-primary bg-skyblue-light',
  emergency: 'border-emergency bg-emergency/5',
  warning: 'border-warning bg-warning/5',
  moderate: 'border-moderate bg-moderate/10',
  success: 'border-success bg-success/5',
}

export function RadioCard({
  selected,
  onClick,
  title,
  description,
  icon,
  tone = 'default',
  className,
}: RadioCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        'relative flex w-full items-start gap-3 rounded-2xl border-2 bg-white p-4 text-left transition-all',
        'hover:border-primary/60 hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
        selected ? toneRing[tone] : 'border-border',
        className,
      )}
    >
      {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-navy">{title}</p>
        {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
      </div>
      <div
        className={clsx(
          'flex size-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5',
          selected ? 'border-primary bg-primary' : 'border-border bg-white',
        )}
      >
        {selected && <Check className="size-3.5 text-white" strokeWidth={3} />}
      </div>
    </button>
  )
}
