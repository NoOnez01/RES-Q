import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { LifeBuoy, ShieldAlert, X } from 'lucide-react'
import type { NavItem } from '@/lib/nav'
import { roleLabel } from '@/lib/nav'
import { FAVICON_URL } from '@/lib/utils'
import type { Role } from '@/lib/types'

interface SidebarProps {
  items: NavItem[]
  role: Role | null
  /** Set when an admin is viewing another role's dashboard/menu -- shows a
   * banner so they don't mistake it for their own account, plus a way back. */
  viewingAs?: Role | null
  onExitView?: () => void
}

export function Sidebar({ items, role, viewingAs, onExitView }: SidebarProps) {
  const location = useLocation()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <img src={FAVICON_URL} alt="" className="size-8" />
        <span className="text-lg font-extrabold text-navy">ResQ</span>
      </div>

      {viewingAs && (
        <div className="flex items-center justify-between gap-2 bg-primary/10 px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <ShieldAlert className="size-3.5 shrink-0" />
            โหมดผู้ดูแล: {roleLabel(viewingAs)}
          </p>
          <button
            onClick={onExitView}
            aria-label="ออกจากมุมมองนี้"
            className="rounded p-1 text-primary hover:bg-primary/15"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <Link to="/profile" className="block px-6 py-4 hover:bg-skyblue-light">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">บทบาทปัจจุบัน</p>
        <p className="mt-1 font-bold text-navy">{roleLabel(role)}</p>
        <p className="mt-0.5 text-xs text-primary">แก้ไขข้อมูลส่วนตัว</p>
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                active ? 'bg-primary text-white shadow-card' : 'text-navy hover:bg-skyblue-light',
              )}
            >
              <Icon className="size-4.5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4">
        <Link
          to="/public/emergency-photo"
          className="flex items-center justify-center gap-2 rounded-xl bg-emergency/10 px-4 py-3 text-sm font-bold text-emergency hover:bg-emergency/15"
        >
          <LifeBuoy className="size-4.5" />
          แจ้งเหตุฉุกเฉิน
        </Link>
      </div>
    </aside>
  )
}
