interface AnimatedWaveProps {
  tone?: 'primary' | 'emergency'
  className?: string
}

export function AnimatedWave({ tone = 'primary', className = '' }: AnimatedWaveProps) {
  const stroke = tone === 'emergency' ? '#D92D20' : '#0B6EBD'
  return (
    <div className={`bg-fx-layer ${className}`} aria-hidden="true">
      <svg className="bg-fx absolute bottom-0 left-0 h-24 w-[200%] animate-wave-drift opacity-20" viewBox="0 0 800 100" preserveAspectRatio="none">
        <path
          d="M0 50 Q 50 10 100 50 T 200 50 T 300 50 T 400 50 T 500 50 T 600 50 T 700 50 T 800 50 V100 H0 Z"
          fill={stroke}
        />
      </svg>
      <svg
        className="bg-fx absolute bottom-0 left-0 h-16 w-[200%] animate-wave-drift opacity-10"
        style={{ animationDuration: '22s', animationDirection: 'reverse' }}
        viewBox="0 0 800 100"
        preserveAspectRatio="none"
      >
        <path
          d="M0 60 Q 50 30 100 60 T 200 60 T 300 60 T 400 60 T 500 60 T 600 60 T 700 60 T 800 60 V100 H0 Z"
          fill={stroke}
        />
      </svg>
    </div>
  )
}
