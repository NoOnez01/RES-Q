import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import clsx from 'clsx'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState, LoadingState } from '@/components/States'
import { fetchFeedbackStats, type FeedbackStats } from '@/lib/caseFeedback'
import { formatDateTime } from '@/lib/utils'
import { CHART_TICK_STYLE, CHART_TOOLTIP_STYLE, SEVERITY_CHART_COLORS } from '@/lib/chartTheme'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ประเมินหน่วยกู้ชีพ: 'Rate rescue teams',
  ยังไม่มีข้อมูลความพึงพอใจ: 'No satisfaction data yet',
  'คะแนนและความคิดเห็นจะแสดงที่นี่ เมื่อผู้แจ้งเหตุให้คะแนนเหตุที่ดำเนินการเสร็จสิ้นแล้ว': 'Ratings and comments will appear here once reporters rate completed cases',
  คะแนนเฉลี่ย: 'Average rating',
  'จาก {n} การประเมิน': 'from {n} ratings',
  การกระจายคะแนน: 'Rating distribution',
  '{n} การประเมิน': '{n} ratings',
  จำนวน: 'Count',
  'คะแนน {n} ดาว': '{n}-star rating',
  'คะแนนแยกตามหน่วยกู้ชีพ ({n})': 'Ratings by rescue team ({n})',
  ยังไม่มีข้อมูลการประเมินหน่วยกู้ชีพ: 'No rescue team ratings yet',
  'ความคิดเห็น/ข้อร้องเรียน ({n})': 'Comments/complaints ({n})',
  ยังไม่มีข้อความจากผู้แจ้งเหตุ: 'No messages from reporters yet',
  'เหตุหมายเลข {caseId}': 'Case {caseId}',
  'หน่วยกู้ชีพ: {name}': 'Rescue team: {name}',
})

function StarRow({ filled }: { filled: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={clsx('size-4', n <= filled ? 'fill-warning text-warning-ink' : 'fill-transparent text-border')} />
      ))}
    </div>
  )
}

export default function DispatchFeedbackStats() {
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [loading, setLoading] = useState(true)
  const t = useT()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchFeedbackStats()
      .then((s) => {
        if (!cancelled) setStats(s)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AppShell variant="dashboard" title={t('ประเมินหน่วยกู้ชีพ')}>
      <div className="relative">
        <div className="flex flex-col gap-5">
          {loading ? (
            <LoadingState />
          ) : !stats || stats.count === 0 ? (
            <EmptyState
              title={t('ยังไม่มีข้อมูลความพึงพอใจ')}
              description={t('คะแนนและความคิดเห็นจะแสดงที่นี่ เมื่อผู้แจ้งเหตุให้คะแนนเหตุที่ดำเนินการเสร็จสิ้นแล้ว')}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface sm:grid-cols-[15rem_minmax(0,1fr)] sm:divide-x sm:divide-y-0">
                <div className="flex flex-col items-center justify-center gap-1.5 p-5 text-center">
                  <p className="text-meta font-medium text-muted">{t('คะแนนเฉลี่ย')}</p>
                  <p className="text-[1.875rem] font-semibold leading-none tabular-nums text-ink">{stats.averageRating.toFixed(1)}</p>
                  <StarRow filled={Math.round(stats.averageRating)} />
                  <p className="text-xs text-muted">{t('จาก {n} การประเมิน', { n: stats.count })}</p>
                </div>
                <div className="flex flex-col gap-2 p-5">
                  <p className="text-meta font-medium text-muted">{t('การกระจายคะแนน')}</p>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={([5, 4, 3, 2, 1] as const).map((n) => ({ rating: n, count: stats.ratingCounts[n] }))}
                        layout="vertical"
                        margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="rating"
                          width={20}
                          tickLine={false}
                          axisLine={false}
                          tick={CHART_TICK_STYLE}
                        />
                        <Tooltip
                          cursor={{ fill: 'transparent' }}
                          contentStyle={CHART_TOOLTIP_STYLE}
                          formatter={(value) => [t('{n} การประเมิน', { n: value as number }), t('จำนวน')]}
                          labelFormatter={(label) => t('คะแนน {n} ดาว', { n: String(label) })}
                        />
                        <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={18}>
                          {([5, 4, 3, 2, 1] as const).map((n) => (
                            <Cell key={n} fill={SEVERITY_CHART_COLORS[n]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-heading text-ink">
                  {t('คะแนนแยกตามหน่วยกู้ชีพ ({n})', { n: stats.teamStats.length })}
                </h2>
                {stats.teamStats.length === 0 ? (
                  <p className="text-sm text-muted">{t('ยังไม่มีข้อมูลการประเมินหน่วยกู้ชีพ')}</p>
                ) : (
                  <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                    {stats.teamStats.map((teamStat, i) => (
                      <div
                        key={teamStat.teamId ?? teamStat.teamName}
                        className={clsx('flex flex-wrap items-center justify-between gap-3 px-5 py-3', teamStat.teamId === null && 'text-muted')}
                      >
                        <div className="flex items-center gap-3">
                          {teamStat.teamId !== null && (
                            <span className="w-5 shrink-0 text-right text-sm tabular-nums text-muted">{i + 1}</span>
                          )}
                          <div>
                            <p className="text-sm font-medium text-ink">{teamStat.teamName}</p>
                            <p className="text-meta text-muted">{t('{n} การประเมิน', { n: teamStat.count })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StarRow filled={Math.round(teamStat.averageRating)} />
                          <span className="w-8 text-right text-sm font-semibold tabular-nums text-ink">{teamStat.averageRating.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="mb-3 text-heading text-ink">
                  {t('ความคิดเห็น/ข้อร้องเรียน ({n})', { n: stats.recentComplaints.length })}
                </h2>
                {stats.recentComplaints.length === 0 ? (
                  <p className="text-sm text-muted">{t('ยังไม่มีข้อความจากผู้แจ้งเหตุ')}</p>
                ) : (
                  <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                    {stats.recentComplaints.map((row) => (
                      <div key={row.id} className="flex flex-col gap-1 px-5 py-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink">{t('เหตุหมายเลข {caseId}', { caseId: row.case_id })}</span>
                          <StarRow filled={row.rating} />
                        </div>
                        {row.rescue_team_name && <p className="text-xs text-muted">{t('หน่วยกู้ชีพ: {name}', { name: row.rescue_team_name })}</p>}
                        <p className="text-sm text-ink">{row.complaint}</p>
                        <p className="text-meta tabular-nums text-muted">{formatDateTime(new Date(row.created_at).getTime())}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
