// Supabase Edge Function: server-side half of "Sign in with LINE" AND
// "Connect LINE" account linking -- both drive LINE's own login step from
// the client (see signInWithLine in src/lib/auth.ts) and land here for the
// part that needs a secret or server-side trust:
//
// - Web (and any non-native caller): a plain browser OAuth redirect, which
//   lands here with a `code` that gets exchanged for tokens using the LINE
//   Login channel's client secret -- that secret must never reach the
//   browser, hence this happens server-side.
// - Native (Android): the LINE SDK's app-to-app login (LineLoginPlugin.java)
//   hands off directly to the LINE app itself instead of a browser redirect,
//   and already returns a signed ID token JWT -- no code/secret exchange
//   needed, but that token came from the client, so it's verified here
//   against LINE's own /oauth2/v2.1/verify endpoint before any of its claims
//   are trusted, rather than just decoding it client-side.
//
// Either path ends up with the same trusted {sub, name, picture}, which the
// request body's `mode` field then routes the same way:
//
// - mode: 'login' (default) -- mints a Supabase magic-link token via the
//   Admin API and hands the hashed token back to the browser, which redeems
//   it with supabase.auth.verifyOtp() to get a real session -- no email
//   ever sent, no password involved. If this LINE sub is already linked to
//   an existing account (profiles.line_user_id, set by a prior 'link' call
//   or a prior first-time login), the magic link targets THAT account's
//   real email instead of a fresh synthetic one, so the user always lands
//   in the one account they linked from. Otherwise it's a synthetic
//   line-<sub>@line.resq.internal identity, same as before this account-
//   linking feature existed. See src/pages/auth/LineCallback.tsx for the
//   other end of this chain, and ensureSocialProfile in src/lib/auth.ts for
//   how a brand-new user gets a `profiles` row.
//
// - mode: 'link' -- called from an already-authenticated browser tab
//   (Settings page), identified by the caller's own Supabase access token
//   in the Authorization header (verified here manually with
//   supabase.auth.getUser(jwt), since this function's verify_jwt is off).
//   Just stamps `profiles.line_user_id` for that caller -- no new session,
//   no magic link. The column's unique constraint (see
//   supabase-profile-line-link.sql) is what actually stops two accounts
//   from claiming the same LINE identity; a violation there comes back as a
//   clean 409 instead of a raw Postgres error.
//
// Deploy: supabase functions deploy line-login-exchange --no-verify-jwt
//   (--no-verify-jwt because this runs before the caller has any Supabase
//   session at all -- there's nothing to verify a JWT against yet)
// Secrets (supabase secrets set ...):
//   LINE_LOGIN_CHANNEL_ID      -- from a *LINE Login* channel (not the
//                                 Messaging API channel line-webhook uses)
//   LINE_LOGIN_CHANNEL_SECRET  -- same channel
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LINE_LOGIN_CHANNEL_ID = Deno.env.get('LINE_LOGIN_CHANNEL_ID') ?? ''
const LINE_LOGIN_CHANNEL_SECRET = Deno.env.get('LINE_LOGIN_CHANNEL_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LineTokenResponse {
  access_token: string
  id_token: string
  expires_in: number
  token_type: string
}

interface LineIdTokenPayload {
  sub: string
  name?: string
  picture?: string
  email?: string
}

/** The id_token is a JWT; we only need the payload (already authenticated
 * by virtue of coming straight from LINE's token endpoint over a
 * server-to-server call using our channel secret), so this just base64url
 * decodes the middle segment instead of pulling in a full JWT library. */
function decodeIdTokenPayload(idToken: string): LineIdTokenPayload {
  const [, payloadB64] = idToken.split('.')
  if (!payloadB64) throw new Error('Malformed id_token')
  const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return JSON.parse(atob(padded))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (!LINE_LOGIN_CHANNEL_ID || !LINE_LOGIN_CHANNEL_SECRET) {
    return new Response(JSON.stringify({ error: 'LINE Login is not configured on the server' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { code, redirectUri, idToken, mode } = (await req.json()) as {
      code?: string
      redirectUri?: string
      idToken?: string
      mode?: 'login' | 'link'
    }
    const effectiveMode: 'login' | 'link' = mode === 'link' ? 'link' : 'login'

    let payload: LineIdTokenPayload
    if (idToken) {
      // Native app-to-app login (LineLoginPlugin.java) -- the ID token came
      // from the client, so its claims are only trusted once LINE's own
      // verify endpoint confirms the signature, audience, and expiry, not
      // just decoded as-is.
      const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id_token: idToken, client_id: LINE_LOGIN_CHANNEL_ID }),
      })
      if (!verifyRes.ok) {
        const body = await verifyRes.text().catch(() => '')
        console.error(`LINE id_token verify failed: ${verifyRes.status} ${body}`)
        return new Response(JSON.stringify({ error: 'LINE id_token verify failed' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      payload = (await verifyRes.json()) as LineIdTokenPayload
    } else if (code && redirectUri) {
      // Web browser OAuth redirect -- exchange the code server-side using
      // the channel secret, which must never reach the browser.
      const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: LINE_LOGIN_CHANNEL_ID,
          client_secret: LINE_LOGIN_CHANNEL_SECRET,
        }),
      })
      if (!tokenRes.ok) {
        const body = await tokenRes.text().catch(() => '')
        console.error(`LINE token exchange failed: ${tokenRes.status} ${body}`)
        return new Response(JSON.stringify({ error: 'LINE token exchange failed' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const tokens = (await tokenRes.json()) as LineTokenResponse
      payload = decodeIdTokenPayload(tokens.id_token)
    } else {
      return new Response(JSON.stringify({ error: 'Missing idToken, or code and redirectUri' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!payload.sub) throw new Error('id_token missing sub')

    if (effectiveMode === 'link') {
      const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
      if (!jwt) {
        return new Response(JSON.stringify({ error: 'Missing session' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: callerData, error: callerError } = await supabase.auth.getUser(jwt)
      if (callerError || !callerData.user) {
        return new Response(JSON.stringify({ error: 'Invalid session' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ line_user_id: payload.sub })
        .eq('id', callerData.user.id)
      if (updateError) {
        const isConflict = updateError.code === '23505' // unique_violation on line_user_id
        console.error('link line_user_id failed:', updateError.code, updateError.message)
        return new Response(
          JSON.stringify({
            error: isConflict
              ? 'บัญชี LINE นี้เชื่อมต่อกับผู้ใช้อื่นอยู่แล้ว'
              : `เชื่อมต่อ LINE ไม่สำเร็จ: ${updateError.message}`,
          }),
          { status: isConflict ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      return new Response(JSON.stringify({ name: payload.name, avatarUrl: payload.picture }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // mode 'login' -- reuse an already-linked account's real email if one
    // exists, so this LINE identity always lands in the same account it was
    // ever linked to, rather than spawning a second synthetic one.
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('line_user_id', payload.sub)
      .maybeSingle()

    let email: string
    if (existingProfile) {
      const { data: existingUser, error: existingUserError } = await supabase.auth.admin.getUserById(
        existingProfile.id,
      )
      if (existingUserError || !existingUser.user?.email) {
        console.error('linked profile has no resolvable auth user:', existingUserError?.message)
        return new Response(JSON.stringify({ error: 'ไม่พบบัญชีที่เชื่อมต่อไว้' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      email = existingUser.user.email
    } else {
      email = `line-${payload.sub}@line.resq.internal`
    }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        data: {
          line_user_id: payload.sub,
          name: payload.name,
          avatar_url: payload.picture,
          provider: 'line',
        },
      },
    })
    if (error || !data) {
      console.error('generateLink failed:', error?.message)
      return new Response(JSON.stringify({ error: 'Could not create a session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        hashedToken: data.properties.hashed_token,
        name: payload.name,
        avatarUrl: payload.picture,
        lineUserId: payload.sub,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('line-login-exchange failed:', err)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
