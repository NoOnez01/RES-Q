import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { X, LogIn, LogOut, UserPlus, UserCircle2, HelpCircle, LayoutGrid, Sparkles, PhoneCall } from 'lucide-react'
import { useEffect } from 'react'
import type { NavItem } from '@/lib/nav'
import type { AppUser } from '@/lib/types'
import { FAVICON_URL } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ปิดเมนู: 'Close menu',
  ดูหน้าทั้งหมด: 'View all pages',
  ดูวิธีการใช้งาน: 'How it works',
  คุณสมบัติของระบบ: 'Features',
  ติดต่อเรา: 'Contact us',
  ออกจากระบบ: 'Log out',
  เข้าสู่ระบบ: 'Log in',
  สมัครสมาชิก: 'Sign up',
})

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  items: NavItem[]
  showAuthLinks?: boolean
  /** Set (non-null) when a real account -- not an anonymous citizen
   * session -- is signed in; shows a profile/logout section instead of
   * the login/register links. */
  loggedInUser?: AppUser | null
}

export function MobileMenu({ open, onClose, items, showAuthLinks, loggedInUser }: MobileMenuProps) {
  const location = useLocation()
  const logout = useStore((s) => s.logout)
  const t = useT()

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] lg:hidden docked:lg:left-[var(--call-dock-w)] docked:lg:block">
      <div className="absolute inset-0 bg-navy/45 animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-y-0 left-0 flex w-[84%] max-w-[18rem] flex-col overflow-y-auto border-r border-border bg-surface shadow-overlay animate-slide-in-left"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
          <div className="flex items-center gap-2 px-1.5">
            <img src={FAVICON_URL} alt="" className="size-6" />
            <span className="text-[15px] font-bold tracking-tight text-ink">ResQ</span>
          </div>
          <button
            onClick={onClose}
            aria-label={t('ปิดเมนู')}
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-skyblue-light hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 p-2">
          {items.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm transition-colors',
                  active ? 'bg-skyblue-light font-semibold text-primary' : 'font-medium text-ink/80 hover:bg-skyblue-light hover:text-ink',
                )}
              >
                <Icon className={clsx('size-4', active ? 'text-primary' : 'text-muted')} />
                {t(item.label)}
              </Link>
            )
          })}
          <Link
            to="/all-screens"
            onClick={onClose}
            className="flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-skyblue-light hover:text-ink"
          >
            <LayoutGrid className="size-4 text-muted" />
            {t('ดูหน้าทั้งหมด')}
          </Link>
          <Link
            to="/how-it-works"
            onClick={onClose}
            className="flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-skyblue-light hover:text-ink"
          >
            <HelpCircle className="size-4 text-muted" />
            {t('ดูวิธีการใช้งาน')}
          </Link>
          {showAuthLinks && (
            <>
              <Link
                to="/#features"
                onClick={onClose}
                className="flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-skyblue-light hover:text-ink"
              >
                <Sparkles className="size-4 text-muted" />
                {t('คุณสมบัติของระบบ')}
              </Link>
              <Link
                to="/#contact"
                onClick={onClose}
                className="flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-skyblue-light hover:text-ink"
              >
                <PhoneCall className="size-4 text-muted" />
                {t('ติดต่อเรา')}
              </Link>
            </>
          )}
        </nav>

        {loggedInUser ? (
          <div className="mt-auto flex flex-col gap-2 border-t border-border p-3">
            <Link
              to="/profile"
              onClick={onClose}
              className="flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-ink/80 transition-colors hover:bg-skyblue-light hover:text-ink"
            >
              {loggedInUser.avatarUrl ? (
                <img src={loggedInUser.avatarUrl} alt="" className="size-6 shrink-0 rounded-full object-cover" />
              ) : (
                <UserCircle2 className="size-6 shrink-0" />
              )}
              {loggedInUser.name}
            </Link>
            <button
              onClick={() => {
                onClose()
                logout()
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-input text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
            >
              <LogOut className="size-4" /> {t('ออกจากระบบ')}
            </button>
          </div>
        ) : (
          showAuthLinks && (
            <div className="mt-auto flex flex-col gap-2 border-t border-border p-3">
              {location.pathname !== '/login' && (
                <Link
                  to="/login"
                  onClick={onClose}
                  className="flex h-10 items-center justify-center gap-2 rounded-lg border border-input text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
                >
                  <LogIn className="size-4" /> {t('เข้าสู่ระบบ')}
                </Link>
              )}
              {!location.pathname.startsWith('/register') && (
                <Link
                  to="/register"
                  onClick={onClose}
                  className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-white transition-colors hover:bg-primary-bright"
                >
                  <UserPlus className="size-4" /> {t('สมัครสมาชิก')}
                </Link>
              )}
            </div>
          )
        )}
      </div>
    </div>,
    document.body,
  )
}
