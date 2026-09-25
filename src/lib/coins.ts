import { supabase } from './supabase'
import { registerTranslations } from './i18n'

registerTranslations({
  'ไม่พบเซสชันของคุณ กรุณาลองใหม่อีกครั้ง': 'Your session was not found. Please try again.',
  เหรียญของคุณไม่พอ: "You don't have enough coins",
  จำนวนเหรียญไม่ถูกต้อง: 'Invalid number of coins',
  ไม่พบมูลนิธินี้แล้ว: 'This foundation is no longer available',
  ไม่พบของรางวัลนี้แล้ว: 'This reward is no longer available',
  ของรางวัลนี้หมดแล้ว: 'This reward is out of stock',
  กรุณากรอกชื่อและเบอร์โทรศัพท์: 'Please enter a name and phone number',
  ไม่มีสิทธิ์ทำรายการนี้: "You don't have permission to do this",
  รายการนี้ถูกดำเนินการไปแล้ว: 'This request has already been handled',
  'ทำรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง': 'Something went wrong. Please try again.',
})

// Data access for the coin system -- see supabase-coin-system.sql. Every
// balance change goes through a database function (coins can't be written
// from the client); this module only reads, calls those functions, and does
// the admin catalog edits RLS allows.

export interface CoinSettings {
  coinsPerCase: number
}

export interface Foundation {
  id: string
  name: string
  description: string | null
  active: boolean
}

export interface Reward {
  id: string
  name: string
  description: string | null
  cost: number
  /** null = unlimited */
  stock: number | null
  active: boolean
}

export type LedgerKind = 'case_reward' | 'redeem' | 'donate' | 'refund'

export interface LedgerEntry {
  id: number
  amount: number
  kind: LedgerKind
  caseId: string | null
  rewardId: string | null
  foundationId: string | null
  createdAt: string
}

export type RedemptionStatus = 'pending' | 'fulfilled' | 'cancelled'

export interface Redemption {
  id: number
  userId: string
  rewardName: string
  cost: number
  contactName: string
  contactPhone: string
  status: RedemptionStatus
  createdAt: string
}

export interface FoundationInput {
  name: string
  description: string
}

export interface RewardInput {
  name: string
  description: string
  cost: number
  stock: number | null
}

function client() {
  if (!supabase) throw new Error('Supabase not configured')
  return supabase
}

/** The functions raise a short code as the error message; these are what a
 * citizen/admin should read instead. */
const ERROR_MESSAGES: Record<string, string> = {
  not_signed_in: 'ไม่พบเซสชันของคุณ กรุณาลองใหม่อีกครั้ง',
  insufficient_coins: 'เหรียญของคุณไม่พอ',
  invalid_amount: 'จำนวนเหรียญไม่ถูกต้อง',
  foundation_not_found: 'ไม่พบมูลนิธินี้แล้ว',
  reward_not_found: 'ไม่พบของรางวัลนี้แล้ว',
  out_of_stock: 'ของรางวัลนี้หมดแล้ว',
  contact_required: 'กรุณากรอกชื่อและเบอร์โทรศัพท์',
  forbidden: 'ไม่มีสิทธิ์ทำรายการนี้',
  already_closed: 'รายการนี้ถูกดำเนินการไปแล้ว',
}

/** Thai message (a translation key -- pass it through t()) for a failed
 * coin call: known codes get their own message, anything else a generic one. */
export function coinErrorMessage(err: unknown): string {
  const message = (err as { message?: string } | null)?.message ?? ''
  return ERROR_MESSAGES[message] ?? 'ทำรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
}

function check<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error
  return data
}

export async function fetchCoinSettings(): Promise<CoinSettings> {
  const row = check(await client().from('coin_settings').select('coins_per_case').maybeSingle())
  return { coinsPerCase: row?.coins_per_case ?? 0 }
}

export async function updateCoinsPerCase(coinsPerCase: number): Promise<void> {
  check(await client().from('coin_settings').update({ coins_per_case: coinsPerCase, updated_at: new Date().toISOString() }).eq('id', true))
}

interface FoundationRow {
  id: string
  name: string
  description: string | null
  active: boolean
}

/** Active only for citizens; RLS also returns removed ones to an admin, so
 * callers that only want the live list filter on `active`. */
export async function fetchFoundations(): Promise<Foundation[]> {
  const rows = check(await client().from('foundations').select('id, name, description, active').order('created_at')) as FoundationRow[]
  return rows.map((r) => ({ id: r.id, name: r.name, description: r.description, active: r.active }))
}

export async function createFoundation(input: FoundationInput): Promise<void> {
  check(await client().from('foundations').insert({ name: input.name.trim(), description: input.description.trim() || null }))
}

export async function updateFoundation(id: string, input: FoundationInput): Promise<void> {
  check(await client().from('foundations').update({ name: input.name.trim(), description: input.description.trim() || null }).eq('id', id))
}

/** Deactivates rather than deletes -- past donations still point at it. */
export async function removeFoundation(id: string): Promise<void> {
  check(await client().from('foundations').update({ active: false }).eq('id', id))
}

export async function fetchFoundationTotals(): Promise<Record<string, number>> {
  const rows = check(await client().rpc('foundation_donation_totals')) as { foundation_id: string; total: number }[]
  return Object.fromEntries((rows ?? []).map((r) => [r.foundation_id, r.total]))
}

interface RewardRow {
  id: string
  name: string
  description: string | null
  cost: number
  stock: number | null
  active: boolean
}

export async function fetchRewards(): Promise<Reward[]> {
  const rows = check(await client().from('rewards').select('id, name, description, cost, stock, active').order('cost')) as RewardRow[]
  return rows.map((r) => ({ id: r.id, name: r.name, description: r.description, cost: r.cost, stock: r.stock, active: r.active }))
}

function rewardRow(input: RewardInput) {
  return { name: input.name.trim(), description: input.description.trim() || null, cost: input.cost, stock: input.stock }
}

export async function createReward(input: RewardInput): Promise<void> {
  check(await client().from('rewards').insert(rewardRow(input)))
}

export async function updateReward(id: string, input: RewardInput): Promise<void> {
  check(await client().from('rewards').update(rewardRow(input)).eq('id', id))
}

export async function removeReward(id: string): Promise<void> {
  check(await client().from('rewards').update({ active: false }).eq('id', id))
}

export async function fetchMyBalance(): Promise<number> {
  return (check(await client().rpc('coin_balance')) as number | null) ?? 0
}

interface LedgerRow {
  id: number
  amount: number
  kind: LedgerKind
  case_id: string | null
  reward_id: string | null
  foundation_id: string | null
  created_at: string
}

/** RLS scopes this to the signed-in user's own rows. */
export async function fetchMyLedger(): Promise<LedgerEntry[]> {
  const rows = check(
    await client()
      .from('coin_ledger')
      .select('id, amount, kind, case_id, reward_id, foundation_id, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ) as LedgerRow[]
  return rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    kind: r.kind,
    caseId: r.case_id,
    rewardId: r.reward_id,
    foundationId: r.foundation_id,
    createdAt: r.created_at,
  }))
}

/** Coins the signed-in reporter earned on one case, or null if none (yet). */
export async function fetchCaseReward(caseNumber: string): Promise<number | null> {
  const row = check(
    await client().from('coin_ledger').select('amount').eq('kind', 'case_reward').eq('case_id', caseNumber).maybeSingle(),
  ) as { amount: number } | null
  return row?.amount ?? null
}

interface RedemptionRow {
  id: number
  user_id: string
  reward_name: string
  cost: number
  contact_name: string
  contact_phone: string
  status: RedemptionStatus
  created_at: string
}

/** A citizen's own redemptions, or every one for an admin (RLS decides). */
export async function fetchRedemptions(): Promise<Redemption[]> {
  const rows = check(
    await client()
      .from('reward_redemptions')
      .select('id, user_id, reward_name, cost, contact_name, contact_phone, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
  ) as RedemptionRow[]
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    rewardName: r.reward_name,
    cost: r.cost,
    contactName: r.contact_name,
    contactPhone: r.contact_phone,
    status: r.status,
    createdAt: r.created_at,
  }))
}

/** Returns the new balance. */
export async function redeemReward(rewardId: string, contactName: string, contactPhone: string): Promise<number> {
  return check(
    await client().rpc('redeem_reward', { p_reward_id: rewardId, p_contact_name: contactName, p_contact_phone: contactPhone }),
  ) as number
}

/** Returns the new balance. */
export async function donateCoins(foundationId: string, amount: number): Promise<number> {
  return check(await client().rpc('donate_coins', { p_foundation_id: foundationId, p_amount: amount })) as number
}

export async function setRedemptionStatus(redemptionId: number, status: 'fulfilled' | 'cancelled'): Promise<void> {
  check(await client().rpc('set_redemption_status', { p_redemption_id: redemptionId, p_status: status }))
}
