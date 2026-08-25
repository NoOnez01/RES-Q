import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import type { NavItem } from '@/lib/nav'

export function BottomNavigation({ items }: { items: NavItem[] }) {
  const location = useLocation()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="เมนูหลัก"
    >
      {items.map((item) => {
        const active = location.pathname === item.path
        const Icon = item.icon
        return (
          <Link
            key={item.path}
            to={item.path}
            className={clsx(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors',
              active ? 'text-primary' : 'text-muted',
            )}
          >
            <Icon className={clsx('size-5', active && 'scale-110')} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
