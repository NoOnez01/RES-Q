import { haversineM, nearbyNodes, nearbySegments, nearestNode, segmentShape, type RoadGraph } from './graph'
import { aStarMulti, type Endpoint, type PathResult } from './search'
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
// Walking-pace cost for the stretch from the exact point to the road.
const CONNECTOR_SPEED_MPS = 20 / 3.6

// Where a route may begin and end. Each end is snapped onto the road
// segments near it -- the way OSRM does -- rather than to the nearest
// intersection: that one can be far along a long road, or on the other
// carriageway of a divided road, where a one-way graph then forces a long
// detour to U-turn. Every nearby segment offers each direction it allows,
// charged the walk to the road plus the drive along it to its end node.
const SNAP_RADIUS_M = 150
const SNAP_SEGMENTS = 6
const NODE_RADIUS_M = 250
const NODE_CANDIDATES = 8

interface Snap extends Endpoint {
  /** Drawn between the exact point and the endpoint's node, in travel order. */
  points: [number, number][]
  metres: number
}

function freeFlowMps(g: RoadGraph, seg: number): number {
  return g.segSpeedKmh[seg] / 3.6
}

/** A segment's shape points before and after the point `along` metres in. */
function shapeSplit(g: RoadGraph, seg: number, along: number): { before: [number, number][]; after: [number, number][] } {
  const pts = segmentShape(g, seg, false)
  let walked = 0
  const total = pts.slice(1).reduce((m, p, i) => m + haversineM(pts[i][0], pts[i][1], p[0], p[1]), 0) || 1
  const scale = g.segLength[seg] / total
  const before: [number, number][] = [pts[0]]
  const after: [number, number][] = []
  for (let i = 1; i < pts.length; i++) {
    walked += haversineM(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) * scale
    if (walked <= along) before.push(pts[i])
    else after.push(pts[i])
  }
  return { before, after }
}

function snapEnds(g: RoadGraph, p: { lat: number; lng: number }, role: 'start' | 'end'): Snap[] {
  const out: Snap[] = []
  for (const snap of nearbySegments(g, p.lat, p.lng, SNAP_RADIUS_M, SNAP_SEGMENTS)) {
    const { seg, along } = snap
    const len = g.segLength[seg]
    const walk = snap.metres / CONNECTOR_SPEED_MPS
    const proj: [number, number] = [snap.lat, snap.lng]
    const { before, after } = shapeSplit(g, seg, along)
    const forward = g.segOneway[seg] !== -1
    const backward = g.segOneway[seg] !== 1
    if (role === 'start') {
      if (forward) out.push({ node: g.segTo[seg], seconds: walk + (len - along) / freeFlowMps(g, seg), points: [proj, ...after], metres: snap.metres + len - along })
      if (backward) out.push({ node: g.segFrom[seg], seconds: walk + along / freeFlowMps(g, seg), points: [proj, ...before.slice().reverse()], metres: snap.metres + along })
    } else {
      if (forward) out.push({ node: g.segFrom[seg], seconds: along / freeFlowMps(g, seg) + walk, points: [...before, proj], metres: along + snap.metres })
      if (backward) out.push({ node: g.segTo[seg], seconds: (len - along) / freeFlowMps(g, seg) + walk, points: [...after.slice().reverse(), proj], metres: len - along + snap.metres })
    }
  }
  // Nearby intersections too, reached on foot: more choices can only make
  // the chosen route faster, and they cover a point whose nearest segments
  // are all one dead-end street.
  for (const { node, metres } of nearbyNodes(g, p.lat, p.lng, NODE_RADIUS_M, NODE_CANDIDATES)) {
    const at: [number, number] = [g.nodeLat[node], g.nodeLng[node]]
    out.push({ node, seconds: metres / CONNECTOR_SPEED_MPS, points: role === 'start' ? [at] : [at], metres })
  }
  if (out.length > 0) return out
  // Nothing mapped nearby: fall back to the nearest intersection.
  const node = nearestNode(g, p.lat, p.lng)
  if (node === -1) return []
  const metres = haversineM(p.lat, p.lng, g.nodeLat[node], g.nodeLng[node])
  return [{ node, seconds: metres / CONNECTOR_SPEED_MPS, points: [], metres }]
}

/** Start and end on the same segment, in a direction it allows: no need to
 * reach any intersection at all. */
function sameSegmentRoute(g: RoadGraph, origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
  let best: { seconds: number; metres: number; points: [number, number][] } | null = null
  const ends = nearbySegments(g, destination.lat, destination.lng, SNAP_RADIUS_M, SNAP_SEGMENTS)
  for (const a of nearbySegments(g, origin.lat, origin.lng, SNAP_RADIUS_M, SNAP_SEGMENTS)) {
    const b = ends.find((e) => e.seg === a.seg)
    if (!b) continue
    const onRoad = Math.abs(b.along - a.along)
    const allowed = b.along >= a.along ? g.segOneway[a.seg] !== -1 : g.segOneway[a.seg] !== 1
    if (!allowed) continue
    const seconds = (a.metres + b.metres) / CONNECTOR_SPEED_MPS + onRoad / freeFlowMps(g, a.seg)
    if (!best || seconds < best.seconds) {
      best = { seconds, metres: a.metres + onRoad + b.metres, points: [[a.lat, a.lng], [b.lat, b.lng]] }
    }
  }
  return best
}

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
  const sources = snapEnds(g, origin, 'start')
  const targets = snapEnds(g, destination, 'end')
  if (sources.length === 0 || targets.length === 0) return null

  const search = (): PathResult | null => {
    const factor = congestionFactor()
    return aStarMulti(g, sources, targets, destination, (seg) => {
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
  if (signal?.aborted) return null
  const direct = sameSegmentRoute(g, origin, destination)
  if (direct && (!path || direct.seconds <= path.seconds)) {
    return {
      points: [[origin.lat, origin.lng], ...direct.points, [destination.lat, destination.lng]],
      distanceKm: direct.metres / 1000,
      durationMin: Math.max(1, Math.round(direct.seconds / 60)),
      traffic: 'none',
      stats: { expanded, rounds, lookups, congestion: Number(congestionFactor().toFixed(2)), ms: Math.round(performance.now() - started) },
    }
  }
  if (!path) return null

  const start = sources[path.startIndex]
  const end = targets[path.endIndex]
  const points: [number, number][] = [[origin.lat, origin.lng]]
  const push = (p: [number, number]) => {
    const last = points[points.length - 1]
    if (last[0] !== p[0] || last[1] !== p[1]) points.push(p)
  }
  start.points.forEach(push)
  let metres = start.metres + end.metres
  const mainRoad: Record<TrafficSource | 'none', number> = { 'real-time': 0, predicted: 0, none: 0 }
  path.segs.forEach((seg, i) => {
    segmentShape(g, seg, path!.reversed[i]).forEach(push)
    metres += g.segLength[seg]
    if (g.segClass[seg] <= TRAFFIC_CLASS_MAX) mainRoad[trafficForWay(g.segWay[seg])?.source ?? 'none'] += g.segLength[seg]
  })
  end.points.forEach(push)
  push([destination.lat, destination.lng])
  // path.seconds already includes both ends (see snapEnds).
  const seconds = path.seconds

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
