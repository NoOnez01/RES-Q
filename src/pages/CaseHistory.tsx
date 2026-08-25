import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { EmergencyCaseCard } from '@/components/EmergencyCaseCard'
import { EmptyState } from '@/components/States'
import { useStore } from '@/lib/store'
import { formatDateTime } from '@/lib/utils'
import type { Role } from '@/lib/types'

function caseRouteForRole(role: Role | undefined, caseId: string): string {
  switch (role) {
    case 'dispatch':
      return `/dispatch/case/${caseId}`
    case 'rescue':
      return `/rescue/case/${caseId}`
    case 'hospital':
      return `/hospital/case/${caseId}`
    default:
      return `/public/case/${caseId}`
  }
}

export default function CaseHistory() {
  const cases = useStore((s) => s.cases)
  const currentUser = useStore((s) => s.currentUser)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sortedCases = useMemo(
    () => Object.values(cases).sort((a, b) => b.createdAt - a.createdAt),
    [cases],
  )

  return (
    <AppShell variant="dashboard" title="ประวัติเคส">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10">
          {sortedCases.length === 0 ? (
            <EmptyState title="ยังไม่มีประวัติเคส" description="เคสที่เคยเกิดขึ้นในระบบจะแสดงที่นี่" />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {sortedCases.map((c, i) => {
                const expanded = expandedId === c.id
                return (
                  <div
                    key={c.id}
                    className="flex flex-col gap-2 animate-fade-in-up"
                    style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}
                  >
                    <EmergencyCaseCard
                      emergencyCase={c}
                      to={caseRouteForRole(currentUser?.role, c.id)}
                      actions={
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-label={expanded ? 'ซ่อนรายละเอียดเพิ่มเติม' : 'แสดงรายละเอียดเพิ่มเติม'}
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedId(expanded ? null : c.id)
                          }}
                          className="inline-flex min-h-[48px] items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-navy transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
                        >
                          รายละเอียดเพิ่มเติม
                          <ChevronDown className={clsx('size-4 transition-transform', expanded && 'rotate-180')} />
                        </button>
                      }
                    />
                    {expanded && (
                      <div className="animate-fade-in-up rounded-xl border border-border bg-white p-4 text-sm text-muted">
                        <p>จำนวนขั้นตอนในไทม์ไลน์: {c.timeline.length} ขั้นตอน</p>
                        <p className="mt-1">อัปเดตล่าสุด: {formatDateTime(c.updatedAt)}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
