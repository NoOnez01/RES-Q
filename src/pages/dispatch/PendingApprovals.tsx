import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { EmptyState, LoadingState } from '@/components/States'
import {
  fetchPendingAccounts,
  approveAccount,
  rejectAccount,
  fetchApprovedStaff,
  setAdminStatus,
  setOrgLeadStatus,
} from '@/lib/pendingAccounts'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { AppUser, Role } from '@/lib/types'
import { UserCheck, CheckCircle2, XCircle, ShieldCheck, ShieldOff, Crown } from 'lucide-react'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ตั้งเป็นแอดมินแล้ว: 'Made an admin',
  ถอดสิทธิ์แอดมินแล้ว: 'Admin access removed',
  ดำเนินการไม่สำเร็จ: 'Action failed',
  อนุมัติบัญชีแล้ว: 'Account approved',
  '{name} เข้าใช้งานได้แล้ว': '{name} can now log in',
  อนุมัติไม่สำเร็จ: 'Approval failed',
  ตั้งเป็นหัวหน้าหน่วยงานแล้ว: 'Made an org lead',
  ถอดสิทธิ์หัวหน้าหน่วยงานแล้ว: 'Org lead access removed',
  ปฏิเสธบัญชีแล้ว: 'Account rejected',
  บัญชีรออนุมัติ: 'Pending accounts',
  ไม่มีบัญชีรออนุมัติ: 'No pending accounts',
  'คำขอสมัครสมาชิกใหม่จากหน่วยกู้ชีพ โรงพยาบาล หรือศูนย์สั่งการ จะแสดงที่นี่':
    'New sign-up requests from rescue teams, hospitals, or dispatch centers will appear here',
  ปฏิเสธ: 'Reject',
  อนุมัติ: 'Approve',
  'ตั้งเป็นหัวหน้าหน่วยงาน (อนุมัติสมาชิกใหม่ในหน่วยงานเดียวกันได้เอง)': 'Make an org lead (can approve new members of the same org themselves)',
  จัดการสิทธิ์แอดมิน: 'Manage admin access',
  ยังไม่มีบัญชีที่อนุมัติแล้ว: 'No approved accounts yet',
  'บัญชีศูนย์สั่งการ หน่วยกู้ชีพ หรือโรงพยาบาลที่ผ่านการอนุมัติจะแสดงที่นี่':
    'Approved dispatch, rescue team, or hospital accounts will appear here',
  แอดมิน: 'Admin',
  ถอดสิทธิ์แอดมิน: 'Remove admin access',
  ตั้งเป็นแอดมิน: 'Make admin',
  จัดการหัวหน้าหน่วยงาน: 'Manage org leads',
  'ยังไม่มีบัญชีหน่วยกู้ชีพ/โรงพยาบาลที่อนุมัติแล้ว': 'No approved rescue team/hospital accounts yet',
  บัญชีหน่วยกู้ชีพหรือโรงพยาบาลที่ผ่านการอนุมัติจะแสดงที่นี่: 'Approved rescue team or hospital accounts will appear here',
  หัวหน้าหน่วยงาน: 'Org lead',
  ถอดสิทธิ์หัวหน้าหน่วยงาน: 'Remove org lead access',
  ยืนยันการปฏิเสธบัญชี: 'Confirm rejecting this account',
  'คุณต้องการปฏิเสธบัญชี "{name}" หรือไม่': 'Reject the account "{name}"?',
  ยืนยันปฏิเสธ: 'Confirm rejection',
})

const ROLE_LABEL: Record<Role, string> = {
  public: 'ประชาชน',
  dispatch: 'ศูนย์สั่งการ 1669',
  rescue: 'หน่วยกู้ชีพ',
  hospital: 'โรงพยาบาล',
}

export default function DispatchPendingApprovals() {
  const rescueTeams = useStore((s) => s.rescueTeams)
  const hospitals = useStore((s) => s.hospitals)
  const currentUser = useStore((s) => s.currentUser)
  const [accounts, setAccounts] = useState<AppUser[] | null>(null)
  const [staff, setStaff] = useState<AppUser[] | null>(null)
  const [adminBusyId, setAdminBusyId] = useState<string | null>(null)
  const [orgLeadBusyId, setOrgLeadBusyId] = useState<string | null>(null)
  // Which pending accounts should also become their org's lead the moment
  // they're approved -- the common case for the very first member of a
  // newly self-registered team/hospital, who then approves their own
  // colleagues afterward instead of needing dispatch/admin every time.
  const [approveAsLead, setApproveAsLead] = useState<Set<string>>(new Set())
  const canManageOrgLeads = currentUser?.isAdmin || currentUser?.isOrgLead

  function orgName(user: AppUser): string | null {
    if (user.role === 'rescue') return rescueTeams.find((t) => t.id === user.rescueTeamId)?.name ?? null
    if (user.role === 'hospital') return hospitals.find((h) => h.id === user.hospitalId)?.name ?? null
    return null
  }
  const [rejectTarget, setRejectTarget] = useState<AppUser | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const t = useT()

  async function reload() {
    setAccounts(await fetchPendingAccounts())
  }

  async function reloadStaff() {
    if (!canManageOrgLeads) return
    setStaff(await fetchApprovedStaff())
  }

  useEffect(() => {
    void reload()
    void reloadStaff()
  }, [currentUser?.isAdmin, currentUser?.isOrgLead])

  async function handleSetAdmin(user: AppUser, isAdmin: boolean) {
    setAdminBusyId(user.id)
    try {
      await setAdminStatus(user.id, isAdmin)
      toast({
        title: isAdmin ? t('ตั้งเป็นแอดมินแล้ว') : t('ถอดสิทธิ์แอดมินแล้ว'),
        message: user.name,
        tone: 'success',
      })
      await reloadStaff()
    } catch (err) {
      console.error('Action failed:', err)
      toast({ title: t('ดำเนินการไม่สำเร็จ'), message: err instanceof Error ? err.message : undefined, tone: 'error' })
    } finally {
      setAdminBusyId(null)
    }
  }

  async function handleApprove(user: AppUser) {
    setBusyId(user.id)
    try {
      await approveAccount(user.id, approveAsLead.has(user.id))
      toast({ title: t('อนุมัติบัญชีแล้ว'), message: t('{name} เข้าใช้งานได้แล้ว', { name: user.name }), tone: 'success' })
      await reload()
      await reloadStaff()
    } catch (err) {
      console.error('Approve account failed:', err)
      toast({ title: t('อนุมัติไม่สำเร็จ'), message: err instanceof Error ? err.message : undefined, tone: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  function toggleApproveAsLead(userId: string, checked: boolean) {
    setApproveAsLead((prev) => {
      const next = new Set(prev)
      if (checked) next.add(userId)
      else next.delete(userId)
      return next
    })
  }

  async function handleSetOrgLead(user: AppUser, isOrgLead: boolean) {
    setOrgLeadBusyId(user.id)
    try {
      await setOrgLeadStatus(user.id, isOrgLead)
      toast({
        title: isOrgLead ? t('ตั้งเป็นหัวหน้าหน่วยงานแล้ว') : t('ถอดสิทธิ์หัวหน้าหน่วยงานแล้ว'),
        message: user.name,
        tone: 'success',
      })
      await reloadStaff()
    } catch (err) {
      console.error('Action failed:', err)
      toast({ title: t('ดำเนินการไม่สำเร็จ'), message: err instanceof Error ? err.message : undefined, tone: 'error' })
    } finally {
      setOrgLeadBusyId(null)
    }
  }

  async function handleReject() {
    if (!rejectTarget) return
    setBusyId(rejectTarget.id)
    try {
      await rejectAccount(rejectTarget.id)
      toast({ title: t('ปฏิเสธบัญชีแล้ว'), tone: 'warning' })
      await reload()
    } catch (err) {
      console.error('Action failed:', err)
      toast({ title: t('ดำเนินการไม่สำเร็จ'), message: err instanceof Error ? err.message : undefined, tone: 'error' })
    } finally {
      setBusyId(null)
      setRejectTarget(null)
    }
  }

  return (
    <AppShell variant="dashboard" title={t('บัญชีรออนุมัติ')}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 flex flex-col gap-4">
          {accounts === null ? (
            <LoadingState />
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={<UserCheck className="size-6" />}
              title={t('ไม่มีบัญชีรออนุมัติ')}
              description={t('คำขอสมัครสมาชิกใหม่จากหน่วยกู้ชีพ โรงพยาบาล หรือศูนย์สั่งการ จะแสดงที่นี่')}
            />
          ) : (
            accounts.map((user) => (
              <Card key={user.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{user.name}</p>
                    <p className="text-sm text-muted">
                      {t(ROLE_LABEL[user.role])}
                      {orgName(user) && ` · ${orgName(user)}`}
                      {user.phone && ` · ${user.phone}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<XCircle className="size-3.5" />}
                      disabled={busyId === user.id}
                      onClick={() => setRejectTarget(user)}
                    >
                      {t('ปฏิเสธ')}
                    </Button>
                    <Button
                      size="sm"
                      icon={<CheckCircle2 className="size-3.5" />}
                      loading={busyId === user.id}
                      onClick={() => handleApprove(user)}
                    >
                      {t('อนุมัติ')}
                    </Button>
                  </div>
                </div>
                {(user.role === 'rescue' || user.role === 'hospital') && (
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={approveAsLead.has(user.id)}
                      onChange={(e) => toggleApproveAsLead(user.id, e.target.checked)}
                      className="size-4 accent-primary"
                    />
                    {t('ตั้งเป็นหัวหน้าหน่วยงาน (อนุมัติสมาชิกใหม่ในหน่วยงานเดียวกันได้เอง)')}
                  </label>
                )}
              </Card>
            ))
          )}
        </div>

        {currentUser?.isAdmin && (
          <div className="mt-8 flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t('จัดการสิทธิ์แอดมิน')}</h2>
            {staff === null ? (
              <LoadingState />
            ) : staff.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="size-6" />}
                title={t('ยังไม่มีบัญชีที่อนุมัติแล้ว')}
                description={t('บัญชีศูนย์สั่งการ หน่วยกู้ชีพ หรือโรงพยาบาลที่ผ่านการอนุมัติจะแสดงที่นี่')}
              />
            ) : (
              staff.map((user) => (
                <Card key={user.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">
                      {user.name}
                      {user.isAdmin && <span className="ml-2 text-xs font-bold text-primary">{t('แอดมิน')}</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {t(ROLE_LABEL[user.role])}
                      {orgName(user) && ` · ${orgName(user)}`}
                    </p>
                  </div>
                  {user.isAdmin ? (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<ShieldOff className="size-3.5" />}
                      loading={adminBusyId === user.id}
                      disabled={user.id === currentUser.id}
                      onClick={() => handleSetAdmin(user, false)}
                    >
                      {t('ถอดสิทธิ์แอดมิน')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      icon={<ShieldCheck className="size-3.5" />}
                      loading={adminBusyId === user.id}
                      onClick={() => handleSetAdmin(user, true)}
                    >
                      {t('ตั้งเป็นแอดมิน')}
                    </Button>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {canManageOrgLeads && (
          <div className="mt-8 flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t('จัดการหัวหน้าหน่วยงาน')}</h2>
            {staff === null ? (
              <LoadingState />
            ) : (
              (() => {
                const orgStaff = staff.filter((u) => u.role === 'rescue' || u.role === 'hospital')
                return orgStaff.length === 0 ? (
                  <EmptyState
                    icon={<Crown className="size-6" />}
                    title={t('ยังไม่มีบัญชีหน่วยกู้ชีพ/โรงพยาบาลที่อนุมัติแล้ว')}
                    description={t('บัญชีหน่วยกู้ชีพหรือโรงพยาบาลที่ผ่านการอนุมัติจะแสดงที่นี่')}
                  />
                ) : (
                  orgStaff.map((user) => (
                    <Card key={user.id} className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-ink">
                          {user.name}
                          {user.isOrgLead && <span className="ml-2 text-xs font-bold text-primary">{t('หัวหน้าหน่วยงาน')}</span>}
                        </p>
                        <p className="text-sm text-muted">
                          {t(ROLE_LABEL[user.role])}
                          {orgName(user) && ` · ${orgName(user)}`}
                        </p>
                      </div>
                      {user.isOrgLead ? (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<ShieldOff className="size-3.5" />}
                          loading={orgLeadBusyId === user.id}
                          disabled={user.id === currentUser?.id}
                          onClick={() => handleSetOrgLead(user, false)}
                        >
                          {t('ถอดสิทธิ์หัวหน้าหน่วยงาน')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          icon={<Crown className="size-3.5" />}
                          loading={orgLeadBusyId === user.id}
                          onClick={() => handleSetOrgLead(user, true)}
                        >
                          {t('ตั้งเป็นหัวหน้าหน่วยงาน')}
                        </Button>
                      )}
                    </Card>
                  ))
                )
              })()
            )}
          </div>
        )}
      </div>

      <ConfirmationModal
        open={!!rejectTarget}
        title={t('ยืนยันการปฏิเสธบัญชี')}
        message={t('คุณต้องการปฏิเสธบัญชี "{name}" หรือไม่', { name: rejectTarget?.name ?? '' })}
        confirmLabel={t('ยืนยันปฏิเสธ')}
        tone="danger"
        onConfirm={handleReject}
        onCancel={() => setRejectTarget(null)}
      />
    </AppShell>
  )
}
