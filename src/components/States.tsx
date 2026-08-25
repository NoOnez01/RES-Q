import { Loader2, Inbox, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './ui/Button'

export function LoadingState({ label = 'กำลังโหลดข้อมูล...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Loader2 className="size-8 animate-spin-slow text-primary" />
      <p className="text-sm font-medium text-muted">{label}</p>
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-white/60 py-14 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-skyblue-light text-primary">
        {icon ?? <Inbox className="size-6" />}
      </div>
      <p className="font-semibold text-navy">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({
  title = 'เกิดข้อผิดพลาด',
  description = 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-emergency/20 bg-emergency/5 py-14 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-emergency/10 text-emergency">
        <AlertCircle className="size-6" />
      </div>
      <p className="font-semibold text-navy">{title}</p>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          ลองอีกครั้ง
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
      <p className="text-lg font-bold text-navy">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </div>
  )
}
