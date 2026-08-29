import { EQUIPMENT_FOR_INCIDENT } from './mockData'
import { haversineKm } from './utils'
import { VEHICLE_LEVEL_RANK } from './types'
import type { EmergencyCase, GeoLocation, RescueTeam, VehicleLevel } from './types'

export interface RankedTeam {
  team: RescueTeam
  distanceKm: number
  available: boolean
  hasRequiredEquipment: boolean
  /** True if the branch has at least one vehicle at exactly `requiredLevel`
   * -- always true when no level was requested (nothing to fail). */
  hasVehicleAtLevel: boolean
}

export interface AssignmentRecommendation {
  ranked: RankedTeam[]
  requiredEquipment: string[]
  /** Nearest available unit -- the default single-team pick when no
   * equipment is required, or the primary responder in a co-assignment. */
  primary: RankedTeam | null
  /** True when the incident needs gear the primary responder doesn't carry,
   * so 1669 should co-assign a second, equipped unit alongside them. */
  needsSupport: boolean
  /** Nearest available unit that actually has the required equipment,
   * distinct from `primary`. Null if none is free. */
  support: RankedTeam | null
}

/** The next tier up from `level`, or null already at the top (CLS) -- used
 * to suggest an escalation support vehicle when a severity re-assessment
 * gets worse, never to invent a level out of nowhere. */
export function nextLevelUp(level: VehicleLevel): VehicleLevel | null {
  const i = VEHICLE_LEVEL_RANK.indexOf(level)
  return i <= 0 ? null : VEHICLE_LEVEL_RANK[i - 1]
}

export function requiredEquipmentFor(incidentType: string | undefined): string[] {
  if (!incidentType) return []
  return EQUIPMENT_FOR_INCIDENT[incidentType] ?? []
}

function isTeamBusy(teamId: string, cases: EmergencyCase[], excludeCaseId?: string): boolean {
  return cases.some(
    (c) =>
      c.id !== excludeCaseId &&
      c.status !== 'completed' &&
      (c.assignedRescueTeam?.id === teamId || c.supportingRescueTeam?.id === teamId),
  )
}

/**
 * Every unit ranked by availability first, then (when the incident needs
 * specific gear) whether they actually carry it, then distance to the
 * incident -- so the first entry is always the genuinely best pick, not
 * just the nearest one regardless of whether they can actually handle the
 * incident. "Busy" means already assigned (primary or supporting) to some
 * other still-open case.
 */
export function rankRescueTeams(
  teams: RescueTeam[],
  incidentLocation: GeoLocation,
  requiredEquipment: string[],
  cases: EmergencyCase[],
  excludeCaseId?: string,
  /** Dispatch's level pick, e.g. from the CLS/ALS/BLS buttons on the
   * finding-rescue screen -- filters to branches with a vehicle at exactly
   * this tier (not "this tier or better": dispatch can just press a higher
   * button themselves). Omitted entirely = today's level-agnostic ranking. */
  requiredLevel?: VehicleLevel,
): RankedTeam[] {
  return teams.map((team) => ({
    team,
    distanceKm: haversineKm(team.base, incidentLocation),
    available: !isTeamBusy(team.id, cases, excludeCaseId),
    // A branch "has" the required equipment if at least one of its own
    // vehicles carries everything needed -- dispatch only assigns the
    // branch (see the branch/vehicle split in types.ts), so what matters
    // is whether some single crew of theirs can actually cover it, not
    // whether the gear exists somewhere spread across different vehicles.
    hasRequiredEquipment: team.vehicles.some((v) => requiredEquipment.every((eq) => v.equipment.includes(eq))),
    hasVehicleAtLevel: !requiredLevel || team.vehicles.some((v) => (v.level ?? 'BLS') === requiredLevel),
  })).sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1
    if (requiredLevel && a.hasVehicleAtLevel !== b.hasVehicleAtLevel) {
      return a.hasVehicleAtLevel ? -1 : 1
    }
    if (requiredEquipment.length > 0 && a.hasRequiredEquipment !== b.hasRequiredEquipment) {
      return a.hasRequiredEquipment ? -1 : 1
    }
    return a.distanceKm - b.distanceKm
  })
}

/**
 * The full recommendation: who to send, and whether the incident's
 * equipment needs (e.g. a jaws-of-life for an entrapment) call for a second
 * unit riding along because the nearest available responder doesn't carry
 * it themselves.
 */
export function recommendAssignment(
  teams: RescueTeam[],
  incidentLocation: GeoLocation,
  incidentType: string | undefined,
  cases: EmergencyCase[],
  excludeCaseId?: string,
  requiredLevel?: VehicleLevel,
): AssignmentRecommendation {
  const requiredEquipment = requiredEquipmentFor(incidentType)
  const ranked = rankRescueTeams(teams, incidentLocation, requiredEquipment, cases, excludeCaseId, requiredLevel)
  const primary = ranked.find((r) => r.available) ?? null
  const needsSupport = requiredEquipment.length > 0 && !!primary && !primary.hasRequiredEquipment
  const support = needsSupport
    ? ranked.find((r) => r.available && r.hasRequiredEquipment && r.team.id !== primary?.team.id) ?? null
    : null
  return { ranked, requiredEquipment, primary, needsSupport, support }
}
