import { Loader2, Inbox, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './ui/Button'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'กำลังโหลดข้อมูล...': 'Loading...',
  เกิดข้อผิดพลาด: 'Something went wrong',
  'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง': 'Could not load the data. Please try again.',
  ลองอีกครั้ง: 'Try again',
})

export function LoadingState({ label }: { label?: string }) {
  const t = useT()
  return (
    <div role="status" className="flex items-center justify-center gap-2.5 py-16 text-center">
      <Loader2 className="size-4 animate-spin-slow text-muted" aria-hidden="true" />
      <p className="text-sm text-muted">{label ?? t('กำลังโหลดข้อมูล...')}</p>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-input bg-surface px-6 py-12 text-center">
      <div className="text-muted/70 [&>svg]:size-6">{icon ?? <Inbox className="size-6" />}</div>
      <p className="mt-3 text-subheading text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-small text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  /** Override when onRetry actually navigates elsewhere (e.g. to login or a
   * dashboard) rather than retrying the same action -- "ลองอีกครั้ง" would
   * misdescribe what the button does. */
  retryLabel?: string
}) {
  const t = useT()
  return (
    <div role="alert" className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 py-12 text-center">
      <AlertCircle className="size-6 text-emergency" aria-hidden="true" />
      <p className="mt-3 text-subheading text-ink">{title ?? t('เกิดข้อผิดพลาด')}</p>
      <p className="mt-1 max-w-sm text-small text-muted">{description ?? t('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง')}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
          {retryLabel ?? t('ลองอีกครั้ง')}
        </Button>
      )}
    </div>
  )
}

export function SuccessState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div role="status" className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 py-12 text-center animate-fade-in">
      <div className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success-ink">
        <CheckCircle2 className="size-5" aria-hidden="true" />
      </div>
      <p className="mt-3 text-heading text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-small text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
