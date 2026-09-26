import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { LifeBuoy, ShieldAlert, X } from 'lucide-react'
import type { NavItem } from '@/lib/nav'
import { roleLabel } from '@/lib/nav'
import { FAVICON_URL } from '@/lib/utils'
import type { Role } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  โหมดผู้ดูแลระบบ: 'Admin mode',
  ออกจากมุมมองนี้: 'Exit this view',
  บทบาทปัจจุบัน: 'Current role',
  แก้ไขข้อมูลส่วนตัว: 'Edit profile',
  แจ้งเหตุฉุกเฉิน: 'Report an emergency',
  เครื่องมือ: 'Tools',
  ยังไม่ได้เข้าสู่ระบบ: 'Not signed in',
  เข้าสู่ระบบ: 'Log in',
})

interface SidebarProps {
  items: NavItem[]
  role: Role | null
  /** Set when an admin is viewing another role's dashboard/menu -- shows a
   * banner so they don't mistake it for their own account, plus a way back. */
  viewingAs?: Role | null
  onExitView?: () => void
  /** Signed in with a real account, not just an anonymous visitor session. */
  loggedIn: boolean
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const t = useT()
  const Icon = item.icon
  return (
    <Link
      to={item.path}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
        active ? 'bg-primary text-white shadow-card' : 'text-ink hover:bg-skyblue-light',
      )}
    >
      <Icon className="size-4.5 shrink-0" />
      <span className="truncate">{t(item.label)}</span>
    </Link>
  )
}

export function Sidebar({ items, role, viewingAs, onExitView, loggedIn }: SidebarProps) {
  const location = useLocation()
  const t = useT()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <img src={FAVICON_URL} alt="" className="size-8" />
        <span className="text-lg font-extrabold text-ink">ResQ</span>
      </div>

      {viewingAs && (
        <div className="flex items-center justify-between gap-2 bg-primary/10 px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <ShieldAlert className="size-3.5 shrink-0" />
            {t('โหมดผู้ดูแลระบบ')}: {t(roleLabel(viewingAs))}
          </p>
          <button
            onClick={onExitView}
            aria-label={t('ออกจากมุมมองนี้')}
            className="rounded p-1 text-primary hover:bg-primary/15"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {loggedIn ? (
        <Link to="/profile" className="block px-6 py-4 hover:bg-skyblue-light">
          <p className="text-xs font-semibold text-muted">{t('บทบาทปัจจุบัน')}</p>
          <p className="mt-1 font-bold text-ink">{t(roleLabel(role))}</p>
          <p className="mt-0.5 text-xs text-primary">{t('แก้ไขข้อมูลส่วนตัว')}</p>
        </Link>
      ) : (
        <Link to="/login" className="block px-6 py-4 hover:bg-skyblue-light">
          <p className="font-bold text-ink">{t('ยังไม่ได้เข้าสู่ระบบ')}</p>
          <p className="mt-0.5 text-xs text-primary">{t('เข้าสู่ระบบ')}</p>
        </Link>
      )}

      <nav className="flex-1 space-y-1 px-3">
        {items.filter((item) => !item.tool).map((item) => (
          <SidebarLink key={item.path} item={item} active={location.pathname === item.path} />
        ))}
        {items.some((item) => item.tool) && (
          <>
            <p className="px-3 pb-1 pt-5 text-xs font-semibold text-muted">{t('เครื่องมือ')}</p>
            {items.filter((item) => item.tool).map((item) => (
              <SidebarLink key={item.path} item={item} active={location.pathname === item.path} />
            ))}
          </>
        )}
      </nav>

      <div className="p-4">
        <Link
          to="/public/emergency-photo"
          className="flex items-center justify-center gap-2 rounded-xl bg-emergency/10 px-4 py-3 text-sm font-bold text-emergency hover:bg-emergency/15"
        >
          <LifeBuoy className="size-4.5" />
          {t('แจ้งเหตุฉุกเฉิน')}
        </Link>
      </div>
    </aside>
  )
}
