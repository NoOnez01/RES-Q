import clsx from 'clsx'
import {
  Check,
  Phone,
  Camera,
  PhoneCall,
  ClipboardCheck,
  Search,
  UserCheck,
  Ambulance,
  MapPin,
  HeartPulse,
  Navigation,
  Building2,
  BedDouble,
  CheckCircle2,
} from 'lucide-react'
import { CASE_STATUS_FLOW, statusMeta } from '@/lib/types'
import type { CaseStatus, TimelineEvent } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'

// Gives each step its own recognizable identity (instead of an identical
// numbered circle for all 13) so the sequence reads at a glance -- what's
// literally happening at this step, not just "step 6 of 13". Shown for
// every step that isn't done yet; a completed step still shows a plain
// checkmark (see below), since "this happened" is the more useful signal
// once a step is behind you.
const STEP_ICON: Record<CaseStatus, React.ElementType> = {
  contacted: Phone,
  'photos-taken': Camera,
  'called-1669': PhoneCall,
  received: ClipboardCheck,
  'finding-rescue': Search,
  'rescue-assigned': UserCheck,
  'rescue-en-route': Ambulance,
  'rescue-arrived': MapPin,
  assisted: HeartPulse,
  transporting: Navigation,
  'hospital-arrived': Building2,
  'hospital-received': BedDouble,
  completed: CheckCircle2,
}

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
        const StepIcon = STEP_ICON[step.key]

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
              {isDone ? <Check className="size-3.5" strokeWidth={3} /> : <StepIcon className="size-3.5" />}
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
