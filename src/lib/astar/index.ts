import type { GeoLocation } from '../types'
import { inGraphRegion } from './region'
import type { AStarRoute } from './router'
import type { RouteRequest, RouteResponse } from './worker'

export type { AStarRoute } from './router'

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, (route: AStarRoute | null) => void>()

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (event: MessageEvent<RouteResponse>) => {
    pending.get(event.data.id)?.(event.data.route)
    pending.delete(event.data.id)
  }
  // A crashed worker answers nobody -- release every waiting caller (they
  // fall back to the other routing providers) and start fresh next time.
  worker.onerror = () => {
    for (const resolve of pending.values()) resolve(null)
    pending.clear()
    worker?.terminate()
    worker = null
  }
  return worker
}

/**
 * Fastest route by A* over the prebuilt road graph, with Longdo traffic as
 * the road weights (see router.ts). Resolves null -- never rejects -- when
 * either end is outside the graph's region or anything goes wrong, so the
 * caller can fall back to another provider.
 */
export function routeWithAStar(
  origin: Pick<GeoLocation, 'lat' | 'lng'>,
  destination: Pick<GeoLocation, 'lat' | 'lng'>,
  signal?: AbortSignal,
): Promise<AStarRoute | null> {
  if (!inGraphRegion(origin) || !inGraphRegion(destination) || typeof Worker === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const id = ++nextId
    pending.set(id, resolve)
    // Abandoning only stops waiting; the worker finishes that search and
    // keeps the traffic it looked up for the next one.
    signal?.addEventListener(
      'abort',
      () => {
        if (pending.delete(id)) resolve(null)
      },
      { once: true },
    )
    const request: RouteRequest = { id, origin: { lat: origin.lat, lng: origin.lng }, destination: { lat: destination.lat, lng: destination.lng } }
    getWorker().postMessage(request)
  })
}
