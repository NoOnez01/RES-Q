interface OrbitRingsProps {
  rings?: 2 | 3
  className?: string
}

export function OrbitRings({ rings = 3, className = '' }: OrbitRingsProps) {
  const sizes = [420, 640, 860].slice(0, rings)
  return (
    <div className={`bg-fx-layer ${className}`} aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {sizes.map((s, i) => (
          <div
            key={s}
            className={`bg-fx absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15 ${
              i % 2 === 0 ? 'animate-orbit-slow' : 'animate-orbit-slower'
            }`}
            style={{ width: s, height: s }}
          >
            <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary/40" />
          </div>
        ))}
      </div>
    </div>
  )
}
