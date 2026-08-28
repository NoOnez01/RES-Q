// Supabase Edge Function: LINE Official Account webhook for reporting an
// emergency straight from a LINE chat, no app install/login needed.
//
// Deploy: supabase functions deploy line-webhook --no-verify-jwt
//   (--no-verify-jwt because LINE calls this with its own signature, not a
//   Supabase JWT -- see verifySignature below for the real auth check)
// Secrets (supabase secrets set ...):
//   LINE_CHANNEL_SECRET        -- from the LINE Developers console
//   LINE_CHANNEL_ACCESS_TOKEN  -- from the LINE Developers console
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the Edge Functions runtime -- no need to set those yourself.
// Webhook URL to paste into the LINE Developers console:
//   https://<project-ref>.supabase.co/functions/v1/line-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET') ?? ''
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ---------------------------------------------------------------------
// Case shape -- deliberately mirrors src/lib/types.ts's EmergencyCase and
// src/lib/store.ts's makeNewCase/pushStatus/toRow so a LINE-reported case
// looks, to every other part of the app, exactly like one filed through
// the web app. This function is the only other place that ever creates a
// case row, so keep it in sync if that shape changes.
// ---------------------------------------------------------------------

type CaseStatus =
  | 'contacted'
  | 'photos-taken'
  | 'called-1669'
  | 'received'
  | 'finding-rescue'
  | 'rescue-assigned'
  | 'rescue-en-route'
  | 'rescue-arrived'
  | 'assisted'
  | 'transporting'
  | 'hospital-arrived'
  | 'hospital-received'
  | 'completed'

const STATUS_META: Record<CaseStatus, { label: string; org: string }> = {
  contacted: { label: 'ติดต่อเจ้าหน้าที่แล้ว', org: 'ประชาชน' },
  'photos-taken': { label: 'ถ่ายรูปจุดเกิดเหตุแล้ว', org: 'ประชาชน' },
  'called-1669': { label: 'ติดต่อ 1669 แล้ว', org: 'ประชาชน' },
  received: { label: 'รับแจ้งเหตุแล้ว', org: 'ศูนย์ 1669' },
  'finding-rescue': { label: 'กำลังค้นหาหน่วยกู้ชีพ', org: 'ศูนย์ 1669' },
  'rescue-assigned': { label: 'มอบหมายหน่วยกู้ชีพแล้ว', org: 'ศูนย์ 1669' },
  'rescue-en-route': { label: 'หน่วยกู้ชีพกำลังเดินทาง', org: 'หน่วยกู้ชีพ' },
  'rescue-arrived': { label: 'ถึงจุดเกิดเหตุแล้ว', org: 'หน่วยกู้ชีพ' },
  assisted: { label: 'เข้าช่วยเหลือแล้ว', org: 'หน่วยกู้ชีพ' },
  transporting: { label: 'กำลังนำส่งโรงพยาบาล', org: 'หน่วยกู้ชีพ' },
  'hospital-arrived': { label: 'ถึงโรงพยาบาลแล้ว', org: 'หน่วยกู้ชีพ' },
  'hospital-received': { label: 'โรงพยาบาลรับผู้ป่วยแล้ว', org: 'โรงพยาบาล' },
  completed: { label: 'เสร็จสิ้น', org: 'ระบบ' },
}

// deno-lint-ignore no-explicit-any
type EmergencyCase = Record<string, any>

let idCounter = 0
function uid(prefix = 'id'): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

function formatCaseNumber(seq: number): string {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `RQ-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}-${suffix}`
}

function pushStatus(c: EmergencyCase, status: CaseStatus, note?: string): EmergencyCase {
  const meta = STATUS_META[status]
  const alreadyHere = c.status === status
  const timeline = alreadyHere
    ? c.timeline
    : [...c.timeline, { id: uid('tl'), status, label: meta.label, org: meta.org, note, timestamp: Date.now() }]
  return { ...c, status, timeline, updatedAt: Date.now() }
}

function makeNewCase(): EmergencyCase {
  const now = Date.now()
  const base: EmergencyCase = {
    id: uid('case'),
    caseNumber: formatCaseNumber(Math.floor(Math.random() * 900) + 100),
    status: 'contacted',
    createdAt: now,
    updatedAt: now,
    location: null,
    photos: [],
    audioRecordings: [],
    callStatus: 'idle',
    callDurationSec: 0,
    incidentDetails: null,
    assessment: null,
    patientInfo: null,
    patientUpdates: [],
    relativeContacts: [],
    assignedRescueTeam: null,
    selectedHospital: null,
    rescueEnRoutePct: 0,
    rescueRejectedAt: null,
    timeline: [],
  }
  return pushStatus(base, 'contacted')
}

/** Mirrors supabaseCaseSync.ts's toRow() -- the explicit columns are just
 * for SQL querying; `data` is what every client actually reads back. */
function toRow(c: EmergencyCase, lineUserId: string) {
  return {
    case_id: c.caseNumber,
    status: c.status,
    incident_type: c.incidentDetails?.incidentType ?? null,
    location: c.incidentDetails?.location ?? c.location?.address ?? null,
    patient_count: c.incidentDetails?.patientCount ?? null,
    conscious: c.incidentDetails?.conscious ?? null,
    callback_phone: c.incidentDetails?.callbackPhone ?? null,
    notes: c.incidentDetails?.notes ?? null,
    reporter_name: c.reporterName ?? null,
    reporter_phone: c.reporterPhone ?? null,
    reporter_user_id: null,
    reporter_line_user_id: lineUserId,
    severity: c.assessment?.severity ?? null,
    injury_description: c.assessment?.injuryDescription ?? null,
    assessed_at: c.assessment ? new Date(c.assessment.assessedAt).toISOString() : null,
    rescue_team_name: c.assignedRescueTeam?.name ?? null,
    rescue_team_unit_code: c.assignedRescueTeam?.unitCode ?? null,
    rescue_team_phone: c.assignedRescueTeam?.phone ?? null,
    rescue_en_route_pct: c.rescueEnRoutePct ?? null,
    rescue_team_id: c.assignedRescueTeam?.id ?? null,
    supporting_rescue_team_id: c.supportingRescueTeam?.id ?? null,
    hospital_id: c.selectedHospital?.id ?? null,
    patient_name: c.patientInfo?.name ?? null,
    patient_age: c.patientInfo?.age ?? null,
    patient_gender: c.patientInfo?.gender ?? null,
    patient_vitals: c.patientInfo?.vitals ?? null,
    first_aid: c.patientInfo?.firstAid ?? null,
    selected_hospital_name: c.selectedHospital?.name ?? null,
    selected_hospital_phone: c.selectedHospital?.phone ?? null,
    timeline: c.timeline,
    created_at: new Date(c.createdAt).toISOString(),
    updated_at: new Date(c.updatedAt).toISOString(),
    data: c,
  }
}

async function saveCase(c: EmergencyCase, lineUserId: string) {
  const { error } = await supabase.from('cases').upsert(toRow(c, lineUserId), { onConflict: 'case_id' })
  if (error) throw new Error(`case upsert failed: ${error.message}`)
}

// ---------------------------------------------------------------------
// Conversation state -- one row per LINE user, remembers which case is
// being built and what step they're on between messages.
// ---------------------------------------------------------------------

interface Session {
  line_user_id: string
  case_id: string
  step: 'awaiting_photo' | 'awaiting_location' | 'awaiting_phone' | 'awaiting_consciousness'
  case_data: EmergencyCase
}

async function getSession(lineUserId: string): Promise<Session | null> {
  const { data } = await supabase.from('line_bot_sessions').select('*').eq('line_user_id', lineUserId).maybeSingle()
  return data as Session | null
}

async function saveSession(session: Session) {
  const { error } = await supabase
    .from('line_bot_sessions')
    .upsert({ ...session, updated_at: new Date().toISOString() })
  if (error) throw new Error(`session upsert failed: ${error.message}`)
}

async function clearSession(lineUserId: string) {
  await supabase.from('line_bot_sessions').delete().eq('line_user_id', lineUserId)
}

// ---------------------------------------------------------------------
// LINE Messaging API
// ---------------------------------------------------------------------

async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature || !LINE_CHANNEL_SECRET) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(LINE_CHANNEL_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)))
  return expected === signature
}

async function replyMessage(replyToken: string, text: string) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  })
}

async function downloadLineContent(messageId: string): Promise<Blob> {
  const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
  })
  if (!res.ok) throw new Error(`LINE content download failed: ${res.status}`)
  return res.blob()
}

async function uploadCasePhoto(caseNumber: string, blob: Blob): Promise<string> {
  const path = `${caseNumber}/photos/${uid('photo')}.jpg`
  const { error } = await supabase.storage.from('case-media').upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw new Error(`photo upload failed: ${error.message}`)
  const { data } = supabase.storage.from('case-media').getPublicUrl(path)
  await supabase.from('case_media').insert({ case_id: caseNumber, media_type: 'photo', file_path: path, url: data.publicUrl })
  return data.publicUrl
}

// ---------------------------------------------------------------------
// Conversation flow
// ---------------------------------------------------------------------

const CANCEL_WORDS = ['ยกเลิก', 'cancel']
const DONE_WORDS = ['เสร็จ', 'done', 'ต่อไป']

interface LineEvent {
  type: string
  replyToken: string
  source: { userId: string }
  message?: {
    type: string
    text?: string
    id?: string
    latitude?: number
    longitude?: number
    address?: string
  }
}

async function handleEvent(event: LineEvent) {
  if (event.type === 'follow') {
    await replyMessage(
      event.replyToken,
      'สวัสดีค่ะ นี่คือระบบแจ้งเหตุฉุกเฉิน ResQ ผ่าน LINE\n\nพิมพ์ข้อความอะไรก็ได้เพื่อเริ่มแจ้งเหตุฉุกเฉิน ระบบจะพาทำทีละขั้นตอน',
    )
    return
  }
  if (event.type !== 'message') return

  const lineUserId = event.source.userId
  const message = event.message
  if (!message) return

  const text = message.text?.trim() ?? ''
  if (CANCEL_WORDS.includes(text.toLowerCase())) {
    await clearSession(lineUserId)
    await replyMessage(event.replyToken, 'ยกเลิกการแจ้งเหตุแล้ว พิมพ์ข้อความใดๆ เพื่อเริ่มใหม่ได้ทุกเมื่อ')
    return
  }

  let session = await getSession(lineUserId)

  // No conversation in progress -- any message starts a brand new report,
  // since this OA is dedicated to emergency reporting, not general chat.
  if (!session) {
    const c = makeNewCase()
    await saveCase(c, lineUserId)
    session = { line_user_id: lineUserId, case_id: c.caseNumber, step: 'awaiting_photo', case_data: c }
    await saveSession(session)
    await replyMessage(
      event.replyToken,
      `รับแจ้งเหตุแล้ว หมายเลขเคส: ${c.caseNumber}\n\nกรุณาส่งรูปภาพจุดเกิดเหตุ (ส่งได้หลายรูป พิมพ์ "เสร็จ" เมื่อส่งครบแล้ว)\n\nพิมพ์ "ยกเลิก" ได้ทุกเมื่อ`,
    )
    return
  }

  const c = session.case_data

  if (session.step === 'awaiting_photo') {
    if (message.type === 'image' && message.id) {
      try {
        const blob = await downloadLineContent(message.id)
        const url = await uploadCasePhoto(c.caseNumber, blob)
        c.photos.push({ id: uid('photo'), dataUrl: url, takenAt: Date.now() })
        c.updatedAt = Date.now()
        await saveCase(c, lineUserId)
        session.case_data = c
        await saveSession(session)
        await replyMessage(event.replyToken, `รับรูปภาพแล้ว (${c.photos.length} รูป) ส่งเพิ่มได้ หรือพิมพ์ "เสร็จ" เพื่อไปขั้นตอนถัดไป`)
      } catch {
        await replyMessage(event.replyToken, 'รับรูปภาพไม่สำเร็จ กรุณาลองส่งใหม่อีกครั้ง')
      }
      return
    }
    if (DONE_WORDS.includes(text.toLowerCase()) || (text && c.photos.length > 0)) {
      const updated = pushStatus(c, 'photos-taken')
      await saveCase(updated, lineUserId)
      session.step = 'awaiting_location'
      session.case_data = updated
      await saveSession(session)
      await replyMessage(
        event.replyToken,
        'กรุณาแชร์ตำแหน่งที่เกิดเหตุ (กดปุ่ม + เลือก "ตำแหน่งที่ตั้ง") หรือพิมพ์ที่อยู่ก็ได้',
      )
      return
    }
    await replyMessage(event.replyToken, 'กรุณาส่งรูปภาพจุดเกิดเหตุอย่างน้อย 1 รูป หรือพิมพ์ "เสร็จ" เพื่อข้ามขั้นตอนนี้')
    return
  }

  if (session.step === 'awaiting_location') {
    if (message.type === 'location') {
      c.location = {
        lat: message.latitude,
        lng: message.longitude,
        address: message.address ?? `${message.latitude}, ${message.longitude}`,
      }
    } else if (text) {
      c.location = { lat: 18.7883, lng: 98.9853, address: text }
    } else {
      await replyMessage(event.replyToken, 'กรุณาแชร์ตำแหน่ง หรือพิมพ์ที่อยู่จุดเกิดเหตุ')
      return
    }
    c.updatedAt = Date.now()
    await saveCase(c, lineUserId)
    session.step = 'awaiting_phone'
    session.case_data = c
    await saveSession(session)
    await replyMessage(event.replyToken, 'กรุณาระบุเบอร์โทรศัพท์ติดต่อกลับ')
    return
  }

  if (session.step === 'awaiting_phone') {
    const digits = text.replace(/\D/g, '')
    if (digits.length < 9 || digits.length > 10) {
      await replyMessage(event.replyToken, 'เบอร์โทรศัพท์ไม่ถูกต้อง กรุณาระบุอีกครั้ง')
      return
    }
    c.reporterPhone = text
    c.updatedAt = Date.now()
    await saveCase(c, lineUserId)
    session.step = 'awaiting_consciousness'
    session.case_data = c
    await saveSession(session)
    await replyMessage(event.replyToken, 'ผู้ป่วยยังมีสติหรือไม่?\n1 = มีสติ\n2 = ไม่มีสติ\n3 = ไม่แน่ใจ')
    return
  }

  if (session.step === 'awaiting_consciousness') {
    const map: Record<string, string> = { '1': 'conscious', '2': 'unconscious', '3': 'unknown' }
    const consciousness = map[text]
    if (!consciousness) {
      await replyMessage(event.replyToken, 'กรุณาพิมพ์ 1, 2 หรือ 3')
      return
    }
    c.reporterConsciousness = consciousness
    const finalCase = pushStatus({ ...c, location: c.location ?? { lat: 18.7883, lng: 98.9853, address: 'ไม่ระบุตำแหน่ง' } }, 'received')
    await saveCase(finalCase, lineUserId)
    await clearSession(lineUserId)
    await replyMessage(
      event.replyToken,
      `แจ้งเหตุสำเร็จ! หมายเลขเคส: ${finalCase.caseNumber}\n\nเจ้าหน้าที่ศูนย์ 1669 จะติดต่อกลับที่เบอร์ที่ท่านแจ้งไว้โดยเร็วที่สุด`,
    )
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok', { status: 200 })

  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature')
  if (!(await verifySignature(rawBody, signature))) {
    return new Response('invalid signature', { status: 401 })
  }

  const body = JSON.parse(rawBody) as { events: LineEvent[] }
  for (const event of body.events ?? []) {
    try {
      await handleEvent(event)
    } catch (err) {
      console.error('line-webhook event failed:', err)
    }
  }

  return new Response('ok', { status: 200 })
})
