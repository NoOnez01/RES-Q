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
        'group flex w-full items-center gap-4 rounded-2xl border border-border bg-white p-5 text-left shadow-card transition-all',
        'hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-card-lg',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
        className,
      )}
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-skyblue-light text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-navy">{title}</p>
        <p className="text-sm text-muted mt-0.5">{description}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  )
}
