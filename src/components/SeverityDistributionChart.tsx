import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from './ui/Card'
import { CHART_COLORS, CHART_TICK_STYLE, CHART_TOOLTIP_STYLE, SEVERITY_CHART_COLORS } from '@/lib/chartTheme'
import { SEVERITY_SHORT_LABEL } from '@/lib/types'
import type { EmergencyCase, Severity } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  วิกฤต: 'Critical',
  ฉุกเฉิน: 'Emergency',
  เร่งด่วน: 'Urgent',
  ไม่เร่งด่วน: 'Less urgent',
  ทั่วไป: 'General',
  ยังไม่มีเหตุที่ได้รับการประเมินระดับความรุนแรง: 'No cases have a severity assessment yet',
  '{n} เหตุ': '{n} cases',
  จำนวน: 'Count',
})

const SEVERITIES: Severity[] = [1, 2, 3, 4, 5]

/**
 * Small horizontal bar chart of how many of the given cases fall into each
 * severity level -- shared across the dispatch/rescue/hospital dashboards
 * so each role gets the same at-a-glance case-mix read, scoped to whatever
 * case list that dashboard already computes for its own StatBar/list.
 * Cases without a severity yet (no dispatcher assessment) aren't counted --
 * this chart is about the mix of already-triaged cases, not queue depth.
 */
// Default export so each dashboard can React.lazy() it -- recharts is
// ~400kB and this chart lives on the three main-landing dashboards (not
// already-lazy routes like FeedbackStats), so it must not bloat their
// eager bundle. See src/App.tsx's comment on DispatchFeedbackStats for
// the same reasoning.
export default function SeverityDistributionChart({ title, cases }: { title: string; cases: EmergencyCase[] }) {
  const t = useT()
  const counts = SEVERITIES.map((sev) => ({
    severity: sev,
    label: t(SEVERITY_SHORT_LABEL[sev]),
    count: cases.filter((c) => c.assessment?.severity === sev).length,
  }))
  const total = counts.reduce((sum, c) => sum + c.count, 0)

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-heading text-ink">
        {title}
      </h2>
      {total === 0 ? (
        <p className="text-sm text-muted">{t('ยังไม่มีเหตุที่ได้รับการประเมินระดับความรุนแรง')}</p>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={counts} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis type="category" dataKey="label" width={72} tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value) => [t('{n} เหตุ', { n: value as number }), t('จำนวน')]}
              />
              <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={20}>
                {counts.map((c) => (
                  <Cell key={c.severity} fill={SEVERITY_CHART_COLORS[c.severity]} />
                ))}
                <LabelList dataKey="count" position="right" offset={8} style={{ ...CHART_TICK_STYLE, fill: CHART_COLORS.navy, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
