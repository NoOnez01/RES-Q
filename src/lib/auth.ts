import { supabase, supabaseEnabled } from './supabase'
import type { AppUser, ApprovalStatus, Role } from './types'

interface ProfileRow {
  id: string
  role: Role
  name: string
  phone: string | null
  rescue_team_id: string | null
  hospital_id: string | null
  approval_status: ApprovalStatus
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

export async function fetchProfile(userId: string): Promise<AppUser | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error || !data) return null
  return toAppUser(data as ProfileRow)
}

/**
 * Citizens never see a login screen -- an anonymous Supabase Auth session
 * gives them a stable identity (so RLS can scope "their" case to them)
 * without any signup friction. A `profiles` row is created for it
 * automatically by a Postgres trigger (see supabase-profiles-table.sql).
 */
export async function ensureAnonymousSession(): Promise<AppUser | null> {
  if (!supabase) return null
  const { data: sessionData } = await supabase.auth.getSession()
  let userId = sessionData.session?.user.id
  if (!userId) {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) return null
    userId = data.user.id
  }
  return fetchProfile(userId)
}

export async function getCurrentUser(): Promise<AppUser | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) return null
  return fetchProfile(userId)
}

export async function signIn(email: string, password: string): Promise<AppUser | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw error ?? new Error('Sign in failed')
  return fetchProfile(data.user.id)
}

interface RegisterInput {
  email: string
  password: string
  name: string
  phone?: string
  role: Role
  rescueTeamId?: string
  hospitalId?: string
}

/** Creates the auth user + its profiles row together. Dispatch/rescue/
 * hospital accounts start `pending`; public isn't sensitive so it's
 * auto-approved (see supabase-profiles-table.sql's insert policy, which
 * enforces this same pairing server-side too, not just here). */
export async function registerAccount(input: RegisterInput): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password })
  if (error) throw error
  if (!data.user) throw new Error('Registration failed')

  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id,
    role: input.role,
    name: input.name,
    phone: input.phone ?? null,
    rescue_team_id: input.rescueTeamId ?? null,
    hospital_id: input.hospitalId ?? null,
    approval_status: input.role === 'public' ? 'approved' : 'pending',
    is_admin: false,
  })
  if (profileError) throw profileError
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

export function onAuthChange(callback: (user: AppUser | null) => void): () => void {
  if (!supabaseEnabled || !supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      callback(null)
      return
    }
    void fetchProfile(session.user.id).then(callback)
  })
  return () => data.subscription.unsubscribe()
}
