import { haversineM, type RoadGraph } from './graph'
import { turnSeconds, type Endpoint, type PathResult } from './search'

/**
 * D* Lite (Koenig & Likhachev, 2002) over the directed road graph -- the
 * router's search. It finds the same fastest route A* would, but searches
 * backwards from the destination and keeps what it worked out: when road
 * costs change (a traffic reading comes in, a road is reported closed) or
 * the vehicle moves on, the next search repairs only the part of the tree
 * that changed instead of starting over. Live navigation re-plans the same
 * trip again and again as the ambulance drives; this is what D* Lite is
 * for.
 *
 * As in the A* (search.ts), the state is the directed edge a vehicle
 * arrived on, so turn rules and turn costs apply. The trip's many possible
 * starts and ends (Endpoint: roads near the exact points) hang off two
 * virtual states: START, whose successors are the start edges, and GOAL,
 * reached from any edge that ends at a target. g(s) is the cost from s to
 * the destination.
 *
 * Heuristic: straight-line distance from the start point to the state's
 * position over the fastest speed in the graph. Every cost -- start edges
 * included, which count the walk from the exact point -- is at least that,
 * so it's consistent; when the start moves, the key modifier km grows by
 * the distance moved (over the same speed), which keeps old keys valid.
 */

interface Incoming {
  /** The node each directed edge leaves from. */
  tail: Uint32Array
  /** Edges arriving at node n: edges[offset[n] .. offset[n + 1]]. */
  offset: Uint32Array
  edges: Uint32Array
}

const incomingCache = new WeakMap<RoadGraph, Incoming>()

/** Built once per graph: the search walks edges backwards. */
function incomingOf(g: RoadGraph): Incoming {
  const cached = incomingCache.get(g)
  if (cached) return cached
  const edgeCount = g.adjSeg.length
  const tail = new Uint32Array(edgeCount)
  for (let n = 0; n < g.nodeCount; n++) for (let e = g.adjOffset[n]; e < g.adjOffset[n + 1]; e++) tail[e] = n
  const offset = new Uint32Array(g.nodeCount + 1)
  for (let e = 0; e < edgeCount; e++) offset[g.adjTo[e] + 1]++
  for (let n = 0; n < g.nodeCount; n++) offset[n + 1] += offset[n]
  const cursor = offset.slice(0, g.nodeCount)
  const edges = new Uint32Array(edgeCount)
  for (let e = 0; e < edgeCount; e++) edges[cursor[g.adjTo[e]]++] = e
  const built = { tail, offset, edges }
  incomingCache.set(g, built)
  return built
}

/** One way the trip can begin on an edge. An edge can be offered more than
 * once -- as the road the vehicle is partway along, and whole, from a
 * nearby intersection -- and which is cheaper can change with traffic, so
 * all are kept. */
const scaleCache = new WeakMap<RoadGraph, number>()

/**
 * How far to scale the straight-line heuristic down so it never overshoots.
 * A road's stored length can fall a little short of the straight line
 * between its end points (node positions and road shapes are rounded
 * separately) -- in the Chiang Mai graph, down to 93% of it. Summed along a
 * route that lets straight-line-at-top-speed exceed the real time, and D*
 * Lite, unlike A*, can then stop with a stale value and hand back a route
 * twice as slow as it says. Scaled by the worst such ratio in the graph, the
 * heuristic is consistent again. Worked out once per graph.
 */
export function heuristicScale(g: RoadGraph): number {
  const cached = scaleCache.get(g)
  if (cached !== undefined) return cached
  let worst = 1
  for (let s = 0; s < g.segCount; s++) {
    const d = haversineM(g.nodeLat[g.segFrom[s]], g.nodeLng[g.segFrom[s]], g.nodeLat[g.segTo[s]], g.nodeLng[g.segTo[s]])
    if (d > 0) worst = Math.min(worst, g.segLength[s] / d)
  }
  const scale = worst * 0.999
  scaleCache.set(g, scale)
  return scale
}

interface Seed {
  cost: number
  source: number
  /** The source's own partial road (drawn by the router), not a whole segment. */
  partial: boolean
}

function cheapest(seeds: Seed[]): Seed {
  let best = seeds[0]
  for (const s of seeds) if (s.cost < best.cost) best = s
  return best
}

export class DStarLite {
  /** Search states expanded by the last plan(). */
  expanded = 0

  private readonly START: number
  private readonly GOAL: number
  private readonly gv: Float64Array
  private readonly rhs: Float64Array
  private readonly queue: KeyQueue
  private km = 0
  private readonly incoming: Incoming
  /** Seconds per metre of straight line the heuristic counts (see heuristicScale). */
  private readonly perMetre: number
  /** Cost of each segment as the search last saw it; NaN = never asked. */
  private readonly segCost: Float64Array
  /** Per edge: cost from its head to the destination through a target
   * there (Infinity if none), and which target. */
  private readonly finish: Float64Array
  private readonly finishTarget: Int32Array
  private readonly finishEdges: number[] = []
  private seeds = new Map<number, Seed[]>()
  private sources: Endpoint[] = []
  private origin: { lat: number; lng: number }

  constructor(
    private readonly g: RoadGraph,
    private readonly targets: Endpoint[],
    private readonly goal: { lat: number; lng: number },
    sources: Endpoint[],
    origin: { lat: number; lng: number },
    /** Seconds to travel a segment right now; Infinity = can't. Asked
     * once per segment -- tell the planner when it changes (updateSegments). */
    private readonly seconds: (seg: number) => number,
  ) {
    const edgeCount = g.adjSeg.length
    this.START = edgeCount
    this.GOAL = edgeCount + 1
    this.gv = new Float64Array(edgeCount + 2).fill(Infinity)
    this.rhs = new Float64Array(edgeCount + 2).fill(Infinity)
    this.queue = new KeyQueue(edgeCount + 2)
    this.incoming = incomingOf(g)
    this.perMetre = heuristicScale(g) / g.maxSpeedMps
    this.segCost = new Float64Array(g.segCount).fill(NaN)
    this.finish = new Float64Array(edgeCount).fill(Infinity)
    this.finishTarget = new Int32Array(edgeCount).fill(-1)
    targets.forEach((t, ti) => {
      for (let i = this.incoming.offset[t.node]; i < this.incoming.offset[t.node + 1]; i++) {
        const e = this.incoming.edges[i]
        const cost = (t.edge !== undefined ? turnSeconds(g, e, t.edge) : 0) + t.seconds
        if (cost < this.finish[e]) {
          if (this.finish[e] === Infinity) this.finishEdges.push(e)
          this.finish[e] = cost
          this.finishTarget[e] = ti
        }
      }
    })
    this.origin = origin
    this.rhs[this.GOAL] = 0
    this.queue.insert(this.GOAL, this.h(this.GOAL), 0)
    this.setSources(sources)
  }

  /** The vehicle moved on (or the trip starts somewhere else). */
  setStart(sources: Endpoint[], origin: { lat: number; lng: number }) {
    this.km += haversineM(this.origin.lat, this.origin.lng, origin.lat, origin.lng) * this.perMetre
    this.origin = origin
    this.setSources(sources)
  }

  /** These segments' costs may have changed (traffic, closures): repair
   * what depended on them. */
  updateSegments(segs: Iterable<number>) {
    for (const seg of segs) {
      const old = this.segCost[seg]
      if (Number.isNaN(old)) continue // never used, so nothing depends on it
      const now = this.seconds(seg)
      if (now === old) continue
      this.segCost[seg] = now
      for (const f of this.edgesOf(seg)) {
        const gf = this.gv[f]
        const tail = this.incoming.tail[f]
        for (let i = this.incoming.offset[tail]; i < this.incoming.offset[tail + 1]; i++) {
          const e = this.incoming.edges[i]
          const turn = turnSeconds(this.g, e, f)
          if (turn === Infinity) continue
          this.costChanged(e, turn + old, turn + now, gf)
        }
        const seeds = this.seeds.get(f)
        if (seeds?.some((s) => !s.partial)) {
          const before = cheapest(seeds).cost
          for (const s of seeds) if (!s.partial) s.cost = this.sources[s.source].seconds + now
          this.costChanged(this.START, before, cheapest(seeds).cost, gf)
        }
      }
    }
  }

  /** Of these segments, the ones the search has priced whose cost is no
   * longer what it priced them at. */
  changedSegments(segs: Iterable<number>): number[] {
    const out: number[] = []
    for (const seg of segs) {
      const c = this.segCost[seg]
      if (!Number.isNaN(c) && this.seconds(seg) !== c) out.push(seg)
    }
    return out
  }

  /** The fastest route from the start to the destination, or null. */
  plan(): PathResult | null {
    this.expanded = 0
    this.computeShortestPath()
    const direct = this.direct()
    const via = this.rhs[this.START]
    if (direct && direct.cost <= via) {
      const node = this.targets[direct.target].node
      return { segs: [], reversed: [], seconds: direct.cost, expanded: this.expanded, startNode: node, endNode: node, startIndex: direct.source, endIndex: direct.target }
    }
    if (via === Infinity) return null

    // Down the tree: each step to the successor that gives the state its cost.
    let first = -1
    let firstCost = Infinity
    for (const [e, seeds] of this.seeds) {
      const v = cheapest(seeds).cost + this.gv[e]
      if (v < firstCost) {
        firstCost = v
        first = e
      }
    }
    if (first === -1) return null
    const seed = cheapest(this.seeds.get(first)!)
    const chain: number[] = seed.partial ? [] : [first]
    let cur = first
    for (let steps = 0; steps < this.START; steps++) {
      let best = this.finish[cur]
      let next = -1
      const node = this.g.adjTo[cur]
      for (let f = this.g.adjOffset[node]; f < this.g.adjOffset[node + 1]; f++) {
        const c = this.transition(cur, f)
        if (c === Infinity) continue
        const v = c + this.gv[f]
        if (v < best) {
          best = v
          next = f
        }
      }
      if (next === -1) break
      chain.push(next)
      cur = next
    }
    // Always ends at a target when the search is sound; never hand back a
    // route that doesn't.
    if (this.finishTarget[cur] === -1) return null
    return {
      segs: chain.map((e) => this.g.adjSeg[e]),
      reversed: chain.map((e) => this.g.adjReverse[e] === 1),
      seconds: via,
      expanded: this.expanded,
      startNode: seed.partial ? this.g.adjTo[first] : this.incoming.tail[first],
      endNode: this.g.adjTo[cur],
      startIndex: seed.source,
      endIndex: this.finishTarget[cur],
    }
  }

  // ---------------------------------------------------------------------

  private setSources(sources: Endpoint[]) {
    this.sources = sources
    const seeds = new Map<number, Seed[]>()
    const add = (e: number, cost: number, source: number, partial: boolean) => {
      const had = seeds.get(e)
      if (had) had.push({ cost, source, partial })
      else seeds.set(e, [{ cost, source, partial }])
    }
    sources.forEach((s, i) => {
      if (s.edge !== undefined && s.edge >= 0) {
        add(s.edge, s.seconds, i, true)
        return
      }
      // Kept even while closed: the road may reopen.
      for (let e = this.g.adjOffset[s.node]; e < this.g.adjOffset[s.node + 1]; e++) add(e, s.seconds + this.cost(this.g.adjSeg[e]), i, false)
    })
    this.seeds = seeds
    this.rhs[this.START] = this.startRhs()
    this.touch(this.START)
  }

  /** A trip whose start and end share an intersection needs no road. */
  private direct(): { cost: number; source: number; target: number } | null {
    let best: { cost: number; source: number; target: number } | null = null
    this.sources.forEach((s, si) => {
      this.targets.forEach((t, ti) => {
        if (t.node !== s.node) return
        const turn = s.edge !== undefined && t.edge !== undefined ? turnSeconds(this.g, s.edge, t.edge) : 0
        const cost = s.seconds + turn + t.seconds
        if (!best || cost < best.cost) best = { cost, source: si, target: ti }
      })
    })
    return best
  }

  private cost(seg: number): number {
    let c = this.segCost[seg]
    if (Number.isNaN(c)) {
      c = this.seconds(seg)
      this.segCost[seg] = c
    }
    return c
  }

  /** Seconds from arriving on `e` to arriving on `f` (turn + drive). */
  private transition(e: number, f: number): number {
    const turn = turnSeconds(this.g, e, f)
    return turn === Infinity ? Infinity : turn + this.cost(this.g.adjSeg[f])
  }

  private *edgesOf(seg: number): Generator<number> {
    for (const node of [this.g.segFrom[seg], this.g.segTo[seg]]) {
      for (let e = this.g.adjOffset[node]; e < this.g.adjOffset[node + 1]; e++) if (this.g.adjSeg[e] === seg) yield e
    }
  }

  /** Lower bound on the cost from the start to state s. */
  private h(s: number): number {
    if (s === this.START) return 0
    const at = s === this.GOAL ? this.goal : { lat: this.g.nodeLat[this.g.adjTo[s]], lng: this.g.nodeLng[this.g.adjTo[s]] }
    return haversineM(this.origin.lat, this.origin.lng, at.lat, at.lng) * this.perMetre
  }

  private startRhs(): number {
    let best = Infinity
    for (const [e, seeds] of this.seeds) best = Math.min(best, cheapest(seeds).cost + this.gv[e])
    return best
  }

  /** rhs of an edge state: its best one-step lookahead. */
  private edgeRhs(e: number): number {
    let best = this.finish[e]
    const node = this.g.adjTo[e]
    for (let f = this.g.adjOffset[node]; f < this.g.adjOffset[node + 1]; f++) {
      const c = this.transition(e, f)
      if (c === Infinity) continue
      const v = c + this.gv[f]
      if (v < best) best = v
    }
    return best
  }

  private recompute(s: number) {
    if (s === this.GOAL) return
    this.rhs[s] = s === this.START ? this.startRhs() : this.edgeRhs(s)
  }

  /** The transition u -> v now costs `now` instead of `before`. */
  private costChanged(u: number, before: number, now: number, gv: number) {
    if (now < before) this.rhs[u] = Math.min(this.rhs[u], now + gv)
    else if (this.rhs[u] === before + gv) this.recompute(u)
    this.touch(u)
  }

  /** Queue maintenance (UpdateVertex in the optimized algorithm). */
  private touch(s: number) {
    const inQueue = this.queue.has(s)
    if (this.gv[s] !== this.rhs[s]) {
      const k2 = Math.min(this.gv[s], this.rhs[s])
      if (inQueue) this.queue.update(s, k2 + this.h(s) + this.km, k2)
      else this.queue.insert(s, k2 + this.h(s) + this.km, k2)
    } else if (inQueue) this.queue.remove(s)
  }

  /** Each predecessor p of s, with the cost of the transition p -> s. */
  private forPredecessors(s: number, visit: (p: number, cost: number) => void) {
    if (s === this.GOAL) {
      for (const e of this.finishEdges) visit(e, this.finish[e])
      return
    }
    if (s === this.START) return
    const tail = this.incoming.tail[s]
    for (let i = this.incoming.offset[tail]; i < this.incoming.offset[tail + 1]; i++) {
      const e = this.incoming.edges[i]
      const c = this.transition(e, s)
      if (c !== Infinity) visit(e, c)
    }
    const seeds = this.seeds.get(s)
    if (seeds) visit(this.START, cheapest(seeds).cost)
  }

  private computeShortestPath() {
    const S = this.START
    while (this.queue.size > 0) {
      const sv = Math.min(this.gv[S], this.rhs[S])
      const k1 = this.queue.topK1()
      const k2 = this.queue.topK2()
      // Done once the start is settled and everything left sorts after it.
      // Ties are processed too: the step from the start onto its first road
      // can cost nothing (starting exactly at an intersection), which gives
      // that road the start's own key -- and the start's value is only as
      // good as that road's.
      if (k1 > sv + this.km || (k1 === sv + this.km && k2 > sv)) {
        if (this.rhs[S] === this.gv[S]) break
      }
      const u = this.queue.top()
      this.expanded++
      const m = Math.min(this.gv[u], this.rhs[u])
      const n1 = m + this.h(u) + this.km
      if (k1 < n1 || (k1 === n1 && k2 < m)) {
        this.queue.update(u, n1, m) // key was stale (the start moved)
      } else if (this.gv[u] > this.rhs[u]) {
        // Cheaper now: settle it, and offer it to whatever leads here.
        this.gv[u] = this.rhs[u]
        this.queue.remove(u)
        const gu = this.gv[u]
        this.forPredecessors(u, (p, c) => {
          if (c + gu < this.rhs[p]) {
            this.rhs[p] = c + gu
            this.touch(p)
          }
        })
      } else {
        // Dearer now: whatever relied on it looks again.
        const old = this.gv[u]
        this.gv[u] = Infinity
        this.forPredecessors(u, (p, c) => {
          if (this.rhs[p] === c + old) {
            this.recompute(p)
            this.touch(p)
          }
        })
        this.recompute(u)
        this.touch(u)
      }
    }
  }
}

/** Indexed binary min-heap of states by (k1, k2), with update and remove. */
class KeyQueue {
  private items: Int32Array
  private k1: Float64Array
  private k2: Float64Array
  private readonly pos: Int32Array
  size = 0

  constructor(states: number) {
    this.items = new Int32Array(1024)
    this.k1 = new Float64Array(1024)
    this.k2 = new Float64Array(1024)
    this.pos = new Int32Array(states).fill(-1)
  }

  has(s: number): boolean {
    return this.pos[s] !== -1
  }

  top(): number {
    return this.items[0]
  }

  topK1(): number {
    return this.k1[0]
  }

  topK2(): number {
    return this.k2[0]
  }

  insert(s: number, k1: number, k2: number) {
    if (this.size === this.items.length) this.grow()
    const i = this.size++
    this.place(i, s, k1, k2)
    this.up(i)
  }

  update(s: number, k1: number, k2: number) {
    const i = this.pos[s]
    this.k1[i] = k1
    this.k2[i] = k2
    this.up(i)
    this.down(this.pos[s])
  }

  remove(s: number) {
    const i = this.pos[s]
    this.pos[s] = -1
    const last = --this.size
    if (i === last) return
    const moved = this.items[last]
    this.place(i, moved, this.k1[last], this.k2[last])
    this.up(i)
    this.down(this.pos[moved])
  }

  private less(a: number, b: number): boolean {
    return this.k1[a] < this.k1[b] || (this.k1[a] === this.k1[b] && this.k2[a] < this.k2[b])
  }

  private place(i: number, s: number, k1: number, k2: number) {
    this.items[i] = s
    this.k1[i] = k1
    this.k2[i] = k2
    this.pos[s] = i
  }

  private swap(a: number, b: number) {
    const s = this.items[a]
    const k1 = this.k1[a]
    const k2 = this.k2[a]
    this.place(a, this.items[b], this.k1[b], this.k2[b])
    this.place(b, s, k1, k2)
  }

  private up(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (!this.less(i, parent)) break
      this.swap(i, parent)
      i = parent
    }
  }

  private down(i: number) {
    for (;;) {
      const l = i * 2 + 1
      if (l >= this.size) return
      let child = l
      if (l + 1 < this.size && this.less(l + 1, l)) child = l + 1
      if (!this.less(child, i)) return
      this.swap(child, i)
      i = child
    }
  }

  private grow() {
    const items = new Int32Array(this.items.length * 2)
    const k1 = new Float64Array(this.items.length * 2)
    const k2 = new Float64Array(this.items.length * 2)
    items.set(this.items)
    k1.set(this.k1)
    k2.set(this.k2)
    this.items = items
    this.k1 = k1
    this.k2 = k2
  }
}
