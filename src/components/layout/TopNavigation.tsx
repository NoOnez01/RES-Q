import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, ChevronDown, LogOut, Menu, UserCircle2 } from 'lucide-react'
import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { FAVICON_URL } from '@/lib/utils'
import { navItemsForRole } from '@/lib/nav'
import type { AppUser } from '@/lib/types'
import { Button } from '../ui/Button'

interface TopNavigationProps {
  variant: 'public' | 'flow' | 'dashboard'
  title?: string
  onMenuClick?: () => void
  onBack?: () => void
  showBack?: boolean
}

const PUBLIC_NAV_LINKS = [
  { label: 'หน้าหลัก', href: '/' },
  { label: 'วิธีการใช้งาน', href: '/how-it-works' },
  { label: 'ฟีเจอร์', href: '/#features' },
  { label: 'ติดต่อเรา', href: '/#contact' },
]

function Avatar({ url, className }: { url?: string; className?: string }) {
  if (url) {
    return <img src={url} alt="" className={clsx('shrink-0 rounded-full object-cover', className)} />
  }
  return <UserCircle2 className={clsx('shrink-0', className)} />
}

/**
 * The public-variant header only ever had room for marketing links
 * (PUBLIC_NAV_LINKS) plus this one account control -- but a logged-in
 * citizen's own pages (current cases, case history, notifications,
 * settings) still need a way in from desktop, since the hamburger menu that
 * carries them is `lg:hidden` and /profile itself links to none of them.
 * Reusing navItemsForRole keeps this in sync with the mobile menu's list
 * instead of maintaining a second copy of it here.
 */
function AccountMenu({
  currentUser,
  unreadCount,
  onLogout,
}: {
  currentUser: AppUser
  unreadCount: number
  onLogout: () => void
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const items = [
    { label: 'ข้อมูลส่วนตัว', path: '/profile', icon: UserCircle2 },
    ...navItemsForRole(currentUser.role, currentUser.isOrgLead).filter((item) => item.path !== '/'),
  ]

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-navy hover:bg-skyblue-light"
      >
        <span className="relative">
          <Avatar url={currentUser.avatarUrl} className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-emergency" />
          )}
        </span>
        {currentUser.name}
        <ChevronDown className={clsx('size-3.5 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-white py-1.5 shadow-card-lg"
        >
          {items.map((item) => (
            <button
              key={item.path}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                navigate(item.path)
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-navy transition-colors hover:bg-skyblue-light"
            >
              <item.icon className="size-4 text-muted" />
              {item.label}
              {item.path === '/notifications' && unreadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-emergency px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-emergency transition-colors hover:bg-emergency/5"
          >
            <LogOut className="size-4" />
            ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  )
}

export function TopNavigation({ variant, title, onMenuClick, onBack, showBack }: TopNavigationProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const notifications = useStore((s) => s.notifications)
  const currentUser = useStore((s) => s.currentUser)
  const logout = useStore((s) => s.logout)
  const loggedIn = !!currentUser && !currentUser.isAnonymous
  const unread = useMemo(
    () =>
      notifications.filter(
        (n) => !n.read && (n.audience === 'all' || n.audience === (currentUser?.role ?? 'public')),
      ).length,
    [notifications, currentUser],
  )

  return (
    <header
      className={clsx(
        'sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur sm:px-6',
      )}
    >
      {(variant === 'dashboard' || variant === 'public') && onMenuClick && (
        <button
          onClick={onMenuClick}
          aria-label="เปิดเมนู"
          className="rounded-lg p-2 text-navy hover:bg-skyblue-light lg:hidden"
        >
          <Menu className="size-5" />
        </button>
      )}

      {(variant === 'flow' || showBack) && (
        <button
          onClick={() => (onBack ? onBack() : navigate(-1))}
          aria-label="ย้อนกลับ"
          className="rounded-lg p-2 text-navy hover:bg-skyblue-light"
        >
          <ArrowLeft className="size-5" />
        </button>
      )}

      {variant !== 'flow' && (
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={FAVICON_URL} alt="" className="size-8" />
          <span className="text-lg font-extrabold text-navy">ResQ</span>
        </Link>
      )}

      {title && <h1 className="min-w-0 flex-1 truncate text-base font-bold text-navy sm:text-lg">{title}</h1>}

      {variant === 'public' && !title && (
        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {PUBLIC_NAV_LINKS.map((link) => {
            const active = link.href === '/' ? location.pathname === '/' : location.pathname + location.hash === link.href
            return (
              <Link
                key={link.href}
                to={link.href}
                className={clsx(
                  'relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  active ? 'text-primary' : 'text-navy hover:bg-skyblue-light',
                )}
              >
                {link.label}
                {active && <span className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-primary" />}
              </Link>
            )
          })}
        </nav>
      )}

      <div className="ml-auto flex items-center gap-2">
        {variant === 'public' && (
          <>
            {loggedIn && currentUser ? (
              <div className="hidden lg:flex">
                <AccountMenu
                  currentUser={currentUser}
                  unreadCount={unread}
                  onLogout={() => {
                    logout()
                    navigate('/')
                  }}
                />
              </div>
            ) : (
              <div className="hidden items-center gap-2 lg:flex">
                {location.pathname !== '/login' && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                    เข้าสู่ระบบ
                  </Button>
                )}
                {!location.pathname.startsWith('/register') && (
                  <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                    สมัครสมาชิก
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {variant === 'dashboard' && (
          <>
            <button
              onClick={() => navigate('/notifications')}
              aria-label="การแจ้งเตือน"
              className="relative rounded-lg p-2 text-navy hover:bg-skyblue-light"
            >
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-emergency text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/profile')}
              aria-label="ข้อมูลส่วนตัว"
              className="rounded-lg p-1.5 text-navy hover:bg-skyblue-light"
            >
              <Avatar url={currentUser?.avatarUrl} className="size-6" />
            </button>
          </>
        )}
      </div>
    </header>
  )
}
