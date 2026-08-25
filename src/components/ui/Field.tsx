import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'
import { AlertCircle } from 'lucide-react'

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
