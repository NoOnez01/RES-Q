import { forwardRef, useEffect, useRef, useState } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'
import { AlertCircle, ChevronDown } from 'lucide-react'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ไม่พบตัวเลือกที่ค้นหา: 'No matching option found',
})

interface FieldShellProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}

export function FieldShell({ label, hint, error, required, children }: FieldShellProps) {
  return (
    // Marked so a failed submit can find and jump to it (lib/formErrors.ts).
    <div className="flex flex-col gap-1.5" data-field-error={error ? '' : undefined}>
      {label && (
        <label className="text-label text-ink">
          {label}
          {required && (
            <span className="ml-0.5 text-emergency" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-meta text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-meta font-medium text-emergency">
          <AlertCircle className="mt-px size-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

// 40px controls; 16px text on phones so iOS doesn't zoom into the field.
const baseFieldClasses =
  'w-full min-h-10 rounded-lg border bg-surface px-3 py-2 text-base text-ink shadow-card placeholder:text-muted/80 transition-[border-color,box-shadow] duration-150 hover:border-muted/50 focus:outline-none focus:ring-[3px] focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-muted sm:text-sm'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  required?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, className, ...props },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <input
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        className={clsx(
          baseFieldClasses,
          error ? 'border-emergency focus:ring-emergency/15' : 'border-input focus:border-primary',
          className,
        )}
        {...props}
      />
    </FieldShell>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  required?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, required, className, ...props },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <textarea
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        className={clsx(
          baseFieldClasses,
          'min-h-[96px] resize-y leading-relaxed',
          error ? 'border-emergency focus:ring-emergency/15' : 'border-input focus:border-primary',
          className,
        )}
        {...props}
      />
    </FieldShell>
  )
})

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  required?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, className, children, ...props },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <select
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        className={clsx(
          baseFieldClasses,
          'appearance-none bg-[url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="%23667085" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>\')] bg-[length:18px] bg-[right_0.65rem_center] bg-no-repeat pr-9',
          error ? 'border-emergency focus:ring-emergency/15' : 'border-input focus:border-primary',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
})

interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  /** A plain string list where the value and displayed label are the same
   * (e.g. INCIDENT_TYPES), or explicit {value, label} pairs for when the
   * stored value is an id distinct from what's shown (e.g. a team's
   * database id vs. its human-readable name). */
  options: string[] | SearchableSelectOption[]
  placeholder?: string
  /** Shown in the empty-results state -- defaults to a generic message. */
  emptyLabel?: string
  className?: string
}

/**
 * A type-to-filter combobox for a long option list (native <select> makes a
 * 20+ item list slow to scan, especially when users know part of the label
 * or a code like "CBD 7" but not its exact position). Filters client-side
 * as you type; clicking an option or blurring outside commits the value,
 * same interaction shape as a native select otherwise.
 */
export function SearchableSelect({
  label,
  hint,
  error,
  required,
  value,
  onChange,
  options,
  placeholder,
  emptyLabel,
  className,
}: SearchableSelectProps) {
  const t = useT()
  const resolvedEmptyLabel = emptyLabel ?? t('ไม่พบตัวเลือกที่ค้นหา')
  const normalized: SearchableSelectOption[] = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const labelForValue = (v: string) => normalized.find((o) => o.value === v)?.label ?? v

  const [query, setQuery] = useState(labelForValue(value))
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Keep the displayed text in sync when the value changes from outside
  // (e.g. a parent resetting the form) without the dropdown being open.
  useEffect(() => {
    if (!open) setQuery(labelForValue(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open, options])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery(labelForValue(value))
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value])

  const filtered = query.trim()
    ? normalized.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : normalized
  // Rendering every option at once is fine for a few dozen (INCIDENT_TYPES)
  // but not for lists in the thousands (e.g. every registered rescue team)
  // -- cap what actually mounts and prompt narrowing further instead.
  const RENDER_LIMIT = 50
  const overflowCount = filtered.length - RENDER_LIMIT
  const visible = filtered.slice(0, RENDER_LIMIT)

  function selectOption(opt: SearchableSelectOption) {
    onChange(opt.value)
    setQuery(opt.label)
    setOpen(false)
  }

  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <div ref={rootRef} className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={(e) => {
            setOpen(true)
            // Selecting the existing text on focus means the very next
            // keystroke replaces it, rather than inserting at whatever the
            // caret position happens to be -- without this, clicking a
            // field that already has a value and typing a fresh search
            // term just appends to it instead of searching from scratch.
            e.target.select()
          }}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          className={clsx(
            baseFieldClasses,
            'pr-10',
            error ? 'border-emergency focus:ring-emergency/15' : 'border-input focus:border-primary',
            className,
          )}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        {open && (
          <div
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-card-lg"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-muted">{resolvedEmptyLabel}</p>
            ) : (
              <>
                {visible.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={opt.value === value}
                    onClick={() => selectOption(opt)}
                    className={clsx(
                      'block w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-skyblue-light',
                      opt.value === value ? 'bg-skyblue-light font-medium text-primary' : 'text-ink',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
                {overflowCount > 0 && (
                  <p className="px-2.5 py-2 text-meta text-muted">
                    และอีก {overflowCount.toLocaleString('th-TH')} รายการ — พิมพ์เพื่อค้นหาให้แคบลง
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </FieldShell>
  )
}
