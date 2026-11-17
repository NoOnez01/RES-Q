import clsx from 'clsx'
import { Bell, CheckCircle2, Info, AlertTriangle, Siren } from 'lucide-react'
import type { AppNotification } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { EmptyState } from './States'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ยังไม่มีการแจ้งเตือน: 'No notifications yet',
  การแจ้งเตือนเกี่ยวกับเหตุจะแสดงที่นี่: 'Case-related notifications will appear here',
  ยังไม่ได้อ่าน: 'Unread',
})

const toneConfig: Record<AppNotification['tone'], { icon: React.ElementType; color: string }> = {
  info: { icon: Info, color: 'text-primary' },
  success: { icon: CheckCircle2, color: 'text-success-ink' },
  warning: { icon: AlertTriangle, color: 'text-warning-ink' },
  emergency: { icon: Siren, color: 'text-emergency' },
}

/** Notifications as one divided list panel: the tone's icon, title, message
 * and time per row; unread rows are tinted and marked with a dot. */
export function NotificationCenter({
  notifications,
  onMarkRead,
  onOpenCase,
}: {
  notifications: AppNotification[]
  onMarkRead: (id: string) => void
  onOpenCase?: (caseId: string) => void
}) {
  const t = useT()
  if (notifications.length === 0) {
    return <EmptyState icon={<Bell className="size-6" />} title={t('ยังไม่มีการแจ้งเตือน')} description={t('การแจ้งเตือนเกี่ยวกับเหตุจะแสดงที่นี่')} />
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {notifications.map((n) => {
        const { icon: Icon, color } = toneConfig[n.tone]
        return (
          <li key={n.id} className="animate-fade-in">
            <button
              onClick={() => {
                onMarkRead(n.id)
                if (n.caseId && onOpenCase) onOpenCase(n.caseId)
              }}
              className={clsx(
                'relative flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-alt',
                !n.read && 'bg-primary/[0.03]',
              )}
            >
              {!n.read && (
                <span className="absolute left-2 top-5 size-1.5 rounded-full bg-primary" aria-hidden="true" />
              )}
              <Icon className={clsx('mt-0.5 size-4 shrink-0', color)} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={clsx('text-sm text-ink', n.read ? 'font-medium' : 'font-semibold')}>
                    {n.title}
                    {!n.read && <span className="sr-only"> ({t('ยังไม่ได้อ่าน')})</span>}
                  </p>
                  <time className="shrink-0 text-meta tabular-nums text-muted">{formatDateTime(n.createdAt)}</time>
                </div>
                <p className="mt-0.5 text-small text-muted">{n.message}</p>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
