import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Phone } from 'lucide-react'
import { useT, registerTranslations } from '@/lib/i18n'
import { CallAvatar, type CallRole } from './CallAvatar'

registerTranslations({
  'ดังมาแล้ว {time}': 'Ringing for {time}',
  'มีสายรออีก {n} สาย': '{n} more call(s) waiting',
})

function RingingFor({ since }: { since: number }) {
  const t = useT()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const sec = Math.max(0, Math.floor((now - since) / 1000))
  const time = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  return <p className="text-sm tabular-nums text-white/70">{t('ดังมาแล้ว {time}', { time })}</p>
}

export interface IncomingCallDetail {
  icon: ReactNode
  text: string
}

/**
 * A call ringing for this desk, as a window in the middle of the screen:
 * who's calling and what's known about the case so far, so staff can pick
 * it up already knowing where and what -- rather than a strip along the top
 * that's easy to miss mid-task. Hiding it doesn't decline anything; the
 * ring (and any other desk) carries on. Used only while this device isn't
 * already in a call -- then the smaller banner takes over, so nothing
 * covers a live conversation.
 */
export function IncomingCallPopup({
  callerRole,
  title,
  caseNumber,
  details,
  ringingSince,
  waitingCount = 0,
  answerLabel,
  dismissLabel,
  onAnswer,
  onDismiss,
}: {
  callerRole: CallRole
  title: string
  caseNumber: string
  details: IncomingCallDetail[]
  ringingSince?: number
  /** Other calls ringing behind this one. */
  waitingCount?: number
  answerLabel: string
  dismissLabel: string
  onAnswer: () => void
  onDismiss: () => void
}) {
  const t = useT()
  const answerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    answerRef.current?.focus()
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDismiss()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onDismiss])

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/55 backdrop-blur-[2px] animate-fade-in" aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="incoming-call-popup-title"
        className="relative w-full max-w-sm rounded-3xl bg-navy p-6 text-white shadow-card-lg ring-1 ring-white/10 animate-scale-in"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <CallAvatar role={callerRole} size="md" ringing />
          <div>
            <p id="incoming-call-popup-title" className="text-lg font-bold">
              {title}
            </p>
            <p className="font-mono text-sm tabular-nums text-white/80">{caseNumber}</p>
            {ringingSince !== undefined && <RingingFor since={ringingSince} />}
          </div>
        </div>

        {details.length > 0 && (
          <ul className="mt-5 divide-y divide-white/10 rounded-2xl bg-white/5">
            {details.map((d, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="shrink-0 text-white/60 [&>svg]:size-4">{d.icon}</span>
                <span className="min-w-0 truncate">{d.text}</span>
              </li>
            ))}
          </ul>
        )}

        {waitingCount > 0 && (
          <p className="mt-3 text-center text-sm font-semibold text-warning">{t('มีสายรออีก {n} สาย', { n: waitingCount })}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="h-12 flex-1 rounded-2xl bg-white/10 text-sm font-semibold transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
          >
            {dismissLabel}
          </button>
          <button
            ref={answerRef}
            type="button"
            onClick={onAnswer}
            className="flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-success text-sm font-bold transition-colors hover:bg-success/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
          >
            <Phone className="size-4.5" aria-hidden="true" />
            {answerLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
