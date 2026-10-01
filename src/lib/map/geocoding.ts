import { longdoKey } from './longdo'
import type { Coords } from '../geolocation'

/**
 * Coordinates to a Thai address a person can read out or drive to. Each
 * provider is tried in turn: Longdo first -- Thai administrative areas down
 * to the subdistrict and postcode, from Thailand's own address data -- then
 * OpenStreetMap's Nominatim, which needs no key. Falls back to the bare
 * coordinates only if both fail.
 */

interface Geocoder {
  id: 'longdo' | 'nominatim'
  available: boolean
  reverse(coords: Coords): Promise<string | null>
}

interface LongdoAddress {
  road?: string
  subdistrict?: string
  district?: string
  province?: string
  postcode?: string
}

const longdo: Geocoder = {
  id: 'longdo',
  available: !!longdoKey,
  async reverse({ lat, lng }) {
    const params = new URLSearchParams({ lon: String(lng), lat: String(lat), noelevation: '1', key: longdoKey ?? '' })
    const res = await fetch(`https://api.longdo.com/map/services/address?${params}`)
    if (!res.ok) return null
    const a = (await res.json()) as LongdoAddress
    // Areas come with their own prefixes (ต./อ./จ., แขวง/เขต) as Thai
    // addresses are written.
    const parts = [a.road, a.subdistrict, a.district, a.province, a.postcode].filter(Boolean)
    // Without a province it's outside Thailand or not an answer at all.
    return a.province ? parts.join(' ') : null
  },
}

interface NominatimAddress {
  road?: string
  neighbourhood?: string
  quarter?: string
  suburb?: string
  city_district?: string
  district?: string
  city?: string
  town?: string
  province?: string
  state?: string
}

const nominatim: Geocoder = {
  id: 'nominatim',
  available: true,
  async reverse({ lat, lng }) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=th&addressdetails=1&zoom=16`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = (await res.json()) as { display_name?: string; address?: NominatimAddress }
    // Built from road and area names rather than `display_name`, which
    // leads with whatever shop is nearest -- that flips with a few metres
    // of GPS drift and reads as the location being unstable.
    const a = data.address
    if (a) {
      const parts = [a.road, a.neighbourhood ?? a.quarter ?? a.suburb, a.city_district ?? a.district, a.city ?? a.town ?? a.province ?? a.state].filter(Boolean)
      if (parts.length > 0) return parts.join(' ')
    }
    return data.display_name ?? null
  },
}

const GEOCODERS: Geocoder[] = [longdo, nominatim]

export async function reverseGeocode(coords: Coords): Promise<string> {
  for (const geocoder of GEOCODERS) {
    if (!geocoder.available) continue
    const address = await geocoder.reverse(coords).catch(() => null)
    if (address) return address
  }
  return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
}
