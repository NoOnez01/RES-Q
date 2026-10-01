import { haversineKm } from './utils'
import type { VehicleStart } from './pathfinding'
import { closuresKey, getActiveClosures } from './roadClosures'
import type { GeoLocation } from './types'
import { DSTARLITE_TIMEOUT_MS } from './map/routing/dstarlite'
import { routingChain, routingChainKey } from './map/routing/providers'
import type { RouteResult } from './map/routing/types'

export type { RouteResult }

// One in-memory cache entry per origin/destination pair (rounded to ~11m
// precision) for this tab's lifetime -- the map re-renders/polls far more
// often than a rescue vehicle's route meaningfully changes, and this is a
// shared public server other users rely on too.
//
// Cancellation is reference-counted rather than tied to any single caller,
// because the promise above is shared: two components requesting the exact
// same origin/destination pair get the *same* in-flight request, not two
// independent ones. If caller A's AbortSignal fired and simply aborted the
// underlying fetch, caller B (still waiting on the identical promise) would
// lose its result too. `refCount` only reaches zero -- and only then
// actually aborts the shared request -- once every caller that passed a
// signal for this key has backed off; a caller with no signal (or the
// route.data.length === 0 / caller already has a result) `pin`s the entry
// so it's never cancelled underneath it.
interface RouteCacheEntry {
  promise: Promise<RouteResult | null>
  controller: AbortController
  refCount: number
  pinned: boolean
  settled: boolean
}
const routeCache = new Map<string, RouteCacheEntry>()
function cacheKey(origin: GeoLocation, destination: GeoLocation, vehicle?: VehicleStart): string {
  const r = (n: number) => n.toFixed(4)
  // A moving vehicle's route depends on which way it faces (to the nearest
  // 45 degrees) -- the same spot facing the other way is another route.
  const v = vehicle ? `|v${vehicle.heading === undefined ? '' : Math.round(vehicle.heading / 45) % 8}` : ''
  // Closures and the providers asked change the answer, so a route is cached per set of each.
  return `${r(origin.lat)},${r(origin.lng)}->${r(destination.lat)},${r(destination.lng)}|${closuresKey(getActiveClosures())}|${routingChainKey()}${v}`
}

const ROUTE_TIMEOUT_MS = 8000

/** The first route any provider in the chain has (map/routing/providers). */
async function firstRoute(origin: GeoLocation, destination: GeoLocation, signal: AbortSignal, vehicle?: VehicleStart): Promise<RouteResult | null> {
  for (const provider of routingChain()) {
    if (signal.aborted) return null
    const route = await provider.route(origin, destination, signal, vehicle)
    if (route) return route
  }
  return null
}

/**
 * Real driving route between two points, from the first routing provider
 * that has one (map/routing/providers). Returns null (never throws) only
 * if every provider fails, so every caller can fall back further to its own
 * straight-line estimate -- this is an enhancement over that baseline, not a
 * hard dependency.
 *
 * `signal`, if passed, lets a caller give up on this specific request (e.g.
 * a live GPS position that's moved on to a newer one before the old
 * request even answered) -- see the reference-counting note above for why
 * that doesn't simply abort the underlying fetch out from under any other
 * caller sharing the same cached request.
 */
export function fetchRoute(
  origin: GeoLocation,
  destination: GeoLocation,
  signal?: AbortSignal,
  /** Set when the origin is a moving vehicle's live GPS fix (navigation). */
  vehicle?: VehicleStart,
): Promise<RouteResult | null> {
  const key = cacheKey(origin, destination, vehicle)
  let entry = routeCache.get(key)

  if (!entry) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DSTARLITE_TIMEOUT_MS + ROUTE_TIMEOUT_MS)
    // Captured by the closure below rather than re-looked-up by `key` --
    // if this exact entry gets cancelled+evicted and a fresh one created
    // for the same key before this settles, a by-key lookup would mark the
    // *new* entry settled instead, based on the *old* request's timing.
    const promise = firstRoute(origin, destination, controller.signal, vehicle).finally(() => {
      clearTimeout(timeout)
      entry!.settled = true
    })
    entry = { promise, controller, refCount: 0, pinned: false, settled: false }
    routeCache.set(key, entry)
  }

  if (!signal || entry.settled) {
    // Already resolved (or no signal to begin with) -- nothing left to
    // ever cancel, so skip the refcounting bookkeeping entirely for what's
    // the common case once a route's been fetched at least once.
    entry.pinned = true
    return entry.promise
  }

  const current = entry
  current.refCount++
  const onAbort = () => {
    current.refCount--
    if (current.refCount <= 0 && !current.pinned && !current.settled) {
      current.controller.abort()
      if (routeCache.get(key) === current) routeCache.delete(key)
    }
  }
  if (signal.aborted) onAbort()
  else signal.addEventListener('abort', onAbort, { once: true })

  return entry.promise
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

export type { VehicleStart }

export interface RouteProgress {
  /** What's left of the route, starting where the vehicle is on it. */
  points: [number, number][]
  remainingKm: number
  remainingMin: number
  /** How far the vehicle is from the route line, metres. */
  offRouteM: number
}

/**
 * Where `pos` is along `route`: the part still ahead (drawn from the
 * vehicle, not from wherever the route was planned), and the distance and
 * time left, scaled from the route's own totals. `offRouteM` is the
 * distance to the route line -- large means the driver has left it.
 */
export function routeProgress(route: RouteResult, pos: { lat: number; lng: number }): RouteProgress {
  const pts = route.points
  const k = Math.cos((pos.lat * Math.PI) / 180)
  const xy = (p: [number, number]) => [p[1] * k * 111_320, p[0] * 110_574] as const
  const [px, py] = xy([pos.lat, pos.lng])
  let total = 0
  let best = { d: Infinity, along: 0, index: 0, point: pts[0] }
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = xy(pts[i - 1])
    const [bx, by] = xy(pts[i])
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy)
    const t = len > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (len * len))) : 0
    const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
    if (d < best.d) {
      const a = pts[i - 1]
      const b = pts[i]
      best = { d, along: total + t * len, index: i, point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }
    }
    total += len
  }
  const fraction = total > 0 ? Math.max(0, (total - best.along) / total) : 0
  return {
    points: [best.point, ...pts.slice(best.index)],
    remainingKm: route.distanceKm * fraction,
    remainingMin: Math.max(1, Math.round(route.durationMin * fraction)),
    offRouteM: best.d,
  }
}
