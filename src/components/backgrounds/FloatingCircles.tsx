interface FloatingCirclesProps {
  count?: 3 | 4 | 5
  tone?: 'primary' | 'navy'
}

const PRESETS = [
  { top: '8%', left: '6%', size: 220, anim: 'animate-float-a', delay: '0s' },
  { top: '58%', left: '84%', size: 260, anim: 'animate-float-b', delay: '1.2s' },
  { top: '78%', left: '12%', size: 160, anim: 'animate-float-c', delay: '2.4s' },
  { top: '14%', left: '78%', size: 140, anim: 'animate-float-c', delay: '0.6s' },
  { top: '40%', left: '48%', size: 190, anim: 'animate-float-a', delay: '1.8s' },
]

export function FloatingCircles({ count = 4, tone = 'primary' }: FloatingCirclesProps) {
  const color = tone === 'navy' ? 'bg-navy/10' : 'bg-primary/10'
  return (
    <div className="bg-fx-layer" aria-hidden="true">
      {PRESETS.slice(0, count).map((p, i) => (
        <span
          key={i}
          className={`bg-fx absolute rounded-full blur-2xl ${color} ${p.anim}`}
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  )
}
