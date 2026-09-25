// Supabase Edge Function: mints a LiveKit access token for the in-app
// video/voice calls (see src/lib/useLiveKitCall.ts). Replaces the old
// peer-to-peer WebRTC setup (Supabase Realtime signaling + the
// cloudflare-turn-credentials function) -- LiveKit's SFU handles
// signaling, TURN relay, and reconnection itself, and lets more than two
// people share one call (dispatcher pulling the rescue crew into a
// citizen's call).
//
// Authorization is delegated entirely to the existing RLS on `cases`: the
// case lookup below runs as the *caller* (their own JWT, not the service
// role), so it only finds the case if they'd be allowed to see it in the
// app anyway -- dispatch/admin any case, rescue only their team's,
// a citizen only their own report. The room name is built here from the
// case id, never taken from the client, so a token is only ever good for
// the one case the caller already has access to.
//
// Deploy: supabase functions deploy livekit-token
//   (keeps default JWT verification ON -- every caller already has a
//   Supabase session, citizens included via anonymous auth.)
// Secrets (LiveKit Cloud dashboard -> Settings -> Keys, or your own server):
//   supabase secrets set LIVEKIT_URL=wss://<project>.livekit.cloud \
//     LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AccessToken } from 'npm:livekit-server-sdk@2.19.1'

const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL') ?? ''
const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY') ?? ''
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

type Role = 'public' | 'dispatch' | 'rescue' | 'hospital'

// 'dispatch' is the case's 1669 line (citizen <-> dispatcher, plus the
// rescue crew when pulled in); 'rescue-citizen' is the separate direct
// call rescue places to the reporter. Hospital accounts can read their
// incoming cases but have no call feature, so they're never admitted.
const ROOM_ROLES: Record<string, Role[]> = {
  dispatch: ['public', 'dispatch', 'rescue'],
  'rescue-citizen': ['public', 'rescue'],
}

const CASE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    console.error('livekit-token: LIVEKIT_URL/LIVEKIT_API_KEY/LIVEKIT_API_SECRET not set')
    return json({ error: 'calls not configured' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'unauthorized' }, 401)

  let caseId: unknown
  let roomKind: unknown
  let requestedRole: unknown
  try {
    ;({ caseId, roomKind, role: requestedRole } = await req.json())
  } catch {
    return json({ error: 'invalid body' }, 400)
  }
  if (typeof caseId !== 'string' || !CASE_ID_PATTERN.test(caseId)) return json({ error: 'invalid caseId' }, 400)
  if (typeof roomKind !== 'string' || !(roomKind in ROOM_ROLES)) return json({ error: 'invalid roomKind' }, 400)

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return json({ error: 'unauthorized' }, 401)
    const userId = userData.user.id

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, name, is_admin, approval_status')
      .eq('id', userId)
      .maybeSingle()
    if (!profile || profile.approval_status !== 'approved') return json({ error: 'forbidden' }, 403)

    // Admins can work any screen (RequireRole lets them through), so their
    // profile role doesn't say which side of this call they're on -- take
    // the side the page asked for, as long as it belongs in this room.
    // Everyone else is always their own role, whatever they asked for.
    const allowed = ROOM_ROLES[roomKind]
    const role =
      profile.is_admin && allowed.includes(requestedRole as Role) ? (requestedRole as Role) : (profile.role as Role)
    if (!profile.is_admin && !allowed.includes(role)) return json({ error: 'forbidden' }, 403)

    const { data: caseRow } = await supabase.from('cases').select('case_id').eq('data->>id', caseId).maybeSingle()
    if (!caseRow) return json({ error: 'forbidden' }, 403)

    const room = roomKind === 'dispatch' ? `resq-${caseId}` : `resq-${caseId}-${roomKind}`
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      // Per connection, not per user: LiveKit keeps one participant per
      // identity, so the same account in two tabs/devices (an admin trying
      // both sides of a call, a dispatcher on phone + desktop) would keep
      // kicking each other out of the room.
      identity: `${userId}:${crypto.randomUUID().slice(0, 8)}`,
      name: profile.name ?? undefined,
      // Read by the client to label each tile (1669 / rescue / reporter)
      // -- a non-admin's is always their profile role, never what the
      // client sent, so a citizen can't pass themselves off as dispatch.
      attributes: { role },
      // Only has to be valid at join time; LiveKit refreshes the session
      // itself for as long as the call lasts.
      ttl: '10m',
    })
    token.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true })

    return json({ token: await token.toJwt(), url: LIVEKIT_URL }, 200)
  } catch (err) {
    console.error('livekit-token failed:', err)
    return json({ error: 'internal error' }, 500)
  }
})
