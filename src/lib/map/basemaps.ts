import { useSyncExternalStore } from 'react'
import { longdoKey, longdoTileUrl } from './longdo'

/**
 * The map's base layer: which provider draws it, chosen once by the user and
 * used by every map in the app. A provider that isn't configured (no key)
 * isn't offered, and one that stops serving tiles mid-session (quota, an
 * outage) is set aside for the rest of the session -- the map falls back to
 * OpenStreetMap rather than going blank in the middle of a case.
 */

export type BasemapId = 'longdo' | 'thaichote' | 'osm'

export interface Basemap {
  id: BasemapId
  /** Thai i18n keys. */
  label: string
  description: string
  attribution: string
  /** Deepest zoom the provider has tiles for -- Leaflet enlarges beyond it. */
  maxNativeZoom: number
  available: boolean
  /** Tile URL template for the app's current theme. */
  url(dark: boolean): string
}

const hd = typeof window !== 'undefined' && window.devicePixelRatio > 1

const LONGDO_ATTRIBUTION = '&copy; <a href="https://map.longdo.com" target="_blank" rel="noreferrer">Longdo Map</a>'

export const BASEMAPS: Basemap[] = [
  {
    id: 'longdo',
    label: 'แผนที่ Longdo',
    description: 'ชื่อถนนและสถานที่ภาษาไทย',
    attribution: LONGDO_ATTRIBUTION,
    maxNativeZoom: 20,
    available: !!longdoKey,
    url: (dark) => longdoTileUrl(dark ? 'dark' : 'icons', hd),
  },
  {
    id: 'thaichote',
    label: 'ภาพดาวเทียม',
    description: 'THAICHOTE จาก GISTDA เห็นสภาพพื้นที่จริง',
    attribution: `ภาพดาวเทียม THAICHOTE &copy; GISTDA · ${LONGDO_ATTRIBUTION}`,
    maxNativeZoom: 18,
    available: !!longdoKey,
    url: () => longdoTileUrl('thaichote', hd),
  },
  {
    id: 'osm',
    label: 'OpenStreetMap',
    description: 'แผนที่เปิดของชุมชน ใช้ได้เสมอโดยไม่ต้องใช้คีย์',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
    available: true,
    url: () => 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
]

const FALLBACK: Basemap = BASEMAPS.find((b) => b.id === 'osm')!
const STORAGE_KEY = 'resq-basemap'

function readChoice(): BasemapId | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return BASEMAPS.some((b) => b.id === v) ? (v as BasemapId) : null
  } catch {
    return null
  }
}

let choice: BasemapId = readChoice() ?? (BASEMAPS.find((b) => b.available)?.id ?? 'osm')
const failed = new Set<BasemapId>()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export interface BasemapState {
  /** What the user picked. */
  chosen: Basemap
  /** What's actually drawn -- the pick, or OpenStreetMap if the pick can't serve. */
  active: Basemap
  /** The pick stopped serving tiles this session. */
  failedOver: boolean
}

let snapshot: BasemapState = compute()
function compute(): BasemapState {
  const chosen = BASEMAPS.find((b) => b.id === choice) ?? FALLBACK
  const usable = chosen.available && !failed.has(chosen.id)
  return { chosen, active: usable ? chosen : FALLBACK, failedOver: chosen.available && !usable }
}

export function setBasemap(id: BasemapId): void {
  choice = id
  // Picking it again is a request to try again.
  failed.delete(id)
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Private mode etc. -- the choice still holds for this session.
  }
  snapshot = compute()
  emit()
}

// A provider has failed when its tiles keep erroring and none has loaded.
const loads = new Map<BasemapId, number>()
const errors = new Map<BasemapId, number>()
const FAILED_AFTER_ERRORS = 4

export function noteTileLoaded(id: BasemapId): void {
  loads.set(id, (loads.get(id) ?? 0) + 1)
}

export function noteTileError(id: BasemapId): void {
  const n = (errors.get(id) ?? 0) + 1
  errors.set(id, n)
  if (id === FALLBACK.id || failed.has(id) || (loads.get(id) ?? 0) > 0 || n < FAILED_AFTER_ERRORS) return
  failed.add(id)
  snapshot = compute()
  emit()
}

export function useBasemap(): BasemapState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => snapshot,
  )
}
