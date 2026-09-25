// Builds the road graph that the in-browser A* router loads
// (src/lib/astar/). Downloads the drivable roads inside the region's
// bounding box from OpenStreetMap (Overpass API), splits every way into
// intersection-to-intersection segments, keeps only the largest connected
// network (an isolated fragment cut off by the bbox edge would make a
// snapped point unreachable), and writes a compact binary file.
//
//   node scripts/build-road-graph.mjs            # download + build
//   node scripts/build-road-graph.mjs --cached   # rebuild from the last download
//
// Output: public/graphs/chiang-mai.bin (served with the app). Road data
// (c) OpenStreetMap contributors, ODbL -- the map already carries the
// attribution. Re-run it to pick up road changes.
//
// Binary layout (little-endian; 4-byte sections first so every typed
// array view is aligned):
//   "RQG1"  u32 nodeCount  u32 segCount  u32 pointCount
//   f64 south  f64 west  f64 north  f64 east
//   i32[nodeCount*2]   node lat/lng * 1e6 (intersections)
//   u32[segCount]      segment from-node
//   u32[segCount]      segment to-node
//   f32[segCount]      segment length, metres
//   u32[segCount+1]    offset of each segment's shape in the point list
//   i32[pointCount*2]  shape points lat/lng * 1e6 (from-node ... to-node)
//   u32[segCount]      which OSM road (way) the segment belongs to, numbered
//                      from 0 -- one traffic lookup covers the whole road
//   u8[segCount]       road class (ROAD_CLASSES index)
//   u8[segCount]       free-flow speed, km/h
//   i8[segCount]       oneway: 0 both ways, 1 from->to only, -1 to->from only

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// Keep in sync with src/lib/astar/region.ts. Mueang Chiang Mai plus the
// ring of districts around it (Mae Rim, San Sai, San Kamphaeng, Saraphi,
// Hang Dong) -- where the main hospitals and rescue bases are.
const REGION = { name: 'chiang-mai', south: 18.62, west: 98.84, north: 18.95, east: 99.12 }
const OUT_FILE = join(ROOT, 'public', 'graphs', `${REGION.name}.bin`)
const CACHE_FILE = join(ROOT, 'scripts', '.cache', `${REGION.name}-osm.json`)

// Order matters: the index is the class code stored in the file, and
// src/lib/astar/graph.ts reads it back with the same list.
const ROAD_CLASSES = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street']
// Typical free-flow speeds (km/h) when a way has no usable maxspeed tag.
const DEFAULT_SPEED = { motorway: 90, trunk: 80, primary: 60, secondary: 50, tertiary: 40, unclassified: 35, residential: 25, living_street: 15 }
const LINK_SPEED = 40
// Shape simplification tolerance: points closer than this to the line
// between their neighbours add nothing visible on the map.
const SIMPLIFY_METRES = 3

function overpassQuery() {
  const types = ROAD_CLASSES.flatMap((c) => (['motorway', 'trunk', 'primary', 'secondary', 'tertiary'].includes(c) ? [c, `${c}_link`] : [c]))
  const bbox = `${REGION.south},${REGION.west},${REGION.north},${REGION.east}`
  return `[out:json][timeout:180];
way["highway"~"^(${types.join('|')})$"]["area"!="yes"]["access"!~"^(no|private)$"]["motor_vehicle"!~"^(no|private)$"](${bbox});
out body qt;
>;
out skel qt;`
}

async function download() {
  if (process.argv.includes('--cached') && existsSync(CACHE_FILE)) {
    console.log(`Using cached OSM data: ${CACHE_FILE}`)
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
  }
  // Public Overpass servers are often busy (504) -- try each in turn.
  for (const server of OVERPASS_SERVERS) {
    console.log(`Downloading roads from ${server} ...`)
    try {
      const res = await fetch(server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ResQ road-graph builder' },
        body: new URLSearchParams({ data: overpassQuery() }),
      })
      if (!res.ok) {
        console.log(`  ${res.status}, trying the next server`)
        continue
      }
      const text = await res.text()
      mkdirSync(dirname(CACHE_FILE), { recursive: true })
      writeFileSync(CACHE_FILE, text)
      return JSON.parse(text)
    } catch (err) {
      console.log(`  ${err.message}, trying the next server`)
    }
  }
  throw new Error('Every Overpass server failed -- try again later')
}

const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

const R = 6371008.8
function metres(a, b) {
  const toRad = Math.PI / 180
  const dLat = (b[0] - a[0]) * toRad
  const dLng = (b[1] - a[1]) * toRad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toRad) * Math.cos(b[0] * toRad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Distance from p to the segment a-b, in metres (local flat approximation --
// accurate to well under a metre at this scale).
function offsetMetres(p, a, b) {
  const kx = Math.cos((a[0] * Math.PI) / 180) * 111320
  const ky = 110540
  const ax = a[1] * kx, ay = a[0] * ky, bx = b[1] * kx, by = b[0] * ky, px = p[1] * kx, py = p[0] * ky
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// Ramer-Douglas-Peucker; always keeps both endpoints.
function simplify(points) {
  if (points.length <= 2) return points
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [i, j] = stack.pop()
    let worst = -1, worstDist = SIMPLIFY_METRES
    for (let k = i + 1; k < j; k++) {
      const d = offsetMetres(points[k], points[i], points[j])
      if (d > worstDist) { worst = k; worstDist = d }
    }
    if (worst !== -1) {
      keep[worst] = 1
      stack.push([i, worst], [worst, j])
    }
  }
  return points.filter((_, k) => keep[k])
}

function roadClass(highway) {
  return highway.replace(/_link$/, '')
}

function freeFlowSpeed(tags) {
  const posted = parseInt(tags.maxspeed ?? '', 10)
  if (posted >= 5 && posted <= 130 && !/mph/.test(tags.maxspeed)) return posted
  return tags.highway.endsWith('_link') ? LINK_SPEED : DEFAULT_SPEED[roadClass(tags.highway)]
}

function oneway(tags) {
  const v = tags.oneway
  if (v === '-1' || v === 'reverse') return -1
  if (v === 'yes' || v === 'true' || v === '1') return 1
  if (v === 'no' || v === 'false' || v === '0') return 0
  if (tags.junction === 'roundabout' || tags.junction === 'circular') return 1
  if (tags.highway === 'motorway' || tags.highway === 'motorway_link') return 1
  return 0
}

function build(osm) {
  const coords = new Map()
  const ways = []
  for (const el of osm.elements) {
    if (el.type === 'node') coords.set(el.id, [el.lat, el.lon])
    else if (el.type === 'way' && el.nodes?.length >= 2) ways.push(el)
  }

  // An OSM node becomes a graph node where roads meet or end.
  const uses = new Map()
  for (const w of ways) {
    for (const id of w.nodes) uses.set(id, (uses.get(id) ?? 0) + 1)
  }
  const isJunction = (id, i, w) => i === 0 || i === w.nodes.length - 1 || uses.get(id) > 1

  const raw = []
  for (const w of ways) {
    const cls = ROAD_CLASSES.indexOf(roadClass(w.tags.highway))
    if (cls === -1) continue
    const speed = freeFlowSpeed(w.tags)
    const dir = oneway(w.tags)
    let start = 0
    for (let i = 1; i < w.nodes.length; i++) {
      if (!isJunction(w.nodes[i], i, w)) continue
      const ids = w.nodes.slice(start, i + 1)
      start = i
      const pts = ids.map((id) => coords.get(id)).filter(Boolean)
      if (pts.length < 2 || ids[0] === ids[ids.length - 1]) continue
      let length = 0
      for (let k = 1; k < pts.length; k++) length += metres(pts[k - 1], pts[k])
      if (length < 0.5) continue
      raw.push({ from: ids[0], to: ids[ids.length - 1], pts, length, cls, speed, dir, way: w.id })
    }
  }

  // Largest weakly connected component only.
  const parent = new Map()
  const find = (x) => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)))
      x = parent.get(x)
    }
    return x
  }
  for (const s of raw) {
    if (!parent.has(s.from)) parent.set(s.from, s.from)
    if (!parent.has(s.to)) parent.set(s.to, s.to)
    const a = find(s.from), b = find(s.to)
    if (a !== b) parent.set(a, b)
  }
  const size = new Map()
  for (const id of parent.keys()) size.set(find(id), (size.get(find(id)) ?? 0) + 1)
  const main = [...size.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const segs = raw.filter((s) => find(s.from) === main)

  const nodeIndex = new Map()
  const nodes = []
  const indexOf = (id) => {
    let i = nodeIndex.get(id)
    if (i === undefined) {
      i = nodes.length
      nodeIndex.set(id, i)
      nodes.push(coords.get(id))
    }
    return i
  }
  const from = segs.map((s) => indexOf(s.from))
  const to = segs.map((s) => indexOf(s.to))
  const shapes = segs.map((s) => simplify(s.pts))
  const pointCount = shapes.reduce((n, p) => n + p.length, 0)

  const header = 4 + 4 * 3 + 8 * 4
  const bytes =
    header + nodes.length * 8 + segs.length * 4 * 3 + (segs.length + 1) * 4 + pointCount * 8 + segs.length * 4 + segs.length * 3
  const buf = new ArrayBuffer(bytes)
  const view = new DataView(buf)
  new Uint8Array(buf, 0, 4).set([0x52, 0x51, 0x47, 0x31]) // "RQG1"
  view.setUint32(4, nodes.length, true)
  view.setUint32(8, segs.length, true)
  view.setUint32(12, pointCount, true)
  view.setFloat64(16, REGION.south, true)
  view.setFloat64(24, REGION.west, true)
  view.setFloat64(32, REGION.north, true)
  view.setFloat64(40, REGION.east, true)

  let off = header
  const nodeArr = new Int32Array(buf, off, nodes.length * 2)
  nodes.forEach((p, i) => {
    nodeArr[i * 2] = Math.round(p[0] * 1e6)
    nodeArr[i * 2 + 1] = Math.round(p[1] * 1e6)
  })
  off += nodes.length * 8
  new Uint32Array(buf, off, segs.length).set(from)
  off += segs.length * 4
  new Uint32Array(buf, off, segs.length).set(to)
  off += segs.length * 4
  new Float32Array(buf, off, segs.length).set(segs.map((s) => s.length))
  off += segs.length * 4
  const shapeOffsets = new Uint32Array(buf, off, segs.length + 1)
  off += (segs.length + 1) * 4
  const pointArr = new Int32Array(buf, off, pointCount * 2)
  off += pointCount * 8
  let p = 0
  shapes.forEach((shape, i) => {
    shapeOffsets[i] = p
    for (const [lat, lng] of shape) {
      pointArr[p * 2] = Math.round(lat * 1e6)
      pointArr[p * 2 + 1] = Math.round(lng * 1e6)
      p++
    }
  })
  shapeOffsets[segs.length] = p
  const wayIndex = new Map()
  new Uint32Array(buf, off, segs.length).set(
    segs.map((s) => {
      if (!wayIndex.has(s.way)) wayIndex.set(s.way, wayIndex.size)
      return wayIndex.get(s.way)
    }),
  )
  off += segs.length * 4
  new Uint8Array(buf, off, segs.length).set(segs.map((s) => s.cls))
  off += segs.length
  new Uint8Array(buf, off, segs.length).set(segs.map((s) => s.speed))
  off += segs.length
  new Int8Array(buf, off, segs.length).set(segs.map((s) => s.dir))

  const rawPoints = segs.reduce((n, s) => n + s.pts.length, 0)
  console.log(
    `${ways.length} ways -> ${segs.length} segments (${raw.length - segs.length} dropped outside the main network), ` +
      `${nodes.length} intersections, ${new Set(segs.map((s) => s.way)).size} roads, ${pointCount} shape points (${rawPoints} before simplifying)`,
  )
  return new Uint8Array(buf)
}

const bytes = build(await download())
mkdirSync(dirname(OUT_FILE), { recursive: true })
writeFileSync(OUT_FILE, bytes)
console.log(`Wrote ${OUT_FILE} (${(bytes.length / 1024 / 1024).toFixed(2)} MB)`)
