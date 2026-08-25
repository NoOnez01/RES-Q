import { useMemo } from 'react'

interface FloatingParticlesProps {
  count?: number
  tone?: 'primary' | 'white'
}

export function FloatingParticles({ count = 10, tone = 'primary' }: FloatingParticlesProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i * 97) % 100}%`,
        bottom: `${(i * 53) % 80}%`,
        size: 2 + ((i * 7) % 4),
        delay: `${(i * 0.9) % 8}s`,
        duration: `${6 + ((i * 3) % 6)}s`,
      })),
    [count],
  )

  const color = tone === 'white' ? 'bg-white/70' : 'bg-primary/60'

  return (
    <div className="bg-fx-layer" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className={`bg-fx absolute rounded-full ${color} animate-particle-float`}
          style={{
            left: p.left,
            bottom: p.bottom,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  )
}
