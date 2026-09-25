/// <reference lib="webworker" />
// Runs the A* router off the main thread: loading the ~3 MB graph and a few
// searches over its ~55k intersections would otherwise stall scrolling and
// the map on a phone. Keeps the parsed graph and the traffic samples for
// as long as the page is open.
import { parseGraph, type RoadGraph } from './graph'
import { GRAPH_REGION } from './region'
import { computeRoute, type AStarRoute } from './router'

export interface RouteRequest {
  id: number
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
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

self.onmessage = async (event: MessageEvent<RouteRequest>) => {
  const { id, origin, destination } = event.data
  let route: AStarRoute | null = null
  try {
    route = await computeRoute(await loadGraph(), origin, destination, import.meta.env.VITE_LONGDO_MAP_KEY)
    if (import.meta.env.DEV && route) console.info('[A*]', route.stats, route.traffic)
  } catch (err) {
    console.error('A* route failed:', err)
  }
  self.postMessage({ id, route } satisfies RouteResponse)
}
