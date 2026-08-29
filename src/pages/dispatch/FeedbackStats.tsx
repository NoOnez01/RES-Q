import { useEffect, useState } from 'react'
import { Star, MessageSquareWarning } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { EmptyState, LoadingState } from '@/components/States'
import { fetchFeedbackStats, type FeedbackStats } from '@/lib/caseFeedback'
import { formatDateTime } from '@/lib/utils'

// Same 1 (worst) -> 5 (best) color language as the severity levels on the
// incident assessment form, so a glance at the distribution reads "mostly
// red = trouble" / "mostly green = good" instead of one flat tone.
const RATING_BAR_TONE: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'bg-emergency',
  2: 'bg-warning',
  3: 'bg-moderate',
  4: 'bg-primary',
  5: 'bg-success',
}

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
                  {([5, 4, 3, 2, 1] as const).map((n) => {
                    const count = stats.ratingCounts[n]
                    const pct = stats.count > 0 ? Math.round((count / stats.count) * 100) : 0
                    return (
                      <div key={n} className="flex items-center gap-2 text-xs">
                        <span className="w-3 shrink-0 font-semibold text-navy">{n}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                          <div className={clsx('h-full rounded-full', RATING_BAR_TONE[n])} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 shrink-0 text-right text-muted">{count}</span>
                      </div>
                    )
                  })}
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
