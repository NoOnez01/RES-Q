import { edgeArrivalBearing, edgeDepartureBearing, haversineM, type RoadGraph } from './graph'

export interface PathResult {
  /** Whole segments travelled, in order (not the partial ones at each end). */
  segs: number[]
  /** Per segment: true when travelled to -> from. */
  reversed: boolean[]
  /** Total cost in seconds, including both ends, turns and traffic lights. */
  seconds: number
  /** Search states taken off the queue: how much of the graph was looked at. */
  expanded: number
  /** The intersections the route actually starts and ends at. */
  startNode: number
  endNode: number
  /** Which of the given sources/targets the route used. */
  startIndex: number
  endIndex: number
}

/**
 * A place a route may start or end at, with the cost (seconds) of getting
 * between it and the exact point (the GPS fix / incident pin).
 *
 * `edge` is set when the endpoint lies partway along a road: for a source,
 * the directed edge the vehicle is already travelling on as it reaches
 * `node` (so turn rules apply to its first turn); for a target, the edge it
 * must turn onto at `node` to finish the trip. Without it (reached on foot)
 * any direction is fine.
 */
export interface Endpoint {
  node: number
  seconds: number
  edge?: number
}

// Time costs of manoeuvres at an intersection, in seconds. Thailand drives
// on the left: turning left is the easy turn, turning right crosses the
// oncoming lanes. An ambulance with lights on waits less at a red light
// than ordinary traffic, but still has to slow down and clear the junction.
export const TURN_SECONDS = { straight: 0, left: 4, right: 10, uTurn: 20 }
export const SIGNAL_SECONDS = 12
const STRAIGHT_DEG = 35
const U_TURN_DEG = 150

/** Signed turn angle from arriving along `inEdge` to leaving along `outEdge`:
 * negative = left, positive = right, degrees in (-180, 180]. */
function turnAngle(g: RoadGraph, inEdge: number, outEdge: number): number {
  const d = edgeDepartureBearing(g, outEdge) - edgeArrivalBearing(g, inEdge)
  return ((d + 540) % 360) - 180
}

/**
 * Seconds for turning from `inEdge` onto `outEdge` at their shared
 * intersection, or Infinity when the move isn't allowed: a turn
 * restriction forbids it, a barrier blocks the intersection, or it doubles
 * straight back along the same road (only allowed at a dead end, where
 * there is no other way out).
 */
export function turnSeconds(g: RoadGraph, inEdge: number, outEdge: number): number {
  const via = g.adjTo[inEdge]
  if (g.nodeFlags[via] & 2) return Infinity
  const inSeg = g.adjSeg[inEdge]
  const outSeg = g.adjSeg[outEdge]
  const signal = g.nodeFlags[via] & 1 ? SIGNAL_SECONDS : 0
  if (inSeg === outSeg) {
    for (let e = g.adjOffset[via]; e < g.adjOffset[via + 1]; e++) {
      if (g.adjSeg[e] !== inSeg) return Infinity
    }
    return TURN_SECONDS.uTurn + signal
  }
  const rules = g.restrictionsAt.get(via)
  if (rules) {
    const fromWay = g.segWay[inSeg]
    const toWay = g.segWay[outSeg]
    let onlyRule = false
    let onlyMatch = false
    for (const r of rules) {
      if (r.fromWay !== fromWay) continue
      if (r.only) {
        onlyRule = true
        if (r.toWay === toWay) onlyMatch = true
      } else if (r.toWay === toWay) return Infinity
    }
    if (onlyRule && !onlyMatch) return Infinity
  }
  const angle = turnAngle(g, inEdge, outEdge)
  const abs = Math.abs(angle)
  const turn = abs <= STRAIGHT_DEG ? TURN_SECONDS.straight : abs > U_TURN_DEG ? TURN_SECONDS.uTurn : angle < 0 ? TURN_SECONDS.left : TURN_SECONDS.right
  return turn + signal
}

/**
 * Turn-aware A* over the directed road graph. `edgeSeconds(seg)` is the
 * cost of travelling a segment (travel time under current traffic, plus
 * any traffic lights along it; Infinity = closed).
 *
 * The search state is the directed edge a vehicle arrived on rather than
 * just the intersection, because whether the next turn is allowed -- and
 * what it costs -- depends on where you came from: turn restrictions,
 * no doubling back, a right turn costing more than going straight.
 *
 * Starts and ends are *sets* of candidates near the exact points (see
 * Endpoint and router.ts); the search picks the fastest combination.
 *
 * Heuristic: straight-line distance to the destination point, minus the
 * furthest target's offset, divided by the fastest speed allowed anywhere
 * in the graph. Turn and light costs only ever add time, so this never
 * overestimates (admissible); the search stops once nothing left in the
 * queue could beat the best finish found, which makes the result the
 * fastest route. `edgeSeconds` must never imply a speed above
 * graph.maxSpeedMps.
 *
 * With `heuristicWeight = 0` this is plain Dijkstra (same answer, more
 * states expanded) -- useful for comparing the two.
 */
export function aStarMulti(
  g: RoadGraph,
  sources: Endpoint[],
  targets: Endpoint[],
  goal: { lat: number; lng: number },
  edgeSeconds: (seg: number) => number,
  heuristicWeight = 1,
): PathResult | null {
  const edgeCount = g.adjSeg.length
  const slackM = Math.max(0, ...targets.map((t) => haversineM(g.nodeLat[t.node], g.nodeLng[t.node], goal.lat, goal.lng)))
  const h = (node: number) =>
    heuristicWeight === 0
      ? 0
      : (heuristicWeight * Math.max(0, haversineM(g.nodeLat[node], g.nodeLng[node], goal.lat, goal.lng) - slackM)) / g.maxSpeedMps

  const targetsAt = new Map<number, number[]>()
  targets.forEach((t, i) => targetsAt.set(t.node, [...(targetsAt.get(t.node) ?? []), i]))

  // State = directed edge; its score is the cost of arriving at its head.
  const gScore = new Float64Array(edgeCount).fill(Infinity)
  const prevEdge = new Int32Array(edgeCount).fill(-1)
  // For states seeded straight from a source: which one, and whether the
  // edge is that source's partial road (drawn by the router, not a whole
  // segment of the path).
  const seedSource = new Int32Array(edgeCount).fill(-1)
  const seedPartial = new Uint8Array(edgeCount)
  const closed = new Uint8Array(edgeCount)
  const heap = new MinHeap(1024)

  const seed = (e: number, cost: number, source: number, partial: boolean) => {
    if (cost < gScore[e]) {
      gScore[e] = cost
      prevEdge[e] = -1
      seedSource[e] = source
      seedPartial[e] = partial ? 1 : 0
      heap.push(e, cost + h(g.adjTo[e]))
    }
  }
  sources.forEach((s, i) => {
    if (s.edge !== undefined && s.edge >= 0) {
      seed(s.edge, s.seconds, i, true)
      return
    }
    for (let e = g.adjOffset[s.node]; e < g.adjOffset[s.node + 1]; e++) {
      const c = edgeSeconds(g.adjSeg[e])
      if (Number.isFinite(c)) seed(e, s.seconds + c, i, false)
    }
  })

  let best = Infinity
  let bestEdge = -1
  let bestTarget = -1
  // A trip whose start and end candidates share an intersection needs no
  // road at all in between.
  let direct: { source: number; target: number } | null = null
  sources.forEach((s, si) => {
    for (const ti of targetsAt.get(s.node) ?? []) {
      const t = targets[ti]
      const turn = s.edge !== undefined && t.edge !== undefined ? turnSeconds(g, s.edge, t.edge) : 0
      const cost = s.seconds + turn + t.seconds
      if (cost < best) {
        best = cost
        direct = { source: si, target: ti }
      }
    }
  })

  let expanded = 0
  while (heap.size > 0) {
    if (heap.peekPriority() >= best) break
    const e = heap.pop()
    if (closed[e]) continue // stale entry: a cheaper one was already expanded
    closed[e] = 1
    expanded++
    const node = g.adjTo[e]

    for (const ti of targetsAt.get(node) ?? []) {
      const t = targets[ti]
      const turn = t.edge !== undefined ? turnSeconds(g, e, t.edge) : 0
      const cost = gScore[e] + turn + t.seconds
      if (cost < best) {
        best = cost
        bestEdge = e
        bestTarget = ti
        direct = null
      }
    }

    for (let f = g.adjOffset[node]; f < g.adjOffset[node + 1]; f++) {
      if (closed[f]) continue
      const turn = turnSeconds(g, e, f)
      if (!Number.isFinite(turn)) continue
      const travel = edgeSeconds(g.adjSeg[f])
      if (!Number.isFinite(travel)) continue
      const tentative = gScore[e] + turn + travel
      if (tentative < gScore[f]) {
        gScore[f] = tentative
        prevEdge[f] = e
        seedSource[f] = -1
        heap.push(f, tentative + h(g.adjTo[f]))
      }
    }
  }

  const found = direct as { source: number; target: number } | null
  if (found) {
    const node = targets[found.target].node
    return { segs: [], reversed: [], seconds: best, expanded, startNode: node, endNode: node, startIndex: found.source, endIndex: found.target }
  }
  if (bestEdge === -1) return null

  const chain: number[] = []
  let e = bestEdge
  while (prevEdge[e] !== -1) {
    chain.push(e)
    e = prevEdge[e]
  }
  const seedEdge = e
  if (!seedPartial[seedEdge]) chain.push(seedEdge)
  chain.reverse()
  const startNode = seedPartial[seedEdge] ? g.adjTo[seedEdge] : (g.adjReverse[seedEdge] ? g.segTo[g.adjSeg[seedEdge]] : g.segFrom[g.adjSeg[seedEdge]])
  return {
    segs: chain.map((x) => g.adjSeg[x]),
    reversed: chain.map((x) => g.adjReverse[x] === 1),
    seconds: best,
    expanded,
    startNode,
    endNode: g.adjTo[bestEdge],
    startIndex: seedSource[seedEdge],
    endIndex: bestTarget,
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
