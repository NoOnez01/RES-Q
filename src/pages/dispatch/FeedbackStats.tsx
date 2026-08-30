import { useEffect, useState } from 'react'
import { Star, MessageSquareWarning } from 'lucide-react'
import clsx from 'clsx'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { EmptyState, LoadingState } from '@/components/States'
import { fetchFeedbackStats, type FeedbackStats } from '@/lib/caseFeedback'
import { formatDateTime } from '@/lib/utils'
import { CHART_TICK_STYLE, CHART_TOOLTIP_STYLE, SEVERITY_CHART_COLORS } from '@/lib/chartTheme'

function StarRow({ filled }: { filled: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={clsx('size-4', n <= filled ? 'fill-warning text-warning' : 'fill-transparent text-border')} />
      ))}
    </div>
  )
}

export default function DispatchFeedbackStats() {
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [loading, setLoading] = useState(true)

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
    <AppShell variant="dashboard" title="สถิติความพึงพอใจ">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 flex flex-col gap-6">
          {loading ? (
            <LoadingState />
          ) : !stats || stats.count === 0 ? (
            <EmptyState
              title="ยังไม่มีข้อมูลความพึงพอใจ"
              description="คะแนนและความคิดเห็นจะปรากฏที่นี่หลังผู้แจ้งเหตุให้คะแนนเคสที่เสร็จสิ้นแล้ว"
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card className="flex flex-col items-center gap-2 py-6 text-center">
                  <p className="text-sm font-medium text-muted">คะแนนเฉลี่ย</p>
                  <p className="text-4xl font-extrabold text-navy">{stats.averageRating.toFixed(1)}</p>
                  <StarRow filled={Math.round(stats.averageRating)} />
                  <p className="text-xs text-muted">จาก {stats.count} รีวิว</p>
                </Card>
                <Card className="flex flex-col gap-2 py-6">
                  <p className="mb-1 text-sm font-medium text-muted">การกระจายคะแนน</p>
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
                          formatter={(value) => [`${value} รีวิว`, 'จำนวน']}
                          labelFormatter={(label) => `คะแนน ${label} ดาว`}
                        />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18}>
                          {([5, 4, 3, 2, 1] as const).map((n) => (
                            <Cell key={n} fill={SEVERITY_CHART_COLORS[n]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <div>
                <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-navy">
                  <MessageSquareWarning className="size-4.5 text-primary" />
                  ความคิดเห็น/ข้อร้องเรียน ({stats.recentComplaints.length})
                </h2>
                {stats.recentComplaints.length === 0 ? (
                  <p className="text-sm text-muted">ยังไม่มีข้อความจากผู้แจ้งเหตุ</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {stats.recentComplaints.map((row) => (
                      <Card key={row.id} className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-navy">เคส {row.case_id}</span>
                          <StarRow filled={row.rating} />
                        </div>
                        {row.rescue_team_name && <p className="text-xs text-muted">หน่วยกู้ชีพ: {row.rescue_team_name}</p>}
                        <p className="text-sm text-navy">{row.complaint}</p>
                        <p className="text-xs text-muted">{formatDateTime(new Date(row.created_at).getTime())}</p>
                      </Card>
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
