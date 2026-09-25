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
}

/**
 * A* from `source` to `target` over the directed road graph, where
 * `edgeSeconds(seg)` is the cost of travelling a segment (its travel time
 * under current traffic).
 *
 * Heuristic: straight-line distance to the target divided by the fastest
 * speed allowed anywhere in the graph. That's a travel time no real route
 * can beat, so it never overestimates (admissible) and never drops by more
 * than an edge's cost (consistent) -- the first time the target comes off
 * the queue, its path is the fastest one. `edgeSeconds` must therefore
 * never imply a speed above graph.maxSpeedMps.
 *
 * With `heuristicWeight = 0` this is plain Dijkstra (same answer, more
 * nodes expanded) -- useful for comparing the two.
 */
export function aStar(
  g: RoadGraph,
  source: number,
  target: number,
  edgeSeconds: (seg: number) => number,
  heuristicWeight = 1,
): PathResult | null {
  const tLat = g.nodeLat[target]
  const tLng = g.nodeLng[target]
  const h = (n: number) => (heuristicWeight === 0 ? 0 : (heuristicWeight * haversineM(g.nodeLat[n], g.nodeLng[n], tLat, tLng)) / g.maxSpeedMps)

  const gScore = new Float64Array(g.nodeCount).fill(Infinity)
  const cameFromEdge = new Int32Array(g.nodeCount).fill(-1)
  const closed = new Uint8Array(g.nodeCount)
  const heap = new MinHeap(1024)

  gScore[source] = 0
  heap.push(source, h(source))
  let expanded = 0

  while (heap.size > 0) {
    const n = heap.pop()
    if (closed[n]) continue // stale entry: a cheaper one was already expanded
    closed[n] = 1
    expanded++
    if (n === target) break

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

  if (!closed[target]) return null

  const segs: number[] = []
  const reversed: boolean[] = []
  for (let n = target; n !== source; ) {
    const e = cameFromEdge[n]
    segs.push(g.adjSeg[e])
    reversed.push(g.adjReverse[e] === 1)
    n = g.adjReverse[e] === 1 ? g.segTo[g.adjSeg[e]] : g.segFrom[g.adjSeg[e]]
  }
  segs.reverse()
  reversed.reverse()
  return { segs, reversed, seconds: gScore[target], expanded }
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
