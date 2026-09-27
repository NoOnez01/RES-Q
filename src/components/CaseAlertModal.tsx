import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Siren, Ambulance, Building2, UserX, ClipboardCheck, ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import { Button } from './ui/Button'
import { SeverityBadge } from './SeverityBadge'
import type { HandoffAlert } from './NotificationAlertBridge'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'มีเหตุอื่นรอดำเนินการอีก {count} รายการ': '{count} more case(s) waiting',
  ปิด: 'Close',
  ดูรายละเอียด: 'View details',
  เดิม: 'Original',
  เสนอโดยหน่วยกู้ชีพ: 'Proposed by rescue team',
  ยืนยันระดับความรุนแรง: 'Confirm severity',
  ไม่ยืนยัน: 'Decline',
  ดูรายละเอียดเหตุ: 'View case details',
  ภายหลัง: 'Later',
})

const EVENT_ICON: Record<HandoffAlert['event'], React.ComponentType<{ className?: string }>> = {
  'case-new': Siren,
  'rescue-rejected': UserX,
  'severity-proposal': ClipboardCheck,
  'rescue-assigned': Ambulance,
  'hospital-incoming': Building2,
}

/**
 * A dedicated modal for the handoff events that actually require a staff
 * member to act (new case, rescue rejection, a severity change to approve,
 * hospital handoff) -- a toast in
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
  onDecide,
}: {
  alert: HandoffAlert | null
  queueCount: number
  onView: () => void
  onDismiss: () => void
  /** A severity proposal: approve (true) or decline (false) it here. */
  onDecide: (accept: boolean) => void
}) {
  const t = useT()
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

  const Icon = EVENT_ICON[alert.event]
  const proposal = alert.event === 'severity-proposal' ? alert.case.rescueSeverityProposal : null
  const current = alert.case.assessment?.severity

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-navy/50 backdrop-blur-[2px] animate-fade-in" onClick={onDismiss} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="case-alert-title"
        className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface p-6 shadow-card-lg animate-scale-in"
      >
        <div
          className={clsx(
            'flex size-12 items-center justify-center rounded-full',
            alert.urgent ? 'bg-emergency/10 text-emergency shadow-[0_0_0_6px_rgba(217,45,32,0.08)]' : 'bg-skyblue-pale text-primary',
          )}
        >
          <Icon className="size-6" />
        </div>
        <h2 id="case-alert-title" className="mt-4 text-lg font-bold text-ink">
          {alert.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{alert.message}</p>
        {proposal && (
          <div className="mt-4 rounded-2xl border border-border bg-skyblue-pale/50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              {current && (
                <>
                  <div className="flex flex-col items-start gap-1">
                    <p className="text-xs text-muted">{t('เดิม')}</p>
                    <SeverityBadge severity={current} />
                  </div>
                  <ArrowRight className="mt-4 size-4 text-muted" aria-hidden="true" />
                </>
              )}
              <div className="flex flex-col items-start gap-1">
                <p className="text-xs text-muted">{t('เสนอโดยหน่วยกู้ชีพ')}</p>
                <SeverityBadge severity={proposal.severity} />
              </div>
            </div>
            {proposal.note && <p className="mt-3 text-sm text-ink">{proposal.note}</p>}
          </div>
        )}
        {queueCount > 1 && (
          <p className="mt-3 text-xs font-medium text-muted">{t('มีเหตุอื่นรอดำเนินการอีก {count} รายการ', { count: queueCount - 1 })}</p>
        )}
        {proposal ? (
          <div className="mt-6 flex flex-col gap-2">
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button variant="outline" fullWidth onClick={() => onDecide(false)} className="sm:flex-1">
                {t('ไม่ยืนยัน')}
              </Button>
              <Button variant={alert.urgent ? 'danger' : 'primary'} fullWidth onClick={() => onDecide(true)} className="sm:flex-1">
                {t('ยืนยันระดับความรุนแรง')}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" fullWidth onClick={onView}>
                {t('ดูรายละเอียดเหตุ')}
              </Button>
              <Button variant="ghost" size="sm" fullWidth onClick={onDismiss}>
                {t('ภายหลัง')}
              </Button>
            </div>
          </div>
        ) : (
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <Button variant="outline" fullWidth onClick={onDismiss} className="sm:flex-1">
            {t('ปิด')}
          </Button>
          <Button
            variant={alert.urgent ? 'danger' : 'primary'}
            fullWidth
            onClick={onView}
            className="sm:flex-1"
          >
            {t('ดูรายละเอียด')}
          </Button>
        </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
