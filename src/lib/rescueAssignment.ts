import { EQUIPMENT_FOR_INCIDENT } from './mockData'
import { haversineKm } from './utils'
import type { EmergencyCase, GeoLocation, RescueTeam } from './types'

export interface RankedTeam {
  team: RescueTeam
  distanceKm: number
  available: boolean
  hasRequiredEquipment: boolean
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
 * Every unit ranked by availability first, then distance to the incident --
 * with an equipment-match flag so dispatch can see who's actually suited,
 * not just who's closest. "Busy" means already assigned (primary or
 * supporting) to some other still-open case.
 */
export function rankRescueTeams(
  teams: RescueTeam[],
  incidentLocation: GeoLocation,
  requiredEquipment: string[],
  cases: EmergencyCase[],
  excludeCaseId?: string,
): RankedTeam[] {
  return teams.map((team) => ({
    team,
    distanceKm: haversineKm(team.base, incidentLocation),
    available: !isTeamBusy(team.id, cases, excludeCaseId),
    hasRequiredEquipment: requiredEquipment.every((eq) => team.equipment.includes(eq)),
  })).sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1
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
): AssignmentRecommendation {
  const requiredEquipment = requiredEquipmentFor(incidentType)
  const ranked = rankRescueTeams(teams, incidentLocation, requiredEquipment, cases, excludeCaseId)
  const primary = ranked.find((r) => r.available) ?? null
  const needsSupport = requiredEquipment.length > 0 && !!primary && !primary.hasRequiredEquipment
  const support = needsSupport
    ? ranked.find((r) => r.available && r.hasRequiredEquipment && r.team.id !== primary?.team.id) ?? null
    : null
  return { ranked, requiredEquipment, primary, needsSupport, support }
}
