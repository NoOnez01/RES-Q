import { haversineM, segmentMidpoint, type RoadGraph } from './graph'

// Longdo's traffic speed service: the current speed on the road nearest a
// point -- real-time where Longdo has live probe data (Bangkok), otherwise
// its prediction for this time of day. One point per request, and a free
// key is rate-limited, so routes look up only the main roads they use, one
// point per road (OSM way), and share every answer for SAMPLE_TTL_MS.
const LONGDO_TRAFFIC_URL = 'https://api.longdo.com/RouteService/json/traffic/speed'

export type TrafficSource = 'real-time' | 'predicted'

interface Sample {
  /** null = Longdo had no data for this road. */
  mps: number | null
  source: TrafficSource | null
  /** Sampled speed / the road's free-flow speed -- how congested it is. */
  ratio: number | null
  at: number
}

const SAMPLE_TTL_MS = 10 * 60_000
// Longdo snaps to the nearest road within this radius (degrees, ~55 m) --
// tight enough that a sample lands on the road asked about rather than a
// parallel one...
const SEARCH_RANGE_DEG = 0.0005
// ...and a snapped point further than this from ours probably belongs to a
// different road, so it's not used.
const MAX_SNAP_M = 40
const CONCURRENCY = 2
// Floor so a jammed road still costs a finite, if large, time.
const MIN_SPEED_MPS = 1.4
// After Longdo says "too many requests", stop asking for a while and route
// on the congestion factor instead.
const RATE_LIMIT_COOLDOWN_MS = 2 * 60_000

const samples = new Map<number, Sample>()
let cooldownUntil = 0

export function trafficCoolingDown(): boolean {
  return Date.now() < cooldownUntil
}

/** The road's sampled traffic, if fresh. */
export function trafficForWay(way: number): Sample | null {
  const s = samples.get(way)
  return s && Date.now() - s.at < SAMPLE_TTL_MS ? s : null
}

/**
 * How congested the area is right now: the median of sampled speed / free-
 * flow speed over every fresh sample (1 = free-flowing). Roads without a
 * sample of their own are slowed by this, so they compete fairly with the
 * sampled ones -- otherwise every unsampled side street would look faster
 * than a sampled, congested main road and the search would chase them.
 * Capped at 1 so no road is ever faster than free flow (keeps the A*
 * heuristic admissible).
 */
export function congestionFactor(): number {
  const ratios: number[] = []
  const now = Date.now()
  for (const s of samples.values()) {
    if (s.ratio !== null && now - s.at < SAMPLE_TTL_MS) ratios.push(s.ratio)
  }
  if (ratios.length === 0) return 1
  ratios.sort((a, b) => a - b)
  const mid = ratios.length >> 1
  const median = ratios.length % 2 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2
  return Math.min(1, Math.max(0.25, median))
}

async function sampleOne(g: RoadGraph, seg: number, key: string, signal: AbortSignal | undefined): Promise<void> {
  const mid = segmentMidpoint(g, seg)
  const params = new URLSearchParams({ lon: String(mid.lng), lat: String(mid.lat), range: String(SEARCH_RANGE_DEG), key })
  let body: string
  let status: number
  try {
    const res = await fetch(`${LONGDO_TRAFFIC_URL}?${params}`, { signal })
    status = res.status
    body = await res.text()
  } catch {
    // Network failure or abort: not cached, so the next route retries it.
    return
  }
  if (status === 429 || body.includes('Too many requests')) {
    cooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS
    return
  }
  let sample: Sample = { mps: null, source: null, ratio: null, at: Date.now() }
  try {
    const data = JSON.parse(body) as { speed?: number; source?: string; lat?: number; lon?: number }
    const snappedClose =
      typeof data.lat === 'number' && typeof data.lon === 'number' && haversineM(mid.lat, mid.lng, data.lat, data.lon) <= MAX_SNAP_M
    if (status === 200 && typeof data.speed === 'number' && snappedClose) {
      // Capped at the graph's top speed so the heuristic stays a true lower
      // bound (see search.ts).
      const mps = Math.min(g.maxSpeedMps, Math.max(MIN_SPEED_MPS, data.speed))
      sample = {
        mps,
        source: data.source === 'real-time' ? 'real-time' : 'predicted',
        ratio: mps / (g.segSpeedKmh[seg] / 3.6),
        at: Date.now(),
      }
    }
  } catch {
    // Not JSON: treat as no data.
  }
  samples.set(g.segWay[seg], sample)
}

// Lookups in flight, by road: two routes computed at the same time (the
// worker handles requests concurrently) wait on one request per road
// instead of both spending the rate limit on it.
const inflight = new Map<number, Promise<void>>()

function sampleShared(g: RoadGraph, seg: number, key: string, signal: AbortSignal | undefined): Promise<void> {
  const way = g.segWay[seg]
  let pending = inflight.get(way)
  if (!pending) {
    pending = sampleOne(g, seg, key, signal).finally(() => inflight.delete(way))
    inflight.set(way, pending)
  }
  return pending
}

/** Looks up traffic at the given segments (one per road), a few at a time. */
export async function sampleTraffic(g: RoadGraph, segs: number[], key: string, signal?: AbortSignal): Promise<void> {
  let next = 0
  const worker = async () => {
    while (next < segs.length && !signal?.aborted && !trafficCoolingDown()) await sampleShared(g, segs[next++], key, signal)
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, segs.length) }, worker))
}
