// Supabase Edge Function: server-side half of "Sign in with LINE".
//
// Supabase Auth has no built-in LINE provider (unlike Google), so the app
// drives LINE's own OAuth/OIDC authorize step directly from the browser
// (see signInWithLine in src/lib/auth.ts) and only needs this function for
// the one step that requires a secret: exchanging the authorization code
// LINE hands back for tokens. That exchange needs the LINE Login channel's
// client secret, which must never reach the browser -- so it happens here,
// not in src/lib/auth.ts.
//
// Once we have LINE's id_token (a verified OIDC token straight from LINE's
// own token endpoint -- no signature check needed here since we obtained it
// via an authenticated server-to-server call, not from an untrusted client),
// this mints a Supabase magic-link token for a synthetic
// line-<sub>@line.resq.internal identity via the Admin API and hands the
// hashed token back to the browser, which redeems it with
// supabase.auth.verifyOtp() to get a real session -- no email ever sent,
// no password involved. See src/pages/auth/LineCallback.tsx for the other
// end of this chain, and ensureSocialProfile in src/lib/auth.ts for how the
// resulting user gets a `profiles` row.
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
    const { code, redirectUri } = (await req.json()) as { code?: string; redirectUri?: string }
    if (!code || !redirectUri) {
      return new Response(JSON.stringify({ error: 'Missing code or redirectUri' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
    const payload = decodeIdTokenPayload(tokens.id_token)
    if (!payload.sub) throw new Error('id_token missing sub')

    const email = `line-${payload.sub}@line.resq.internal`
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
