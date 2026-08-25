// Root-absolute string literals like "/favicon.svg" ignore Vite's base path
// entirely, so they 404 the moment the app is served from a subpath (e.g.
// GitHub Pages' /RES-Q/) instead of the domain root. BASE_URL always has a
// trailing slash, so this resolves correctly everywhere the app runs.
export const FAVICON_URL = `${import.meta.env.BASE_URL}favicon.svg`

export function formatCaseNumber(seq: number, date = new Date()): string {
  return `RQ-${date.getFullYear()}-${String(seq).padStart(3, '0')}`
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function estimateEtaMin(distanceKm: number, avgSpeedKmh = 38): number {
  return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60))
}

let idCounter = 0
export function uid(prefix = 'id'): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
