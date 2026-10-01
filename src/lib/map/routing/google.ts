import { decodePolyline } from './polyline'
import type { RoutingProvider } from './types'

/**
 * Google Maps' Routes API (computeRoutes), called straight from the browser
 * -- it allows cross-origin requests, so no server in between. Needs
 * VITE_GOOGLE_MAPS_KEY: a browser key restricted to this app's domains and
 * to the Routes API in Google Cloud Console, and a billing account (Google
 * charges per route; TRAFFIC_AWARE is the higher-priced tier).
 */
export const googleMapsKey: string | undefined = import.meta.env.VITE_GOOGLE_MAPS_KEY || undefined

const GOOGLE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes'
// Only what's used -- Google bills and answers by the fields asked for.
const FIELD_MASK = 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'

interface ComputeRoutesResponse {
  routes?: {
    /** Seconds, as a string like "754s". */
    duration?: string
    distanceMeters?: number
    polyline?: { encodedPolyline?: string }
  }[]
}

export const google: RoutingProvider = {
  id: 'google',
  label: 'Google Maps',
  description: 'ทั่วโลก ตามสภาพจราจร ต้องใช้คีย์ที่มีการเรียกเก็บเงิน',
  available: !!googleMapsKey,
  async route(origin, destination, signal, vehicle) {
    const body = {
      origin: {
        location: {
          latLng: { latitude: origin.lat, longitude: origin.lng },
          // A moving vehicle sets off the way it's facing.
          ...(vehicle?.heading !== undefined ? { heading: Math.round(vehicle.heading) % 360 } : {}),
        },
      },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      languageCode: 'th',
      regionCode: 'TH',
      units: 'METRIC',
    }
    try {
      const res = await fetch(GOOGLE_ROUTES_URL, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': googleMapsKey ?? '', 'X-Goog-FieldMask': FIELD_MASK },
        body: JSON.stringify(body),
      })
      if (!res.ok) return null
      const route = ((await res.json()) as ComputeRoutesResponse).routes?.[0]
      const encoded = route?.polyline?.encodedPolyline
      if (!route || !encoded || !route.distanceMeters) return null
      const points = decodePolyline(encoded)
      if (points.length < 2) return null
      const seconds = parseFloat(route.duration ?? '0')
      return { points, distanceKm: route.distanceMeters / 1000, durationMin: Math.max(1, Math.round(seconds / 60)), provider: 'google' }
    } catch {
      return null
    }
  },
  badge: () => 'Google Maps · สภาพจราจรปัจจุบัน',
}
