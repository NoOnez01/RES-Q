// The road graph written by scripts/build-road-graph.mjs, parsed into flat
// typed arrays (see that script for the file layout) plus what routing
// needs on top: a directed adjacency list, turn geometry and restrictions
// for turn-aware search, and grids for snapping a GPS point onto a road.

/** Same order as ROAD_CLASSES in scripts/build-road-graph.mjs. */
export const ROAD_CLASSES = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service'] as const

export interface RoadGraph {
  nodeCount: number
  segCount: number
  nodeLat: Float64Array
  nodeLng: Float64Array
  segFrom: Uint32Array
  segTo: Uint32Array
  segLength: Float32Array
  shapeOffset: Uint32Array
  shapePoints: Int32Array
  /** The OSM road (way) each segment is part of -- traffic is looked up
   * once per road and shared by all its segments. */
  segWay: Uint32Array
  segClass: Uint8Array
  segSpeedKmh: Uint8Array
  segOneway: Int8Array
  /** Traffic lights part-way along each segment (each adds a wait). */
  segSignals: Uint8Array
  /** 1 = a barrier part-way along blocks cars. */
  segBlocked: Uint8Array
  /** Per intersection: 1 = traffic light, 2 = barrier (can't pass through). */
  nodeFlags: Uint8Array
  /** Compass bearing (degrees) a segment leaves its from-node, and arrives
   * at its to-node, travelling from -> to -- for turn angles. */
  segStartBearing: Float32Array
  segEndBearing: Float32Array
  /** Turn restrictions keyed by their via intersection. */
  restrictionsAt: Map<number, { fromWay: number; toWay: number; only: boolean }[]>
  /** Directed edges out of node n: adjOffset[n] .. adjOffset[n + 1]. */
  adjOffset: Uint32Array
  adjSeg: Uint32Array
  adjTo: Uint32Array
  /** 1 when the edge runs the segment backwards (to -> from). */
  adjReverse: Uint8Array
  /** Fastest free-flow speed anywhere in the graph -- the A* heuristic
   * divides straight-line distance by this, so it never overestimates. */
  maxSpeedMps: number
  grid: { south: number; west: number; cell: number; cols: number; rows: number; start: Uint32Array; nodes: Uint32Array }
  /** Segments per grid cell (any shape point in the cell) -- for snapping a
   * point onto the road it is actually on, see nearbySegments(). */
  segGrid: { start: Uint32Array; segs: Uint32Array }
}

const HEADER_BYTES = 56
const GRID_CELL_DEG = 0.005

export function parseGraph(buf: ArrayBuffer): RoadGraph {
  const view = new DataView(buf)
  const magic = String.fromCharCode(...new Uint8Array(buf, 0, 4))
  if (magic !== 'RQG2') throw new Error(`Not a road graph file this version can read (${magic})`)
  const nodeCount = view.getUint32(4, true)
  const segCount = view.getUint32(8, true)
  const pointCount = view.getUint32(12, true)
  const restrictionCount = view.getUint32(16, true)
  const south = view.getFloat64(24, true)
  const west = view.getFloat64(32, true)
  const north = view.getFloat64(40, true)
  const east = view.getFloat64(48, true)

  let off = HEADER_BYTES
  const nodeFixed = new Int32Array(buf, off, nodeCount * 2)
  off += nodeCount * 8
  const segFrom = new Uint32Array(buf, off, segCount)
  off += segCount * 4
  const segTo = new Uint32Array(buf, off, segCount)
  off += segCount * 4
  const segLength = new Float32Array(buf, off, segCount)
  off += segCount * 4
  const shapeOffset = new Uint32Array(buf, off, segCount + 1)
  off += (segCount + 1) * 4
  const shapePoints = new Int32Array(buf, off, pointCount * 2)
  off += pointCount * 8
  const segWay = new Uint32Array(buf, off, segCount)
  off += segCount * 4
  const restrFrom = new Uint32Array(buf, off, restrictionCount)
  off += restrictionCount * 4
  const restrVia = new Uint32Array(buf, off, restrictionCount)
  off += restrictionCount * 4
  const restrTo = new Uint32Array(buf, off, restrictionCount)
  off += restrictionCount * 4
  const segClass = new Uint8Array(buf, off, segCount)
  off += segCount
  const segSpeedKmh = new Uint8Array(buf, off, segCount)
  off += segCount
  const segOneway = new Int8Array(buf, off, segCount)
  off += segCount
  const segSignals = new Uint8Array(buf, off, segCount)
  off += segCount
  const segBlocked = new Uint8Array(buf, off, segCount)
  off += segCount
  const nodeFlags = new Uint8Array(buf, off, nodeCount)
  off += nodeCount
  const restrOnly = new Uint8Array(buf, off, restrictionCount)

  const restrictionsAt = new Map<number, { fromWay: number; toWay: number; only: boolean }[]>()
  for (let i = 0; i < restrictionCount; i++) {
    const list = restrictionsAt.get(restrVia[i]) ?? []
    list.push({ fromWay: restrFrom[i], toWay: restrTo[i], only: restrOnly[i] === 1 })
    restrictionsAt.set(restrVia[i], list)
  }

  const segStartBearing = new Float32Array(segCount)
  const segEndBearing = new Float32Array(segCount)
  for (let sgi = 0; sgi < segCount; sgi++) {
    const a = shapeOffset[sgi]
    const b = shapeOffset[sgi + 1] - 1
    const pt = (i: number) => [shapePoints[i * 2] / 1e6, shapePoints[i * 2 + 1] / 1e6] as const
    segStartBearing[sgi] = bearing(...pt(a), ...pt(a + 1))
    segEndBearing[sgi] = bearing(...pt(b - 1), ...pt(b))
  }

  const nodeLat = new Float64Array(nodeCount)
  const nodeLng = new Float64Array(nodeCount)
  for (let i = 0; i < nodeCount; i++) {
    nodeLat[i] = nodeFixed[i * 2] / 1e6
    nodeLng[i] = nodeFixed[i * 2 + 1] / 1e6
  }

  // Directed adjacency (CSR): a two-way segment is an edge each way, a
  // one-way segment only the permitted direction.
  const degree = new Uint32Array(nodeCount + 1)
  let maxSpeedKmh = 1
  for (let s = 0; s < segCount; s++) {
    if (segOneway[s] !== -1) degree[segFrom[s]]++
    if (segOneway[s] !== 1) degree[segTo[s]]++
    if (segSpeedKmh[s] > maxSpeedKmh) maxSpeedKmh = segSpeedKmh[s]
  }
  const adjOffset = new Uint32Array(nodeCount + 1)
  for (let n = 0; n < nodeCount; n++) adjOffset[n + 1] = adjOffset[n] + degree[n]
  const edgeCount = adjOffset[nodeCount]
  const adjSeg = new Uint32Array(edgeCount)
  const adjTo = new Uint32Array(edgeCount)
  const adjReverse = new Uint8Array(edgeCount)
  const fill = adjOffset.slice(0, nodeCount)
  for (let s = 0; s < segCount; s++) {
    if (segOneway[s] !== -1) {
      const e = fill[segFrom[s]]++
      adjSeg[e] = s
      adjTo[e] = segTo[s]
    }
    if (segOneway[s] !== 1) {
      const e = fill[segTo[s]]++
      adjSeg[e] = s
      adjTo[e] = segFrom[s]
      adjReverse[e] = 1
    }
  }

  // Nodes bucketed into a lat/lng grid (counting sort) for nearestNode().
  const cols = Math.ceil((east - west) / GRID_CELL_DEG)
  const rows = Math.ceil((north - south) / GRID_CELL_DEG)
  const cellOf = (n: number) => {
    const c = Math.min(cols - 1, Math.max(0, Math.floor((nodeLng[n] - west) / GRID_CELL_DEG)))
    const r = Math.min(rows - 1, Math.max(0, Math.floor((nodeLat[n] - south) / GRID_CELL_DEG)))
    return r * cols + c
  }
  const start = new Uint32Array(cols * rows + 1)
  for (let n = 0; n < nodeCount; n++) start[cellOf(n) + 1]++
  for (let i = 0; i < cols * rows; i++) start[i + 1] += start[i]
  const cursor = start.slice(0, cols * rows)
  const gridNodes = new Uint32Array(nodeCount)
  for (let n = 0; n < nodeCount; n++) gridNodes[cursor[cellOf(n)]++] = n

  return {
    nodeCount,
    segCount,
    nodeLat,
    nodeLng,
    segFrom,
    segTo,
    segLength,
    shapeOffset,
    shapePoints,
    segWay,
    segClass,
    segSpeedKmh,
    segOneway,
    segSignals,
    segBlocked,
    nodeFlags,
    segStartBearing,
    segEndBearing,
    restrictionsAt,
    adjOffset,
    adjSeg,
    adjTo,
    adjReverse,
    maxSpeedMps: maxSpeedKmh / 3.6,
    grid: { south, west, cell: GRID_CELL_DEG, cols, rows, start, nodes: gridNodes },
    segGrid: buildSegmentGrid(shapeOffset, shapePoints, segCount, south, west, cols, rows),
  }
}

const EARTH_RADIUS_M = 6371008.8
const RAD = Math.PI / 180

/** Initial compass bearing from one point to another, degrees 0..360. */
export function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const y = Math.sin((lng2 - lng1) * RAD) * Math.cos(lat2 * RAD)
  const x = Math.cos(lat1 * RAD) * Math.sin(lat2 * RAD) - Math.sin(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.cos((lng2 - lng1) * RAD)
  return (Math.atan2(y, x) / RAD + 360) % 360
}

/** Direction of travel arriving at the head of directed edge e. */
export function edgeArrivalBearing(g: RoadGraph, e: number): number {
  const seg = g.adjSeg[e]
  return g.adjReverse[e] ? (g.segStartBearing[seg] + 180) % 360 : g.segEndBearing[seg]
}

/** Direction of travel leaving the tail of directed edge e. */
export function edgeDepartureBearing(g: RoadGraph, e: number): number {
  const seg = g.adjSeg[e]
  return g.adjReverse[e] ? (g.segEndBearing[seg] + 180) % 360 : g.segStartBearing[seg]
}

/** The directed edge that runs segment `seg` in the given direction, or -1
 * if the segment's one-way rule doesn't allow that direction. */
export function directedEdge(g: RoadGraph, seg: number, reverse: boolean): number {
  const tail = reverse ? g.segTo[seg] : g.segFrom[seg]
  for (let e = g.adjOffset[tail]; e < g.adjOffset[tail + 1]; e++) {
    if (g.adjSeg[e] === seg && (g.adjReverse[e] === 1) === reverse) return e
  }
  return -1
}

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * RAD
  const dLng = (lng2 - lng1) * RAD
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Nearest intersection to a point within ~2 km, or -1. */
export function nearestNode(g: RoadGraph, lat: number, lng: number): number {
  const { south, west, cell, cols, rows, start, nodes } = g.grid
  const c0 = Math.floor((lng - west) / cell)
  const r0 = Math.floor((lat - south) / cell)
  let best = -1
  let bestDist = Infinity
  // Rings of cells outward; once something is found, one more ring is
  // enough to be sure nothing closer sits just across a cell border.
  for (let ring = 0, extra = -1; ring <= 4 && extra !== 0; ring++) {
    for (let r = r0 - ring; r <= r0 + ring; r++) {
      for (let c = c0 - ring; c <= c0 + ring; c++) {
        if (Math.max(Math.abs(r - r0), Math.abs(c - c0)) !== ring) continue
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue
        const cellIndex = r * cols + c
        for (let i = start[cellIndex]; i < start[cellIndex + 1]; i++) {
          const n = nodes[i]
          const d = haversineM(lat, lng, g.nodeLat[n], g.nodeLng[n])
          if (d < bestDist) {
            bestDist = d
            best = n
          }
        }
      }
    }
    if (best !== -1) extra = extra === -1 ? 1 : extra - 1
  }
  return best
}

/** A segment's shape as [lat, lng] pairs, in the direction travelled. */
export function segmentShape(g: RoadGraph, seg: number, reverse: boolean): [number, number][] {
  const pts: [number, number][] = []
  for (let i = g.shapeOffset[seg]; i < g.shapeOffset[seg + 1]; i++) {
    pts.push([g.shapePoints[i * 2] / 1e6, g.shapePoints[i * 2 + 1] / 1e6])
  }
  return reverse ? pts.reverse() : pts
}

/** The point halfway along a segment's shape, by distance. */
export function segmentMidpoint(g: RoadGraph, seg: number): { lat: number; lng: number } {
  const pts = segmentShape(g, seg, false)
  let remaining = g.segLength[seg] / 2
  for (let i = 1; i < pts.length; i++) {
    const d = haversineM(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])
    if (d >= remaining) {
      const t = d === 0 ? 0 : remaining / d
      return { lat: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, lng: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t }
    }
    remaining -= d
  }
  const last = pts[pts.length - 1]
  return { lat: last[0], lng: last[1] }
}

/** Intersections within `radiusM` of a point, nearest first, at most `max`. */
export function nearbyNodes(g: RoadGraph, lat: number, lng: number, radiusM: number, max: number): { node: number; metres: number }[] {
  const { south, west, cell, cols, rows, start, nodes } = g.grid
  const c0 = Math.floor((lng - west) / cell)
  const r0 = Math.floor((lat - south) / cell)
  const reach = Math.ceil(radiusM / (cell * 111_000)) + 1
  const found: { node: number; metres: number }[] = []
  for (let r = r0 - reach; r <= r0 + reach; r++) {
    for (let c = c0 - reach; c <= c0 + reach; c++) {
      if (r < 0 || c < 0 || r >= rows || c >= cols) continue
      const cellIndex = r * cols + c
      for (let i = start[cellIndex]; i < start[cellIndex + 1]; i++) {
        const n = nodes[i]
        const metres = haversineM(lat, lng, g.nodeLat[n], g.nodeLng[n])
        if (metres <= radiusM) found.push({ node: n, metres })
      }
    }
  }
  return found.sort((a, b) => a.metres - b.metres).slice(0, max)
}

function buildSegmentGrid(
  shapeOffset: Uint32Array,
  shapePoints: Int32Array,
  segCount: number,
  south: number,
  west: number,
  cols: number,
  rows: number,
): { start: Uint32Array; segs: Uint32Array } {
  const cellsOf = (seg: number) => {
    const cells = new Set<number>()
    for (let i = shapeOffset[seg]; i < shapeOffset[seg + 1]; i++) {
      const c = Math.min(cols - 1, Math.max(0, Math.floor((shapePoints[i * 2 + 1] / 1e6 - west) / GRID_CELL_DEG)))
      const r = Math.min(rows - 1, Math.max(0, Math.floor((shapePoints[i * 2] / 1e6 - south) / GRID_CELL_DEG)))
      cells.add(r * cols + c)
    }
    return cells
  }
  const perSeg: Set<number>[] = []
  const start = new Uint32Array(cols * rows + 1)
  for (let s = 0; s < segCount; s++) {
    const cells = cellsOf(s)
    perSeg.push(cells)
    for (const cell of cells) start[cell + 1]++
  }
  for (let i = 0; i < cols * rows; i++) start[i + 1] += start[i]
  const cursor = start.slice(0, cols * rows)
  const segs = new Uint32Array(start[cols * rows])
  perSeg.forEach((cells, s) => {
    for (const cell of cells) segs[cursor[cell]++] = s
  })
  return { start, segs }
}

export interface SegmentSnap {
  seg: number
  /** Distance from the point to the road, metres. */
  metres: number
  /** Where along the segment the point projects: metres from its from-node. */
  along: number
  /** The projected point on the road. */
  lat: number
  lng: number
}

/** Road segments within `radiusM` of a point, nearest first, with where the
 * point projects onto each -- what OSRM-style snapping uses, rather than
 * jumping to the nearest intersection (which may be far along a long road,
 * or on the other carriageway of a divided one). */
export function nearbySegments(g: RoadGraph, lat: number, lng: number, radiusM: number, max: number): SegmentSnap[] {
  const { south, west, cell, cols, rows } = g.grid
  const c0 = Math.floor((lng - west) / cell)
  const r0 = Math.floor((lat - south) / cell)
  const reach = Math.ceil(radiusM / (cell * 111_000))
  const kx = Math.cos((lat * Math.PI) / 180) * 111_320
  const ky = 110_540
  const seen = new Set<number>()
  const out: SegmentSnap[] = []
  for (let r = r0 - reach; r <= r0 + reach; r++) {
    for (let c = c0 - reach; c <= c0 + reach; c++) {
      if (r < 0 || c < 0 || r >= rows || c >= cols) continue
      const idx = r * cols + c
      for (let i = g.segGrid.start[idx]; i < g.segGrid.start[idx + 1]; i++) {
        const seg = g.segGrid.segs[i]
        if (seen.has(seg)) continue
        seen.add(seg)
        const pts = segmentShape(g, seg, false)
        let best: SegmentSnap | null = null
        let walked = 0
        for (let k = 1; k < pts.length; k++) {
          const ax = (pts[k - 1][1] - lng) * kx, ay = (pts[k - 1][0] - lat) * ky
          const bx = (pts[k][1] - lng) * kx, by = (pts[k][0] - lat) * ky
          const dx = bx - ax, dy = by - ay
          const len2 = dx * dx + dy * dy
          const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2))
          const px = ax + t * dx, py = ay + t * dy
          const d = Math.hypot(px, py)
          const pieceLen = Math.sqrt(len2)
          if (!best || d < best.metres) {
            best = { seg, metres: d, along: walked + t * pieceLen, lat: lat + py / ky, lng: lng + px / kx }
          }
          walked += pieceLen
        }
        if (best && best.metres <= radiusM) {
          // Shape lengths are flat-earth; scale to the stored segment length.
          best.along = walked > 0 ? (best.along / walked) * g.segLength[seg] : 0
          out.push(best)
        }
      }
    }
  }
  return out.sort((a, b) => a.metres - b.metres).slice(0, max)
}
