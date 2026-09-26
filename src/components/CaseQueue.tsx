import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import type { EmergencyCase } from '@/lib/types'
import { statusMeta } from '@/lib/types'
import { SeverityBadge } from './SeverityBadge'
import { StatusBadge } from './StatusBadge'
import { formatDateTime, formatTime } from '@/lib/utils'
import { checkCaseConsistency } from '@/lib/caseHealth'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ความรุนแรง: 'Severity',
  เหตุ: 'Case',
  สถานที่: 'Location',
  สถานะ: 'Status',
  เวลา: 'Time',
  ยังไม่ประเมิน: 'Not assessed',
  รอรายละเอียดเหตุการณ์: 'Awaiting incident details',
  ยังไม่ระบุตำแหน่ง: 'No location set yet',
  'ผู้ป่วย {n} คน': '{n} patient(s)',
  เมื่อสักครู่: 'Just now',
  '{n} นาที': '{n} min',
  '{h} ชม. {m} นาที': '{h} h {m} min',
  รอหน่วยกู้ชีพตอบรับ: 'Awaiting rescue team response',
  หน่วยกู้ชีพปฏิเสธการรับเหตุ: 'Rescue team declined the case',
  ข้อมูลของเหตุไม่สอดคล้องกัน: 'Case data is inconsistent',
})

const DAY_MS = 24 * 60 * 60 * 1000

/** "12 นาที" / "1 ชม. 5 นาที" since `ts`; a date once it's older than a day. */
function Elapsed({ ts, now }: { ts: number; now: number }) {
  const t = useT()
  const ms = Math.max(0, now - ts)
  const min = Math.floor(ms / 60_000)
  const label =
    ms >= DAY_MS
      ? formatDateTime(ts)
      : min < 1
        ? t('เมื่อสักครู่')
        : min < 60
          ? t('{n} นาที', { n: min })
          : t('{h} ชม. {m} นาที', { h: Math.floor(min / 60), m: min % 60 })
  return (
    <span className="flex flex-col lg:items-end">
      <span className="text-sm font-semibold tabular-nums text-ink">{label}</span>
      {ms < DAY_MS && <span className="text-xs tabular-nums text-muted">{formatTime(ts)}</span>}
    </span>
  )
}

/** Re-renders every 30 s so elapsed times stay current on an open board. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

/** Who's handling it -- or, while dispatch waits on a team, that wait. */
function unitLine(c: EmergencyCase, t: ReturnType<typeof useT>): string | null {
  if (c.status === 'rescue-assigned') return t('รอหน่วยกู้ชีพตอบรับ')
  if (c.status === 'finding-rescue' && c.rescueRejectedAt) return t('หน่วยกู้ชีพปฏิเสธการรับเหตุ')
  if (!c.assignedRescueTeam) return null
  const unit = c.assignedVehicle?.unitCode
  return unit ? `${c.assignedRescueTeam.name} · ${unit}` : c.assignedRescueTeam.name
}

export interface QueueDetail {
  primary: string
  secondary?: string
}

export interface CaseQueueRow {
  case: EmergencyCase
  to: string
  /** The one thing this role does next with the case, if anything. */
  action?: ReactNode
}

/**
 * Cases as rows in one panel -- the shape of a queue an operator scans,
 * rather than a grid of cards. Every row reads the same way across roles:
 * severity, the case, where (or who, for a hospital), status and the unit
 * handling it, how long ago, and the role's next action. The whole row
 * opens the case; its action button sits above that link.
 */
export function CaseQueue({
  rows,
  empty,
  detailLabel,
  detailOf,
  timeOf = (c) => c.createdAt,
  actionWidth = '1.25rem',
}: {
  rows: CaseQueueRow[]
  /** Shown in place of the rows when there are none. */
  empty: string
  /** Header of the third column; defaults to the location. */
  detailLabel?: string
  detailOf?: (c: EmergencyCase) => QueueDetail
  /** Which moment the time column counts from. */
  timeOf?: (c: EmergencyCase) => number
  /** Width of the action column on wide screens, so rows line up. */
  actionWidth?: string
}) {
  const t = useT()
  const now = useNow()
  const style = { '--queue-action': actionWidth } as CSSProperties
  const columns =
    'lg:grid-cols-[7.5rem_minmax(0,1.35fr)_minmax(0,1.25fr)_minmax(0,1.35fr)_6rem_var(--queue-action)] lg:[grid-template-areas:"sev_case_place_status_time_action"]'

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card" style={style}>
      {rows.length > 0 && (
        <div
          className={clsx(
            'hidden gap-x-4 border-b border-border bg-surface-alt px-4 py-2.5 text-xs font-semibold text-muted lg:grid',
            columns,
          )}
        >
          <span>{t('ความรุนแรง')}</span>
          <span>{t('เหตุ')}</span>
          <span>{detailLabel ?? t('สถานที่')}</span>
          <span>{t('สถานะ')}</span>
          <span className="text-right">{t('เวลา')}</span>
          <span />
        </div>
      )}
      {rows.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map(({ case: c, to, action }) => {
            const issues = checkCaseConsistency(c)
            const unassessed = c.status === 'received' && !c.assessment
            const done = c.status === 'completed' || c.status === 'hospital-received'
            const detail = detailOf?.(c) ?? {
              primary: c.location?.address ?? t('ยังไม่ระบุตำแหน่ง'),
              secondary: t('ผู้ป่วย {n} คน', { n: c.incidentDetails?.patientCount ?? '-' }),
            }
            const unit = unitLine(c, t)
            const waiting = c.status === 'rescue-assigned' || (c.status === 'finding-rescue' && !!c.rescueRejectedAt)
            return (
              <li
                key={c.id}
                className={clsx(
                  'group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3.5 transition-colors hover:bg-skyblue-pale',
                  // On a phone the action gets a row of its own, full width, so two
                  // buttons never crowd the status.
                  action
                    ? '[grid-template-areas:"sev_time"_"case_case"_"place_place"_"status_status"_"action_action"]'
                    : '[grid-template-areas:"sev_time"_"case_case"_"place_place"_"status_status"]',
                  'lg:gap-y-0',
                  columns,
                  unassessed && 'bg-emergency/[0.035]',
                )}
              >
                <div className="[grid-area:sev]">
                  {c.assessment ? (
                    <SeverityBadge severity={c.assessment.severity} />
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-dashed border-emergency/40 px-2.5 py-1 text-xs font-semibold text-emergency-dark">
                      {t('ยังไม่ประเมิน')}
                    </span>
                  )}
                </div>

                <div className="min-w-0 [grid-area:case]">
                  <p className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-muted">
                    {c.caseNumber}
                    {issues.length > 0 && (
                      <AlertTriangle
                        className="size-3.5 shrink-0 text-warning"
                        role="img"
                        aria-label={t('ข้อมูลของเหตุไม่สอดคล้องกัน')}
                      >
                        <title>{issues.map((i) => t(i.message)).join(' · ')}</title>
                      </AlertTriangle>
                    )}
                  </p>
                  <Link
                    to={to}
                    className={clsx(
                      'block truncate font-semibold outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-primary/50',
                      done ? 'text-ink/70' : 'text-ink',
                    )}
                  >
                    {c.incidentDetails?.incidentType ?? t('รอรายละเอียดเหตุการณ์')}
                  </Link>
                </div>

                <div className="min-w-0 [grid-area:place]">
                  <p className="line-clamp-2 break-words text-sm text-ink/85">{detail.primary}</p>
                  {detail.secondary && <p className="line-clamp-2 break-words text-xs text-muted">{detail.secondary}</p>}
                </div>

                <div className="flex min-w-0 flex-col items-start gap-1 [grid-area:status]">
                  <StatusBadge status={c.status} />
                  {unit && (
                    <span className={clsx('max-w-full truncate text-xs', waiting ? 'font-semibold text-warning' : 'text-muted')}>
                      {unit}
                    </span>
                  )}
                </div>

                <div className="justify-self-end text-right [grid-area:time]">
                  <Elapsed ts={timeOf(c)} now={now} />
                </div>

                <div className="relative z-10 flex items-center justify-end gap-2 [grid-area:action] max-lg:mt-1.5 max-lg:w-full max-lg:[&>button]:flex-1 lg:justify-self-end [&_button]:whitespace-nowrap">
                  {action}
                  <ChevronRight className="hidden size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 lg:block" aria-hidden="true" />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** A queue's heading, with its count and an optional action on the right. */
export function QueueSection({
  title,
  count,
  urgent = false,
  aside,
  className,
  children,
}: {
  title: string
  count: number
  /** Something here is waiting on this role -- the count turns red. */
  urgent?: boolean
  aside?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={clsx('mt-8', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          {title}
          <span
            className={clsx(
              'inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
              urgent && count > 0 ? 'bg-emergency text-white' : 'bg-border/70 text-ink/70',
            )}
          >
            {count}
          </span>
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** Shared ordering for an action queue: unassessed first, then the most
 * severe, then whoever has waited longest. */
export function byUrgency(a: EmergencyCase, b: EmergencyCase): number {
  const rank = (c: EmergencyCase) => (c.status === 'received' && !c.assessment ? 0 : 1)
  if (rank(a) !== rank(b)) return rank(a) - rank(b)
  const sa = a.assessment?.severity ?? 6
  const sb = b.assessment?.severity ?? 6
  if (sa !== sb) return sa - sb
  return a.createdAt - b.createdAt
}

/** When a case reached `status`, from its timeline. */
export function reachedAt(c: EmergencyCase, status: EmergencyCase['status']): number | undefined {
  return c.timeline.find((e) => e.status === status)?.timestamp
}

export function isToday(ts: number | undefined): boolean {
  if (ts === undefined) return false
  const d = new Date(ts)
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

/** Whether a case has moved past `status` in the pipeline. */
export function isPast(c: EmergencyCase, status: EmergencyCase['status']): boolean {
  return statusMeta(c.status).order > statusMeta(status).order
}
