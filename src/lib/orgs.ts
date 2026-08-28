import { supabase, supabaseEnabled } from './supabase'
import type { Hospital, RescueTeam } from './types'

interface RescueTeamRow {
  id: string
  name: string
  unit_code: string
  members: number
  vehicle: string
  phone: string
  base_lat: number
  base_lng: number
  base_address: string
  equipment: string[]
  driver_name: string | null
  plate_number: string | null
}

interface HospitalRow {
  id: string
  name: string
  distance_km: number
  eta_min: number
  er_available: boolean
  beds_available: number
  specialties: string[]
  lat: number
  lng: number
  address: string
  phone: string
}

function rowToRescueTeam(row: RescueTeamRow): RescueTeam {
  return {
    id: row.id,
    name: row.name,
    unitCode: row.unit_code,
    members: row.members,
    vehicle: row.vehicle,
    phone: row.phone,
    base: { lat: row.base_lat, lng: row.base_lng, address: row.base_address },
    equipment: row.equipment ?? [],
    driverName: row.driver_name ?? undefined,
    plateNumber: row.plate_number ?? undefined,
  }
}

function rowToHospital(row: HospitalRow): Hospital {
  return {
    id: row.id,
    name: row.name,
    distanceKm: row.distance_km,
    etaMin: row.eta_min,
    erAvailable: row.er_available,
    bedsAvailable: row.beds_available,
    specialties: row.specialties ?? [],
    location: { lat: row.lat, lng: row.lng, address: row.address },
    phone: row.phone,
  }
}

/** Falls back to whatever the caller already has (the static seed data) if
 * Supabase isn't reachable -- a self-registered new team/hospital just
 * won't show up anywhere until connectivity's back, not a hard failure. */
export async function fetchOrgs(): Promise<{ rescueTeams: RescueTeam[]; hospitals: Hospital[] } | null> {
  if (!supabaseEnabled || !supabase) return null
  const [teamsRes, hospitalsRes] = await Promise.all([
    supabase.from('rescue_teams').select('*'),
    supabase.from('hospitals').select('*'),
  ])
  if (teamsRes.error || hospitalsRes.error || !teamsRes.data?.length || !hospitalsRes.data?.length) return null
  return {
    rescueTeams: teamsRes.data.map(rowToRescueTeam),
    hospitals: hospitalsRes.data.map(rowToHospital),
  }
}

/** Next 'rt-04'/'hp-05'-style id, continuing whatever sequence already
 * exists (including the seeded 'rt-01'..'rt-03' / 'hp-01'..'hp-04') --
 * human-readable and stable, instead of the opaque uid() strings used
 * elsewhere in the app for things nobody needs to read out loud. */
async function nextOrgId(table: 'rescue_teams' | 'hospitals', prefix: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.from(table).select('id')
  if (error) throw error
  const pattern = new RegExp(`^${prefix}-(\\d+)$`)
  const highest = (data ?? [])
    .map((row) => pattern.exec(row.id as string)?.[1])
    .filter((n): n is string => !!n)
    .map((n) => parseInt(n, 10))
    .reduce((max, n) => Math.max(max, n), 0)
  return `${prefix}-${String(highest + 1).padStart(2, '0')}`
}

export interface NewRescueTeamInput {
  name: string
  unitCode: string
  phone: string
  members: number
  vehicle?: string
  equipment?: string[]
  baseAddress?: string
  baseLat?: number
  baseLng?: number
}

export interface NewHospitalInput {
  name: string
  phone: string
  address: string
  lat?: number
  lng?: number
  erAvailable?: boolean
  bedsAvailable?: number
  specialties?: string[]
}

/** Registration lets rescue/hospital sign-up create their own org if it
 * isn't in the existing roster yet (see supabase-org-insert-policy.sql).
 * Also used by the admin "manage organizations" screen. Returns the new
 * row's id, to use as the profile's rescue_team_id. */
export async function createRescueTeam(input: NewRescueTeamInput): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const id = await nextOrgId('rescue_teams', 'rt')
  const { error } = await supabase.from('rescue_teams').insert({
    id,
    name: input.name,
    unit_code: input.unitCode,
    phone: input.phone,
    members: input.members,
    vehicle: input.vehicle ?? '',
    base_lat: input.baseLat ?? 18.7883,
    base_lng: input.baseLng ?? 98.9853,
    base_address: input.baseAddress ?? '',
    equipment: input.equipment ?? [],
  })
  if (error) throw error
  return id
}

export async function createHospital(input: NewHospitalInput): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const id = await nextOrgId('hospitals', 'hp')
  const { error } = await supabase.from('hospitals').insert({
    id,
    name: input.name,
    phone: input.phone,
    distance_km: 0,
    eta_min: 0,
    er_available: input.erAvailable ?? true,
    beds_available: input.bedsAvailable ?? 0,
    specialties: input.specialties ?? [],
    lat: input.lat ?? 18.7883,
    lng: input.lng ?? 98.9853,
    address: input.address,
  })
  if (error) throw error
  return id
}

export async function updateRescueTeam(id: string, input: NewRescueTeamInput): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from('rescue_teams')
    .update({
      name: input.name,
      unit_code: input.unitCode,
      phone: input.phone,
      members: input.members,
      vehicle: input.vehicle ?? '',
      equipment: input.equipment ?? [],
      base_address: input.baseAddress ?? '',
      ...(input.baseLat !== undefined ? { base_lat: input.baseLat } : {}),
      ...(input.baseLng !== undefined ? { base_lng: input.baseLng } : {}),
    })
    .eq('id', id)
  if (error) throw error
}

export async function updateHospital(id: string, input: NewHospitalInput): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from('hospitals')
    .update({
      name: input.name,
      phone: input.phone,
      address: input.address,
      er_available: input.erAvailable ?? true,
      beds_available: input.bedsAvailable ?? 0,
      specialties: input.specialties ?? [],
      ...(input.lat !== undefined ? { lat: input.lat } : {}),
      ...(input.lng !== undefined ? { lng: input.lng } : {}),
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteRescueTeam(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('rescue_teams').delete().eq('id', id)
  if (error) throw error
}

export async function deleteHospital(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('hospitals').delete().eq('id', id)
  if (error) throw error
}
