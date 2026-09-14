import { Ambulance } from 'lucide-react'

/**
 * A live-feeling progress track for the citizen tracking page: a small
 * ambulance icon rides the leading edge of the fill, driven by the case's
 * real rescueEnRoutePct (not a decorative loop) -- the calm reassurance
 * that help is a moving, live thing, not a static percentage. Used for
 * both legs the citizen watches live: rescue team to scene, and rescue
 * team to hospital.
 */
export function RescueEnRouteProgress({ pct }: { pct: number }) {
  const clamped = Math.min(96, Math.max(4, pct))
  return (
    <div className="relative h-2 w-full" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full w-full overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-primary transition-all duration-700 ease-out" style={{ width: `${clamped}%` }} />
      </div>
      <div
        className="absolute top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white shadow-card-lg transition-all duration-700 ease-out animate-pulse-glow"
        style={{ left: `${clamped}%` }}
        aria-hidden="true"
      >
        <Ambulance className="size-3.5" />
      </div>
    </div>
  )
}
