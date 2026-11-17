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
import { useT } from '@/lib/i18n'

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
  const t = useT()

  return (
    <ol className="relative flex flex-col gap-0">
      {steps.map((step, i) => {
        // Most recent occurrence, not the first — a status can now be
        // revisited (e.g. finding-rescue again after a rejection), and the
        // latest note/timestamp is the one worth showing.
        const matches = timeline.filter((ev) => ev.status === step.key)
        const event = matches[matches.length - 1]
        const isDone = !!event
        const isCurrent = step.order === currentOrder
        const isNext = step.order === currentOrder + 1
        const isLast = i === steps.length - 1
        const StepIcon = STEP_ICON[step.key]

        return (
          <li key={step.key} className={clsx('relative flex gap-3', isDone || isCurrent ? 'pb-4' : 'pb-2.5', 'last:pb-0')}>
            {!isLast && (
              <span
                className={clsx('absolute left-[10px] top-6 bottom-1 w-px -translate-x-1/2', isDone ? 'bg-primary/60' : 'bg-border')}
                aria-hidden="true"
              />
            )}
            <span
              className={clsx(
                'relative z-10 mt-px flex size-5 shrink-0 items-center justify-center rounded-full border',
                isDone && 'border-primary-fill bg-primary-fill text-white',
                !isDone && isCurrent && 'border-primary bg-surface text-primary ring-4 ring-primary/15',
                !isDone && isNext && 'border-primary/50 bg-surface text-primary/70',
                !isDone && !isCurrent && !isNext && 'border-input bg-surface text-muted/60',
              )}
              aria-hidden="true"
            >
              {isDone ? <Check className="size-3" strokeWidth={3} /> : <StepIcon className="size-2.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p
                  className={clsx(
                    'text-sm leading-5',
                    isDone || isCurrent ? 'font-medium text-ink' : 'text-muted',
                  )}
                >
                  {t(step.label)}
                </p>
                {isCurrent && !isDone && (
                  <span className="rounded-md bg-warning/10 px-1.5 py-px text-[11px] font-semibold text-warning-ink">
                    {t('กำลังดำเนินการ')}
                  </span>
                )}
                {isNext && !isDone && (
                  <span className="rounded-md bg-skyblue-light px-1.5 py-px text-[11px] font-semibold text-primary">
                    {t('ขั้นตอนถัดไป')}
                  </span>
                )}
              </div>
              <p className={clsx('text-meta text-muted', !(isDone || isCurrent) && 'text-muted/80')}>
                {t(step.org)}
                {event && (
                  <>
                    <span aria-hidden="true"> · </span>
                    <time className="tabular-nums">{formatDateTime(event.timestamp)}</time>
                    {event.note && ` · ${event.note}`}
                  </>
                )}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
