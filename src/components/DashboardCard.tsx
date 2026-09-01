import clsx from 'clsx'
import type { ReactNode } from 'react'

/** A row of key numbers presented as one bordered/shadowed bar with
 * internal dividers, not N separate boxed cards -- the same figures read
 * as one "here's where things stand" statement instead of a wall of
 * identical tiles. Wrap a set of <StatItem>s in this. */
export function StatBar({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={clsx(
        'flex flex-col divide-y divide-border rounded-2xl border border-border bg-white shadow-card sm:flex-row sm:divide-x sm:divide-y-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

const TONE_CLASSES: Record<string, string> = {
  primary: 'bg-skyblue-light text-primary',
  emergency: 'bg-emergency/10 text-emergency',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
}

export function StatItem({
  label,
  value,
  icon,
  tone = 'primary',
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  tone?: 'primary' | 'emergency' | 'success' | 'warning'
}) {
  return (
    <div className="flex flex-1 items-center gap-3 p-4">
      {icon && (
        <span className={clsx('flex size-10 shrink-0 items-center justify-center rounded-xl', TONE_CLASSES[tone])}>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-none text-navy">{value}</p>
        <p className="mt-1.5 text-xs font-medium text-muted">{label}</p>
      </div>
    </div>
  )
}
