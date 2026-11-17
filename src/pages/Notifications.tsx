import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { NotificationCenter } from '@/components/NotificationCenter'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/lib/store'
import type { Role } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  รายการที่ยังไม่ได้อ่าน: 'Unread items',
  ทำเครื่องหมายว่าอ่านแล้วทั้งหมด: 'Mark all as read',
})

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
  const t = useT()

  const filtered = useMemo(
    () =>
      notifications
        .filter((n) => n.audience === 'all' || n.audience === (currentUser?.role ?? 'public'))
        .sort((a, b) => b.createdAt - a.createdAt),
    [notifications, currentUser],
  )

  const unreadCount = useMemo(() => filtered.filter((n) => !n.read).length, [filtered])

  return (
    <AppShell variant="dashboard" title={t('การแจ้งเตือน')}>
      <div className="relative">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-muted">
              {t('รายการที่ยังไม่ได้อ่าน')}
              <span
                className={clsx(
                  'inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums',
                  unreadCount > 0 ? 'bg-primary-fill text-white' : 'bg-skyblue-light text-muted',
                )}
              >
                {unreadCount}
              </span>
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={unreadCount === 0}
              onClick={() => markAllNotificationsRead(currentUser?.role ?? 'public')}
            >
              {t('ทำเครื่องหมายว่าอ่านแล้วทั้งหมด')}
            </Button>
          </div>

          <div className="mt-4">
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
