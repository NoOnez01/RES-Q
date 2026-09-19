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
  ฟีเจอร์: 'Features',
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
    <div className="fixed inset-0 z-[90] lg:hidden">
      <div className="absolute inset-0 bg-navy/50 animate-fade-in" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs overflow-y-auto bg-surface p-5 shadow-card-lg animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={FAVICON_URL} alt="" className="size-8" />
            <span className="text-lg font-extrabold text-ink">ResQ</span>
          </div>
          <button onClick={onClose} aria-label={t('ปิดเมนู')} className="rounded-lg p-2 text-ink hover:bg-skyblue-light">
            <X className="size-5" />
          </button>
        </div>

        <nav className="mt-6 flex flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold',
                  active ? 'bg-primary text-white' : 'text-ink hover:bg-skyblue-light',
                )}
              >
                <Icon className="size-4.5" />
                {t(item.label)}
              </Link>
            )
          })}
          <Link
            to="/all-screens"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-ink hover:bg-skyblue-light"
          >
            <LayoutGrid className="size-4.5" />
            {t('ดูหน้าทั้งหมด')}
          </Link>
          <Link
            to="/how-it-works"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-ink hover:bg-skyblue-light"
          >
            <HelpCircle className="size-4.5" />
            {t('ดูวิธีการใช้งาน')}
          </Link>
          {showAuthLinks && (
            <>
              <Link
                to="/#features"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-ink hover:bg-skyblue-light"
              >
                <Sparkles className="size-4.5" />
                {t('ฟีเจอร์')}
              </Link>
              <Link
                to="/#contact"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-ink hover:bg-skyblue-light"
              >
                <PhoneCall className="size-4.5" />
                {t('ติดต่อเรา')}
              </Link>
            </>
          )}
        </nav>

        {loggedInUser ? (
          <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
            <Link
              to="/profile"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-ink hover:bg-skyblue-light"
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
              className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold text-ink hover:bg-skyblue-light"
            >
              <LogOut className="size-4.5" /> {t('ออกจากระบบ')}
            </button>
          </div>
        ) : (
          showAuthLinks && (
            <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
              {location.pathname !== '/login' && (
                <Link
                  to="/login"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold text-ink hover:bg-skyblue-light"
                >
                  <LogIn className="size-4.5" /> {t('เข้าสู่ระบบ')}
                </Link>
              )}
              {!location.pathname.startsWith('/register') && (
                <Link
                  to="/register"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary-bright"
                >
                  <UserPlus className="size-4.5" /> {t('สมัครสมาชิก')}
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
