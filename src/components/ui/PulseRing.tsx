import clsx from 'clsx'

interface PulseRingProps {
  tone?: 'primary' | 'emergency' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const toneDot: Record<NonNullable<PulseRingProps['tone']>, string> = {
  primary: 'bg-primary',
  emergency: 'bg-emergency',
  success: 'bg-success',
  warning: 'bg-warning',
}

const toneRing: Record<NonNullable<PulseRingProps['tone']>, string> = {
  primary: 'bg-primary/40',
  emergency: 'bg-emergency/40',
  success: 'bg-success/40',
  warning: 'bg-warning/40',
}

const sizeDot: Record<NonNullable<PulseRingProps['size']>, string> = {
  sm: 'size-1.5',
  md: 'size-2.5',
  lg: 'size-4',
}

export function PulseRing({ tone = 'primary', size = 'md', className }: PulseRingProps) {
  return (
    <span className={clsx('relative inline-flex', sizeDot[size], className)} aria-hidden="true">
      <span className={clsx('bg-fx absolute inset-0 animate-ping-slow rounded-full', toneRing[tone])} />
      <span className={clsx('relative inline-flex rounded-full', sizeDot[size], toneDot[tone])} />
    </span>
  )
}
