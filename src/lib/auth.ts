import { supabase, supabaseEnabled } from './supabase'
import { isNativeApp } from './nativeNotify'
import { LineLoginNative } from './lineLoginNative'
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
  is_org_lead: boolean
  avatar_url: string | null
  nickname: string | null
  birthdate: string | null
  blood_type: string | null
  allergies: string | null
  chronic_conditions: string | null
  line_user_id: string | null
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
    isOrgLead: row.is_org_lead,
    isAnonymous,
    avatarUrl: row.avatar_url ?? undefined,
    nickname: row.nickname ?? undefined,
    birthdate: row.birthdate ?? undefined,
    bloodType: row.blood_type ?? undefined,
    allergies: row.allergies ?? undefined,
    chronicConditions: row.chronic_conditions ?? undefined,
    lineUserId: row.line_user_id ?? undefined,
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

export interface ProfilePatch {
  name: string
  phone?: string
  avatarUrl?: string
  nickname?: string
  birthdate?: string
  bloodType?: string
  allergies?: string
  chronicConditions?: string
}

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('profiles')
    .update({
      name: patch.name,
      phone: patch.phone ?? null,
      avatar_url: patch.avatarUrl ?? null,
      nickname: patch.nickname ?? null,
      birthdate: patch.birthdate ?? null,
      blood_type: patch.bloodType ?? null,
      allergies: patch.allergies ?? null,
      chronic_conditions: patch.chronicConditions ?? null,
    })
    .eq('id', userId)
  if (error) throw error
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

/** Any Google/LINE sign-in lands here whether the person is a returning or
 * brand-new user -- neither OAuth provider goes through registerAccount, and
 * the only DB trigger that auto-creates a profiles row is scoped to
 * anonymous sessions (see supabase-profiles-table.sql), so a first-time
 * social login needs its own row created client-side. Always role='public',
 * auto-approved -- the same pairing the "Insert own profile" RLS policy
 * requires, matching how a public web signup works today. Dispatch/rescue/
 * hospital accounts still only ever come from the dedicated registration +
 * approval flow, which a generic "sign in with Google" button can't imply. */
export async function ensureSocialProfile(
  userId: string,
  meta: { name?: string; avatarUrl?: string; lineUserId?: string },
): Promise<AppUser | null> {
  if (!supabase) return null
  const existing = await fetchProfile(userId, false)
  if (existing) return existing
  const { error } = await supabase.from('profiles').insert({
    id: userId,
    role: 'public',
    name: meta.name?.trim() || 'ผู้ใช้ ResQ',
    avatar_url: meta.avatarUrl ?? null,
    approval_status: 'approved',
    is_admin: false,
    line_user_id: meta.lineUserId ?? null,
  })
  if (error) throw error
  return fetchProfile(userId, false)
}

/** Supabase handles the whole Google OAuth round-trip itself (PKCE + its own
 * /auth/v1/callback) -- this just kicks it off. Lands back on our own
 * /auth/callback once Google confirms, see src/pages/auth/AuthCallback.tsx. */
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth/callback` },
  })
  if (error) throw error
}

const LINE_LOGIN_CHANNEL_ID = import.meta.env.VITE_LINE_LOGIN_CHANNEL_ID as string | undefined
const LINE_STATE_KEY = 'resq-line-login-state'
const LINE_MODE_KEY = 'resq-line-login-mode'

export type LineAuthMode = 'login' | 'link'

function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function lineRedirectUri(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}auth/line-callback`
}

/** Native: hands off to the LINE app itself via LineLoginPlugin.java's
 * app-to-app login -- the user is presumably already signed into the LINE
 * app, so this needs no credentials typed in and no browser round-trip.
 * Resolves with the signed-in profile directly (or null once a 'link' call
 * finishes) instead of navigating anywhere, since there's no redirect to
 * land on.
 *
 * Web: Supabase has no built-in LINE provider (unlike Google), so this
 * drives LINE's own OAuth/OIDC authorize step directly -- the code exchange
 * (needs the channel secret) happens server-side in the line-login-exchange
 * Edge Function once LINE redirects back to /auth/line-callback (see
 * LineCallback.tsx). Resolves with null immediately since the page
 * navigates away; `mode: 'link'` is for an already-logged-in user attaching
 * LINE to their existing account from Settings, instead of signing in
 * fresh -- the stored mode is what tells /auth/line-callback which of those
 * two to do once LINE redirects back. */
export async function signInWithLine(mode: LineAuthMode = 'login'): Promise<AppUser | null> {
  if (!LINE_LOGIN_CHANNEL_ID) throw new Error('LINE Login is not configured (missing VITE_LINE_LOGIN_CHANNEL_ID)')

  if (isNativeApp()) {
    const { idToken } = await LineLoginNative.login({ channelId: LINE_LOGIN_CHANNEL_ID })
    if (mode === 'link') {
      await exchangeLineIdentity({ idToken, mode: 'link' })
      return null
    }
    return completeLineSession(await exchangeLineIdentity({ idToken, mode: 'login' }))
  }

  const state = randomToken()
  sessionStorage.setItem(LINE_STATE_KEY, state)
  sessionStorage.setItem(LINE_MODE_KEY, mode)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_LOGIN_CHANNEL_ID,
    redirect_uri: lineRedirectUri(),
    state,
    scope: 'openid profile',
    nonce: randomToken(),
  })
  window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
  return null
}

/** Reads back and clears the state saved just before redirecting to LINE --
 * a mismatch (or nothing stored, e.g. a replayed/forged callback URL) means
 * this isn't a callback we actually initiated. Web-only: native never
 * redirects anywhere, see signInWithLine. */
export function consumeLineLoginState(): { redirectUri: string; mode: LineAuthMode } | null {
  const state = sessionStorage.getItem(LINE_STATE_KEY)
  const mode: LineAuthMode = sessionStorage.getItem(LINE_MODE_KEY) === 'link' ? 'link' : 'login'
  sessionStorage.removeItem(LINE_STATE_KEY)
  sessionStorage.removeItem(LINE_MODE_KEY)
  if (!state) return null
  return { redirectUri: lineRedirectUri(), mode }
}

export function getStoredLineState(): string | null {
  return sessionStorage.getItem(LINE_STATE_KEY)
}

interface LineExchangeResult {
  hashedToken?: string
  name?: string
  avatarUrl?: string
  lineUserId?: string
  error?: string
}

type LineExchangeInput =
  | { code: string; redirectUri: string; mode: LineAuthMode }
  | { idToken: string; mode: LineAuthMode }

/** Calls the line-login-exchange Edge Function. Given a web `code`, it
 * exchanges it for tokens using the LINE channel secret (never exposed to
 * the browser); given a native `idToken`, it verifies that token against
 * LINE's own /oauth2/v2.1/verify endpoint instead, since a client-supplied
 * token can't otherwise be trusted. In 'login' mode it turns the result into
 * a Supabase magic-link token via the admin API; in 'link' mode it instead
 * stamps the LINE identity straight onto the caller's own profiles row (see
 * that function's own comments for the full chain). */
async function exchangeLineIdentity(input: LineExchangeInput): Promise<LineExchangeResult> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.functions.invoke<LineExchangeResult>('line-login-exchange', {
    body: input,
  })
  if (error) {
    // The SDK's own error.message is just the generic "Edge Function
    // returned a non-2xx status code" wrapper -- the actual reason (e.g.
    // "already linked to another user") is in the JSON body the function
    // returned, reachable only via error.context (the raw Response), not
    // `data`. Duck-typed rather than `instanceof FunctionsHttpError`, which
    // isn't reliable if the SDK's own classes end up loaded from two
    // different module instances.
    const context = (error as { context?: unknown }).context as Response | undefined
    const body =
      context && typeof context.json === 'function' ? await context.clone().json().catch(() => null) : null
    throw new Error(body?.error || (error instanceof Error ? error.message : 'LINE login failed'))
  }
  if (!data) throw new Error('LINE login failed')
  if (data.error) throw new Error(data.error)
  return data
}

/** Redeems the magic-link token the Edge Function minted to establish a
 * real session, then ensures a profiles row exists exactly like a fresh
 * Google sign-in would. If this LINE identity was already linked to an
 * existing account (see below), the Edge Function issues the magic link for
 * that account's real email instead of a fresh synthetic one, so the user
 * lands back in the same account they linked from -- not a second,
 * disconnected one. */
async function completeLineSession(result: LineExchangeResult): Promise<AppUser | null> {
  if (!supabase) return null
  const { hashedToken, name, avatarUrl, lineUserId } = result
  if (!hashedToken) throw new Error('LINE login failed')
  // GoTrue's /verify endpoint rejects the 'magiclink' type here even though
  // admin.generateLink's own `type: 'magiclink'` (line-login-exchange) is
  // still valid -- current servers want 'email' when redeeming the
  // resulting token_hash ("Verify requires a verification type" otherwise).
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: hashedToken, type: 'email' })
  if (error || !data.user) throw error ?? new Error('LINE login failed')
  return ensureSocialProfile(data.user.id, { name, avatarUrl, lineUserId })
}

/** Completes a WEB LINE login callback -- see completeLineSession for the
 * native equivalent, driven directly from signInWithLine instead of a
 * redirect landing on LineCallback.tsx. */
export async function completeLineLogin(code: string, redirectUri: string): Promise<AppUser | null> {
  return completeLineSession(await exchangeLineIdentity({ code, redirectUri, mode: 'login' }))
}

/** Attaches a LINE identity to the CURRENTLY signed-in account (called from
 * Settings, not the login page) -- lets someone who already registered with
 * email/Google also use "Sign in with LINE" for the same account, and lets
 * line-push-notify reach them by LINE. Fails with a clear error if that
 * LINE account is already linked to someone else (profiles.line_user_id is
 * unique -- see supabase-profile-line-link.sql). */
export async function linkLineIdentity(code: string, redirectUri: string): Promise<void> {
  await exchangeLineIdentity({ code, redirectUri, mode: 'link' })
}

/** Detaches LINE from the current account -- afterwards "Sign in with LINE"
 * for that same LINE account creates a fresh, separate account again. Only
 * touches our own scoped `line_user_id` column, never the auth session, so
 * this can't lock anyone out of the account they're currently using it from. */
export async function unlinkLineIdentity(userId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('profiles').update({ line_user_id: null }).eq('id', userId)
  if (error) throw error
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
