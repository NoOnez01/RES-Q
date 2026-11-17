import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import type { NavItem } from '@/lib/nav'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({ เมนูหลัก: 'Main menu' })

export function BottomNavigation({ items }: { items: NavItem[] }) {
  const location = useLocation()
  const t = useT()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label={t('เมนูหลัก')}
    >
      {items.filter((item) => !item.tool).map((item) => {
        const active = location.pathname === item.path
        const Icon = item.icon
        return (
          <Link
            key={item.path}
            to={item.path}
            className={clsx(
              'relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium leading-tight transition-colors',
              active ? 'text-primary' : 'text-muted hover:text-ink',
            )}
            aria-current={active ? 'page' : undefined}
          >
            {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-b bg-primary" aria-hidden="true" />}
            <Icon className="size-5 shrink-0" />
            <span className="block max-w-full truncate">{t(item.label)}</span>
          </Link>
        )
      })}
    </nav>
  )
}
