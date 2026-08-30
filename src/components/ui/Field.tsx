import { forwardRef, useEffect, useRef, useState } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'
import { AlertCircle, ChevronDown } from 'lucide-react'

interface FieldShellProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}

export function FieldShell({ label, hint, error, required, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-navy">
          {label}
          {required && <span className="text-emergency ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-emergency">
          <AlertCircle className="size-3.5" /> {error}
        </p>
      )}
    </div>
  )
}

const baseFieldClasses =
  'w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-navy placeholder:text-muted/70 transition-colors focus:outline-none focus:ring-4 focus:ring-primary/15'

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
        className={clsx(
          baseFieldClasses,
          error ? 'border-emergency focus:ring-emergency/15' : 'border-border focus:border-primary',
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
        className={clsx(
          baseFieldClasses,
          'min-h-[100px] resize-y',
          error ? 'border-emergency focus:ring-emergency/15' : 'border-border focus:border-primary',
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
        className={clsx(
          baseFieldClasses,
          'appearance-none bg-[url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="%23667085" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>\')] bg-[right_0.9rem_center] bg-no-repeat pr-10',
          error ? 'border-emergency focus:ring-emergency/15' : 'border-border focus:border-primary',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
})

interface SearchableSelectProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: string[]
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
  emptyLabel = 'ไม่พบตัวเลือกที่ค้นหา',
  className,
}: SearchableSelectProps) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Keep the displayed text in sync when the value changes from outside
  // (e.g. a parent resetting the form) without the dropdown being open.
  useEffect(() => {
    if (!open) setQuery(value)
  }, [value, open])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery(value)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, value])

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  function selectOption(opt: string) {
    onChange(opt)
    setQuery(opt)
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
          className={clsx(
            baseFieldClasses,
            'pr-10',
            error ? 'border-emergency focus:ring-emergency/15' : 'border-border focus:border-primary',
            className,
          )}
        />
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        {open && (
          <div
            role="listbox"
            className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-white py-1 shadow-card-lg"
          >
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">{emptyLabel}</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={opt === value}
                  onClick={() => selectOption(opt)}
                  className={clsx(
                    'block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-skyblue-light',
                    opt === value ? 'bg-skyblue-pale font-semibold text-primary' : 'text-navy',
                  )}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </FieldShell>
  )
}
