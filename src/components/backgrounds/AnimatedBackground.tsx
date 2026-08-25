import { FloatingCircles } from './FloatingCircles'
import { AnimatedGrid } from './AnimatedGrid'
import { GradientMesh } from './GradientMesh'
import { FloatingParticles } from './FloatingParticles'
import { AnimatedWave } from './AnimatedWave'
import { BackgroundGlow } from './BackgroundGlow'
import { InteractiveMapGrid } from './InteractiveMapGrid'
import { MedicalMotifs } from './MedicalMotifs'

export type BackgroundVariant = 'home' | 'auth' | 'emergency' | 'dashboard' | 'map' | 'howto' | 'call' | 'hospital'

function HeartbeatLine() {
  return (
    <svg
      className="bg-fx-layer opacity-[0.08]"
      aria-hidden="true"
      viewBox="0 0 900 80"
      preserveAspectRatio="none"
    >
      <polyline
        points="0,40 60,40 80,40 95,10 110,70 125,40 160,40 400,40 420,40 440,10 455,70 470,40 520,40 900,40"
        fill="none"
        stroke="#D92D20"
        strokeWidth="2"
        className="bg-fx animate-heartbeat"
        style={{ transformOrigin: 'center' }}
      />
    </svg>
  )
}

export function AnimatedBackground({ variant }: { variant: BackgroundVariant }) {
  switch (variant) {
    case 'home':
      return (
        <>
          <GradientMesh />
          <FloatingCircles count={4} />
          <MedicalMotifs />
          <HeartbeatLine />
        </>
      )
    case 'auth':
      return (
        <>
          <AnimatedGrid variant="dots" opacity={0.5} />
          <BackgroundGlow corners={['tl', 'br']} />
          <FloatingCircles count={3} tone="navy" />
        </>
      )
    case 'emergency':
      return (
        <>
          <AnimatedGrid variant="lines" opacity={0.35} />
          <FloatingParticles count={8} />
        </>
      )
    case 'call':
      return (
        <>
          <GradientMesh />
          <AnimatedWave />
        </>
      )
    case 'dashboard':
      return (
        <>
          <AnimatedGrid variant="lines" opacity={0.2} animate={false} />
          <FloatingCircles count={3} />
        </>
      )
    case 'map':
      return <InteractiveMapGrid />
    case 'hospital':
      return (
        <>
          <AnimatedGrid variant="dots" opacity={0.25} animate={false} />
          <HeartbeatLine />
        </>
      )
    case 'howto':
      return (
        <>
          <AnimatedGrid variant="dots" opacity={0.4} />
          <FloatingCircles count={4} />
          <BackgroundGlow corners={['tr', 'bl']} />
        </>
      )
    default:
      return null
  }
}
