export interface Coords {
  lat: number
  lng: number
}

export class GeolocationError extends Error {
  constructor(public reason: 'unsupported' | 'denied' | 'unavailable' | 'timeout', message: string) {
    super(message)
  }
}

const SAMPLE_WINDOW_MS = 4000
const GOOD_ENOUGH_ACCURACY_M = 30

/**
 * A single `getCurrentPosition()` call is often noisy — desktops without a
 * GPS chip fall back to WiFi/IP-based estimates that can land kilometers
 * apart between calls. This instead watches for a few seconds and keeps
 * whichever reading reports the smallest accuracy radius, which is far more
 * stable than trusting the very first fix that comes back.
 */
export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new GeolocationError('unsupported', 'อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง'))
      return
    }

    let best: GeolocationPosition | null = null
    let watchId: number | null = null
    let settled = false

    function finish(fn: () => void) {
      if (settled) return
      settled = true
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      fn()
    }

    const timer = setTimeout(() => {
      finish(() => {
        if (best) resolve({ lat: best.coords.latitude, lng: best.coords.longitude })
        else reject(new GeolocationError('timeout', 'ค้นหาตำแหน่งใช้เวลานานเกินไป กรุณาลองใหม่'))
      })
    }, SAMPLE_WINDOW_MS)

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos
        if (pos.coords.accuracy <= GOOD_ENOUGH_ACCURACY_M) {
          clearTimeout(timer)
          finish(() => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
        }
      },
      (err) => {
        clearTimeout(timer)
        finish(() => {
          if (best) {
            resolve({ lat: best.coords.latitude, lng: best.coords.longitude })
            return
          }
          if (err.code === err.PERMISSION_DENIED) {
            reject(new GeolocationError('denied', 'กรุณาอนุญาตการเข้าถึงตำแหน่งเพื่อระบุจุดเกิดเหตุ'))
          } else if (err.code === err.TIMEOUT) {
            reject(new GeolocationError('timeout', 'ค้นหาตำแหน่งใช้เวลานานเกินไป กรุณาลองใหม่'))
          } else {
            reject(new GeolocationError('unavailable', 'ไม่สามารถระบุตำแหน่งได้ในขณะนี้'))
          }
        })
      },
      { enableHighAccuracy: true, timeout: SAMPLE_WINDOW_MS, maximumAge: 0 },
    )
  })
}

/**
 * Keeps GPS live for as long as the caller wants it (e.g. the whole time a
 * reporter is on the photo step), unlike `getCurrentPosition()` which stops
 * after one good-enough fix. Every raw fix is passed straight to `onUpdate`
 * — the caller decides how to throttle/react (e.g. only reverse-geocode
 * once movement crosses a real threshold), since a browser can fire this
 * many times a second on a device with a live GPS chip.
 */
export function watchPosition(onUpdate: (pos: Coords) => void, onError?: (err: GeolocationError) => void): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError?.(new GeolocationError('unsupported', 'อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง'))
    return () => {}
  }
  const watchId = navigator.geolocation.watchPosition(
    (pos) => onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    (err) => {
      if (!onError) return
      if (err.code === err.PERMISSION_DENIED) {
        onError(new GeolocationError('denied', 'กรุณาอนุญาตการเข้าถึงตำแหน่งเพื่อระบุจุดเกิดเหตุ'))
      } else if (err.code === err.TIMEOUT) {
        onError(new GeolocationError('timeout', 'ค้นหาตำแหน่งใช้เวลานานเกินไป กรุณาลองใหม่'))
      } else {
        onError(new GeolocationError('unavailable', 'ไม่สามารถระบุตำแหน่งได้ในขณะนี้'))
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  )
  return () => navigator.geolocation.clearWatch(watchId)
}

interface NominatimAddress {
  road?: string
  neighbourhood?: string
  suburb?: string
  quarter?: string
  city_district?: string
  district?: string
  city?: string
  town?: string
  province?: string
  state?: string
  postcode?: string
}

/**
 * Reverse-geocodes coordinates into a human-readable Thai address via OSM's
 * free Nominatim API — no API key needed, and it's the same OpenStreetMap
 * data already used for the map tiles in MapPanel.
 *
 * Built from structured address components rather than Nominatim's raw
 * `display_name`, which leads with whatever POI happens to be nearest (a
 * cafe, then a 7-Eleven, then a different shop) — that name flips readily
 * with only a few meters of GPS drift even though the actual street/area
 * hasn't changed, which reads as the location being unstable. Road + area
 * names change far less over small distances.
 */
export async function reverseGeocode(coords: Coords): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}&accept-language=th&addressdetails=1&zoom=16`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('reverse geocode failed')
  const data = (await res.json()) as { display_name?: string; address?: NominatimAddress }
  const a = data.address
  if (a) {
    const parts = [
      a.road,
      a.neighbourhood ?? a.quarter ?? a.suburb,
      a.city_district ?? a.district,
      a.city ?? a.town ?? a.province ?? a.state,
    ].filter(Boolean)
    if (parts.length > 0) return parts.join(' ')
  }
  return data.display_name ?? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
}
