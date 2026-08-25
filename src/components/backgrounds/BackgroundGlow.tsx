interface BackgroundGlowProps {
  corners?: Array<'tl' | 'tr' | 'bl' | 'br'>
}

const cornerPos: Record<string, string> = {
  tl: '-top-32 -left-32',
  tr: '-top-32 -right-32',
  bl: '-bottom-32 -left-32',
  br: '-bottom-32 -right-32',
}

export function BackgroundGlow({ corners = ['tl', 'br'] }: BackgroundGlowProps) {
  return (
    <div className="bg-fx-layer" aria-hidden="true">
      {corners.map((c, i) => (
        <div
          key={c}
          className={`bg-fx absolute ${cornerPos[c]} size-80 rounded-full bg-primary/15 blur-3xl animate-glow-breathe`}
          style={{ animationDelay: `${i * 1.5}s` }}
        />
      ))}
    </div>
  )
}
