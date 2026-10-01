import type { GeoLocation } from '../../types'
import type { VehicleStart } from '../../pathfinding'

/** Every routing provider the app knows -- see providers.ts. */
export type RoutingProviderId = 'dstarlite' | 'longdo' | 'google' | 'osrm'

export interface RouteResult {
  /** [lat, lng] pairs tracing the actual road geometry, in travel order. */
  points: [number, number][]
  distanceKm: number
  /** Route duration in minutes, as the provider estimates it (with or
   * without traffic -- see the provider's `badge`). */
  durationMin: number
  /** Which provider produced this route. */
  provider: RoutingProviderId
  /** For 'dstarlite': which traffic data weighted most of the route (see
   * lib/pathfinding/router.ts). */
  traffic?: 'real-time' | 'predicted' | 'none'
}

/**
 * A routing service the app can ask for a driving route. To add one (say a
 * self-hosted OSRM, or HERE), write a module exporting one of these and list
 * it in providers.ts -- nothing else in the app changes.
 */
export interface RoutingProvider {
  id: RoutingProviderId
  /** Thai i18n keys, for Settings. */
  label: string
  description: string
  /** Configured on this build (has its key). An unavailable provider is
   * skipped without being asked. */
  available: boolean
  /**
   * The route, or null when this provider can't give one -- outside its
   * area, a failed request, no route found. Never rejects: null hands over
   * to the next provider.
   */
  route(origin: GeoLocation, destination: GeoLocation, signal: AbortSignal, vehicle?: VehicleStart): Promise<RouteResult | null>
  /** Thai i18n key for the ETA badge -- says what data backs the number,
   * never more. */
  badge(route: Pick<RouteResult, 'traffic'>): string
}
