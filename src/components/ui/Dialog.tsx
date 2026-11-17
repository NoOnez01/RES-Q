import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({ ปิด: 'Close' })

/** Scrim + panel classes, for the few overlays that manage their own
 * lifecycle (camera capture, alerts) but should look like every dialog. */
export const DIALOG_SCRIM = 'absolute inset-0 bg-navy/45 animate-fade-in'
export const DIALOG_PANEL =
  'relative w-full max-h-[92vh] overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-overlay animate-scale-in sm:rounded-2xl'

const WIDTH = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-2xl' }

/**
 * A modal dialog: for decisions that must interrupt (confirm, acknowledge)
 * or a short focused task. A bottom sheet on a phone, centered from `sm`.
 * Escape and the scrim close it; focus moves in on open and returns to
 * whatever opened it on close.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = 'md',
  dismissible = true,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  children?: ReactNode
  /** Actions, primary last -- right-aligned on desktop, stacked on a phone. */
  footer?: ReactNode
  size?: keyof typeof WIDTH
  /** False for a dialog that must be answered (no X, no scrim/Esc close). */
  dismissible?: boolean
}) {
  const t = useT()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  // Callers pass inline handlers; reading them through a ref keeps the
  // effect below from re-running (and re-grabbing focus) on every render.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [open, dismissible])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      <div className={DIALOG_SCRIM} onClick={dismissible ? onClose : undefined} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(DIALOG_PANEL, WIDTH[size], 'focus:outline-none')}
      >
        <div className="flex items-start gap-3 px-5 pb-1 pt-5 sm:px-6">
          {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-heading text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('ปิด')}
              className="-mr-1.5 -mt-1 shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-skyblue-light hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {children && <div className="flex flex-col gap-3 px-5 pt-3 sm:px-6">{children}</div>}
        {footer ? (
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border bg-surface-alt px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6 sm:pb-3.5">
            {footer}
          </div>
        ) : (
          <div className="h-5" />
        )}
      </div>
    </div>,
    document.body,
  )
}
