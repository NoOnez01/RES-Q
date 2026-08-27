import { supabase, supabaseEnabled } from './supabase'
import { uid } from './utils'
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

export interface NewRescueTeamInput {
  name: string
  unitCode: string
  phone: string
  members: number
}

export interface NewHospitalInput {
  name: string
  phone: string
  address: string
}

/** Registration lets rescue/hospital sign-up create their own org if it
 * isn't in the existing roster yet (see supabase-org-insert-policy.sql).
 * Returns the new row's id, to use as the profile's rescue_team_id. */
export async function createRescueTeam(input: NewRescueTeamInput): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const id = uid('rt')
  const { error } = await supabase.from('rescue_teams').insert({
    id,
    name: input.name,
    unit_code: input.unitCode,
    phone: input.phone,
    members: input.members,
    vehicle: '',
    base_lat: 18.7883,
    base_lng: 98.9853,
    base_address: '',
    equipment: [],
  })
  if (error) throw error
  return id
}

export async function createHospital(input: NewHospitalInput): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const id = uid('hp')
  const { error } = await supabase.from('hospitals').insert({
    id,
    name: input.name,
    phone: input.phone,
    distance_km: 0,
    eta_min: 0,
    er_available: true,
    beds_available: 0,
    specialties: [],
    lat: 18.7883,
    lng: 98.9853,
    address: input.address,
  })
  if (error) throw error
  return id
}
