import { Browser } from '@capacitor/browser'
import { supabase, supabaseEnabled } from './supabase'
import { isNativeApp } from './nativeNotify'
import type { AppUser, ApprovalStatus, Role } from './types'

/** LINE's plain OAuth authorize endpoint (unlike its "mobile app" package/
 * signature registration, which only applies to their native SDK) only
 * accepts a pre-registered https:// redirect_uri -- a custom resq:// scheme
 * is rejected outright ("Invalid redirect custom scheme"), and
 * https://localhost/... (the app's own origin inside the WebView) isn't
 * reliably reachable once the login hands off through the system browser.
 * So native login reuses the real, already-approved production callback URL
 * -- LineCallback.tsx detects it's running for a native-initiated flow (via
 * the `native` flag encoded in `state`, see encodeLineState) and relays the
 * result to the app over the resq:// deep link instead of completing the
 * exchange on the web page itself, which would establish the session under
 * the wrong origin. */
const LINE_PRODUCTION_CALLBACK_URL = 'https://noonez01.github.io/RES-Q/auth/line-callback'

export function lineRedirectUri(): string {
  if (isNativeApp()) return LINE_PRODUCTION_CALLBACK_URL
  return `${window.location.origin}${import.meta.env.BASE_URL}auth/line-callback`
}

interface LineStatePayload {
  mode: LineAuthMode
  native: boolean
}

function encodeLineState(mode: LineAuthMode): string {
  const payload: LineStatePayload = { mode, native: isNativeApp() }
  return `${btoa(JSON.stringify(payload))}.${randomToken()}`
}

/** `state` is LINE's only channel that survives a redirect to a completely
 * different origin/tab (the login might start in the app's WebView and land
 * on the production web page in an external browser) -- so unlike a typical
 * OAuth client, this doesn't also compare against a separately-stored
 * expected value. That's an acceptable tradeoff here: the actual token
 * exchange still requires our server-side LINE channel secret and a fresh,
 * single-use code from LINE, so a forged state alone can't complete a
 * login. */
export function parseLineState(state: string): LineStatePayload | null {
  try {
    const [encoded] = state.split('.')
    const payload = JSON.parse(atob(encoded)) as Partial<LineStatePayload>
    return { mode: payload.mode === 'link' ? 'link' : 'login', native: !!payload.native }
  } catch {
    return null
  }
}

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

export type LineAuthMode = 'login' | 'link'

function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

/** Supabase has no built-in LINE provider (unlike Google), so this drives
 * LINE's own OAuth/OIDC authorize step directly -- the token exchange that
 * needs the channel secret happens server-side in the line-login-exchange
 * Edge Function once LINE redirects back to /auth/line-callback with a
 * code (see AuthCallback pattern in src/pages/auth/LineCallback.tsx).
 *
 * `mode: 'link'` is for an already-logged-in user attaching LINE to their
 * existing account from Settings, instead of signing in fresh -- encoded
 * into `state` (see encodeLineState) rather than sessionStorage, since a
 * native login's callback can land on a completely different origin/tab
 * (see lineRedirectUri) where sessionStorage set here wouldn't be visible. */
export async function signInWithLine(mode: LineAuthMode = 'login'): Promise<void> {
  if (!LINE_LOGIN_CHANNEL_ID) throw new Error('LINE Login is not configured (missing VITE_LINE_LOGIN_CHANNEL_ID)')
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_LOGIN_CHANNEL_ID,
    redirect_uri: lineRedirectUri(),
    state: encodeLineState(mode),
    scope: 'openid profile',
    nonce: randomToken(),
  })
  const authorizeUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
  if (isNativeApp()) {
    // A system Custom Tab, not this app's own WebView -- LINE's redirect
    // will land on the production web page (see lineRedirectUri), which
    // relays back to the app over a resq:// deep link (see
    // LineCallback.tsx and the appUrlOpen listener in App.tsx).
    await Browser.open({ url: authorizeUrl })
    return
  }
  window.location.href = authorizeUrl
}

interface LineExchangeResult {
  hashedToken?: string
  name?: string
  avatarUrl?: string
  lineUserId?: string
  error?: string
}

/** Calls the line-login-exchange Edge Function, which trades the LINE
 * authorization code for an id_token server-side (needs the LINE channel
 * secret, so this can't happen in the browser). In 'login' mode it turns
 * that into a Supabase magic-link token via the admin API; in 'link' mode
 * it instead stamps the LINE identity straight onto the caller's own
 * profiles row (see that function's own comments for the full chain). */
async function exchangeLineCode(code: string, redirectUri: string, mode: LineAuthMode): Promise<LineExchangeResult> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.functions.invoke<LineExchangeResult>('line-login-exchange', {
    body: { code, redirectUri, mode },
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

/** Completes a LINE login: exchanges the code, redeems the resulting
 * Supabase token to establish a real session, then ensures a profiles row
 * exists exactly like a fresh Google sign-in would. If this LINE identity
 * was already linked to an existing account (see linkLineIdentity), the
 * Edge Function issues the magic link for that account's real email
 * instead of a fresh synthetic one, so the user lands back in the same
 * account they linked from -- not a second, disconnected one. */
export async function completeLineLogin(code: string, redirectUri: string): Promise<AppUser | null> {
  if (!supabase) return null
  const { hashedToken, name, avatarUrl, lineUserId } = await exchangeLineCode(code, redirectUri, 'login')
  if (!hashedToken) throw new Error('LINE login failed')
  // GoTrue's /verify endpoint rejects the 'magiclink' type here even though
  // admin.generateLink's own `type: 'magiclink'` (line-login-exchange) is
  // still valid -- current servers want 'email' when redeeming the
  // resulting token_hash ("Verify requires a verification type" otherwise).
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: hashedToken, type: 'email' })
  if (error || !data.user) throw error ?? new Error('LINE login failed')
  return ensureSocialProfile(data.user.id, { name, avatarUrl, lineUserId })
}

/** Attaches a LINE identity to the CURRENTLY signed-in account (called from
 * Settings, not the login page) -- lets someone who already registered with
 * email/Google also use "Sign in with LINE" for the same account, and lets
 * line-push-notify reach them by LINE. Fails with a clear error if that
 * LINE account is already linked to someone else (profiles.line_user_id is
 * unique -- see supabase-profile-line-link.sql). */
export async function linkLineIdentity(code: string, redirectUri: string): Promise<void> {
  await exchangeLineCode(code, redirectUri, 'link')
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
