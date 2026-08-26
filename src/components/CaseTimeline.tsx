import clsx from 'clsx'
import { Check } from 'lucide-react'
import { CASE_STATUS_FLOW, statusMeta } from '@/lib/types'
import type { CaseStatus, TimelineEvent } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'

export function CaseTimeline({
  timeline,
  currentStatus,
  compact = false,
  hiddenSteps,
}: {
  timeline: TimelineEvent[]
  currentStatus: CaseStatus
  compact?: boolean
  /** Steps to omit entirely, e.g. the reporter's own pre-dispatch actions. */
  hiddenSteps?: CaseStatus[]
}) {
  // Derived from the case's actual current status, not "the highest order
  // ever recorded" — a case can move backward (e.g. a rescue rejection),
  // and history alone can't tell current status apart from a past one.
  const currentOrder = statusMeta(currentStatus).order
  const steps = hiddenSteps ? CASE_STATUS_FLOW.filter((s) => !hiddenSteps.includes(s.key)) : CASE_STATUS_FLOW

  return (
    <ol className="relative flex flex-col gap-0">
      {steps.map((step, i) => {
        // Most recent occurrence, not the first — a status can now be
        // revisited (e.g. finding-rescue again after a rejection), and the
        // latest note/timestamp is the one worth showing.
        const matches = timeline.filter((t) => t.status === step.key)
        const event = matches[matches.length - 1]
        const isDone = !!event
        const isCurrent = step.order === currentOrder
        const isNext = step.order === currentOrder + 1
        const isLast = i === steps.length - 1

        return (
          <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                className={clsx(
                  'absolute left-[13px] top-6 h-full w-0.5 -translate-x-1/2',
                  isDone ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
            <span
              className={clsx(
                'relative z-10 flex size-[26px] shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                isDone && 'border-primary bg-primary text-white',
                !isDone && isCurrent && 'border-primary bg-white text-primary animate-pulse-glow',
                !isDone && isNext && 'border-primary/40 bg-white text-primary/60',
                !isDone && !isCurrent && !isNext && 'border-border bg-white text-muted/50',
              )}
            >
              {isDone ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={clsx(
                    'font-semibold',
                    isDone || isCurrent ? 'text-navy' : 'text-muted',
                    compact && 'text-sm',
                  )}
                >
                  {step.label}
                </p>
                {isCurrent && !isDone && (
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-bold text-warning">
                    กำลังดำเนินการ
                  </span>
                )}
                {isNext && !isDone && (
                  <span className="rounded-full bg-skyblue-light px-2 py-0.5 text-[11px] font-bold text-primary">
                    ขั้นตอนถัดไป
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">{step.org}</p>
              {event && (
                <p className="text-xs text-muted mt-0.5">
                  {formatDateTime(event.timestamp)}
                  {event.note && ` · ${event.note}`}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
