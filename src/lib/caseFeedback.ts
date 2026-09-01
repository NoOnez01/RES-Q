import { supabase, supabaseEnabled } from './supabase'

export interface FeedbackInput {
  caseId: string
  rescueTeamId?: string
  rescueTeamName?: string
  rating: number
  complaint?: string
}

export async function submitCaseFeedback(input: FeedbackInput): Promise<void> {
  if (!supabaseEnabled || !supabase) return
  const { error } = await supabase.from('case_feedback').insert({
    case_id: input.caseId,
    rescue_team_id: input.rescueTeamId ?? null,
    rescue_team_name: input.rescueTeamName ?? null,
    rating: input.rating,
    complaint: input.complaint?.trim() ? input.complaint.trim() : null,
  })
  if (error) throw error
}

export interface FeedbackRow {
  id: string
  case_id: string
  rescue_team_id: string | null
  rescue_team_name: string | null
  rating: number
  complaint: string | null
  created_at: string
}

export interface TeamFeedbackStats {
  teamId: string | null
  teamName: string
  count: number
  averageRating: number
}

export interface FeedbackStats {
  count: number
  averageRating: number
  ratingCounts: Record<1 | 2 | 3 | 4 | 5, number>
  recentComplaints: FeedbackRow[]
  /** Sorted best-rated first (ties broken by review count) -- rows with no
   * rescue_team_name (feedback submitted without a resolvable team) are
   * grouped last under a placeholder label rather than dropped. */
  teamStats: TeamFeedbackStats[]
}

/**
 * Pulls every feedback row and aggregates client-side -- the volume here
 * (one row per completed case) never gets large enough to need a database
 * view or RPC for this.
 */
export async function fetchFeedbackStats(): Promise<FeedbackStats> {
  const empty: FeedbackStats = {
    count: 0,
    averageRating: 0,
    ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    recentComplaints: [],
    teamStats: [],
  }
  if (!supabaseEnabled || !supabase) return empty
  const { data, error } = await supabase
    .from('case_feedback')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Failed to fetch feedback stats:', error.message)
    return empty
  }
  const rows = (data ?? []) as FeedbackRow[]
  if (rows.length === 0) return empty
  const ratingCounts: FeedbackStats['ratingCounts'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let total = 0
  const byTeam = new Map<string, { teamId: string | null; teamName: string; total: number; count: number }>()
  for (const row of rows) {
    total += row.rating
    ratingCounts[row.rating as 1 | 2 | 3 | 4 | 5]++

    const teamKey = row.rescue_team_id ?? row.rescue_team_name ?? '__unassigned__'
    const entry = byTeam.get(teamKey) ?? {
      teamId: row.rescue_team_id,
      teamName: row.rescue_team_name ?? 'ไม่ระบุหน่วยกู้ชีพ',
      total: 0,
      count: 0,
    }
    entry.total += row.rating
    entry.count += 1
    byTeam.set(teamKey, entry)
  }
  const teamStats: TeamFeedbackStats[] = [...byTeam.values()]
    .map((t) => ({ teamId: t.teamId, teamName: t.teamName, count: t.count, averageRating: t.total / t.count }))
    .sort((a, b) => {
      // Unattributed feedback can't evaluate any specific unit -- always last.
      if ((a.teamId === null) !== (b.teamId === null)) return a.teamId === null ? 1 : -1
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating
      return b.count - a.count
    })

  return {
    count: rows.length,
    averageRating: total / rows.length,
    ratingCounts,
    recentComplaints: rows.filter((r) => r.complaint),
    teamStats,
  }
}
