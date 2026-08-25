import clsx from 'clsx'
import type { ReactNode } from 'react'

export function DashboardCard({
  label,
  value,
  icon,
  tone = 'primary',
  className,
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  tone?: 'primary' | 'emergency' | 'success' | 'warning'
  className?: string
}) {
  const toneClasses: Record<string, string> = {
    primary: 'bg-skyblue-light text-primary',
    emergency: 'bg-emergency/10 text-emergency',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  }
  return (
    <div className={clsx('rounded-2xl border border-border bg-white p-5 shadow-card', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && (
          <div className={clsx('flex size-9 items-center justify-center rounded-lg', toneClasses[tone])}>{icon}</div>
        )}
      </div>
      <p className="mt-2 text-2xl font-extrabold text-navy">{value}</p>
    </div>
  )
}
