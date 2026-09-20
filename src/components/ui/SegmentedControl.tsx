import type { ElementType } from 'react'
import clsx from 'clsx'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: ElementType
}

/**
 * A "pick one of N" button group with a highlighted active option -- shared
 * shape for the several places across the app that each hand-rolled their
 * own version of this (Settings.tsx's theme/language pickers,
 * Navigation.tsx's simulated/GPS toggle). Two variants for the two visual
 * treatments those call sites actually needed:
 * - `pill`: compact rounded-full tab switcher, plain text labels.
 * - `card`: bordered grid of taller cards, optional icon above the label.
 * Both share the same active/inactive color logic so they stay visually
 * consistent with each other even though their container shape differs.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  variant = 'pill',
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  variant?: 'pill' | 'card'
  className?: string
}) {
  if (variant === 'card') {
    return (
      <div className={clsx('grid gap-2', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={clsx(
              'flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-semibold transition-all',
              value === opt.value
                ? 'border-primary bg-skyblue-light text-primary'
                : 'border-border bg-surface text-muted hover:border-primary/40',
            )}
          >
            {opt.icon && <opt.icon className="size-5" />}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={clsx('flex rounded-full border border-border bg-surface p-0.5 text-xs font-semibold shadow-card', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={clsx('rounded-full px-3 py-1.5 transition-colors', value === opt.value ? 'bg-primary text-white' : 'text-muted hover:text-ink')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
