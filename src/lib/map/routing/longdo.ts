import { longdoKey } from '../longdo'
import type { RoutingProvider } from './types'

// The GeoJSON variant of Longdo's route endpoint, not the plain JSON
// `route/guide` one: `guide[]` entries carry turn-by-turn text but no
// lat/lon, so the route would come back with no geometry. `geojson/route`
// returns the same segments, each with its own coordinates ([lon, lat]) and
// distance/interval -- road geometry and totals in one request.
const LONGDO_ROUTE_URL = 'https://api.longdo.com/RouteService/geojson/route'

interface LongdoGeoJsonResponse {
  features?: {
    geometry?: { coordinates?: [number, number][] }
    properties?: { distance?: number; interval?: number }
  }[]
}

/** Longdo Map's route service: anywhere in Thailand, fastest route for the
 * current traffic. Needs VITE_LONGDO_MAP_KEY. */
export const longdo: RoutingProvider = {
  id: 'longdo',
  label: 'Longdo Map',
  description: 'ทั่วประเทศไทย ตามสภาพจราจร',
  available: !!longdoKey,
  async route(origin, destination, signal) {
    const params = new URLSearchParams({
      flon: String(origin.lng),
      flat: String(origin.lat),
      tlon: String(destination.lng),
      tlat: String(destination.lat),
      mode: 't', // fastest route, traffic-aware
      type: 'A', // driving
      locale: 'th',
      key: longdoKey ?? '',
    })
    try {
      const res = await fetch(`${LONGDO_ROUTE_URL}?${params}`, { signal })
      if (!res.ok) return null
      const features = ((await res.json()) as LongdoGeoJsonResponse).features
      if (!features || features.length === 0) return null

      const points: [number, number][] = []
      let distanceM = 0
      let durationS = 0
      for (const feature of features) {
        distanceM += feature.properties?.distance ?? 0
        durationS += feature.properties?.interval ?? 0
        for (const [lon, lat] of feature.geometry?.coordinates ?? []) {
          if (typeof lat === 'number' && typeof lon === 'number') points.push([lat, lon])
        }
      }
      if (points.length < 2 || distanceM <= 0) return null
      return { points, distanceKm: distanceM / 1000, durationMin: Math.max(1, Math.round(durationS / 60)), provider: 'longdo' }
    } catch {
      return null
    }
  },
  badge: () => 'เส้นทางที่เร็วที่สุดตามสภาพจราจร',
}
