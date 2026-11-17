import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { ChevronRight, LifeBuoy, ShieldAlert, X } from 'lucide-react'
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
  เมนูหลัก: 'Main menu',
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
  /** Where the brand goes: this role's own home (its overview). */
  homePath: string
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const t = useT()
  const Icon = item.icon
  return (
    <Link
      to={item.path}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors',
        active ? 'bg-skyblue-light font-semibold text-primary' : 'font-medium text-ink/80 hover:bg-skyblue-light hover:text-ink',
      )}
    >
      <Icon className={clsx('size-4 shrink-0', active ? 'text-primary' : 'text-muted group-hover:text-ink')} />
      <span className="truncate">{t(item.label)}</span>
    </Link>
  )
}

export function Sidebar({ items, role, viewingAs, onExitView, loggedIn, homePath }: SidebarProps) {
  const location = useLocation()
  const t = useT()
  const places = items.filter((item) => !item.tool)
  const tools = items.filter((item) => item.tool)

  return (
    // The docked call takes the sidebar's place; the menu opens from the top bar.
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex docked:lg:hidden">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-3">
        <Link to={homePath} className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-skyblue-light">
          <img src={FAVICON_URL} alt="" className="size-6" />
          <span className="text-[15px] font-bold tracking-tight text-ink">ResQ</span>
        </Link>
      </div>

      {viewingAs && (
        <div className="flex items-center justify-between gap-2 border-b border-primary/15 bg-primary/[0.06] px-3 py-2">
          <p className="flex items-center gap-1.5 text-meta font-semibold text-primary">
            <ShieldAlert className="size-3.5 shrink-0" />
            {t('โหมดผู้ดูแลระบบ')}: {t(roleLabel(viewingAs))}
          </p>
          <button
            onClick={onExitView}
            aria-label={t('ออกจากมุมมองนี้')}
            className="rounded-md p-1 text-primary transition-colors hover:bg-primary/10"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="p-2">
        <Link
          to={loggedIn ? '/profile' : '/login'}
          className="group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-skyblue-light"
        >
          <span className="min-w-0">
            {loggedIn ? (
              <>
                <span className="block text-meta text-muted">{t('บทบาทปัจจุบัน')}</span>
                <span className="block truncate text-sm font-semibold text-ink">{t(roleLabel(role))}</span>
              </>
            ) : (
              <>
                <span className="block text-sm font-semibold text-ink">{t('ยังไม่ได้เข้าสู่ระบบ')}</span>
                <span className="block text-meta text-primary">{t('เข้าสู่ระบบ')}</span>
              </>
            )}
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <nav aria-label={t('เมนูหลัก')} className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="space-y-0.5">
          {places.map((item) => (
            <SidebarLink key={item.path} item={item} active={location.pathname === item.path} />
          ))}
        </div>
        {tools.length > 0 && (
          <>
            <p className="px-2.5 pb-1.5 pt-5 text-meta font-medium text-muted">{t('เครื่องมือ')}</p>
            <div className="space-y-0.5">
              {tools.map((item) => (
                <SidebarLink key={item.path} item={item} active={location.pathname === item.path} />
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <Link
          to="/public/emergency-photo"
          className="flex h-9 items-center justify-center gap-2 rounded-lg border border-emergency/30 text-sm font-semibold text-emergency transition-colors hover:border-emergency/50 hover:bg-emergency/[0.05]"
        >
          <LifeBuoy className="size-4" />
          {t('แจ้งเหตุฉุกเฉิน')}
        </Link>
      </div>
    </aside>
  )
}
