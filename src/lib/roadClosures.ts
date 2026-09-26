import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { registerTranslations } from './i18n'

// Road closures reported by rescue/dispatch staff (supabase-road-closures.sql).
// Kept live app-wide: the A* router avoids them (lib/astar/), and every open
// route re-plans the moment one is reported or cleared.

registerTranslations({
  น้ำท่วม: 'Flooding',
  อุบัติเหตุกีดขวาง: 'Crash blocking the road',
  ก่อสร้างหรือซ่อมถนน: 'Roadworks',
  อื่น: 'Other',
})

export type ClosureReason = 'flood' | 'accident' | 'construction' | 'other'

export const CLOSURE_REASON_LABEL: Record<ClosureReason, string> = {
  flood: 'น้ำท่วม',
  accident: 'อุบัติเหตุกีดขวาง',
  construction: 'ก่อสร้างหรือซ่อมถนน',
  other: 'อื่น',
}

export interface RoadClosure {
  id: string
  lat: number
  lng: number
  reason: ClosureReason
  note: string | null
  reportedBy: string | null
  reporterName: string | null
  createdAt: number
  expiresAt: number
}

interface ClosureRow {
  id: string
  lat: number
  lng: number
  reason: ClosureReason
  note: string | null
  reported_by: string | null
  reporter_name: string | null
  created_at: string
  expires_at: string
}

let all: RoadClosure[] = []
let active: RoadClosure[] = []
const listeners = new Set<() => void>()
let started = false

/** Recomputes which closures are still in force; notifies only on change. */
function publish() {
  const now = Date.now()
  const next = all.filter((c) => c.expiresAt > now)
  if (next.length === active.length && next.every((c, i) => c.id === active[i].id)) return
  active = next
  for (const listener of listeners) listener()
}

async function refresh() {
  if (!supabase) return
  const { data, error } = await supabase
    .from('road_closures')
    .select('id, lat, lng, reason, note, reported_by, reporter_name, created_at, expires_at')
    .is('cleared_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at')
  if (error) {
    console.error('Failed to load road closures:', error.message)
    return
  }
  all = (data as ClosureRow[]).map((r) => ({
    id: r.id,
    lat: r.lat,
    lng: r.lng,
    reason: r.reason,
    note: r.note,
    reportedBy: r.reported_by,
    reporterName: r.reporter_name,
    createdAt: Date.parse(r.created_at),
    expiresAt: Date.parse(r.expires_at),
  }))
  publish()
}

/** Starts loading closures and following changes -- once a session exists
 * (the table is only readable signed in). Safe to call repeatedly. */
export function startRoadClosureSync(): void {
  if (started || !supabase) return
  started = true
  void refresh()
  supabase
    .channel('road-closures')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'road_closures' }, () => void refresh())
    .subscribe()
  // Expiry happens without any database change, so check the clock too.
  setInterval(publish, 60_000)
}

export function getActiveClosures(): RoadClosure[] {
  return active
}

/** Identifies a set of closures -- routes are cached and re-planned by it. */
export function closuresKey(list: RoadClosure[]): string {
  return list.map((c) => c.id).join(',')
}

export function useRoadClosures(): RoadClosure[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => active,
  )
}

export async function reportRoadClosure(input: {
  lat: number
  lng: number
  reason: ClosureReason
  note?: string
  reporterName?: string
}): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('road_closures').insert({
    lat: input.lat,
    lng: input.lng,
    reason: input.reason,
    note: input.note?.trim() || null,
    reporter_name: input.reporterName ?? null,
  })
  if (error) throw error
  await refresh()
}

export async function clearRoadClosure(id: string, clearedBy: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('road_closures')
    .update({ cleared_at: new Date().toISOString(), cleared_by: clearedBy })
    .eq('id', id)
    .select('id')
  if (error) throw error
  // RLS turns a disallowed update into "0 rows changed", not an error.
  if (!data?.length) throw new Error('forbidden')
  await refresh()
}
