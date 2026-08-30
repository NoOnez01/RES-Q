import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ChevronDown, Search } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { EmergencyCaseCard } from '@/components/EmergencyCaseCard'
import { EmptyState } from '@/components/States'
import { Input } from '@/components/ui/Field'
import { useStore } from '@/lib/store'
import { formatDateTime } from '@/lib/utils'
import type { EmergencyCase, Role } from '@/lib/types'

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

interface CaseListPageProps {
  title: string
  emptyTitle: string
  emptyDescription: string
  filter: (c: EmergencyCase) => boolean
  sortBy: 'createdAt' | 'updatedAt'
}

/**
 * Shared by CaseHistory (completed cases) and CurrentCases (everything
 * still in progress) -- same card list and expand behavior, just a
 * different status filter and sort key.
 *
 * `cases` in the store already reflects whatever Supabase RLS scoped the
 * session to (a real rescue/hospital account only ever gets its own org's
 * rows). The one gap RLS can't close: an admin account bypasses ALL
 * scoping so its `is_admin` flag can drive the "view as" dashboards --
 * which also means that same account, just browsing as itself (its base
 * role, e.g. 'public'), would otherwise see every citizen's case mixed
 * together here. So this adds one client-side filter back for that one
 * case: effectively-public sessions only ever see their own reports.
 */
export function CaseListPage({ title, emptyTitle, emptyDescription, filter, sortBy }: CaseListPageProps) {
  const cases = useStore((s) => s.cases)
  const currentUser = useStore((s) => s.currentUser)
  const viewingRole = useStore((s) => s.viewingRole)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const effectiveRole = currentUser?.isAdmin && viewingRole ? viewingRole : (currentUser?.role ?? null)

  const sortedCases = useMemo(() => {
    let list = Object.values(cases).filter(filter)
    if (effectiveRole === 'public') {
      list = list.filter((c) => c.isDemo || c.reporterUserId === currentUser?.id)
    }
    return list.sort((a, b) => b[sortBy] - a[sortBy])
  }, [cases, filter, sortBy, effectiveRole, currentUser?.id])

  // Case-insensitive substring match on the human-facing case number (e.g.
  // "RQ-2026-003-AB12") -- everything here is already scoped to what this
  // role is authorized to see, so this is a client-side filter over an
  // already-small list, not a lookup that could reach into other orgs' cases.
  const trimmedQuery = query.trim().toLowerCase()
  const visibleCases = trimmedQuery
    ? sortedCases.filter((c) => c.caseNumber.toLowerCase().includes(trimmedQuery))
    : sortedCases

  return (
    <AppShell variant="dashboard" title={title}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10">
          {sortedCases.length > 0 && (
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาด้วยหมายเลขเคส เช่น RQ-2026-003"
                className="pl-11"
              />
            </div>
          )}
          {visibleCases.length === 0 ? (
            trimmedQuery ? (
              <EmptyState title="ไม่พบเคสที่ค้นหา" description={`ไม่พบเคสที่ตรงกับ "${query.trim()}"`} />
            ) : (
              <EmptyState title={emptyTitle} description={emptyDescription} />
            )
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {visibleCases.map((c, i) => {
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
