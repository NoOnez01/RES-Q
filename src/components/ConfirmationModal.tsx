import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { Button } from './ui/Button'

interface ConfirmationModalProps {
  open: boolean
  title: string
  /** Omit for a short, title-only confirmation -- not every confirmation
   * needs an explanatory paragraph underneath. */
  message?: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  tone?: 'primary' | 'danger'
  confirmLoading?: boolean
  icon?: React.ReactNode
}

export function ConfirmationModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'ยกเลิก',
  onConfirm,
  onCancel,
  tone = 'primary',
  confirmLoading = false,
  icon,
}: ConfirmationModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-navy/50 backdrop-blur-[2px] animate-fade-in" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-card-lg animate-scale-in"
      >
        <button
          onClick={onCancel}
          aria-label="ปิด"
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted hover:bg-skyblue-light hover:text-navy transition-colors"
        >
          <X className="size-5" />
        </button>
        {icon && <div className="mb-3">{icon}</div>}
        <h2 id="confirm-modal-title" className="text-lg font-bold text-navy pr-8">
          {title}
        </h2>
        {message && <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <Button variant="outline" fullWidth onClick={onCancel} className="sm:flex-1">
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            fullWidth
            onClick={onConfirm}
            loading={confirmLoading}
            className={clsx('sm:flex-1')}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
