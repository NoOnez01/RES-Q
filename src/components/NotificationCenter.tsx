import clsx from 'clsx'
import { Bell, CheckCircle2, Info, AlertTriangle, Siren } from 'lucide-react'
import type { AppNotification } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { EmptyState } from './States'
import { PulseRing } from './backgrounds/PulseRing'

const toneConfig: Record<AppNotification['tone'], { icon: React.ElementType; classes: string }> = {
  info: { icon: Info, classes: 'bg-primary/10 text-primary' },
  success: { icon: CheckCircle2, classes: 'bg-success/10 text-success' },
  warning: { icon: AlertTriangle, classes: 'bg-warning/10 text-warning' },
  emergency: { icon: Siren, classes: 'bg-emergency/10 text-emergency' },
}

export function NotificationCenter({
  notifications,
  onMarkRead,
  onOpenCase,
}: {
  notifications: AppNotification[]
  onMarkRead: (id: string) => void
  onOpenCase?: (caseId: string) => void
}) {
  if (notifications.length === 0) {
    return <EmptyState icon={<Bell className="size-6" />} title="ยังไม่มีการแจ้งเตือน" description="การแจ้งเตือนเกี่ยวกับเคสจะแสดงที่นี่" />
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {notifications.map((n, i) => {
        const { icon: Icon, classes } = toneConfig[n.tone]
        return (
          <li key={n.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
            <button
              onClick={() => {
                onMarkRead(n.id)
                if (n.caseId && onOpenCase) onOpenCase(n.caseId)
              }}
              className={clsx(
                'flex w-full items-start gap-3 px-1 py-3.5 text-left transition-colors hover:bg-skyblue-pale',
                !n.read && 'bg-skyblue-pale/60',
              )}
            >
              <div className={clsx('relative flex size-9 shrink-0 items-center justify-center rounded-full', classes)}>
                {!n.read && n.tone === 'emergency' && (
                  <span className="bg-fx absolute inset-0 animate-ping-slow rounded-full bg-emergency/25" aria-hidden="true" />
                )}
                <Icon className="relative size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={clsx('text-sm', n.read ? 'font-medium text-navy' : 'font-bold text-navy')}>{n.title}</p>
                  {!n.read && <PulseRing tone={n.tone === 'emergency' ? 'emergency' : 'primary'} size="sm" />}
                </div>
                <p className="text-xs text-muted mt-0.5">{n.message}</p>
                <p className="text-[11px] text-muted/70 mt-1">{formatDateTime(n.createdAt)}</p>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
