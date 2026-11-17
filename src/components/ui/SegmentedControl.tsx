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
              'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors',
              value === opt.value
                ? 'border-primary bg-primary/[0.06] text-primary ring-1 ring-primary'
                : 'border-input bg-surface text-muted hover:border-muted/50 hover:text-ink',
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
    <div role="group" className={clsx('inline-flex rounded-lg border border-border bg-surface-alt p-0.5 text-[13px] font-medium', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={clsx(
            'min-h-8 flex-1 whitespace-nowrap rounded-md px-3 py-1 transition-colors',
            value === opt.value ? 'bg-surface text-ink shadow-card ring-1 ring-border' : 'text-muted hover:text-ink',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
