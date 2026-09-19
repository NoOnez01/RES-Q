import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Ambulance, CheckCircle2, ClipboardList } from 'lucide-react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { StatBar, StatItem } from '@/components/DashboardCard'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { EmptyState, ErrorState } from '@/components/States'
import { useStore } from '@/lib/store'
import { roleLabel } from '@/lib/nav'
import { CHART_TICK_STYLE, CHART_TOOLTIP_STYLE, SEVERITY_CHART_COLORS } from '@/lib/chartTheme'
import type { EmergencyCase, Severity } from '@/lib/types'
import { SEVERITY_SHORT_LABEL } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  หน่วยกู้ชีพของฉัน: 'My rescue team',
  โรงพยาบาลของฉัน: 'My hospital',
  'ศูนย์สั่งการ 1669 (ภาพรวมระบบ)': 'Dispatch Center 1669 (system-wide)',
  เคสที่ฉันแจ้งเหตุ: 'Cases I reported',
  กรุณาเข้าสู่ระบบเพื่อดูสถิติของคุณ: 'Please log in to view your stats',
  ยังไม่มีข้อมูลสถิติ: 'No stats yet',
  สถิติจะปรากฏที่นี่เมื่อมีเคสที่เกี่ยวข้องกับคุณในระบบ: 'Stats will appear here once there are cases related to you in the system',
  เคสทั้งหมด: 'Total cases',
  กำลังดำเนินการ: 'In progress',
  เสร็จสิ้นแล้ว: 'Completed',
  แนวโน้มจำนวนเคสรายเดือน: 'Monthly case trend',
  'ยังไม่มีข้อมูลในช่วง {n} เดือนล่าสุด': 'No data in the last {n} months',
  '{n} เคส': '{n} cases',
  จำนวน: 'Count',
  สัดส่วนตามระดับความรุนแรง: 'Breakdown by severity',
  ยังไม่มีเคสที่ประเมินระดับความรุนแรง: 'No cases with a severity assessment yet',
  วิกฤต: 'Critical',
  ฉุกเฉิน: 'Emergency',
  เร่งด่วน: 'Urgent',
  ไม่เร่งด่วน: 'Less urgent',
  ทั่วไป: 'General',
})

const TREND_MONTHS = 6

function monthKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}`
}

function monthLabel(ts: number, language: 'th' | 'en'): string {
  return new Date(ts).toLocaleDateString(language === 'en' ? 'en-US' : 'th-TH', { month: 'short', year: '2-digit' })
}

export default function PersonalStats() {
  const navigate = useNavigate()
  const currentUser = useStore((s) => s.currentUser)
  const cases = useStore((s) => s.cases)
  const rescueTeams = useStore((s) => s.rescueTeams)
  const hospitals = useStore((s) => s.hospitals)
  const language = useStore((s) => s.language)
  const t = useT()

  const scoped = useMemo(() => {
    const all = Object.values(cases)
    if (!currentUser) return { list: [] as EmergencyCase[], scopeLabel: '' }
    switch (currentUser.role) {
      case 'rescue': {
        const teamName = rescueTeams.find((team) => team.id === currentUser.rescueTeamId)?.name
        return {
          list: all.filter(
            (c) => c.assignedRescueTeam?.id === currentUser.rescueTeamId || c.supportingRescueTeam?.id === currentUser.rescueTeamId,
          ),
          scopeLabel: teamName ?? t('หน่วยกู้ชีพของฉัน'),
        }
      }
      case 'hospital': {
        const hospitalName = hospitals.find((h) => h.id === currentUser.hospitalId)?.name
        return {
          list: all.filter((c) => c.selectedHospital?.id === currentUser.hospitalId),
          scopeLabel: hospitalName ?? t('โรงพยาบาลของฉัน'),
        }
      }
      case 'dispatch':
        // No individual-dispatcher attribution exists on a case (assessments
        // aren't tagged with which staff member filled them in) -- the
        // closest honest "personal" view for this role is the whole
        // system's activity, which is what a dispatcher actually oversees.
        return { list: all, scopeLabel: t('ศูนย์สั่งการ 1669 (ภาพรวมระบบ)') }
      default:
        return {
          list: all.filter((c) => c.reporterUserId === currentUser.id || c.isDemo),
          scopeLabel: t('เคสที่ฉันแจ้งเหตุ'),
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases, currentUser, rescueTeams, hospitals, language])

  // Both memo hooks must run unconditionally on every render (the Rules of
  // Hooks) -- scoped.list is already [] when there's no currentUser, so
  // there's nothing to gate here; the "not logged in" screen is decided
  // below, after every hook has run.
  const severityCounts = useMemoSeverityCounts(scoped.list)
  const trend = useMemoTrend(scoped.list, language)

  if (!currentUser) {
    return (
      <AppShell variant="dashboard" title={t('สถิติของฉัน')}>
        <ErrorState
          title={t('ยังไม่ได้เข้าสู่ระบบ')}
          description={t('กรุณาเข้าสู่ระบบเพื่อดูสถิติของคุณ')}
          onRetry={() => navigate('/login')}
          retryLabel={t('เข้าสู่ระบบ')}
        />
      </AppShell>
    )
  }

  const { list, scopeLabel } = scoped
  const completedCount = list.filter((c) => c.status === 'completed').length
  const inProgressCount = list.length - completedCount

  return (
    <AppShell variant="dashboard" title={t('สถิติของฉัน')}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-bold text-ink">{t('สถิติของฉัน')}</h1>
            <p className="mt-1.5 text-sm text-muted">
              {t(roleLabel(currentUser.role))} · {scopeLabel}
            </p>
          </div>

          {list.length === 0 ? (
            <EmptyState
              icon={<Activity className="size-6" />}
              title={t('ยังไม่มีข้อมูลสถิติ')}
              description={t('สถิติจะปรากฏที่นี่เมื่อมีเคสที่เกี่ยวข้องกับคุณในระบบ')}
            />
          ) : (
            <>
              <StatBar>
                <StatItem label={t('เคสทั้งหมด')} value={list.length} icon={<ClipboardList className="size-5" />} tone="primary" />
                <StatItem label={t('กำลังดำเนินการ')} value={inProgressCount} icon={<Ambulance className="size-5" />} tone="warning" />
                <StatItem label={t('เสร็จสิ้นแล้ว')} value={completedCount} icon={<CheckCircle2 className="size-5" />} tone="success" />
              </StatBar>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="flex flex-col gap-3">
                  <p className="text-sm font-bold text-ink">{t('แนวโน้มจำนวนเคสรายเดือน')}</p>
                  {trend.every((item) => item.count === 0) ? (
                    <p className="py-8 text-center text-sm text-muted">{t('ยังไม่มีข้อมูลในช่วง {n} เดือนล่าสุด', { n: TREND_MONTHS })}</p>
                  ) : (
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={CHART_TICK_STYLE} />
                          <Tooltip
                            cursor={{ fill: '#EAF6FF' }}
                            contentStyle={CHART_TOOLTIP_STYLE}
                            formatter={(value) => [t('{n} เคส', { n: value as number }), t('จำนวน')]}
                          />
                          <Bar dataKey="count" fill="#0B6EBD" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>

                <Card className="flex flex-col gap-3">
                  <p className="text-sm font-bold text-ink">{t('สัดส่วนตามระดับความรุนแรง')}</p>
                  {severityCounts.every((s) => s.count === 0) ? (
                    <p className="py-8 text-center text-sm text-muted">{t('ยังไม่มีเคสที่ประเมินระดับความรุนแรง')}</p>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="h-40 w-40 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={severityCounts.filter((s) => s.count > 0)}
                              dataKey="count"
                              nameKey="label"
                              innerRadius={38}
                              outerRadius={64}
                              paddingAngle={2}
                              strokeWidth={0}
                            >
                              {severityCounts
                                .filter((s) => s.count > 0)
                                .map((s) => (
                                  <Cell key={s.severity} fill={SEVERITY_CHART_COLORS[s.severity]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [t('{n} เคส', { n: value as number }), '']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5">
                        {severityCounts
                          .filter((s) => s.count > 0)
                          .map((s) => (
                            <div key={s.severity} className="flex items-center gap-2 text-xs">
                              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: SEVERITY_CHART_COLORS[s.severity] }} />
                              <span className="flex-1 text-ink">{t(s.label)}</span>
                              <span className="font-bold text-ink">{s.count}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function useMemoSeverityCounts(list: EmergencyCase[]) {
  return useMemo(() => {
    const counts: Record<Severity, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const c of list) {
      const sev = c.assessment?.severity
      if (sev) counts[sev]++
    }
    return ([1, 2, 3, 4, 5] as Severity[]).map((sev) => ({
      severity: sev,
      label: SEVERITY_SHORT_LABEL[sev],
      count: counts[sev],
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list])
}

function useMemoTrend(list: EmergencyCase[], language: 'th' | 'en') {
  return useMemo(() => {
    const now = Date.now()
    const buckets: { key: string; label: string; count: number }[] = []
    for (let i = TREND_MONTHS - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      buckets.push({ key: monthKey(d.getTime()), label: monthLabel(d.getTime(), language), count: 0 })
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]))
    for (const c of list) {
      const bucket = byKey.get(monthKey(c.createdAt))
      if (bucket) bucket.count++
    }
    return buckets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, language])
}
