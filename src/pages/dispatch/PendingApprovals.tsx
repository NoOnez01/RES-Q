import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { EmptyState, LoadingState } from '@/components/States'
import { fetchPendingAccounts, approveAccount, rejectAccount } from '@/lib/pendingAccounts'
import { MOCK_RESCUE_TEAMS, MOCK_HOSPITALS } from '@/lib/mockData'
import { toast } from '@/lib/toast'
import type { AppUser, Role } from '@/lib/types'
import { UserCheck, CheckCircle2, XCircle } from 'lucide-react'

const ROLE_LABEL: Record<Role, string> = {
  public: 'ประชาชน',
  dispatch: 'ศูนย์สั่งการ 1669',
  rescue: 'หน่วยกู้ชีพ',
  hospital: 'โรงพยาบาล',
}

function orgName(user: AppUser): string | null {
  if (user.role === 'rescue') return MOCK_RESCUE_TEAMS.find((t) => t.id === user.rescueTeamId)?.name ?? null
  if (user.role === 'hospital') return MOCK_HOSPITALS.find((h) => h.id === user.hospitalId)?.name ?? null
  return null
}

export default function DispatchPendingApprovals() {
  const [accounts, setAccounts] = useState<AppUser[] | null>(null)
  const [rejectTarget, setRejectTarget] = useState<AppUser | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function reload() {
    setAccounts(await fetchPendingAccounts())
  }

  useEffect(() => {
    void reload()
  }, [])

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
