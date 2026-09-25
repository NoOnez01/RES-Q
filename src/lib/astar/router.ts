import { haversineM, nearestNode, segmentShape, type RoadGraph } from './graph'
import { aStar, type PathResult } from './search'
import { congestionFactor, sampleTraffic, trafficCoolingDown, trafficForWay, type TrafficSource } from './traffic'

export interface AStarRoute {
  points: [number, number][]
  distanceKm: number
  durationMin: number
  /** Which traffic data covers most of the route's main-road length;
   * 'none' when it mostly ran on estimated speeds. */
  traffic: TrafficSource | 'none'
  stats: { expanded: number; rounds: number; lookups: number; congestion: number; ms: number }
}

// Main roads (motorway .. tertiary) get their own traffic lookups; smaller
// roads, which are far more numerous and rarely covered by Longdo, run at
// their free-flow speed slowed by the area's congestion factor.
const TRAFFIC_CLASS_MAX = 4
const MAX_ROUNDS = 4
const MAX_LOOKUPS_PER_ROUND = 15
const MAX_LOOKUPS_PER_ROUTE = 30
// The stretch from the exact GPS point to the nearest intersection.
const CONNECTOR_SPEED_MPS = 20 / 3.6

/**
 * Fastest route under current traffic, found with A* over the road graph.
 *
 * Traffic speeds come from a per-point, rate-limited service, so asking for
 * every road up front would take thousands of requests. Instead the search
 * is lazy: A* runs, the traffic on main roads of the path it found that
 * haven't been sampled yet is looked up (one point per road), and A* runs
 * again with those speeds -- until the fastest path's main roads all have
 * traffic data, or the lookup budget is spent. Roads without a sample are
 * slowed by the area's measured congestion, so the search doesn't keep
 * swerving onto unsampled side streets that only look fast.
 */
export async function computeRoute(
  g: RoadGraph,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  longdoKey: string | undefined,
  signal?: AbortSignal,
): Promise<AStarRoute | null> {
  const started = performance.now()
  const source = nearestNode(g, origin.lat, origin.lng)
  const target = nearestNode(g, destination.lat, destination.lng)
  if (source === -1 || target === -1) return null

  const search = (): PathResult | null => {
    const factor = congestionFactor()
    return aStar(g, source, target, (seg) => {
      const sampled = trafficForWay(g.segWay[seg])?.mps
      return g.segLength[seg] / (sampled ?? (g.segSpeedKmh[seg] / 3.6) * factor)
    })
  }

  let path = search()
  let expanded = path?.expanded ?? 0
  let rounds = 1
  let lookups = 0
  while (path && longdoKey && rounds < MAX_ROUNDS && lookups < MAX_LOOKUPS_PER_ROUTE && !trafficCoolingDown() && !signal?.aborted) {
    // Main roads on the path still missing traffic: one lookup per road, at
    // its longest segment on the path; longest roads first.
    const pick = new Map<number, number>()
    const onPath = new Map<number, number>()
    for (const seg of path.segs) {
      if (g.segClass[seg] > TRAFFIC_CLASS_MAX) continue
      const way = g.segWay[seg]
      if (trafficForWay(way)) continue
      onPath.set(way, (onPath.get(way) ?? 0) + g.segLength[seg])
      if (!pick.has(way) || g.segLength[seg] > g.segLength[pick.get(way)!]) pick.set(way, seg)
    }
    if (pick.size === 0) break
    const batch = [...pick.keys()]
      .sort((a, b) => onPath.get(b)! - onPath.get(a)!)
      .slice(0, Math.min(MAX_LOOKUPS_PER_ROUND, MAX_LOOKUPS_PER_ROUTE - lookups))
      .map((way) => pick.get(way)!)
    await sampleTraffic(g, batch, longdoKey, signal)
    lookups += batch.length
    path = search()
    expanded += path?.expanded ?? 0
    rounds++
  }
  if (!path || signal?.aborted) return null

  const points: [number, number][] = [[origin.lat, origin.lng]]
  let metres = 0
  const mainRoad: Record<TrafficSource | 'none', number> = { 'real-time': 0, predicted: 0, none: 0 }
  path.segs.forEach((seg, i) => {
    for (const p of segmentShape(g, seg, path!.reversed[i])) {
      const last = points[points.length - 1]
      if (last[0] !== p[0] || last[1] !== p[1]) points.push(p)
    }
    metres += g.segLength[seg]
    if (g.segClass[seg] <= TRAFFIC_CLASS_MAX) mainRoad[trafficForWay(g.segWay[seg])?.source ?? 'none'] += g.segLength[seg]
  })
  const startGap = haversineM(origin.lat, origin.lng, g.nodeLat[source], g.nodeLng[source])
  const endGap = haversineM(destination.lat, destination.lng, g.nodeLat[target], g.nodeLng[target])
  points.push([destination.lat, destination.lng])
  metres += startGap + endGap
  const seconds = path.seconds + (startGap + endGap) / CONNECTOR_SPEED_MPS

  const withData = mainRoad['real-time'] + mainRoad.predicted
  const traffic: AStarRoute['traffic'] =
    withData === 0 || withData < mainRoad.none ? 'none' : mainRoad['real-time'] >= mainRoad.predicted ? 'real-time' : 'predicted'

  return {
    points,
    distanceKm: metres / 1000,
    durationMin: Math.max(1, Math.round(seconds / 60)),
    traffic,
    stats: { expanded, rounds, lookups, congestion: Number(congestionFactor().toFixed(2)), ms: Math.round(performance.now() - started) },
  }
}
