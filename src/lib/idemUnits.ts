import { supabase } from './supabase'
import { haversineKm } from './utils'
import { THAILAND_PROVINCE_COORDS } from './thailandProvinces'
import type { VehicleLevel } from './types'

/** One row from `idem_units` -- the nationwide NDEMS operational-unit
 * directory synced by scripts/sync_idem_units.py. Read-only from the app;
 * only the sync script writes to this table. */
export interface IdemUnit {
  unitCode: string
  unitName: string | null
  bls: number | null
  als: number | null
  cls: number | null
  emtP: number | null
  aemt: number | null
  emtI: number | null
  emt: number | null
  emtB: number | null
  emr: number | null
  province: string | null
  ccId: string | null
  sourceUpdatedAt: string | null
  updatedAt: string
}

interface IdemUnitRow {
  unit_code: string
  unit_name: string | null
  bls: number | null
  als: number | null
  cls: number | null
  emt_p: number | null
  aemt: number | null
  emt_i: number | null
  emt: number | null
  emt_b: number | null
  emr: number | null
  province: string | null
  cc_id: string | null
  source_updated_at: string | null
  updated_at: string
}

function rowToUnit(row: IdemUnitRow): IdemUnit {
  return {
    unitCode: row.unit_code,
    unitName: row.unit_name,
    bls: row.bls,
    als: row.als,
    cls: row.cls,
    emtP: row.emt_p,
    aemt: row.aemt,
    emtI: row.emt_i,
    emt: row.emt,
    emtB: row.emt_b,
    emr: row.emr,
    province: row.province,
    ccId: row.cc_id,
    sourceUpdatedAt: row.source_updated_at,
    updatedAt: row.updated_at,
  }
}

const PAGE_SIZE = 1000

/** Fetches the whole directory (~8,600 rows as of the last sync) in pages
 * of 1000 -- Supabase's PostgREST caps a single response at that many rows
 * regardless of an explicit .range(), so a plain single-shot query would
 * silently return only the first page. Cached by the caller (see
 * useIdemUnits) rather than re-fetched on every render -- this is reference
 * data that only changes when the sync script runs. */
export async function fetchAllIdemUnits(): Promise<IdemUnit[]> {
  if (!supabase) return []
  const all: IdemUnit[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('idem_units')
      .select('unit_code,unit_name,bls,als,cls,emt_p,aemt,emt_i,emt,emt_b,emr,province,cc_id,source_updated_at,updated_at')
      .order('unit_code', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const rows = (data ?? []) as IdemUnitRow[]
    all.push(...rows.map(rowToUnit))
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

/** Units have no per-record coordinates from the source -- only a
 * province -- so this is a province-centroid approximation, never the
 * unit's real position. Returns null when the province is missing or
 * unrecognized, so callers can fall back to "distance unknown" instead of
 * guessing a number. */
export function estimateUnitDistanceKm(unit: IdemUnit, from: { lat: number; lng: number }): number | null {
  if (!unit.province) return null
  const coords = THAILAND_PROVINCE_COORDS[unit.province]
  if (!coords) return null
  return haversineKm(from, coords)
}

/** A unit "has" a level if the source reports at least one vehicle of that
 * type -- missing/zero/null are all treated the same (doesn't have it). */
export function unitHasLevel(unit: IdemUnit, level: VehicleLevel): boolean {
  const count = level === 'CLS' ? unit.cls : level === 'ALS' ? unit.als : unit.bls
  return !!count && count > 0
}

export const STAFF_CERTIFICATION_FIELDS: { key: keyof IdemUnit; label: string }[] = [
  { key: 'emtP', label: 'EMT-P' },
  { key: 'aemt', label: 'AEMT' },
  { key: 'emtI', label: 'EMT-I' },
  { key: 'emt', label: 'EMT' },
  { key: 'emtB', label: 'EMT-B' },
  { key: 'emr', label: 'EMR' },
]
