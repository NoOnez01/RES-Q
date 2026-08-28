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
        title: isAdmin ? 'ตั้งเป็นแอดมินแล้ว' : 'ถอดสิทธิ์แอดมินแล้ว',
        message: user.name,
        tone: 'success',
      })
      await reloadStaff()
    } catch {
      toast({ title: 'ดำเนินการไม่สำเร็จ', tone: 'error' })
    } finally {
      setAdminBusyId(null)
    }
  }

  async function handleApprove(user: AppUser) {
    setBusyId(user.id)
    try {
      await approveAccount(user.id, approveAsLead.has(user.id))
      toast({ title: 'อนุมัติบัญชีแล้ว', message: `${user.name} เข้าใช้งานได้แล้ว`, tone: 'success' })
      await reload()
      await reloadStaff()
    } catch {
      toast({ title: 'อนุมัติไม่สำเร็จ', tone: 'error' })
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
        title: isOrgLead ? 'ตั้งเป็นหัวหน้าหน่วยงานแล้ว' : 'ถอดสิทธิ์หัวหน้าหน่วยงานแล้ว',
        message: user.name,
        tone: 'success',
      })
      await reloadStaff()
    } catch {
      toast({ title: 'ดำเนินการไม่สำเร็จ', tone: 'error' })
    } finally {
      setOrgLeadBusyId(null)
    }
  }

  async function handleReject() {
    if (!rejectTarget) return
    setBusyId(rejectTarget.id)
    try {
      await rejectAccount(rejectTarget.id)
      toast({ title: 'ปฏิเสธบัญชีแล้ว', tone: 'warning' })
      await reload()
    } catch {
      toast({ title: 'ดำเนินการไม่สำเร็จ', tone: 'error' })
    } finally {
      setBusyId(null)
      setRejectTarget(null)
    }
  }

  return (
    <AppShell variant="dashboard" title="บัญชีรออนุมัติ">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 flex flex-col gap-4">
          {accounts === null ? (
            <LoadingState />
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={<UserCheck className="size-6" />}
              title="ไม่มีบัญชีรออนุมัติ"
              description="คำขอสมัครสมาชิกใหม่จากหน่วยกู้ชีพ โรงพยาบาล หรือศูนย์สั่งการ จะแสดงที่นี่"
            />
          ) : (
            accounts.map((user) => (
              <Card key={user.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy">{user.name}</p>
                    <p className="text-sm text-muted">
                      {ROLE_LABEL[user.role]}
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
                      ปฏิเสธ
                    </Button>
                    <Button
                      size="sm"
                      icon={<CheckCircle2 className="size-3.5" />}
                      loading={busyId === user.id}
                      onClick={() => handleApprove(user)}
                    >
                      อนุมัติ
                    </Button>
                  </div>
                </div>
                {(user.role === 'rescue' || user.role === 'hospital') && (
                  <label className="flex items-center gap-2 text-sm text-navy">
                    <input
                      type="checkbox"
                      checked={approveAsLead.has(user.id)}
                      onChange={(e) => toggleApproveAsLead(user.id, e.target.checked)}
                      className="size-4 accent-primary"
                    />
                    ตั้งเป็นหัวหน้าหน่วยงาน (อนุมัติสมาชิกใหม่ในหน่วยงานเดียวกันได้เอง)
                  </label>
                )}
              </Card>
            ))
          )}
        </div>

        {currentUser?.isAdmin && (
          <div className="mt-8 flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">จัดการสิทธิ์แอดมิน</h2>
            {staff === null ? (
              <LoadingState />
            ) : staff.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="size-6" />}
                title="ยังไม่มีบัญชีที่อนุมัติแล้ว"
                description="บัญชีศูนย์สั่งการ หน่วยกู้ชีพ หรือโรงพยาบาลที่ผ่านการอนุมัติจะแสดงที่นี่"
              />
            ) : (
              staff.map((user) => (
                <Card key={user.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy">
                      {user.name}
                      {user.isAdmin && <span className="ml-2 text-xs font-bold text-primary">แอดมิน</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {ROLE_LABEL[user.role]}
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
                      ถอดสิทธิ์แอดมิน
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      icon={<ShieldCheck className="size-3.5" />}
                      loading={adminBusyId === user.id}
                      onClick={() => handleSetAdmin(user, true)}
                    >
                      ตั้งเป็นแอดมิน
                    </Button>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {canManageOrgLeads && (
          <div className="mt-8 flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">จัดการหัวหน้าหน่วยงาน</h2>
            {staff === null ? (
              <LoadingState />
            ) : (
              (() => {
                const orgStaff = staff.filter((u) => u.role === 'rescue' || u.role === 'hospital')
                return orgStaff.length === 0 ? (
                  <EmptyState
                    icon={<Crown className="size-6" />}
                    title="ยังไม่มีบัญชีหน่วยกู้ชีพ/โรงพยาบาลที่อนุมัติแล้ว"
                    description="บัญชีหน่วยกู้ชีพหรือโรงพยาบาลที่ผ่านการอนุมัติจะแสดงที่นี่"
                  />
                ) : (
                  orgStaff.map((user) => (
                    <Card key={user.id} className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-navy">
                          {user.name}
                          {user.isOrgLead && <span className="ml-2 text-xs font-bold text-primary">หัวหน้าหน่วยงาน</span>}
                        </p>
                        <p className="text-sm text-muted">
                          {ROLE_LABEL[user.role]}
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
                          ถอดสิทธิ์หัวหน้าหน่วยงาน
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          icon={<Crown className="size-3.5" />}
                          loading={orgLeadBusyId === user.id}
                          onClick={() => handleSetOrgLead(user, true)}
                        >
                          ตั้งเป็นหัวหน้าหน่วยงาน
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
        title="ยืนยันการปฏิเสธบัญชี"
        message={`คุณต้องการปฏิเสธบัญชี "${rejectTarget?.name}" หรือไม่`}
        confirmLabel="ยืนยันปฏิเสธ"
        tone="danger"
        onConfirm={handleReject}
        onCancel={() => setRejectTarget(null)}
      />
    </AppShell>
  )
}
