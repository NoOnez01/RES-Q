import { useSyncExternalStore } from 'react'
import { dstarlite } from './dstarlite'
import { longdo } from './longdo'
import { google } from './google'
import { osrm } from './osrm'
import type { RouteResult, RoutingProvider, RoutingProviderId } from './types'
import { registerTranslations } from '../../i18n'

registerTranslations({
  // ETA badges
  เส้นทางที่เร็วที่สุดตามสภาพจราจร: 'Fastest route for current traffic',
  เส้นทางตามถนนจริง: 'Real road route',
  'D* Lite · สภาพจราจรปัจจุบัน': 'D* Lite · live traffic',
  'D* Lite · สภาพจราจรคาดการณ์': 'D* Lite · predicted traffic',
  'D* Lite · ความเร็วโดยประมาณ': 'D* Lite · estimated speeds',
  'Google Maps · สภาพจราจรปัจจุบัน': 'Google Maps · live traffic',
  // Settings
  'D* Lite ของ RES-Q': "RES-Q's D* Lite",
  'เลี่ยงถนนที่แจ้งปิด คิดเวลาเลี้ยวและไฟแดง เฉพาะพื้นที่เชียงใหม่': 'Avoids reported closures, counts turns and traffic lights; Chiang Mai area only',
  'ทั่วประเทศไทย ตามสภาพจราจร': 'All of Thailand, for current traffic',
  'ทั่วโลก ตามสภาพจราจร ต้องใช้คีย์ที่มีการเรียกเก็บเงิน': 'Worldwide, for current traffic; needs a billed key',
  'ฟรี ไม่ต้องใช้คีย์ ความเร็วถนนโดยทั่วไป ไม่รวมจราจร': 'Free, no key; typical road speeds, no traffic',
})

/**
 * Which routing providers the app asks, in what order. The first that has a
 * route wins; one that can't (outside its area, no key, a failed request)
 * hands over to the next, so a route is only missing if every one fails.
 *
 * The order comes from VITE_ROUTING_PROVIDERS (comma-separated ids, e.g.
 * "google,dstarlite,osrm") when set, otherwise DEFAULT_ORDER. A user can
 * also put one provider first from Settings; the rest still back it up.
 */
export const ROUTING_PROVIDERS: Record<RoutingProviderId, RoutingProvider> = { dstarlite, longdo, google, osrm }

const DEFAULT_ORDER: RoutingProviderId[] = ['dstarlite', 'longdo', 'google', 'osrm']

function configuredOrder(): RoutingProviderId[] {
  const raw = import.meta.env.VITE_ROUTING_PROVIDERS
  if (!raw) return DEFAULT_ORDER
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is RoutingProviderId => s in ROUTING_PROVIDERS)
  // OSRM stays last whatever the list says: free and keyless, the floor
  // under every other provider.
  return ids.length > 0 ? [...new Set([...ids, 'osrm' as const])] : DEFAULT_ORDER
}

const ORDER = configuredOrder()

/** Configured providers, in the build's order. */
export function availableRoutingProviders(): RoutingProvider[] {
  return ORDER.map((id) => ROUTING_PROVIDERS[id]).filter((p) => p.available)
}

// The user's pick: 'auto' = the build's order.
export type RoutingPreference = RoutingProviderId | 'auto'
const STORAGE_KEY = 'resq-routing-provider'
const listeners = new Set<() => void>()

function readPreference(): RoutingPreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v && v in ROUTING_PROVIDERS && ROUTING_PROVIDERS[v as RoutingProviderId].available ? (v as RoutingProviderId) : 'auto'
  } catch {
    return 'auto'
  }
}
let preference: RoutingPreference = readPreference()

export function setRoutingPreference(p: RoutingPreference): void {
  preference = p
  try {
    localStorage.setItem(STORAGE_KEY, p)
  } catch {
    // Private mode etc. -- holds for this session.
  }
  listeners.forEach((l) => l())
}

export function useRoutingPreference(): RoutingPreference {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => preference,
  )
}

/** The providers to ask for a route right now, in order. */
export function routingChain(): RoutingProvider[] {
  const chain = availableRoutingProviders()
  if (preference === 'auto') return chain
  const first = chain.find((p) => p.id === preference)
  return first ? [first, ...chain.filter((p) => p !== first)] : chain
}

/** Identifies the current chain -- routes are cached per chain. */
export function routingChainKey(): string {
  return routingChain()
    .map((p) => p.id)
    .join('>')
}

/** Thai i18n key saying what backs a route's ETA. */
export function routeBadge(route: Pick<RouteResult, 'provider' | 'traffic'>): string {
  return ROUTING_PROVIDERS[route.provider].badge(route)
}
