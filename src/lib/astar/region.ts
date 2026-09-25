import type { GeoLocation } from '../types'

/** The area the prebuilt road graph covers -- keep in sync with REGION in
 * scripts/build-road-graph.mjs, which writes the file this points at. */
export const GRAPH_REGION = {
  south: 18.62,
  west: 98.84,
  north: 18.95,
  east: 99.12,
  url: `${import.meta.env.BASE_URL}graphs/chiang-mai.bin`,
}

export function inGraphRegion(p: Pick<GeoLocation, 'lat' | 'lng'>): boolean {
  return p.lat >= GRAPH_REGION.south && p.lat <= GRAPH_REGION.north && p.lng >= GRAPH_REGION.west && p.lng <= GRAPH_REGION.east
}
