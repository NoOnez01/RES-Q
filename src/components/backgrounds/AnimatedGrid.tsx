interface AnimatedGridProps {
  variant?: 'dots' | 'lines'
  opacity?: number
  animate?: boolean
}

export function AnimatedGrid({ variant = 'dots', opacity = 1, animate = true }: AnimatedGridProps) {
  return (
    <div className="bg-fx-layer" aria-hidden="true">
      <div
        className={`bg-fx absolute inset-0 ${variant === 'dots' ? 'bg-grid-dots' : 'bg-grid-lines'} ${
          animate ? 'animate-grid-drift' : ''
        }`}
        style={{ opacity, maskImage: 'radial-gradient(ellipse at 50% 30%, black 55%, transparent 90%)' }}
      />
    </div>
  )
}
