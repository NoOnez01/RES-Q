import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-outline' | 'success'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

/**
 * Filled variants carry one action per view; outline and ghost repeat.
 * Danger is for destructive or genuinely urgent actions only.
 */
const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary-fill text-primary-foreground shadow-card hover:bg-primary-fill-hover disabled:bg-primary-fill/45',
  secondary: 'bg-primary/[0.08] text-primary hover:bg-primary/[0.13] disabled:opacity-50',
  outline:
    'border border-input bg-surface text-ink shadow-card hover:border-muted/50 hover:bg-surface-alt disabled:opacity-50',
  ghost: 'bg-transparent text-ink hover:bg-skyblue-light disabled:opacity-50',
  danger: 'bg-emergency text-white shadow-card hover:bg-emergency-dark disabled:bg-emergency/45',
  // A destructive action that repeats per row: quiet until hovered.
  'danger-outline':
    'border border-input bg-surface text-emergency shadow-card hover:border-emergency/40 hover:bg-emergency/[0.05] disabled:opacity-50',
  success: 'bg-success-ink text-white shadow-card hover:brightness-110 disabled:opacity-50',
}

// Heights step 32 / 36 / 44 / 48. lg and xl are the touch sizes used on
// phone-first flows; min-h lets a long Thai label wrap instead of clipping.
const sizeClasses: Record<Size, string> = {
  sm: 'min-h-8 gap-1.5 rounded-lg px-3 py-1 text-[13px] [&_svg]:size-3.5',
  md: 'min-h-9 gap-2 rounded-lg px-3.5 py-1.5 text-sm [&_svg]:size-4',
  lg: 'min-h-11 gap-2 rounded-xl px-5 py-2 text-[15px] [&_svg]:size-[18px]',
  xl: 'min-h-12 gap-2.5 rounded-xl px-6 py-2.5 text-base [&_svg]:size-5',
}

const BASE =
  'inline-flex select-none items-center justify-center text-center font-medium leading-tight transition-[background-color,border-color,color,filter] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed [&_svg]:shrink-0'

/** Navigation styled as a button: one focusable element, not a button
 * nested inside a link. */
export function LinkButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className,
  children,
  ...props
}: LinkProps & { variant?: Variant; size?: Size; fullWidth?: boolean; icon?: React.ReactNode }) {
  return (
    <Link className={clsx(BASE, variantClasses[variant], sizeClasses[size], fullWidth && 'w-full', className)} {...props}>
      {icon}
      <span>{children}</span>
    </Link>
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    icon,
    iconRight,
    className,
    children,
    disabled,
    onClick,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      className={clsx(
        BASE,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin-slow" aria-hidden="true" /> : icon}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  )
})
