// Checks the app's D* Lite router against the A* reference on the real road
// graph: every search -- fresh, and after each kind of change it repairs
// incrementally (a road closed, reopened, slowed by traffic, the vehicle
// moving on or taking a wrong turn) -- must find a route exactly as fast as
// A* finds from scratch, and the route must add up to what it reports.
// Run with: node scripts/check-router.mjs [seed]
import { readFileSync } from 'node:fs'
import { directedEdge, parseGraph, type RoadGraph } from '../src/lib/pathfinding/graph'
import { aStarMulti, turnSeconds, SIGNAL_SECONDS, type Endpoint, type PathResult } from '../src/lib/pathfinding/search'
import { snapEnds } from '../src/lib/pathfinding/router'
import { DStarLite, heuristicScale } from '../src/lib/pathfinding/dstarlite'

declare const __REPO_ROOT__: string // set by check-router.mjs
const buf = readFileSync(`${__REPO_ROOT__}/public/graphs/chiang-mai.bin`)
const g: RoadGraph = parseGraph(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
let seed = Number(process.argv[2] ?? 11)
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
const TRIPS = 50

// Free-flow costs, with closures and traffic slow-downs the test changes.
const closed = new Set<number>()
const slow = new Map<number, number>()
const seconds = (seg: number) =>
  g.segBlocked[seg] === 1 || closed.has(seg)
    ? Infinity
    : (g.segLength[seg] / (g.segSpeedKmh[seg] / 3.6)) * (slow.get(seg) ?? 1) + g.segSignals[seg] * SIGNAL_SECONDS

let failures = 0
const near = (a: number, b: number) => (a === Infinity && b === Infinity) || Math.abs(a - b) < 1e-6

/** A route's cost added up again from its roads, turns and ends. */
function pathCost(p: PathResult, sources: Endpoint[], targets: Endpoint[]): number {
  const start = sources[p.startIndex]
  const end = targets[p.endIndex]
  if (p.segs.length === 0 && start.node === end.node) {
    return start.seconds + (start.edge !== undefined && end.edge !== undefined ? turnSeconds(g, start.edge, end.edge) : 0) + end.seconds
  }
  let cost = start.seconds
  let prev = start.edge !== undefined && start.edge >= 0 ? start.edge : -1
  p.segs.forEach((seg, i) => {
    const e = directedEdge(g, seg, p.reversed[i])
    if (prev !== -1) cost += turnSeconds(g, prev, e)
    cost += seconds(seg)
    prev = e
  })
  if (end.edge !== undefined && prev !== -1) cost += turnSeconds(g, prev, end.edge)
  return cost + end.seconds
}

const stats = new Map<string, { n: number; aStar: number; dStar: number }>()
function check(what: string, planner: DStarLite, dest: { lat: number; lng: number }, sources: Endpoint[], targets: Endpoint[]) {
  // The reference uses the same safe heuristic, so it's exactly optimal too.
  const a = aStarMulti(g, sources, targets, dest, seconds, heuristicScale(g))
  const d = planner.plan()
  const ac = a?.seconds ?? Infinity
  const dc = d?.seconds ?? Infinity
  let problem = ''
  if (!near(ac, dc)) problem = `A* ${ac.toFixed(3)} s vs D* Lite ${dc.toFixed(3)} s`
  else if (d && !targets[d.endIndex]) problem = 'route does not end at the destination'
  else if (d && !near(pathCost(d, sources, targets), dc)) problem = `route adds up to ${pathCost(d, sources, targets).toFixed(3)} s, reported ${dc.toFixed(3)} s`
  if (problem) {
    failures++
    if (failures <= 10) console.log(`FAIL  ${what}: ${problem}`)
  }
  const s = stats.get(what) ?? { n: 0, aStar: 0, dStar: 0 }
  s.n++
  s.aStar += a?.expanded ?? 0
  s.dStar += planner.expanded
  stats.set(what, s)
  return a
}
const randomPoint = () => {
  const n = Math.floor(rand() * g.nodeCount)
  return { lat: g.nodeLat[n] + (rand() - 0.5) * 0.002, lng: g.nodeLng[n] + (rand() - 0.5) * 0.002 }
}

for (let trip = 0; trip < TRIPS; ) {
  closed.clear()
  slow.clear()
  const origin = randomPoint()
  const dest = randomPoint()
  const sources = snapEnds(g, origin, 'start', closed)
  const targets = snapEnds(g, dest, 'end', closed)
  if (!sources.length || !targets.length) continue
  trip++
  const planner = new DStarLite(g, targets, dest, sources, origin, seconds)
  const path = check('fresh search', planner, dest, sources, targets)
  if (!path || path.segs.length < 6) continue

  const shut = [0.3, 0.5, 0.7].map((f) => path.segs[Math.floor(path.segs.length * f)])
  shut.forEach((s) => closed.add(s))
  planner.updateSegments(shut)
  check('roads closed', planner, dest, sources, targets)
  shut.forEach((s) => closed.delete(s))
  planner.updateSegments(shut)
  check('roads reopened', planner, dest, sources, targets)

  const slowed = [0, 1, 2].map(() => path.segs[Math.floor(rand() * path.segs.length)])
  slowed.forEach((s) => slow.set(s, 1.5 + rand() * 2.5))
  planner.updateSegments(slowed)
  check('traffic slows 3 roads', planner, dest, sources, targets)

  // Driving on: to junctions along the route, and to the middle of a road.
  for (const frac of [0.33, 0.66]) {
    const node = g.segFrom[path.segs[Math.floor(path.segs.length * frac)]]
    const at = { lat: g.nodeLat[node], lng: g.nodeLng[node] }
    const moved = snapEnds(g, at, 'start', closed)
    if (!moved.length) continue
    planner.setStart(moved, at)
    check('vehicle drives on', planner, dest, moved, targets)
    const now = planner.plan()
    if (now && now.segs.length > 4) {
      const ahead = [now.segs[Math.floor(now.segs.length * 0.6)]]
      ahead.forEach((s) => closed.add(s))
      planner.updateSegments(ahead)
      check('road closed after driving on', planner, dest, moved, targets)
      ahead.forEach((s) => closed.delete(s))
      planner.updateSegments(ahead)
    }
  }
  const wrong = { lat: origin.lat + (rand() - 0.5) * 0.007, lng: origin.lng + (rand() - 0.5) * 0.007 }
  const off = snapEnds(g, wrong, 'start', closed)
  if (off.length) {
    planner.setStart(off, wrong)
    check('wrong turn', planner, dest, off, targets)
  }
}

console.log(`${TRIPS} trips over the Chiang Mai graph -- states expanded, A* from scratch vs D* Lite:`)
for (const [what, s] of stats) {
  console.log(`  ${what.padEnd(30)} x${String(s.n).padStart(3)}   A* ${String(Math.round(s.aStar / s.n)).padStart(6)}   D* Lite ${String(Math.round(s.dStar / s.n)).padStart(6)}`)
}
console.log(failures ? `\n${failures} FAILED` : '\nall passed')
process.exit(failures ? 1 : 0)
