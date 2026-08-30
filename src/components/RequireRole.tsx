import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { LoadingState } from '@/components/States'
import type { Role } from '@/lib/types'

/**
 * Guards a dispatch/rescue/hospital-only route. Without this, App.tsx had no
 * route guard at all -- any of these pages rendered their full dashboard
 * shell for an anonymous visitor or a logged-in user of the wrong role, with
 * no indication they weren't supposed to be there. Real case data was still
 * safe (Supabase RLS scopes it server-side regardless of what the client
 * renders), but the UI itself was fully explorable by anyone with the URL.
 *
 * `role` accepts one or more roles because a few routes intentionally serve
 * more than one (e.g. /org-approvals is for rescue/hospital org leads, a
 * separate route from /dispatch/pending-approvals which serves dispatch
 * staff, even though both render the same underlying page component).
 * `currentUser.isAdmin` always bypasses this, matching the existing "admin
 * can view any dashboard" behavior elsewhere in the app (see AppShell's
 * effectiveRole / viewingRole).
 */
export function RequireRole({ role, children }: { role: Role | Role[]; children: ReactNode }) {
  const currentUser = useStore((s) => s.currentUser)
  const authResolved = useStore((s) => s.authResolved)
  const location = useLocation()

  if (!authResolved) {
    return <LoadingState label="กำลังตรวจสอบสิทธิ์การเข้าถึง..." />
  }

  const allowedRoles = Array.isArray(role) ? role : [role]
  const authorized =
    !!currentUser &&
    !currentUser.isAnonymous &&
    (currentUser.isAdmin || allowedRoles.includes(currentUser.role))

  if (!authorized) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
