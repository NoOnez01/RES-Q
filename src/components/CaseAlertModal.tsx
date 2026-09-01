import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Siren, Ambulance, Building2 } from 'lucide-react'
import clsx from 'clsx'
import { Button } from './ui/Button'
import type { HandoffAlert } from './NotificationAlertBridge'

const KIND_ICON: Record<HandoffAlert['kind'], React.ComponentType<{ className?: string }>> = {
  dispatch: Siren,
  rescue: Ambulance,
  hospital: Building2,
}

/**
 * A dedicated modal for the handoff events that actually require a staff
 * member to act (new case, rescue rejection, hospital handoff) -- a toast in
 * the corner is easy to miss when the person isn't looking at the screen,
 * which is exactly the failure mode that matters in a dispatch context.
 * Queues one alert at a time so a burst of events (e.g. two cases landing at
 * once) doesn't stack overlapping dialogs.
 */
export function CaseAlertModal({
  alert,
  queueCount,
  onView,
  onDismiss,
}: {
  alert: HandoffAlert | null
  queueCount: number
  onView: () => void
  onDismiss: () => void
}) {
  useEffect(() => {
    if (!alert) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDismiss()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [alert, onDismiss])

  if (!alert) return null

  const Icon = KIND_ICON[alert.kind]

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-navy/50 backdrop-blur-[2px] animate-fade-in" onClick={onDismiss} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="case-alert-title"
        className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-card-lg animate-scale-in"
      >
        <div
          className={clsx(
            'flex size-12 items-center justify-center rounded-full',
            alert.urgent ? 'bg-emergency/10 text-emergency shadow-[0_0_0_6px_rgba(217,45,32,0.08)]' : 'bg-skyblue-pale text-primary',
          )}
        >
          <Icon className="size-6" />
        </div>
        <h2 id="case-alert-title" className="mt-4 text-lg font-bold text-navy">
          {alert.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{alert.message}</p>
        {queueCount > 1 && (
          <p className="mt-3 text-xs font-medium text-muted">มีเคสอื่นรออีก {queueCount - 1} รายการ</p>
        )}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <Button variant="outline" fullWidth onClick={onDismiss} className="sm:flex-1">
            ปิด
          </Button>
          <Button
            variant={alert.urgent ? 'danger' : 'primary'}
            fullWidth
            onClick={onView}
            className="sm:flex-1"
          >
            ดูรายละเอียด
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
