import { createPortal } from 'react-dom'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'
import clsx from 'clsx'
import { useToastStore } from '@/lib/toast'
import type { ToastTone } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ปิดการแจ้งเตือน: 'Dismiss notification',
})

const toneConfig: Record<ToastTone, { icon: React.ElementType; classes: string }> = {
  info: { icon: Info, classes: '[&>svg:first-child]:text-primary' },
  success: { icon: CheckCircle2, classes: '[&>svg:first-child]:text-success-ink' },
  warning: { icon: AlertTriangle, classes: '[&>svg:first-child]:text-warning-ink' },
  error: { icon: XCircle, classes: '[&>svg:first-child]:text-emergency' },
}

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  const t = useT()

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed inset-x-0 bottom-3 z-[200] flex flex-col items-center gap-2 px-3 pb-[env(safe-area-inset-bottom)] pointer-events-none sm:inset-x-auto sm:bottom-auto sm:top-4 sm:items-end sm:right-4 sm:px-0">
      {toasts.map((toastItem) => {
        const { icon: Icon, classes } = toneConfig[toastItem.tone]
        return (
          <div
            key={toastItem.id}
            role={toastItem.tone === 'error' ? 'alert' : 'status'}
            className={clsx(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-overlay animate-toast-in',
              classes,
            )}
          >
            <Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{toastItem.title}</p>
              {toastItem.message && <p className="text-xs text-muted mt-0.5">{toastItem.message}</p>}
            </div>
            <button
              onClick={() => dismiss(toastItem.id)}
              aria-label={t('ปิดการแจ้งเตือน')}
              className="-mr-1 shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-skyblue-light hover:text-ink"
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
