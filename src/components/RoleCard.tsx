import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export function RoleCard({
  icon,
  title,
  description,
  onClick,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'group flex w-full items-center gap-4 border-border bg-surface px-4 py-4 text-left transition-colors sm:px-5',
        'hover:bg-surface-alt',
        className,
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-primary [&>svg]:size-5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-subheading text-ink">{title}</p>
        <p className="mt-0.5 text-small text-muted">{description}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
    </button>
  )
}
