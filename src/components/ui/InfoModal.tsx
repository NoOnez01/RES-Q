import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './Button'

interface InfoModalProps {
  open: boolean
  title: string
  message: string
  icon?: React.ReactNode
  onClose: () => void
  actionLabel?: string
  onAction?: () => void
}

export function InfoModal({ open, title, message, icon, onClose, actionLabel, onAction }: InfoModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-navy/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-modal-title"
        className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-card-lg animate-scale-in sm:max-w-sm sm:rounded-3xl"
      >
        <button
          onClick={onClose}
          aria-label="ปิด"
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted transition-colors hover:bg-skyblue-light hover:text-navy"
        >
          <X className="size-5" />
        </button>
        {icon && <div className="mb-3">{icon}</div>}
        <h2 id="info-modal-title" className="pr-8 text-lg font-bold text-navy">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <Button variant="outline" fullWidth onClick={onClose} className="sm:flex-1">
            ปิด
          </Button>
          {actionLabel && onAction && (
            <Button variant="primary" fullWidth onClick={onAction} className="sm:flex-1">
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
