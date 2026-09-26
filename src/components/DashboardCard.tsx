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
        'grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-card sm:flex [&>*]:bg-surface [&>*:last-child:nth-child(odd)]:col-span-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

const TONE_TEXT: Record<string, string> = {
  primary: 'text-primary',
  emergency: 'text-emergency',
  success: 'text-success',
  warning: 'text-warning',
}

/** One figure: its label (with the tone's icon) over the number. `alert`
 * turns the number itself red -- for a count that means something is
 * waiting on this role right now, never for decoration. */
export function StatItem({
  label,
  value,
  icon,
  tone = 'primary',
  alert = false,
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  tone?: 'primary' | 'emergency' | 'success' | 'warning'
  alert?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-5 py-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        {icon && <span className={clsx('shrink-0 [&>svg]:size-4', TONE_TEXT[tone])}>{icon}</span>}
        <span className="leading-snug">{label}</span>
      </p>
      <p className={clsx('text-2xl font-bold leading-none tabular-nums', alert ? 'text-emergency' : 'text-ink')}>{value}</p>
    </div>
  )
}
