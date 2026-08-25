import { createPortal } from 'react-dom'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'
import clsx from 'clsx'
import { useToastStore } from '@/lib/toast'
import type { ToastTone } from '@/lib/toast'

const toneConfig: Record<ToastTone, { icon: React.ElementType; classes: string }> = {
  info: { icon: Info, classes: 'border-primary/30 [&_svg]:text-primary' },
  success: { icon: CheckCircle2, classes: 'border-success/30 [&_svg]:text-success' },
  warning: { icon: AlertTriangle, classes: 'border-warning/30 [&_svg]:text-warning' },
  error: { icon: XCircle, classes: 'border-emergency/30 [&_svg]:text-emergency' },
}

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed inset-x-0 bottom-3 z-[200] flex flex-col items-center gap-2 px-3 pb-[env(safe-area-inset-bottom)] pointer-events-none sm:inset-x-auto sm:bottom-auto sm:top-4 sm:items-end sm:right-4 sm:px-0">
      {toasts.map((t) => {
        const { icon: Icon, classes } = toneConfig[t.tone]
        return (
          <div
            key={t.id}
            className={clsx(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-white p-4 shadow-card-lg animate-toast-in',
              classes,
            )}
          >
            <span className="relative shrink-0">
              {t.tone === 'error' && (
                <span className="bg-fx absolute inset-0 animate-ping-slow rounded-full bg-emergency/25" aria-hidden="true" />
              )}
              <Icon className="relative size-5 mt-0.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-navy">{t.title}</p>
              {t.message && <p className="text-xs text-muted mt-0.5">{t.message}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="ปิดการแจ้งเตือน"
              className="shrink-0 text-muted hover:text-navy"
            >
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
