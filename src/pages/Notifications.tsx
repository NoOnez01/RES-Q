import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { NotificationCenter } from '@/components/NotificationCenter'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/lib/store'
import type { Role } from '@/lib/types'

function caseRouteForRole(role: Role | undefined, caseId: string): string {
  switch (role) {
    case 'dispatch':
      return `/dispatch/case/${caseId}`
    case 'rescue':
      return `/rescue/case/${caseId}`
    case 'hospital':
      return `/hospital/case/${caseId}`
    default:
      return `/public/case/${caseId}`
  }
}

export default function Notifications() {
  const notifications = useStore((s) => s.notifications)
  const currentUser = useStore((s) => s.currentUser)
  const markNotificationRead = useStore((s) => s.markNotificationRead)
  const markAllNotificationsRead = useStore((s) => s.markAllNotificationsRead)
  const navigate = useNavigate()

  const filtered = useMemo(
    () =>
      notifications
        .filter((n) => n.audience === 'all' || n.audience === (currentUser?.role ?? 'public'))
        .sort((a, b) => b.createdAt - a.createdAt),
    [notifications, currentUser],
  )

  const unreadCount = useMemo(() => filtered.filter((n) => !n.read).length, [filtered])

  return (
    <AppShell variant="dashboard" title="การแจ้งเตือน">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                key={unreadCount}
                className={clsx(
                  'inline-flex min-w-8 items-center justify-center rounded-full px-2.5 py-1 text-sm font-bold animate-count-pop',
                  unreadCount > 0 ? 'bg-emergency/10 text-emergency' : 'bg-skyblue-light text-muted',
                )}
              >
                {unreadCount}
              </span>
              <p className="text-sm font-medium text-muted">รายการที่ยังไม่ได้อ่าน</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={unreadCount === 0}
              onClick={() => markAllNotificationsRead(currentUser?.role ?? 'public')}
            >
              ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
            </Button>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-white p-3 shadow-card sm:p-5">
            <NotificationCenter
              notifications={filtered}
              onMarkRead={markNotificationRead}
              onOpenCase={(caseId) => navigate(caseRouteForRole(currentUser?.role, caseId))}
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
