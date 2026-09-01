// Supabase Edge Function: mints short-lived Cloudflare Calls TURN
// credentials for the WebRTC video/voice call feature (see
// src/lib/useWebRTCCall.ts). Replaces Metered.ca as the TURN provider.
//
// Cloudflare's TURN Key API Token can generate unlimited credentials
// against the account's own billing, so it must never reach the browser --
// this function holds it server-side and only ever hands back the
// resulting short-lived iceServers object (a real username/credential
// pair, but one that expires and is scoped to TURN relay only).
//
// Deploy: supabase functions deploy cloudflare-turn-credentials
//   (keeps default JWT verification ON -- unlike line-login-exchange,
//   every caller here already has a Supabase session by the time they
//   place a call: citizens get one via anonymous auth on app load, well
//   before the call screen ever renders).
// Secrets (Cloudflare dashboard -> Calls -> TURN -> create a Turn key):
//   supabase secrets set CLOUDFLARE_TURN_KEY_ID=... CLOUDFLARE_TURN_KEY_API_TOKEN=...

const CLOUDFLARE_TURN_KEY_ID = Deno.env.get('CLOUDFLARE_TURN_KEY_ID') ?? ''
const CLOUDFLARE_TURN_KEY_API_TOKEN = Deno.env.get('CLOUDFLARE_TURN_KEY_API_TOKEN') ?? ''
// 24h -- comfortably longer than any single call, short enough to cap the
// blast radius if a credential pair ever leaked out of the client.
const TTL_SECONDS = 86400

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (!CLOUDFLARE_TURN_KEY_ID || !CLOUDFLARE_TURN_KEY_API_TOKEN) {
    console.error('cloudflare-turn-credentials: CLOUDFLARE_TURN_KEY_ID/CLOUDFLARE_TURN_KEY_API_TOKEN not set')
    return new Response(JSON.stringify({ error: 'TURN not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${CLOUDFLARE_TURN_KEY_ID}/credentials/generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_TURN_KEY_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: TTL_SECONDS }),
      },
    )
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`cloudflare-turn-credentials: Cloudflare API rejected the request: ${res.status} ${body}`)
      return new Response(JSON.stringify({ error: 'failed to generate TURN credentials' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    // Cloudflare's response is already { iceServers: { urls, username,
    // credential } } -- passed through as-is, the client wraps it into an
    // RTCIceServer[] itself.
    const json = await res.json()
    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('cloudflare-turn-credentials failed:', err)
    return new Response(JSON.stringify({ error: 'internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
