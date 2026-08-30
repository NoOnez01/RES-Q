// Supabase Edge Function: pushes a LINE message whenever a case's status
// changes, for whichever reporter can actually be reached on LINE --
// either they reported through the LINE OA bot directly (reporter_line_
// user_id is already set on the row by line-webhook), or they're logged
// into the web app via LINE Login (see completeLineLogin/ensureSocialProfile
// in src/lib/auth.ts), in which case their LINE user id lives in
// auth.users.raw_user_meta_data->>'line_user_id' instead.
//
// Triggered by a Postgres trigger on `cases` that calls this function via
// pg_net -- see supabase-line-push-trigger.sql for the trigger + the
// one-time `alter database ... set` config it needs. That trigger sends the
// project's own service_role key as a Bearer token, which satisfies this
// function's normal JWT verification (kept ON, unlike line-webhook/
// line-login-exchange, which are called by outside parties with no
// Supabase session at all) -- so deploy this one WITHOUT --no-verify-jwt.
// The payload shape it expects matches Supabase's Database Webhooks format
// even though it isn't triggered by one on this project (that dashboard's
// Triggers UI has no direct "call an Edge Function" action type) --
// {type, table, record, old_record} -- so it'd also work unchanged if a
// future project sets it up via a real Database Webhook instead.
//
// Deploy: supabase functions deploy line-push-notify
// Secrets: reuses LINE_CHANNEL_ACCESS_TOKEN, already set for line-webhook
// (must be the same Messaging API channel, since push messages only reach
// users who have added that channel's OA as a friend).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildFlexCard, flexMessage } from '../_shared/lineFlex.ts'
import { STATUS_META } from '../_shared/caseStatus.ts'
import type { CaseStatus } from '../_shared/caseStatus.ts'

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const WEB_APP_BASE_URL = 'https://noonez01.github.io/RES-Q'
const BRAND_BLUE = '#0B6EBD'
const BRAND_SUCCESS = '#12B76A'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// The reporter is already watching these happen live on their own screen
// while filing the report -- notifications start once 1669 actually
// receives the case, not before.
const PRE_RECEIVED_STATUSES = new Set(['contacted', 'photos-taken', 'called-1669'])

interface CaseRow {
  case_id: string
  status: CaseStatus
  reporter_user_id: string | null
  reporter_line_user_id: string | null
  /** Full EmergencyCase blob -- see supabase-realtime-sync.sql. */
  data: Record<string, unknown> | null
}

interface DatabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: CaseRow
  old_record: CaseRow | null
}

async function pushMessages(to: string, messages: unknown[]) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify({ to, messages }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // Most common non-bug cause: this LINE user has never added the OA as
    // a friend (or unblocked/blocked it) -- push only works for followers,
    // unlike a reply. Logged, not thrown, since there's no caller to retry.
    console.error(`LINE push API rejected the message: ${res.status} ${body}`)
  }
}

async function resolveLineUserId(row: CaseRow): Promise<string | null> {
  if (row.reporter_line_user_id) return row.reporter_line_user_id
  if (!row.reporter_user_id) return null
  const { data, error } = await supabase.auth.admin.getUserById(row.reporter_user_id)
  if (error || !data.user) return null
  const lineId = data.user.user_metadata?.line_user_id
  return typeof lineId === 'string' ? lineId : null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok', { status: 200 })

  try {
    const payload = (await req.json()) as DatabaseWebhookPayload
    if (payload.table !== 'cases' || payload.type !== 'UPDATE') {
      return new Response('ignored', { status: 200 })
    }
    const { record, old_record } = payload
    if (!old_record || record.status === old_record.status) {
      return new Response('no status change', { status: 200 })
    }
    if (PRE_RECEIVED_STATUSES.has(record.status)) {
      return new Response('pre-received, skipped', { status: 200 })
    }
    // line-webhook already sends its own "แจ้งเหตุสำเร็จ" Flex card the
    // moment a bot-reported case reaches 'received' -- skip so that case
    // doesn't get double-notified. A web-reported case has no
    // reporter_line_user_id, so it still gets its first notification here.
    if (record.status === 'received' && record.reporter_line_user_id) {
      return new Response('already notified by line-webhook', { status: 200 })
    }

    const lineUserId = await resolveLineUserId(record)
    if (!lineUserId) return new Response('no LINE identity to notify', { status: 200 })

    const caseData = record.data ?? {}
    const caseNumber = (caseData.caseNumber as string | undefined) ?? record.case_id
    const caseId = (caseData.id as string | undefined) ?? record.case_id
    const meta = STATUS_META[record.status] ?? { label: record.status, org: '' }
    const trackingUrl = `${WEB_APP_BASE_URL}/public/case/${caseId}`
    const isDone = record.status === 'completed'
    // The very first notification a web-reported case gets (this status is
    // never reached twice per case) -- frame it like line-webhook's own
    // "แจ้งเหตุสำเร็จ" card instead of a generic status update, since for
    // this reporter it *is* the "you've successfully reported" moment.
    const isFirstNotice = record.status === 'received'

    const bubble = buildFlexCard({
      headerText: isFirstNotice ? 'แจ้งเหตุสำเร็จ' : isDone ? 'เคสเสร็จสิ้น' : 'อัปเดตสถานะเคส',
      headerColor: isFirstNotice || isDone ? BRAND_SUCCESS : BRAND_BLUE,
      title: isFirstNotice ? `หมายเลขเคส ${caseNumber}` : meta.label,
      bodyLines: isFirstNotice
        ? [
            'คุณได้แจ้งเหตุฉุกเฉินเรียบร้อยแล้ว เจ้าหน้าที่ศูนย์ 1669 จะติดต่อกลับที่เบอร์ที่ท่านแจ้งไว้โดยเร็วที่สุด',
            'กดปุ่มด้านล่างเพื่อติดตามสถานะเคสนี้แบบเรียลไทม์ ระบบจะแจ้งความคืบหน้าที่นี่ให้ด้วยทุกครั้งที่มีการอัปเดต',
          ]
        : [
            `เคส ${caseNumber}`,
            isDone ? 'ขอบคุณที่ใช้บริการ ResQ' : 'กดปุ่มด้านล่างเพื่อดูรายละเอียดและตำแหน่งแบบเรียลไทม์',
          ],
      buttons: [{ label: isFirstNotice ? 'ติดตามสถานะเคส' : 'ดูรายละเอียดเคส', uri: trackingUrl }],
    })
    await pushMessages(lineUserId, [flexMessage(`เคส ${caseNumber}: ${meta.label}`, bubble)])
    return new Response('sent', { status: 200 })
  } catch (err) {
    console.error('line-push-notify failed:', err)
    return new Response('error', { status: 500 })
  }
})
