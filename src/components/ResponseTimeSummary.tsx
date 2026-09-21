import { Timer, Siren, Truck, ClipboardCheck } from 'lucide-react'
import { Card } from './ui/Card'
import { StatBar, StatItem } from './DashboardCard'
import type { CaseStatus, EmergencyCase } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  สรุปเวลาตอบสนองการช่วยเหลือ: 'Emergency response time summary',
  'ค่าเฉลี่ยจากเคสที่มีข้อมูลครบ {n} เคส': 'Average from {n} cases with complete timing data',
  ยังไม่มีข้อมูลเวลาเพียงพอสำหรับสรุปผล: 'Not enough timing data yet to summarize',
  เวลารับแจ้งถึงมอบหมายหน่วย: 'Call to dispatch',
  เวลาตอบสนอง: 'Response time',
  เวลานำส่งโรงพยาบาล: 'Transport time',
  เคสที่เสร็จสิ้นทั้งหมด: 'Total completed cases',
  นาที: 'min',
})

function timestampFor(c: EmergencyCase, status: CaseStatus): number | undefined {
  return c.timeline.find((e) => e.status === status)?.timestamp
}

/** Average time (in minutes) between two timeline milestones, across only
 * the cases that actually reached both -- a case still in progress, or one
 * that skipped a step (e.g. closed with advice, no dispatch), silently
 * doesn't count rather than skewing the average with a partial duration. */
function avgMinutesBetween(cases: EmergencyCase[], fromStatus: CaseStatus, toStatus: CaseStatus): number | null {
  let sumMs = 0
  let count = 0
  for (const c of cases) {
    const from = timestampFor(c, fromStatus)
    const to = timestampFor(c, toStatus)
    if (from != null && to != null && to >= from) {
      sumMs += to - from
      count++
    }
  }
  return count === 0 ? null : sumMs / count / 60000
}

/**
 * The core operational KPIs a 1669 dispatch center tracks: how long from a
 * call coming in to a unit being assigned, how long from assignment to
 * actually reaching the scene (the industry-standard "response time"), and
 * how long the transport leg to hospital takes. All computed from the
 * timeline entries pushStatus() already records on every case (see
 * store.ts) -- no separate tracking needed, this just reads what's already
 * there. Scoped to every case currently in the store (not just "today"),
 * since a freshly-seeded or low-volume instance would otherwise show "not
 * enough data" far more often than is useful.
 */
export default function ResponseTimeSummary({ cases }: { cases: EmergencyCase[] }) {
  const t = useT()
  const dispatchMin = avgMinutesBetween(cases, 'received', 'rescue-assigned')
  const responseMin = avgMinutesBetween(cases, 'rescue-assigned', 'rescue-arrived')
  const transportMin = avgMinutesBetween(cases, 'transporting', 'hospital-arrived')
  const completedCount = cases.filter((c) => c.status === 'completed').length
  const hasSample = dispatchMin != null || responseMin != null || transportMin != null

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          <Timer className="size-4.5 text-primary" />
          {t('สรุปเวลาตอบสนองการช่วยเหลือ')}
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          {hasSample
            ? t('ค่าเฉลี่ยจากเคสที่มีข้อมูลครบ {n} เคส', { n: completedCount })
            : t('ยังไม่มีข้อมูลเวลาเพียงพอสำหรับสรุปผล')}
        </p>
      </div>
      <StatBar>
        <StatItem
          tone="primary"
          icon={<Siren className="size-5" />}
          label={t('เวลารับแจ้งถึงมอบหมายหน่วย')}
          value={dispatchMin != null ? `${dispatchMin.toFixed(1)} ${t('นาที')}` : '—'}
        />
        <StatItem
          tone="warning"
          icon={<Timer className="size-5" />}
          label={t('เวลาตอบสนอง')}
          value={responseMin != null ? `${responseMin.toFixed(1)} ${t('นาที')}` : '—'}
        />
        <StatItem
          tone="success"
          icon={<Truck className="size-5" />}
          label={t('เวลานำส่งโรงพยาบาล')}
          value={transportMin != null ? `${transportMin.toFixed(1)} ${t('นาที')}` : '—'}
        />
        <StatItem
          tone="primary"
          icon={<ClipboardCheck className="size-5" />}
          label={t('เคสที่เสร็จสิ้นทั้งหมด')}
          value={completedCount}
        />
      </StatBar>
    </Card>
  )
}
