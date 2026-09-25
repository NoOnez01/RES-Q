import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { ArrowDownLeft, ArrowUpRight, Coins as CoinsIcon, Gift, HandHeart, History, RotateCcw } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { EmptyState, ErrorState, LoadingState } from '@/components/States'
import { useStore } from '@/lib/store'
import { supabaseEnabled } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { formatDateTime } from '@/lib/utils'
import {
  coinErrorMessage,
  donateCoins,
  fetchCoinSettings,
  fetchFoundationTotals,
  fetchFoundations,
  fetchMyBalance,
  fetchMyLedger,
  fetchRedemptions,
  fetchRewards,
  redeemReward,
  type Foundation,
  type LedgerEntry,
  type Redemption,
  type RedemptionStatus,
  type Reward,
} from '@/lib/coins'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  เหรียญของฉัน: 'My coins',
  'ระบบเหรียญต้องเชื่อมต่อฐานข้อมูล': 'The coin system needs a database connection',
  'ได้รับ {n} เหรียญ ทุกครั้งที่เคสที่คุณแจ้งเสร็จสิ้น': 'Earn {n} coins every time a case you reported is completed',
  'คุณยังไม่ได้เข้าสู่ระบบ เหรียญจะเก็บไว้กับอุปกรณ์นี้': "You're not logged in — your coins are kept on this device",
  แลกของรางวัล: 'Rewards',
  บริจาค: 'Donate',
  ประวัติ: 'History',
  ยังไม่มีของรางวัล: 'No rewards yet',
  'ของรางวัลจะแสดงที่นี่เมื่อผู้ดูแลระบบเพิ่มเข้ามา': 'Rewards will appear here once an admin adds them',
  'เหลือ {n} ชิ้น': '{n} left',
  หมดแล้ว: 'Out of stock',
  แลก: 'Redeem',
  'ขาดอีก {n} เหรียญ': '{n} more coins needed',
  ยังไม่มีมูลนิธิที่ร่วมโครงการ: 'No partner foundations yet',
  'มูลนิธิที่ร่วมโครงการจะแสดงที่นี่': 'Partner foundations will appear here',
  'ได้รับบริจาคแล้ว {n} เหรียญ': '{n} coins donated so far',
  ยังไม่มีประวัติเหรียญ: 'No coin history yet',
  'คุณจะได้รับเหรียญเมื่อเคสที่คุณแจ้งเสร็จสิ้น': "You'll earn coins when a case you reported is completed",
  'ได้รับจากเคส {caseId}': 'Earned on case {caseId}',
  'แลก {name}': 'Redeemed {name}',
  'บริจาคให้ {name}': 'Donated to {name}',
  'คืนเหรียญ {name}': 'Refund for {name}',
  ของรางวัล: 'Reward',
  มูลนิธิ: 'Foundation',
  คำขอแลกของรางวัล: 'Reward requests',
  รอดำเนินการ: 'Pending',
  ส่งแล้ว: 'Delivered',
  'ยกเลิก (คืนเหรียญแล้ว)': 'Cancelled (coins refunded)',
  'ใช้ {cost} เหรียญ เจ้าหน้าที่จะติดต่อกลับเพื่อจัดส่งของรางวัล': 'Uses {cost} coins. Staff will contact you to deliver the reward.',
  ชื่อผู้รับ: 'Recipient name',
  เบอร์โทรศัพท์: 'Phone number',
  เบอร์โทรศัพท์ไม่ถูกต้อง: 'Invalid phone number',
  กรุณากรอกชื่อผู้รับ: 'Please enter the recipient name',
  ยืนยันแลก: 'Confirm',
  'แลกของรางวัลแล้ว เจ้าหน้าที่จะติดต่อกลับ': 'Reward redeemed — staff will contact you',
  'คุณมี {n} เหรียญ': 'You have {n} coins',
  จำนวนเหรียญ: 'Number of coins',
  ยืนยันบริจาค: 'Confirm donation',
  ทั้งหมด: 'All',
  'ขอบคุณที่ร่วมบริจาค {n} เหรียญ': 'Thank you for donating {n} coins',
})

type Tab = 'rewards' | 'donate' | 'history'

interface WalletData {
  balance: number
  coinsPerCase: number
  rewards: Reward[]
  foundations: Foundation[]
  totals: Record<string, number>
  ledger: LedgerEntry[]
  redemptions: Redemption[]
}

const REDEMPTION_STATUS: Record<RedemptionStatus, { label: string; className: string }> = {
  pending: { label: 'รอดำเนินการ', className: 'bg-warning/10 text-warning' },
  fulfilled: { label: 'ส่งแล้ว', className: 'bg-success/10 text-success' },
  cancelled: { label: 'ยกเลิก (คืนเหรียญแล้ว)', className: 'bg-bg text-muted' },
}

function validPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 9 && digits.length <= 10
}

function CoinAmount({ value, className }: { value: number; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 font-bold tabular-nums', className)}>
      <CoinsIcon className="size-4 text-warning" aria-hidden="true" />
      {value.toLocaleString()}
    </span>
  )
}

export default function Coins() {
  const currentUser = useStore((s) => s.currentUser)
  const t = useT()
  const [tab, setTab] = useState<Tab>('rewards')
  const [data, setData] = useState<WalletData | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const [redeemTarget, setRedeemTarget] = useState<Reward | null>(null)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactError, setContactError] = useState<{ name?: string; phone?: string }>({})
  const [donateTarget, setDonateTarget] = useState<Foundation | null>(null)
  const [donateAmount, setDonateAmount] = useState('')
  const [donateError, setDonateError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  const loggedIn = !!currentUser && !currentUser.isAnonymous

  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      const [balance, settings, rewards, foundations, totals, ledger, redemptions] = await Promise.all([
        fetchMyBalance(),
        fetchCoinSettings(),
        fetchRewards(),
        fetchFoundations(),
        fetchFoundationTotals(),
        fetchMyLedger(),
        fetchRedemptions(),
      ])
      setData({ balance, coinsPerCase: settings.coinsPerCase, rewards, foundations, totals, ledger, redemptions })
    } catch (err) {
      console.error('Failed to load coins:', err)
      setLoadFailed(true)
    }
  }, [])

  // The balance is per session, so wait for the (usually anonymous) one.
  useEffect(() => {
    if (supabaseEnabled && currentUser) void load()
  }, [currentUser, load])

  // Removed rewards/foundations stay loaded so history can still name them.
  const rewardName = useMemo(() => new Map(data?.rewards.map((r) => [r.id, r.name])), [data])
  const foundationName = useMemo(() => new Map(data?.foundations.map((f) => [f.id, f.name])), [data])

  function openRedeem(reward: Reward) {
    setRedeemTarget(reward)
    setContactName(loggedIn ? (currentUser?.name ?? '') : '')
    setContactPhone(loggedIn ? (currentUser?.phone ?? '') : '')
    setContactError({})
  }

  async function confirmRedeem() {
    if (!redeemTarget) return
    const errors = {
      name: contactName.trim() ? undefined : t('กรุณากรอกชื่อผู้รับ'),
      phone: validPhone(contactPhone) ? undefined : t('เบอร์โทรศัพท์ไม่ถูกต้อง'),
    }
    setContactError(errors)
    if (errors.name || errors.phone) return
    setSubmitting(true)
    try {
      await redeemReward(redeemTarget.id, contactName.trim(), contactPhone.trim())
      toast({ title: t('แลกของรางวัลแล้ว เจ้าหน้าที่จะติดต่อกลับ'), tone: 'success' })
      setRedeemTarget(null)
      await load()
    } catch (err) {
      toast({ title: t(coinErrorMessage(err)), tone: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  function openDonate(foundation: Foundation) {
    setDonateTarget(foundation)
    setDonateAmount('')
    setDonateError(undefined)
  }

  async function confirmDonate() {
    if (!donateTarget || !data) return
    const amount = Number(donateAmount)
    if (!Number.isInteger(amount) || amount <= 0 || amount > data.balance) {
      setDonateError(amount > data.balance ? t('เหรียญของคุณไม่พอ') : t('จำนวนเหรียญไม่ถูกต้อง'))
      return
    }
    setSubmitting(true)
    try {
      await donateCoins(donateTarget.id, amount)
      toast({ title: t('ขอบคุณที่ร่วมบริจาค {n} เหรียญ', { n: amount.toLocaleString() }), tone: 'success' })
      setDonateTarget(null)
      await load()
    } catch (err) {
      toast({ title: t(coinErrorMessage(err)), tone: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  function ledgerLabel(entry: LedgerEntry): string {
    const reward = (entry.rewardId && rewardName.get(entry.rewardId)) || t('ของรางวัล')
    switch (entry.kind) {
      case 'case_reward':
        return t('ได้รับจากเคส {caseId}', { caseId: entry.caseId ?? '' })
      case 'redeem':
        return t('แลก {name}', { name: reward })
      case 'refund':
        return t('คืนเหรียญ {name}', { name: reward })
      case 'donate':
        return t('บริจาคให้ {name}', { name: (entry.foundationId && foundationName.get(entry.foundationId)) || t('มูลนิธิ') })
    }
  }

  let body: React.ReactNode
  if (!supabaseEnabled) {
    body = <EmptyState title={t('ระบบเหรียญต้องเชื่อมต่อฐานข้อมูล')} icon={<CoinsIcon className="size-6" />} />
  } else if (loadFailed) {
    body = <ErrorState onRetry={() => void load()} />
  } else if (!data) {
    body = <LoadingState />
  } else {
    const rewards = data.rewards.filter((r) => r.active)
    const foundations = data.foundations.filter((f) => f.active)
    body = (
      <div className="flex flex-col gap-5">
        <Card className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-muted">{t('เหรียญของฉัน')}</p>
          <p className="flex items-center gap-2.5 text-4xl font-extrabold tabular-nums text-ink">
            <CoinsIcon className="size-8 text-warning" aria-hidden="true" />
            {data.balance.toLocaleString()}
          </p>
          {data.coinsPerCase > 0 && (
            <p className="text-sm text-muted">{t('ได้รับ {n} เหรียญ ทุกครั้งที่เคสที่คุณแจ้งเสร็จสิ้น', { n: data.coinsPerCase })}</p>
          )}
          {!loggedIn && <p className="text-xs text-muted">{t('คุณยังไม่ได้เข้าสู่ระบบ เหรียญจะเก็บไว้กับอุปกรณ์นี้')}</p>}
        </Card>

        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'rewards', label: t('แลกของรางวัล'), icon: Gift },
            { value: 'donate', label: t('บริจาค'), icon: HandHeart },
            { value: 'history', label: t('ประวัติ'), icon: History },
          ]}
        />

        {tab === 'rewards' &&
          (rewards.length === 0 ? (
            <EmptyState title={t('ยังไม่มีของรางวัล')} description={t('ของรางวัลจะแสดงที่นี่เมื่อผู้ดูแลระบบเพิ่มเข้ามา')} icon={<Gift className="size-6" />} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rewards.map((reward) => {
                const soldOut = reward.stock !== null && reward.stock <= 0
                const short = reward.cost - data.balance
                return (
                  <Card key={reward.id} className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-ink">{reward.name}</p>
                      <CoinAmount value={reward.cost} className="shrink-0 text-ink" />
                    </div>
                    {reward.description && <p className="text-sm text-muted">{reward.description}</p>}
                    <div className="mt-auto flex items-center justify-between gap-3">
                      <span className={clsx('text-xs font-medium', soldOut ? 'text-emergency' : 'text-muted')}>
                        {soldOut ? t('หมดแล้ว') : reward.stock !== null ? t('เหลือ {n} ชิ้น', { n: reward.stock }) : ''}
                      </span>
                      {!soldOut && short > 0 ? (
                        <span className="text-xs font-medium text-muted">{t('ขาดอีก {n} เหรียญ', { n: short.toLocaleString() })}</span>
                      ) : (
                        <Button size="sm" disabled={soldOut} onClick={() => openRedeem(reward)}>
                          {t('แลก')}
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          ))}

        {tab === 'donate' &&
          (foundations.length === 0 ? (
            <EmptyState title={t('ยังไม่มีมูลนิธิที่ร่วมโครงการ')} description={t('มูลนิธิที่ร่วมโครงการจะแสดงที่นี่')} icon={<HandHeart className="size-6" />} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {foundations.map((foundation) => (
                <Card key={foundation.id} className="flex flex-col gap-3">
                  <p className="font-bold text-ink">{foundation.name}</p>
                  {foundation.description && <p className="text-sm text-muted">{foundation.description}</p>}
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span className="text-xs text-muted">
                      {t('ได้รับบริจาคแล้ว {n} เหรียญ', { n: (data.totals[foundation.id] ?? 0).toLocaleString() })}
                    </span>
                    <Button size="sm" variant="outline" disabled={data.balance <= 0} onClick={() => openDonate(foundation)}>
                      {t('บริจาค')}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ))}

        {tab === 'history' && (
          <div className="flex flex-col gap-5">
            {data.redemptions.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-bold text-ink">{t('คำขอแลกของรางวัล')}</h2>
                {data.redemptions.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{r.rewardName}</p>
                      <p className="text-xs text-muted">{formatDateTime(Date.parse(r.createdAt))}</p>
                    </div>
                    <span className={clsx('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', REDEMPTION_STATUS[r.status].className)}>
                      {t(REDEMPTION_STATUS[r.status].label)}
                    </span>
                  </div>
                ))}
              </section>
            )}
            {data.ledger.length === 0 ? (
              <EmptyState title={t('ยังไม่มีประวัติเหรียญ')} description={t('คุณจะได้รับเหรียญเมื่อเคสที่คุณแจ้งเสร็จสิ้น')} icon={<History className="size-6" />} />
            ) : (
              <section className="flex flex-col gap-2">
                {data.ledger.map((entry) => {
                  const Icon = entry.kind === 'refund' ? RotateCcw : entry.amount > 0 ? ArrowDownLeft : ArrowUpRight
                  return (
                    <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                      <span
                        className={clsx(
                          'flex size-9 shrink-0 items-center justify-center rounded-full',
                          entry.amount > 0 ? 'bg-success/10 text-success' : 'bg-skyblue-light text-primary',
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{ledgerLabel(entry)}</p>
                        <p className="text-xs text-muted">{formatDateTime(Date.parse(entry.createdAt))}</p>
                      </div>
                      <span className={clsx('shrink-0 text-sm font-bold tabular-nums', entry.amount > 0 ? 'text-success' : 'text-ink')}>
                        {entry.amount > 0 ? '+' : '−'}
                        {Math.abs(entry.amount).toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </section>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <AppShell variant="dashboard" title={t('เหรียญของฉัน')}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10">{body}</div>
      </div>

      <ConfirmationModal
        open={!!redeemTarget}
        title={t('แลก {name}', { name: redeemTarget?.name ?? '' })}
        message={t('ใช้ {cost} เหรียญ เจ้าหน้าที่จะติดต่อกลับเพื่อจัดส่งของรางวัล', { cost: (redeemTarget?.cost ?? 0).toLocaleString() })}
        confirmLabel={t('ยืนยันแลก')}
        confirmLoading={submitting}
        onConfirm={() => void confirmRedeem()}
        onCancel={() => setRedeemTarget(null)}
      >
        <Input
          label={t('ชื่อผู้รับ')}
          required
          value={contactName}
          error={contactError.name}
          onChange={(e) => setContactName(e.target.value)}
        />
        <Input
          label={t('เบอร์โทรศัพท์')}
          type="tel"
          inputMode="tel"
          required
          value={contactPhone}
          error={contactError.phone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
      </ConfirmationModal>

      <ConfirmationModal
        open={!!donateTarget}
        title={t('บริจาคให้ {name}', { name: donateTarget?.name ?? '' })}
        message={t('คุณมี {n} เหรียญ', { n: (data?.balance ?? 0).toLocaleString() })}
        confirmLabel={t('ยืนยันบริจาค')}
        confirmLoading={submitting}
        onConfirm={() => void confirmDonate()}
        onCancel={() => setDonateTarget(null)}
      >
        <Input
          label={t('จำนวนเหรียญ')}
          type="number"
          inputMode="numeric"
          min={1}
          max={data?.balance}
          value={donateAmount}
          error={donateError}
          onChange={(e) => {
            setDonateAmount(e.target.value)
            if (donateError) setDonateError(undefined)
          }}
        />
        <Button size="sm" variant="ghost" className="self-start" onClick={() => setDonateAmount(String(data?.balance ?? 0))}>
          {t('ทั้งหมด')}
        </Button>
      </ConfirmationModal>
    </AppShell>
  )
}
