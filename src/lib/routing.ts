import { haversineKm } from './utils'
import type { GeoLocation } from './types'

export interface RouteResult {
  /** [lat, lng] pairs tracing the actual road geometry, in travel order. */
  points: [number, number][]
  distanceKm: number
  /** OSRM's typical-speed estimate for the road network -- NOT adjusted for
   * live traffic conditions (see the module doc below for why). */
  durationMin: number
}

interface OsrmResponse {
  code: string
  routes?: { geometry: string; distance: number; duration: number }[]
}

// Real road-following routing via OSRM's free public demo server -- no API
// key, no billing account, callable straight from the browser. The
// tradeoff for "free and keyless": this reflects the road network's
// typical speeds, not live traffic conditions (that data genuinely isn't
// available from any provider without a paid, billed API -- see the
// google-directions Edge Function this replaced, kept in git history if
// a future call ever wants to revisit that tradeoff). The demo server's
// own usage policy asks that production traffic be modest or self-hosted
// (https://project-osrm.org/docs/v5.24.0/api/#general-options) -- fine for
// this app's per-case route lookups, worth revisiting with a self-hosted
// OSRM instance if usage grows a lot.
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving'

// Standard Google/OSRM polyline algorithm (both use the same precision-5
// encoding) -- encodes a lat/lng path as a compact ASCII string. No
// library needed for the decode side; this is the well-known reference
// implementation.
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = 0
    result = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}

// One in-memory cache entry per origin/destination pair (rounded to ~11m
// precision) for this tab's lifetime -- the map re-renders/polls far more
// often than a rescue vehicle's route meaningfully changes, and this is a
// shared public server other users rely on too.
const routeCache = new Map<string, Promise<RouteResult | null>>()
function cacheKey(origin: GeoLocation, destination: GeoLocation): string {
  const r = (n: number) => n.toFixed(4)
  return `${r(origin.lat)},${r(origin.lng)}->${r(destination.lat)},${r(destination.lng)}`
}

/**
 * Real driving route between two points, via OSRM's public routing API.
 * Returns null (never throws) on any failure -- unreachable server, no
 * route found, request timeout -- so every caller falls back to the old
 * straight-line estimate. This is an enhancement over that baseline, not a
 * hard dependency.
 */
export function fetchRoute(origin: GeoLocation, destination: GeoLocation): Promise<RouteResult | null> {
  const key = cacheKey(origin, destination)
  const cached = routeCache.get(key)
  if (cached) return cached

  const url = `${OSRM_BASE_URL}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=polyline`
  const promise = fetch(url, { signal: AbortSignal.timeout(8000) })
    .then((res) => (res.ok ? (res.json() as Promise<OsrmResponse>) : null))
    .then((data) => {
      const route = data?.code === 'Ok' ? data.routes?.[0] : undefined
      if (!route) return null
      return {
        points: decodePolyline(route.geometry),
        distanceKm: route.distance / 1000,
        durationMin: Math.max(1, Math.round(route.duration / 60)),
      } satisfies RouteResult
    })
    .catch(() => null)

  routeCache.set(key, promise)
  return promise
}

/**
 * Walks `ratio` (0-1) of the way along a route's actual distance -- not
 * just its point-index -- so a vehicle marker moves at a visually even
 * pace. The route geometry is denser on curves and sparser on straight
 * stretches, so interpolating by index alone would visibly speed up on
 * the straights and slow down through curves.
 */
export function pointAlongRoute(points: [number, number][], ratio: number): { lat: number; lng: number } {
  if (points.length === 0) return { lat: 0, lng: 0 }
  if (points.length === 1) return { lat: points[0][0], lng: points[0][1] }
  const clamped = Math.min(1, Math.max(0, ratio))

  const segLens: number[] = []
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    const d = haversineKm({ lat: points[i][0], lng: points[i][1] }, { lat: points[i + 1][0], lng: points[i + 1][1] })
    segLens.push(d)
    total += d
  }
  if (total === 0) return { lat: points[0][0], lng: points[0][1] }

  const targetDist = clamped * total
  let covered = 0
  for (let i = 0; i < segLens.length; i++) {
    const segLen = segLens[i]
    if (covered + segLen >= targetDist || i === segLens.length - 1) {
      const segRatio = segLen === 0 ? 0 : (targetDist - covered) / segLen
      const [lat1, lng1] = points[i]
      const [lat2, lng2] = points[i + 1]
      return { lat: lat1 + (lat2 - lat1) * segRatio, lng: lng1 + (lng2 - lng1) * segRatio }
    }
    covered += segLen
  }
  return { lat: points[points.length - 1][0], lng: points[points.length - 1][1] }
}
