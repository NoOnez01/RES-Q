import { routeWithDStarLite } from '../../pathfinding'
import { getActiveClosures } from '../../roadClosures'
import type { RoutingProvider } from './types'

// Its first route on a device also downloads the ~3 MB road graph, which a
// slow phone connection shouldn't be allowed to spend the whole routing
// budget on (the download carries on in the worker, so the next route has it).
export const DSTARLITE_TIMEOUT_MS = 6000

/**
 * The app's own router: D* Lite over the prebuilt road graph (Chiang Mai),
 * Longdo traffic as road weights, reported road closures avoided -- see
 * lib/pathfinding/. Answers null outside the graph's region.
 */
export const dstarlite: RoutingProvider = {
  id: 'dstarlite',
  label: 'D* Lite ของ RES-Q',
  description: 'เลี่ยงถนนที่แจ้งปิด คิดเวลาเลี้ยวและไฟแดง เฉพาะพื้นที่เชียงใหม่',
  available: true,
  route(origin, destination, signal, vehicle) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DSTARLITE_TIMEOUT_MS)
    const onAbort = () => controller.abort()
    signal.addEventListener('abort', onAbort, { once: true })
    return routeWithDStarLite(origin, destination, controller.signal, getActiveClosures(), vehicle)
      .then((r) =>
        r && r.points.length >= 2
          ? { points: r.points, distanceKm: r.distanceKm, durationMin: r.durationMin, provider: 'dstarlite' as const, traffic: r.traffic }
          : null,
      )
      .finally(() => {
        clearTimeout(timeout)
        signal.removeEventListener('abort', onAbort)
      })
  },
  badge: (route) =>
    route.traffic === 'real-time'
      ? 'D* Lite · สภาพจราจรปัจจุบัน'
      : route.traffic === 'predicted'
        ? 'D* Lite · สภาพจราจรคาดการณ์'
        : 'D* Lite · ความเร็วโดยประมาณ',
}
