import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import { Coins, Gift, HandHeart, Pencil, Plus, Settings2, Trash2, Inbox } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { EmptyState, ErrorState, LoadingState } from '@/components/States'
import { useStore } from '@/lib/store'
import { supabaseEnabled } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { formatDateTime } from '@/lib/utils'
import {
  coinErrorMessage,
  createFoundation,
  createReward,
  fetchCoinSettings,
  fetchFoundationTotals,
  fetchFoundations,
  fetchRedemptions,
  fetchRewards,
  removeFoundation,
  removeReward,
  setRedemptionStatus,
  updateCoinsPerCase,
  updateFoundation,
  updateReward,
  type Foundation,
  type FoundationInput,
  type Redemption,
  type Reward,
  type RewardInput,
} from '@/lib/coins'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  จัดการระบบเหรียญ: 'Manage coin system',
  'เฉพาะแอดมินเท่านั้นที่จัดการระบบเหรียญได้': 'Only admins can manage the coin system',
  ไม่มีสิทธิ์เข้าถึงหน้านี้: 'No access to this page',
  'ระบบเหรียญต้องเชื่อมต่อฐานข้อมูล': 'The coin system needs a database connection',
  เหรียญต่อเคส: 'Coins per case',
  'ประชาชนได้รับเหรียญเมื่อเคสที่แจ้งเสร็จสิ้น (มีผลกับเคสที่เสร็จสิ้นหลังจากนี้)':
    'Citizens earn coins when a case they reported is completed (applies to cases completed from now on)',
  'บันทึกจำนวนเหรียญต่อเคสแล้ว': 'Coins per case saved',
  บันทึก: 'Save',
  ยกเลิก: 'Cancel',
  แก้ไข: 'Edit',
  ลบ: 'Delete',
  ยืนยันลบ: 'Confirm delete',
  บันทึกไม่สำเร็จ: 'Failed to save',
  มูลนิธิที่ร่วมโครงการ: 'Partner foundations',
  เพิ่มมูลนิธิ: 'Add foundation',
  ชื่อมูลนิธิ: 'Foundation name',
  รายละเอียด: 'Details',
  กรุณากรอกชื่อมูลนิธิ: 'Please enter the foundation name',
  บันทึกข้อมูลมูลนิธิแล้ว: 'Foundation saved',
  เพิ่มมูลนิธิแล้ว: 'Foundation added',
  ลบมูลนิธิแล้ว: 'Foundation removed',
  ยังไม่มีมูลนิธิในระบบ: 'No foundations yet',
  'เพิ่มมูลนิธิแรกได้ที่ปุ่มด้านบน': 'Add the first foundation using the button above',
  'ได้รับบริจาคแล้ว {n} เหรียญ': '{n} coins donated so far',
  ยืนยันการลบมูลนิธิ: 'Confirm removing this foundation',
  'ต้องการลบ "{name}" หรือไม่ ประชาชนจะบริจาคให้มูลนิธินี้ไม่ได้อีก แต่ประวัติการบริจาคเดิมยังอยู่':
    'Remove "{name}"? Citizens can no longer donate to it, but past donations stay in their history.',
  รายการของรางวัล: 'Rewards',
  เพิ่มของรางวัล: 'Add reward',
  ชื่อของรางวัล: 'Reward name',
  'ราคา (เหรียญ)': 'Cost (coins)',
  'จำนวนคงเหลือ (เว้นว่าง = ไม่จำกัด)': 'Stock (leave blank = unlimited)',
  'กรุณากรอกชื่อของรางวัลและราคาที่มากกว่า 0': 'Please enter a reward name and a cost above 0',
  บันทึกข้อมูลของรางวัลแล้ว: 'Reward saved',
  เพิ่มของรางวัลแล้ว: 'Reward added',
  ลบของรางวัลแล้ว: 'Reward removed',
  ยังไม่มีของรางวัลในระบบ: 'No rewards yet',
  'เพิ่มของรางวัลแรกได้ที่ปุ่มด้านบน': 'Add the first reward using the button above',
  '{cost} เหรียญ · เหลือ {n} ชิ้น': '{cost} coins · {n} left',
  '{cost} เหรียญ · ไม่จำกัดจำนวน': '{cost} coins · unlimited',
  ยืนยันการลบของรางวัล: 'Confirm removing this reward',
  'ต้องการลบ "{name}" หรือไม่ คำขอแลกที่มีอยู่แล้วจะไม่ถูกยกเลิก':
    'Remove "{name}"? Existing requests for it are not cancelled.',
  คำขอแลกของรางวัล: 'Reward requests',
  ยังไม่มีคำขอแลกของรางวัล: 'No reward requests yet',
  รอดำเนินการ: 'Pending',
  ส่งแล้ว: 'Delivered',
  'ยกเลิก (คืนเหรียญแล้ว)': 'Cancelled (coins refunded)',
  'ส่งของแล้ว': 'Mark delivered',
  'ยกเลิกและคืนเหรียญ': 'Cancel & refund',
  'บันทึกว่าส่งของแล้ว': 'Marked as delivered',
  'ยกเลิกคำขอและคืนเหรียญแล้ว': 'Request cancelled and coins refunded',
  ยืนยันยกเลิกคำขอ: 'Confirm cancelling this request',
  'ยกเลิกคำขอแลก "{name}" ของ {contact} หรือไม่ ระบบจะคืน {cost} เหรียญให้ผู้แลก':
    'Cancel the "{name}" request from {contact}? {cost} coins will be refunded to them.',
  'ยกเลิกคำขอ': 'Cancel request',
  '{name} · {phone}': '{name} · {phone}',
  '{cost} เหรียญ': '{cost} coins',
})

const EMPTY_FOUNDATION: FoundationInput = { name: '', description: '' }
const EMPTY_REWARD = { name: '', description: '', cost: '', stock: '' }

const REDEMPTION_STATUS: Record<Redemption['status'], { label: string; className: string }> = {
  pending: { label: 'รอดำเนินการ', className: 'bg-warning/10 text-warning' },
  fulfilled: { label: 'ส่งแล้ว', className: 'bg-success/10 text-success' },
  cancelled: { label: 'ยกเลิก (คืนเหรียญแล้ว)', className: 'bg-bg text-muted' },
}

function SectionHeading({ icon: Icon, title, action }: { icon: typeof Coins; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
        <Icon className="size-4 text-primary" /> {title}
      </h2>
      {action}
    </div>
  )
}

function FoundationForm({ initial, onCancel, onSaved }: { initial: Foundation | null; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FoundationInput>(
    initial ? { name: initial.name, description: initial.description ?? '' } : EMPTY_FOUNDATION,
  )
  const [saving, setSaving] = useState(false)
  const t = useT()

  async function handleSave() {
    if (!form.name.trim()) {
      toast({ title: t('กรุณากรอกชื่อมูลนิธิ'), tone: 'error' })
      return
    }
    setSaving(true)
    try {
      if (initial) await updateFoundation(initial.id, form)
      else await createFoundation(form)
      toast({ title: initial ? t('บันทึกข้อมูลมูลนิธิแล้ว') : t('เพิ่มมูลนิธิแล้ว'), tone: 'success' })
      onSaved()
    } catch {
      toast({ title: t('บันทึกไม่สำเร็จ'), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <Input label={t('ชื่อมูลนิธิ')} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Textarea label={t('รายละเอียด')} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <div className="flex gap-2">
        <Button size="sm" loading={saving} onClick={handleSave}>
          {t('บันทึก')}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          {t('ยกเลิก')}
        </Button>
      </div>
    </Card>
  )
}

function RewardForm({ initial, onCancel, onSaved }: { initial: Reward | null; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(
    initial
      ? {
          name: initial.name,
          description: initial.description ?? '',
          cost: String(initial.cost),
          stock: initial.stock === null ? '' : String(initial.stock),
        }
      : EMPTY_REWARD,
  )
  const [saving, setSaving] = useState(false)
  const t = useT()

  async function handleSave() {
    const cost = Number(form.cost)
    const stock = form.stock.trim() === '' ? null : Number(form.stock)
    if (!form.name.trim() || !Number.isInteger(cost) || cost <= 0 || (stock !== null && (!Number.isInteger(stock) || stock < 0))) {
      toast({ title: t('กรุณากรอกชื่อของรางวัลและราคาที่มากกว่า 0'), tone: 'error' })
      return
    }
    const input: RewardInput = { name: form.name, description: form.description, cost, stock }
    setSaving(true)
    try {
      if (initial) await updateReward(initial.id, input)
      else await createReward(input)
      toast({ title: initial ? t('บันทึกข้อมูลของรางวัลแล้ว') : t('เพิ่มของรางวัลแล้ว'), tone: 'success' })
      onSaved()
    } catch {
      toast({ title: t('บันทึกไม่สำเร็จ'), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label={t('ชื่อของรางวัล')}
          required
          className="sm:col-span-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label={t('ราคา (เหรียญ)')}
          type="number"
          min={1}
          required
          value={form.cost}
          onChange={(e) => setForm({ ...form, cost: e.target.value })}
        />
        <Input
          label={t('จำนวนคงเหลือ (เว้นว่าง = ไม่จำกัด)')}
          type="number"
          min={0}
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
        />
      </div>
      <Textarea label={t('รายละเอียด')} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <div className="flex gap-2">
        <Button size="sm" loading={saving} onClick={handleSave}>
          {t('บันทึก')}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          {t('ยกเลิก')}
        </Button>
      </div>
    </Card>
  )
}

interface AdminData {
  coinsPerCase: number
  foundations: Foundation[]
  totals: Record<string, number>
  rewards: Reward[]
  redemptions: Redemption[]
}

export default function ManageCoins() {
  const currentUser = useStore((s) => s.currentUser)
  const t = useT()
  const [data, setData] = useState<AdminData | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [coinsPerCase, setCoinsPerCase] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [foundationForm, setFoundationForm] = useState<string | 'new' | null>(null)
  const [rewardForm, setRewardForm] = useState<string | 'new' | null>(null)
  const [removeFoundationTarget, setRemoveFoundationTarget] = useState<Foundation | null>(null)
  const [removeRewardTarget, setRemoveRewardTarget] = useState<Reward | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Redemption | null>(null)
  const [busy, setBusy] = useState(false)

  const isAdmin = !!currentUser?.isAdmin

  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      const [settings, foundations, totals, rewards, redemptions] = await Promise.all([
        fetchCoinSettings(),
        fetchFoundations(),
        fetchFoundationTotals(),
        fetchRewards(),
        fetchRedemptions(),
      ])
      setData({ coinsPerCase: settings.coinsPerCase, foundations, totals, rewards, redemptions })
      setCoinsPerCase(String(settings.coinsPerCase))
    } catch (err) {
      console.error('Failed to load coin admin data:', err)
      setLoadFailed(true)
    }
  }, [])

  useEffect(() => {
    if (supabaseEnabled && isAdmin) void load()
  }, [isAdmin, load])

  if (!isAdmin) {
    return (
      <AppShell variant="dashboard" title={t('จัดการระบบเหรียญ')}>
        <ErrorState title={t('ไม่มีสิทธิ์เข้าถึงหน้านี้')} description={t('เฉพาะแอดมินเท่านั้นที่จัดการระบบเหรียญได้')} />
      </AppShell>
    )
  }

  async function saveSettings() {
    const n = Number(coinsPerCase)
    if (!Number.isInteger(n) || n < 0) return
    setSavingSettings(true)
    try {
      await updateCoinsPerCase(n)
      toast({ title: t('บันทึกจำนวนเหรียญต่อเคสแล้ว'), tone: 'success' })
      await load()
    } catch {
      toast({ title: t('บันทึกไม่สำเร็จ'), tone: 'error' })
    } finally {
      setSavingSettings(false)
    }
  }

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true)
    try {
      await action()
      toast({ title: t(success), tone: 'success' })
      await load()
    } catch (err) {
      toast({ title: t(coinErrorMessage(err)), tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function handleSaved() {
    setFoundationForm(null)
    setRewardForm(null)
    await load()
  }

  let body: React.ReactNode
  if (!supabaseEnabled) {
    body = <EmptyState title={t('ระบบเหรียญต้องเชื่อมต่อฐานข้อมูล')} icon={<Coins className="size-6" />} />
  } else if (loadFailed) {
    body = <ErrorState onRetry={() => void load()} />
  } else if (!data) {
    body = <LoadingState />
  } else {
    const foundations = data.foundations.filter((f) => f.active)
    const rewards = data.rewards.filter((r) => r.active)
    // Pending first -- those are the ones needing someone to act.
    const redemptions = [...data.redemptions].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'))
    const settingsValid = Number.isInteger(Number(coinsPerCase)) && Number(coinsPerCase) >= 0 && coinsPerCase.trim() !== ''

    body = (
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <SectionHeading icon={Settings2} title={t('เหรียญต่อเคส')} />
          <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-48">
              <Input
                label={t('เหรียญต่อเคส')}
                type="number"
                min={0}
                value={coinsPerCase}
                onChange={(e) => setCoinsPerCase(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="sm:mb-0.5"
              loading={savingSettings}
              disabled={!settingsValid || Number(coinsPerCase) === data.coinsPerCase}
              onClick={saveSettings}
            >
              {t('บันทึก')}
            </Button>
            <p className="text-sm text-muted sm:flex-1 sm:self-center">
              {t('ประชาชนได้รับเหรียญเมื่อเคสที่แจ้งเสร็จสิ้น (มีผลกับเคสที่เสร็จสิ้นหลังจากนี้)')}
            </p>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading
            icon={Inbox}
            title={t('คำขอแลกของรางวัล')}
          />
          {redemptions.length === 0 ? (
            <EmptyState title={t('ยังไม่มีคำขอแลกของรางวัล')} icon={<Inbox className="size-6" />} />
          ) : (
            redemptions.map((r) => (
              <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                    {r.rewardName}
                    <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-bold', REDEMPTION_STATUS[r.status].className)}>
                      {t(REDEMPTION_STATUS[r.status].label)}
                    </span>
                  </p>
                  <p className="text-sm text-muted">{t('{name} · {phone}', { name: r.contactName, phone: r.contactPhone })}</p>
                  <p className="text-xs text-muted">
                    {t('{cost} เหรียญ', { cost: r.cost.toLocaleString() })} · {formatDateTime(Date.parse(r.createdAt))}
                  </p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void run(() => setRedemptionStatus(r.id, 'fulfilled'), 'บันทึกว่าส่งของแล้ว')}
                    >
                      {t('ส่งของแล้ว')}
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => setCancelTarget(r)}>
                      {t('ยกเลิกและคืนเหรียญ')}
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading
            icon={HandHeart}
            title={t('มูลนิธิที่ร่วมโครงการ')}
            action={
              foundationForm === null && (
                <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setFoundationForm('new')}>
                  {t('เพิ่มมูลนิธิ')}
                </Button>
              )
            }
          />
          {foundationForm === 'new' && <FoundationForm initial={null} onCancel={() => setFoundationForm(null)} onSaved={handleSaved} />}
          {foundations.length === 0 && foundationForm !== 'new' ? (
            <EmptyState title={t('ยังไม่มีมูลนิธิในระบบ')} description={t('เพิ่มมูลนิธิแรกได้ที่ปุ่มด้านบน')} icon={<HandHeart className="size-6" />} />
          ) : (
            foundations.map((f) =>
              foundationForm === f.id ? (
                <FoundationForm key={f.id} initial={f} onCancel={() => setFoundationForm(null)} onSaved={handleSaved} />
              ) : (
                <Card key={f.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{f.name}</p>
                    {f.description && <p className="text-sm text-muted">{f.description}</p>}
                    <p className="text-xs text-muted">{t('ได้รับบริจาคแล้ว {n} เหรียญ', { n: (data.totals[f.id] ?? 0).toLocaleString() })}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" icon={<Pencil className="size-3.5" />} onClick={() => setFoundationForm(f.id)}>
                      {t('แก้ไข')}
                    </Button>
                    <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" />} onClick={() => setRemoveFoundationTarget(f)}>
                      {t('ลบ')}
                    </Button>
                  </div>
                </Card>
              ),
            )
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading
            icon={Gift}
            title={t('รายการของรางวัล')}
            action={
              rewardForm === null && (
                <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setRewardForm('new')}>
                  {t('เพิ่มของรางวัล')}
                </Button>
              )
            }
          />
          {rewardForm === 'new' && <RewardForm initial={null} onCancel={() => setRewardForm(null)} onSaved={handleSaved} />}
          {rewards.length === 0 && rewardForm !== 'new' ? (
            <EmptyState title={t('ยังไม่มีของรางวัลในระบบ')} description={t('เพิ่มของรางวัลแรกได้ที่ปุ่มด้านบน')} icon={<Gift className="size-6" />} />
          ) : (
            rewards.map((r) =>
              rewardForm === r.id ? (
                <RewardForm key={r.id} initial={r} onCancel={() => setRewardForm(null)} onSaved={handleSaved} />
              ) : (
                <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{r.name}</p>
                    {r.description && <p className="text-sm text-muted">{r.description}</p>}
                    <p className="text-xs text-muted">
                      {r.stock === null
                        ? t('{cost} เหรียญ · ไม่จำกัดจำนวน', { cost: r.cost.toLocaleString() })
                        : t('{cost} เหรียญ · เหลือ {n} ชิ้น', { cost: r.cost.toLocaleString(), n: r.stock })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" icon={<Pencil className="size-3.5" />} onClick={() => setRewardForm(r.id)}>
                      {t('แก้ไข')}
                    </Button>
                    <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" />} onClick={() => setRemoveRewardTarget(r)}>
                      {t('ลบ')}
                    </Button>
                  </div>
                </Card>
              ),
            )
          )}
        </section>
      </div>
    )
  }

  return (
    <AppShell variant="dashboard" title={t('จัดการระบบเหรียญ')}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10">{body}</div>
      </div>

      <ConfirmationModal
        open={!!removeFoundationTarget}
        title={t('ยืนยันการลบมูลนิธิ')}
        message={t('ต้องการลบ "{name}" หรือไม่ ประชาชนจะบริจาคให้มูลนิธินี้ไม่ได้อีก แต่ประวัติการบริจาคเดิมยังอยู่', {
          name: removeFoundationTarget?.name ?? '',
        })}
        confirmLabel={t('ยืนยันลบ')}
        tone="danger"
        confirmLoading={busy}
        onConfirm={() => {
          const target = removeFoundationTarget
          if (target) void run(() => removeFoundation(target.id), 'ลบมูลนิธิแล้ว').then(() => setRemoveFoundationTarget(null))
        }}
        onCancel={() => setRemoveFoundationTarget(null)}
      />
      <ConfirmationModal
        open={!!removeRewardTarget}
        title={t('ยืนยันการลบของรางวัล')}
        message={t('ต้องการลบ "{name}" หรือไม่ คำขอแลกที่มีอยู่แล้วจะไม่ถูกยกเลิก', { name: removeRewardTarget?.name ?? '' })}
        confirmLabel={t('ยืนยันลบ')}
        tone="danger"
        confirmLoading={busy}
        onConfirm={() => {
          const target = removeRewardTarget
          if (target) void run(() => removeReward(target.id), 'ลบของรางวัลแล้ว').then(() => setRemoveRewardTarget(null))
        }}
        onCancel={() => setRemoveRewardTarget(null)}
      />
      <ConfirmationModal
        open={!!cancelTarget}
        title={t('ยืนยันยกเลิกคำขอ')}
        message={t('ยกเลิกคำขอแลก "{name}" ของ {contact} หรือไม่ ระบบจะคืน {cost} เหรียญให้ผู้แลก', {
          name: cancelTarget?.rewardName ?? '',
          contact: cancelTarget?.contactName ?? '',
          cost: (cancelTarget?.cost ?? 0).toLocaleString(),
        })}
        confirmLabel={t('ยกเลิกคำขอ')}
        tone="danger"
        confirmLoading={busy}
        onConfirm={() => {
          const target = cancelTarget
          if (target)
            void run(() => setRedemptionStatus(target.id, 'cancelled'), 'ยกเลิกคำขอและคืนเหรียญแล้ว').then(() =>
              setCancelTarget(null),
            )
        }}
        onCancel={() => setCancelTarget(null)}
      />
    </AppShell>
  )
}
