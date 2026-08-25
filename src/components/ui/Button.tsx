import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'
import { playClickSound } from '@/lib/alertSound'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-bright active:bg-primary shadow-card hover:shadow-card-lg disabled:bg-primary/40',
  secondary:
    'bg-skyblue-light text-primary hover:bg-primary/10 active:bg-primary/15 disabled:opacity-50',
  outline:
    'bg-white text-navy border border-border hover:border-primary hover:text-primary active:bg-skyblue-pale disabled:opacity-50',
  ghost: 'bg-transparent text-navy hover:bg-skyblue-light active:bg-skyblue-light/80 disabled:opacity-50',
  danger:
    'bg-emergency text-white hover:bg-emergency-dark active:bg-emergency-dark shadow-card disabled:bg-emergency/40',
  success:
    'bg-success text-white hover:brightness-95 active:brightness-90 shadow-card disabled:opacity-50',
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-3.5 py-2 gap-1.5 rounded-xl',
  md: 'text-[15px] px-5 py-2.5 gap-2 rounded-xl',
  lg: 'text-base px-6 py-3.5 gap-2.5 rounded-2xl',
  xl: 'text-lg px-8 py-4 gap-3 rounded-2xl',
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
      onClick={(e) => {
        playClickSound()
        onClick?.(e)
      }}
      className={clsx(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-[1.1em] animate-spin-slow" /> : icon}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  )
})
