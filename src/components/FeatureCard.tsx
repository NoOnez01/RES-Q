import type { ReactNode } from 'react'

export function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-white p-6 shadow-card transition-shadow hover:shadow-card-lg">
      <div className="flex size-11 items-center justify-center rounded-xl bg-skyblue-light text-primary">{icon}</div>
      <p className="font-bold text-navy">{title}</p>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </div>
  )
}
