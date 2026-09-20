import { useEffect, useRef, useState } from 'react'
import { clamp } from './utils'

/**
 * Demo/training-mode fake progress: animates a percentage from `initialPct`
 * to 100 over ~12.6s (700ms ticks), syncing each tick out via `onProgress`.
 * This is the "simulated" half of Navigation.tsx's simulated-vs-real-GPS
 * toggle, extracted alongside lib/useLiveRoute.ts (the GPS half) so both
 * modes are self-contained hooks instead of scattered effects each gated by
 * the same `gpsMode` boolean.
 */
export function useSimulatedProgress({
  active,
  caseId,
  initialPct,
  onProgress,
}: {
  /** Master on/off switch -- when false, the timer is stopped and not restarted. */
  active: boolean
  caseId: string | undefined
  initialPct: number
  onProgress: (caseId: string, pct: number) => void
}): number {
  const [pct, setPct] = useState(initialPct)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!active || !caseId) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    setPct(initialPct)
    const step = 100 / 18
    intervalRef.current = setInterval(() => {
      setPct((prev) => clamp(prev + step, 0, 100))
    }, 700)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // `initialPct` intentionally omitted -- only meant to seed the very
    // first tick when this restarts (id/active changes), not to resync the
    // animation to the store's last-persisted value on every store update,
    // which would fight the local animation this timer is driving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, caseId])

  useEffect(() => {
    if (!active || !caseId) return
    onProgress(caseId, Math.round(pct))
    if (pct >= 100 && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [pct, active, caseId, onProgress])

  return pct
}
