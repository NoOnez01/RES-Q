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
  is_org_lead: boolean
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
    isOrgLead: row.is_org_lead,
  }
}

/** Only returns rows at all for an approved dispatch/admin/org-lead caller
 * -- RLS (see supabase-profiles-table.sql, supabase-org-lead-system.sql)
 * silently filters everyone else to zero, and an org lead only ever gets
 * back pending accounts for their own rescue team or hospital. */
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

/** `asOrgLead` also grants is_org_lead in the same update -- useful for the
 * common case of approving the very first member of a newly self-registered
 * org, who then becomes able to approve their own colleagues afterward. */
export async function approveAccount(userId: string, asOrgLead = false): Promise<void> {
  if (!supabase) return
  const patch: { approval_status: 'approved'; is_org_lead?: boolean } = { approval_status: 'approved' }
  if (asOrgLead) patch.is_org_lead = true
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) throw error
}

export async function rejectAccount(userId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('profiles').update({ approval_status: 'rejected' }).eq('id', userId)
  if (error) throw error
}

/** Approved staff accounts (not the public role -- promoting an anonymous-
 * style citizen row to admin doesn't make sense). Only returns rows at all
 * for an approved dispatch/admin caller, same as fetchPendingAccounts. */
export async function fetchApprovedStaff(): Promise<AppUser[]> {
  if (!supabaseEnabled || !supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('approval_status', 'approved')
    .neq('role', 'public')
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Failed to fetch approved staff:', error.message)
    return []
  }
  return (data ?? []).map(toAppUser)
}

/** Only an already-approved admin can call this -- enforced server-side too
 * (see supabase-admin-grant-policy.sql), so a non-admin request just fails. */
export async function setAdminStatus(userId: string, isAdmin: boolean): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('profiles').update({ is_admin: isAdmin }).eq('id', userId)
  if (error) throw error
}

/** Admin/dispatch can call this for anyone; an org lead can only call it
 * for a fellow member of their own org -- enforced server-side (see
 * supabase-org-lead-system.sql), so a mismatched request just fails. */
export async function setOrgLeadStatus(userId: string, isOrgLead: boolean): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('profiles').update({ is_org_lead: isOrgLead }).eq('id', userId)
  if (error) throw error
}
