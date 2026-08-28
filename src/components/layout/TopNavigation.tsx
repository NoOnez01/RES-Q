import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, LogOut, Menu, UserCircle2 } from 'lucide-react'
import clsx from 'clsx'
import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { FAVICON_URL } from '@/lib/utils'
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
            {loggedIn ? (
              <div className="hidden items-center gap-1 lg:flex">
                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-navy hover:bg-skyblue-light"
                >
                  <Avatar url={currentUser?.avatarUrl} className="size-5" />
                  {currentUser?.name}
                </button>
                <button
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                  aria-label="ออกจากระบบ"
                  className="rounded-lg p-2 text-navy hover:bg-skyblue-light"
                >
                  <LogOut className="size-5" />
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 lg:flex">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  เข้าสู่ระบบ
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                  สมัครสมาชิก
                </Button>
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
