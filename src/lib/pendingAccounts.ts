import { supabase, supabaseEnabled } from './supabase'
import type { AppUser, Role } from './types'

interface ProfileRow {
  id: string
  role: Role
  name: string
  phone: string | null
  rescue_team_id: string | null
  hospital_id: string | null
  approval_status: 'pending' | 'approved' | 'rejected'
  is_admin: boolean
}

function toAppUser(row: ProfileRow): AppUser {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phone: row.phone ?? undefined,
    rescueTeamId: row.rescue_team_id ?? undefined,
    hospitalId: row.hospital_id ?? undefined,
    approvalStatus: row.approval_status,
    isAdmin: row.is_admin,
  }
}

/** Only returns rows at all for an approved dispatch/admin caller -- RLS
 * (see supabase-profiles-table.sql) silently filters everyone else to zero. */
export async function fetchPendingAccounts(): Promise<AppUser[]> {
  if (!supabaseEnabled || !supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Failed to fetch pending accounts:', error.message)
    return []
  }
  return (data ?? []).map(toAppUser)
}

export async function approveAccount(userId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('profiles').update({ approval_status: 'approved' }).eq('id', userId)
  if (error) throw error
}

export async function rejectAccount(userId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('profiles').update({ approval_status: 'rejected' }).eq('id', userId)
  if (error) throw error
}
