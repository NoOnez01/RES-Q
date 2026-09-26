import { useEffect, useRef, type ReactNode, type Ref } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { PhoneOff, Video } from 'lucide-react'
import { useT, registerTranslations } from '@/lib/i18n'
import { CallAvatar, type CallRole } from './CallAvatar'

registerTranslations({
  ปฏิเสธสาย: 'Decline',
  รับสาย: 'Answer',
})

function AnswerButton({
  label,
  tone,
  onClick,
  buttonRef,
  children,
}: {
  label: string
  tone: 'accept' | 'decline'
  onClick: () => void
  buttonRef?: Ref<HTMLButtonElement>
  children: ReactNode
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2 rounded-2xl text-sm font-semibold focus-visible:outline-none"
    >
      <span
        className={clsx(
          'flex size-16 items-center justify-center rounded-full text-white shadow-card-lg transition-transform duration-150 group-active:scale-95 group-focus-visible:ring-4 group-focus-visible:ring-white/60 [&>svg]:size-7',
          tone === 'accept' ? 'bg-success' : 'bg-emergency',
        )}
      >
        {children}
      </span>
      {label}
    </button>
  )
}

/**
 * A call coming in, full screen, the way a phone shows one: who's calling,
 * big, with a decline button on the left and answer on the right.
 */
export function IncomingCallScreen({
  callerRole,
  title,
  subtitle,
  onAccept,
  onDecline,
}: {
  callerRole: CallRole
  title: string
  subtitle: string
  onAccept: () => void
  onDecline: () => void
}) {
  const t = useT()
  const acceptRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    acceptRef.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="incoming-call-title"
      aria-describedby="incoming-call-subtitle"
      className="fixed inset-0 z-[205] flex flex-col items-center justify-between bg-navy px-6 pb-[calc(env(safe-area-inset-bottom)+3rem)] pt-[calc(env(safe-area-inset-top)+5rem)] text-white animate-fade-in"
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgb(var(--color-primary)/0.4),transparent_65%)]"
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-center gap-7 text-center">
        <CallAvatar role={callerRole} size="lg" ringing />
        <div>
          <p id="incoming-call-title" className="text-3xl font-bold">
            {title}
          </p>
          <p id="incoming-call-subtitle" className="mt-2 text-sm text-white/75">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="relative flex w-full max-w-xs justify-between">
        <AnswerButton label={t('ปฏิเสธสาย')} tone="decline" onClick={onDecline}>
          <PhoneOff />
        </AnswerButton>
        <AnswerButton label={t('รับสาย')} tone="accept" onClick={onAccept} buttonRef={acceptRef}>
          <Video />
        </AnswerButton>
      </div>
    </div>,
    document.body,
  )
}
