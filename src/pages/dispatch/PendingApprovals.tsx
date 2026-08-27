import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { EmptyState, LoadingState } from '@/components/States'
import { fetchPendingAccounts, approveAccount, rejectAccount, fetchApprovedStaff, setAdminStatus } from '@/lib/pendingAccounts'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { AppUser, Role } from '@/lib/types'
import { UserCheck, CheckCircle2, XCircle, ShieldCheck, ShieldOff } from 'lucide-react'

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
    if (!currentUser?.isAdmin) return
    setStaff(await fetchApprovedStaff())
  }

  useEffect(() => {
    void reload()
    void reloadStaff()
  }, [currentUser?.isAdmin])

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
      await approveAccount(user.id)
      toast({ title: 'อนุมัติบัญชีแล้ว', message: `${user.name} เข้าใช้งานได้แล้ว`, tone: 'success' })
      await reload()
    } catch {
      toast({ title: 'อนุมัติไม่สำเร็จ', tone: 'error' })
    } finally {
      setBusyId(null)
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
              <Card key={user.id} className="flex flex-wrap items-center justify-between gap-3">
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
