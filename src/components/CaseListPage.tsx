import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { CaseQueue } from '@/components/CaseQueue'
import { EmptyState } from '@/components/States'
import { Input } from '@/components/ui/Field'
import { useStore } from '@/lib/store'
import type { EmergencyCase, Role } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'ค้นหาด้วยหมายเลขเหตุ เช่น RQ-2026-003': 'Search by case number, e.g. RQ-2026-003',
  ไม่พบเหตุที่ค้นหา: 'No matching case found',
  'ไม่พบเหตุที่ตรงกับ "{query}"': 'No case matches "{query}"',
})

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
 * still in progress) -- the same case queue as the dashboards, just a
 * different status filter and sort key (which the time column follows).
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
  const [query, setQuery] = useState('')
  const t = useT()

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
      {sortedCases.length > 0 && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ค้นหาด้วยหมายเลขเหตุ เช่น RQ-2026-003')}
            className="pl-11"
          />
        </div>
      )}
      {sortedCases.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <CaseQueue
          rows={visibleCases.map((c) => ({ case: c, to: caseRouteForRole(currentUser?.role, c.id) }))}
          empty={t('ไม่พบเหตุที่ตรงกับ "{query}"', { query: query.trim() })}
          timeOf={(c) => c[sortBy]}
        />
      )}
    </AppShell>
  )
}
