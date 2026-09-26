import { haversineM, type RoadGraph } from './graph'

export interface PathResult {
  /** Segments travelled, in order. */
  segs: number[]
  /** Per segment: true when travelled to -> from. */
  reversed: boolean[]
  /** Total cost -- seconds, when edgeSeconds returns travel times. */
  seconds: number
  /** Nodes taken off the open set before reaching the target: how much of
   * the graph the search had to look at. */
  expanded: number
  /** The intersections the route actually starts and ends at. */
  startNode: number
  endNode: number
  /** Which of the given sources/targets the route used. */
  startIndex: number
  endIndex: number
}

/** A place a route may start or end at, with the cost (seconds) of getting
 * between it and the exact point (the GPS fix / incident pin). */
export interface Endpoint {
  node: number
  seconds: number
}

/**
 * A* over the directed road graph, where `edgeSeconds(seg)` is the cost of
 * travelling a segment (its travel time under current traffic).
 *
 * Starts and ends are *sets* of nearby intersections, each with the cost
 * of reaching it from the exact point. Snapping to the single nearest
 * intersection breaks on divided roads: the nearest one is often on the
 * carriageway heading the wrong way, and a one-way graph then forces a long
 * detour to U-turn. Offering several and letting the search choose avoids it.
 *
 * Heuristic: straight-line distance to the destination point, minus the
 * furthest target's offset, divided by the fastest speed allowed anywhere
 * in the graph. No real route can beat that, so it never overestimates
 * (admissible); the search stops once nothing left in the queue could beat
 * the best finish found, which makes the result the fastest route.
 * `edgeSeconds` must never imply a speed above graph.maxSpeedMps.
 *
 * With `heuristicWeight = 0` this is plain Dijkstra (same answer, more
 * nodes expanded) -- useful for comparing the two.
 */
export function aStarMulti(
  g: RoadGraph,
  sources: Endpoint[],
  targets: Endpoint[],
  goal: { lat: number; lng: number },
  edgeSeconds: (seg: number) => number,
  heuristicWeight = 1,
): PathResult | null {
  // Several endpoints can share a node (two roads meeting there) -- keep the
  // cheapest per node, and remember which one it was.
  const targetCost = new Map<number, { seconds: number; index: number }>()
  targets.forEach((t, index) => {
    const prev = targetCost.get(t.node)
    if (!prev || t.seconds < prev.seconds) targetCost.set(t.node, { seconds: t.seconds, index })
  })
  const startIndex = new Map<number, number>()
  const slackM = Math.max(0, ...targets.map((t) => haversineM(g.nodeLat[t.node], g.nodeLng[t.node], goal.lat, goal.lng)))
  const h = (n: number) =>
    heuristicWeight === 0
      ? 0
      : (heuristicWeight * Math.max(0, haversineM(g.nodeLat[n], g.nodeLng[n], goal.lat, goal.lng) - slackM)) / g.maxSpeedMps

  const gScore = new Float64Array(g.nodeCount).fill(Infinity)
  const cameFromEdge = new Int32Array(g.nodeCount).fill(-1)
  const closed = new Uint8Array(g.nodeCount)
  const heap = new MinHeap(1024)
  sources.forEach((s, index) => {
    if (s.seconds < gScore[s.node]) {
      gScore[s.node] = s.seconds
      startIndex.set(s.node, index)
      heap.push(s.node, s.seconds + h(s.node))
    }
  })

  let best = Infinity
  let bestNode = -1
  let expanded = 0
  while (heap.size > 0) {
    if (heap.peekPriority() >= best) break
    const n = heap.pop()
    if (closed[n]) continue // stale entry: a cheaper one was already expanded
    closed[n] = 1
    expanded++
    const finish = targetCost.get(n)
    if (finish !== undefined && gScore[n] + finish.seconds < best) {
      best = gScore[n] + finish.seconds
      bestNode = n
    }

    for (let e = g.adjOffset[n]; e < g.adjOffset[n + 1]; e++) {
      const m = g.adjTo[e]
      if (closed[m]) continue
      const tentative = gScore[n] + edgeSeconds(g.adjSeg[e])
      if (tentative < gScore[m]) {
        gScore[m] = tentative
        cameFromEdge[m] = e
        heap.push(m, tentative + h(m))
      }
    }
  }
  if (bestNode === -1) return null

  const segs: number[] = []
  const reversed: boolean[] = []
  let first = bestNode
  for (let n = bestNode; cameFromEdge[n] !== -1; ) {
    const e = cameFromEdge[n]
    segs.push(g.adjSeg[e])
    reversed.push(g.adjReverse[e] === 1)
    n = g.adjReverse[e] === 1 ? g.segTo[g.adjSeg[e]] : g.segFrom[g.adjSeg[e]]
    first = n
  }
  segs.reverse()
  reversed.reverse()
  return {
    segs,
    reversed,
    seconds: best,
    expanded,
    startNode: first,
    endNode: bestNode,
    startIndex: startIndex.get(first) ?? 0,
    endIndex: targetCost.get(bestNode)!.index,
  }
}

/** Single start/end intersection (used for the A*-vs-Dijkstra comparison). */
export function aStar(
  g: RoadGraph,
  source: number,
  target: number,
  edgeSeconds: (seg: number) => number,
  heuristicWeight = 1,
): PathResult | null {
  const goal = { lat: g.nodeLat[target], lng: g.nodeLng[target] }
  return aStarMulti(g, [{ node: source, seconds: 0 }], [{ node: target, seconds: 0 }], goal, edgeSeconds, heuristicWeight)
}

/** Binary min-heap of (node, priority), growing as needed. Duplicates are
 * allowed -- the search skips stale ones instead of doing decrease-key. */
class MinHeap {
  private nodes: Int32Array
  private prio: Float64Array
  size = 0

  constructor(capacity: number) {
    this.nodes = new Int32Array(capacity)
    this.prio = new Float64Array(capacity)
  }

  push(node: number, priority: number) {
    if (this.size === this.nodes.length) {
      const nodes = new Int32Array(this.size * 2)
      const prio = new Float64Array(this.size * 2)
      nodes.set(this.nodes)
      prio.set(this.prio)
      this.nodes = nodes
      this.prio = prio
    }
    let i = this.size++
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.prio[parent] <= priority) break
      this.nodes[i] = this.nodes[parent]
      this.prio[i] = this.prio[parent]
      i = parent
    }
    this.nodes[i] = node
    this.prio[i] = priority
  }

  peekPriority(): number {
    return this.prio[0]
  }

  pop(): number {
    const top = this.nodes[0]
    const lastNode = this.nodes[--this.size]
    const lastPrio = this.prio[this.size]
    let i = 0
    for (;;) {
      let child = i * 2 + 1
      if (child >= this.size) break
      if (child + 1 < this.size && this.prio[child + 1] < this.prio[child]) child++
      if (this.prio[child] >= lastPrio) break
      this.nodes[i] = this.nodes[child]
      this.prio[i] = this.prio[child]
      i = child
    }
    this.nodes[i] = lastNode
    this.prio[i] = lastPrio
    return top
  }
}
