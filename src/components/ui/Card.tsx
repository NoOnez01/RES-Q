import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

/** A working surface: white, one hairline, no lift. Hierarchy inside it
 * comes from type and dividers, never from a nested box. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  // A caller's own padding replaces the default rather than fighting it in
  // the cascade (where p-5 would win over p-0 by source order).
  const ownPadding = /(^|\s)!?p-/.test(className ?? '')
  return <div className={clsx('rounded-2xl border border-border bg-surface', !ownPadding && 'p-5', className)} {...props} />
}

/** The title row of a Card: a section title, optional supporting line, and
 * actions aligned to the right. */
export function CardHeader({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex flex-wrap items-start justify-between gap-x-4 gap-y-2', className)}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-heading text-ink [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted">
          {icon}
          {title}
        </h2>
        {description && <p className="mt-0.5 text-small text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** A page's own header: title, one line of context, and the page-level
 * actions. Pages inside AppShell whose top bar already names them use this
 * only when the page needs a description or actions. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex flex-wrap items-end justify-between gap-x-6 gap-y-3', className)}>
      <div className="min-w-0">
        <h1 className="text-title text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-small text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer select-none items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
      />
      <span className="text-sm text-ink">{label}</span>
    </label>
  )
}
