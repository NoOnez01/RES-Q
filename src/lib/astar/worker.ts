/// <reference lib="webworker" />
// Runs the A* router off the main thread: loading the ~4.5 MB graph and a
// few searches over its ~75k intersections would otherwise stall scrolling and
// the map on a phone. Keeps the parsed graph and the traffic samples for
// as long as the page is open.
import { nearbySegments, parseGraph, type RoadGraph } from './graph'
import { GRAPH_REGION } from './region'
import { computeRoute, type AStarRoute } from './router'

export interface RouteRequest {
  id: number
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
  /** Road closures in force right now (see lib/roadClosures.ts). */
  closures: { id: string; lat: number; lng: number }[]
}

export interface RouteResponse {
  id: number
  route: AStarRoute | null
}

let graph: Promise<RoadGraph> | null = null
function loadGraph(): Promise<RoadGraph> {
  return (graph ??= fetch(GRAPH_REGION.url)
    .then((res) => {
      if (!res.ok) throw new Error(`road graph: HTTP ${res.status}`)
      return res.arrayBuffer()
    })
    .then(parseGraph)
    .catch((err: unknown) => {
      graph = null // retry on the next request instead of failing forever
      throw err
    }))
}

// A closure is a reported point; the road segments passing within this
// distance of it count as closed (both carriageways of a divided road, and
// the side street it sits on, if it's at a junction).
const CLOSURE_RADIUS_M = 25
const closedByClosure = new Map<string, number[]>()

function closedSegments(g: RoadGraph, closures: RouteRequest['closures']): Set<number> {
  const closed = new Set<number>()
  for (const c of closures) {
    let segs = closedByClosure.get(c.id)
    if (!segs) {
      segs = nearbySegments(g, c.lat, c.lng, CLOSURE_RADIUS_M, 8).map((s) => s.seg)
      closedByClosure.set(c.id, segs)
    }
    for (const s of segs) closed.add(s)
  }
  return closed
}

self.onmessage = async (event: MessageEvent<RouteRequest>) => {
  const { id, origin, destination, closures } = event.data
  let route: AStarRoute | null = null
  try {
    const g = await loadGraph()
    route = await computeRoute(g, origin, destination, import.meta.env.VITE_LONGDO_MAP_KEY, undefined, closedSegments(g, closures))
    if (import.meta.env.DEV && route) console.info('[A*]', route.stats, route.traffic)
  } catch (err) {
    console.error('A* route failed:', err)
  }
  self.postMessage({ id, route } satisfies RouteResponse)
}
