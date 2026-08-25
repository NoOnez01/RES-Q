import { Activity, HeartPulse, Stethoscope } from 'lucide-react'

const MOTIFS = [
  { Icon: HeartPulse, top: '10%', left: '8%', size: 64, anim: 'animate-float-a', delay: '0s' },
  { Icon: Stethoscope, top: '68%', left: '4%', size: 56, anim: 'animate-float-b', delay: '1.4s' },
  { Icon: Activity, top: '20%', left: '92%', size: 60, anim: 'animate-float-c', delay: '0.7s' },
  { Icon: HeartPulse, top: '78%', left: '90%', size: 48, anim: 'animate-float-a', delay: '2.1s' },
]

export function MedicalMotifs() {
  return (
    <div className="bg-fx-layer" aria-hidden="true">
      {MOTIFS.map(({ Icon, top, left, size, anim, delay }, i) => (
        <span
          key={i}
          className={`bg-fx absolute -translate-x-1/2 -translate-y-1/2 text-primary opacity-[0.07] ${anim}`}
          style={{ top, left, animationDelay: delay }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </span>
      ))}
    </div>
  )
}
