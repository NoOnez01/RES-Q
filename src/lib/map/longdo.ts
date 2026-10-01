/**
 * Longdo Map (map.longdo.com) -- Thailand's own map platform, and the app's
 * first choice wherever it has a provider for the job: Thai-labelled map
 * tiles, THAICHOTE satellite imagery, Thai addresses down to the
 * subdistrict, traffic-aware routing and live road speeds.
 *
 * One free key (VITE_LONGDO_MAP_KEY, from map.longdo.com/console) covers
 * all of it. Without one every Longdo provider reports itself unavailable
 * and the OpenStreetMap-based ones take over -- nothing else has to know.
 */
export const longdoKey: string | undefined = import.meta.env.VITE_LONGDO_MAP_KEY || undefined

/** A Longdo map tile URL template for Leaflet. `HD` asks for a 512-pixel
 * tile of the same area, sharp on high-density screens. */
export function longdoTileUrl(mode: 'icons' | 'dark' | 'thaichote', hd: boolean): string {
  return `https://ms.longdo.com/mmmap/tile.php?zoom={z}&x={x}&y={y}&mode=${mode}&proj=epsg3857${hd ? '&HD=1' : ''}&key=${longdoKey ?? ''}`
}
