import { decodePolyline } from './polyline'
import type { RoutingProvider } from './types'

// OSRM's free public demo server: no key, callable from the browser, typical
// road speeds rather than live traffic. Its usage policy asks production
// traffic to stay modest or self-host
// (https://project-osrm.org/docs/v5.24.0/api/#general-options) -- fine for
// per-case lookups; a self-hosted OSRM is the same provider with another URL.
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving'

interface OsrmResponse {
  code: string
  routes?: { geometry: string; distance: number; duration: number }[]
}

export const osrm: RoutingProvider = {
  id: 'osrm',
  label: 'OSRM',
  description: 'ฟรี ไม่ต้องใช้คีย์ ความเร็วถนนโดยทั่วไป ไม่รวมจราจร',
  available: true,
  async route(origin, destination, signal) {
    const url = `${OSRM_BASE_URL}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=polyline`
    try {
      const res = await fetch(url, { signal })
      if (!res.ok) return null
      const data = (await res.json()) as OsrmResponse
      const route = data.code === 'Ok' ? data.routes?.[0] : undefined
      if (!route) return null
      return {
        points: decodePolyline(route.geometry),
        distanceKm: route.distance / 1000,
        durationMin: Math.max(1, Math.round(route.duration / 60)),
        provider: 'osrm',
      }
    } catch {
      return null
    }
  },
  badge: () => 'เส้นทางตามถนนจริง',
}
