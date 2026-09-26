import { createPortal } from 'react-dom'
import { Phone, X } from 'lucide-react'
import { CallAvatar, type CallRole } from './call/CallAvatar'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ซ่อนการแจ้งเตือนสายนี้: 'Hide this call alert',
})

/**
 * The ringtone in CallRingtoneBridge is audible from any page, but on its
 * own nothing told someone *which* case was calling unless they happened to
 * be on the right screen already. This is the visual half: an incoming-call
 * banner along the top, the way call apps show one while you're using the
 * app, that stays until the ring itself stops -- a new 1669 call for
 * dispatch, or an invite into one for a rescue crew. Hiding it doesn't
 * decline anything: another dispatcher may still answer.
 */
export function IncomingCallAlert({
  callerRole,
  title,
  message,
  answerLabel,
  onAnswer,
  onDismiss,
}: {
  callerRole: CallRole
  title: string
  message: string
  answerLabel: string
  onAnswer: () => void
  onDismiss: () => void
}) {
  const t = useT()
  return createPortal(
    <div className="fixed inset-x-0 top-0 z-[210] flex justify-center p-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:p-4">
      <div
        role="alert"
        className="flex w-full max-w-md items-center gap-3 rounded-3xl bg-navy p-3 text-white shadow-card-lg ring-1 ring-white/10 animate-fade-in-up"
      >
        <CallAvatar role={callerRole} size="sm" ringing />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{title}</p>
          <p className="truncate text-xs text-white/70">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('ซ่อนการแจ้งเตือนสายนี้')}
          title={t('ซ่อนการแจ้งเตือนสายนี้')}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
        >
          <X className="size-5" />
        </button>
        <button
          type="button"
          onClick={onAnswer}
          aria-label={answerLabel}
          title={answerLabel}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success transition-colors hover:bg-success/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
        >
          <Phone className="size-5" />
        </button>
      </div>
    </div>,
    document.body,
  )
}
