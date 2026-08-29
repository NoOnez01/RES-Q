import { supabase, supabaseEnabled } from './supabase'
import type { Hospital, RescueTeam, RescueVehicle, VehicleLevel } from './types'

interface RescueTeamRow {
  id: string
  name: string
  phone: string
  base_lat: number
  base_lng: number
  base_address: string
}

interface RescueVehicleRow {
  id: string
  rescue_team_id: string
  unit_code: string
  members: number
  vehicle: string
  equipment: string[]
  level: string
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

function rowToRescueVehicle(row: RescueVehicleRow): RescueVehicle {
  return {
    id: row.id,
    rescueTeamId: row.rescue_team_id,
    unitCode: row.unit_code,
    members: row.members,
    vehicle: row.vehicle,
    equipment: row.equipment ?? [],
    // Rows fetched before supabase-rescue-vehicle-level.sql runs (or a
    // stale schema cache) may not carry the column at all -- default to the
    // lowest/safest tier rather than claim capability that isn't confirmed.
    level: (row.level as VehicleLevel) || 'BLS',
    driverName: row.driver_name ?? undefined,
    plateNumber: row.plate_number ?? undefined,
  }
}

function rowToRescueTeam(row: RescueTeamRow, vehicles: RescueVehicle[]): RescueTeam {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    base: { lat: row.base_lat, lng: row.base_lng, address: row.base_address },
    vehicles,
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
  const [teamsRes, vehiclesRes, hospitalsRes] = await Promise.all([
    supabase.from('rescue_teams').select('*'),
    supabase.from('rescue_vehicles').select('*'),
    supabase.from('hospitals').select('*'),
  ])
  if (teamsRes.error || vehiclesRes.error || hospitalsRes.error || !teamsRes.data?.length || !hospitalsRes.data?.length) {
    return null
  }
  const vehiclesByTeam = new Map<string, RescueVehicle[]>()
  for (const row of vehiclesRes.data as RescueVehicleRow[]) {
    const vehicle = rowToRescueVehicle(row)
    const list = vehiclesByTeam.get(vehicle.rescueTeamId) ?? []
    list.push(vehicle)
    vehiclesByTeam.set(vehicle.rescueTeamId, list)
  }
  return {
    rescueTeams: (teamsRes.data as RescueTeamRow[]).map((row) => rowToRescueTeam(row, vehiclesByTeam.get(row.id) ?? [])),
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

/** Next 'rt-04-v3'-style id, scoped to one branch's own vehicles. */
async function nextVehicleId(rescueTeamId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.from('rescue_vehicles').select('id').eq('rescue_team_id', rescueTeamId)
  if (error) throw error
  const pattern = /-v(\d+)$/
  const highest = (data ?? [])
    .map((row) => pattern.exec(row.id as string)?.[1])
    .filter((n): n is string => !!n)
    .map((n) => parseInt(n, 10))
    .reduce((max, n) => Math.max(max, n), 0)
  return `${rescueTeamId}-v${highest + 1}`
}

export interface NewRescueVehicleInput {
  unitCode: string
  members: number
  vehicle?: string
  equipment?: string[]
  level?: VehicleLevel
  driverName?: string
  plateNumber?: string
}

export interface NewRescueTeamInput {
  name: string
  phone: string
  baseAddress?: string
  baseLat?: number
  baseLng?: number
  /** Seeds the branch's first vehicle at creation time (e.g. from the
   * signup form, which still collects unit-code/members) -- omit when
   * creating an empty branch (e.g. from the admin screen) to add vehicles
   * to separately afterward. */
  initialVehicle?: NewRescueVehicleInput
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
 * branch's id, to use as the profile's rescue_team_id. */
export async function createRescueTeam(input: NewRescueTeamInput): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const id = await nextOrgId('rescue_teams', 'rt')
  const { error } = await supabase.from('rescue_teams').insert({
    id,
    name: input.name,
    phone: input.phone,
    base_lat: input.baseLat ?? 18.7883,
    base_lng: input.baseLng ?? 98.9853,
    base_address: input.baseAddress ?? '',
  })
  if (error) throw error
  if (input.initialVehicle) await createRescueVehicle(id, input.initialVehicle)
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
      phone: input.phone,
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

export async function createRescueVehicle(rescueTeamId: string, input: NewRescueVehicleInput): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const id = await nextVehicleId(rescueTeamId)
  const { error } = await supabase.from('rescue_vehicles').insert({
    id,
    rescue_team_id: rescueTeamId,
    unit_code: input.unitCode,
    members: input.members,
    vehicle: input.vehicle ?? '',
    equipment: input.equipment ?? [],
    level: input.level ?? 'BLS',
    driver_name: input.driverName ?? null,
    plate_number: input.plateNumber ?? null,
  })
  if (error) throw error
  return id
}

export async function updateRescueVehicle(id: string, input: NewRescueVehicleInput): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from('rescue_vehicles')
    .update({
      unit_code: input.unitCode,
      members: input.members,
      vehicle: input.vehicle ?? '',
      equipment: input.equipment ?? [],
      level: input.level ?? 'BLS',
      driver_name: input.driverName ?? null,
      plate_number: input.plateNumber ?? null,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteRescueVehicle(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from('rescue_vehicles').delete().eq('id', id)
  if (error) throw error
}
