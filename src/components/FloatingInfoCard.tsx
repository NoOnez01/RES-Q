import type { ReactNode } from 'react'
import clsx from 'clsx'

export function FloatingInfoCard({
  icon,
  title,
  subtitle,
  onClick,
  delayMs = 0,
  float = true,
  className,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  onClick: () => void
  delayMs?: number
  float?: boolean
  className?: string
}) {
  return (
    <div
      className={clsx('shrink-0 hover:![animation-play-state:paused] focus-within:![animation-play-state:paused]', className)}
      style={
        float
          ? {
              animation: `fade-in-up 0.4s ease-out ${delayMs}ms backwards, float-c 9s ease-in-out ${
                delayMs + 400
              }ms infinite`,
            }
          : { animation: `fade-in-up 0.4s ease-out ${delayMs}ms backwards` }
      }
    >
      <button
        type="button"
        onClick={onClick}
        className="
          group flex w-64 items-start gap-3 rounded-2xl border border-border bg-white/95 p-4 text-left shadow-card backdrop-blur
          transition-shadow duration-200 hover:border-primary/40 hover:shadow-card-lg hover:shadow-[0_0_0_4px_rgba(11,110,189,0.10)]
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20
        "
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-skyblue-light text-primary transition-transform duration-200 group-hover:scale-110">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold leading-snug text-navy">{title}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">{subtitle}</span>
        </span>
      </button>
    </div>
  )
}
