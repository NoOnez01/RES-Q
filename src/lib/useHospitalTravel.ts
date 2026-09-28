import { useCallback, useEffect, useState } from 'react'
import { fetchRoute } from './routing'
import { haversineKm } from './utils'
import type { GeoLocation, Hospital } from './types'
import type { Travel } from './hospitalRisk'

// Until a road route comes back: straight-line distance stretched to a
// typical road distance, at an ambulance's average city speed.
const ROAD_FACTOR = 1.35
const AMBULANCE_KMH = 40
// Road routes are worked out for this many of the nearest hospitals -- the
// ones that can matter; the rest keep their estimate.
const ROUTED = 8

export function estimateTravel(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Travel {
  const distanceKm = haversineKm(from, to) * ROAD_FACTOR
  return { distanceKm, etaMin: Math.max(1, Math.round((distanceKm / AMBULANCE_KMH) * 60)), source: 'estimate' }
}

/**
 * Travel from the scene to each hospital: an estimate straight away, then
 * the real road route (with traffic, where there's data) as each one is
 * worked out, nearest hospitals first. A hospital's own stored distance is
 * from wherever it was entered, not from this incident, so it's not used.
 */
export function useHospitalTravel(origin: GeoLocation | null | undefined, hospitals: Hospital[]): (h: Hospital) => Travel {
  const [routed, setRouted] = useState<Record<string, Travel>>({})
  const originKey = origin ? `${origin.lat},${origin.lng}` : ''
  const hospitalsKey = hospitals.map((h) => h.id).join(',')

  useEffect(() => {
    setRouted({})
    if (!origin) return
    const controller = new AbortController()
    const nearest = [...hospitals]
      .sort((a, b) => haversineKm(origin, a.location) - haversineKm(origin, b.location))
      .slice(0, ROUTED)
    void (async () => {
      // One at a time: the router works through them in turn anyway, and
      // outside its own map each one is a call to a public routing service.
      for (const h of nearest) {
        const route = await fetchRoute(origin, h.location, controller.signal).catch(() => null)
        if (controller.signal.aborted) return
        if (route) {
          setRouted((r) => ({ ...r, [h.id]: { distanceKm: route.distanceKm, etaMin: Math.max(1, Math.round(route.durationMin)), source: 'route' } }))
        }
      }
    })()
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on what they contain
  }, [originKey, hospitalsKey])

  return useCallback(
    (h: Hospital) => routed[h.id] ?? (origin ? estimateTravel(origin, h.location) : { distanceKm: h.distanceKm, etaMin: h.etaMin, source: 'estimate' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routed, originKey],
  )
}
