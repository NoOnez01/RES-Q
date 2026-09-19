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
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Loader2 className="size-8 animate-spin-slow text-primary" />
      <p className="text-sm font-medium text-muted">{label ?? t('กำลังโหลดข้อมูล...')}</p>
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface/60 py-14 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-skyblue-light text-primary">
        {icon ?? <Inbox className="size-6" />}
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-emergency/20 bg-emergency/5 py-14 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-emergency/10 text-emergency">
        <AlertCircle className="size-6" />
      </div>
      <p className="font-semibold text-ink">{title ?? t('เกิดข้อผิดพลาด')}</p>
      <p className="max-w-sm text-sm text-muted">{description ?? t('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง')}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-success/20 bg-success/5 py-14 px-6 text-center animate-scale-in">
      <div className="flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="size-8" />
      </div>
      <p className="text-lg font-bold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  )
}
