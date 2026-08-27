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

function toAppUser(row: ProfileRow, isAnonymous: boolean): AppUser {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phone: row.phone ?? undefined,
    rescueTeamId: row.rescue_team_id ?? undefined,
    hospitalId: row.hospital_id ?? undefined,
    approvalStatus: row.approval_status,
    isAdmin: row.is_admin,
    isAnonymous,
  }
}

/** `isAnonymous` has to come from the session, not the profiles row --
 * an anonymous session and a real "public" registration both end up with
 * role 'public', so the row alone can't tell them apart. This is what lets
 * the UI tell "just an anonymous visitor" apart from "actually logged in"
 * (e.g. whether to show login/register links or a profile menu). */
export async function fetchProfile(userId: string, isAnonymous: boolean): Promise<AppUser | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error || !data) return null
  return toAppUser(data as ProfileRow, isAnonymous)
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
  let user = sessionData.session?.user
  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) return null
    user = data.user
  }
  return fetchProfile(user.id, !!user.is_anonymous)
}

export async function getCurrentUser(): Promise<AppUser | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return null
  return fetchProfile(user.id, !!user.is_anonymous)
}

export async function signIn(email: string, password: string): Promise<AppUser | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw error ?? new Error('Sign in failed')
  return fetchProfile(data.user.id, false)
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

export async function updateProfile(userId: string, patch: { name: string; phone?: string }): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('profiles')
    .update({ name: patch.name, phone: patch.phone ?? null })
    .eq('id', userId)
  if (error) throw error
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
    void fetchProfile(session.user.id, !!session.user.is_anonymous).then(callback)
  })
  return () => data.subscription.unsubscribe()
}
