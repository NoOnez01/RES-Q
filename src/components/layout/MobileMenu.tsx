import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { X, LogIn, UserPlus, HelpCircle, LayoutGrid, Sparkles, PhoneCall } from 'lucide-react'
import { useEffect } from 'react'
import type { NavItem } from '@/lib/nav'
import { FAVICON_URL } from '@/lib/utils'

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  items: NavItem[]
  showAuthLinks?: boolean
}

export function MobileMenu({ open, onClose, items, showAuthLinks }: MobileMenuProps) {
  const location = useLocation()

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
      <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs overflow-y-auto bg-white p-5 shadow-card-lg animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={FAVICON_URL} alt="" className="size-8" />
            <span className="text-lg font-extrabold text-navy">ResQ</span>
          </div>
          <button onClick={onClose} aria-label="ปิดเมนู" className="rounded-lg p-2 text-navy hover:bg-skyblue-light">
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
                  active ? 'bg-primary text-white' : 'text-navy hover:bg-skyblue-light',
                )}
              >
                <Icon className="size-4.5" />
                {item.label}
              </Link>
            )
          })}
          <Link
            to="/all-screens"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-navy hover:bg-skyblue-light"
          >
            <LayoutGrid className="size-4.5" />
            ดูหน้าทั้งหมด
          </Link>
          <Link
            to="/how-it-works"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-navy hover:bg-skyblue-light"
          >
            <HelpCircle className="size-4.5" />
            ดูวิธีการใช้งาน
          </Link>
          {showAuthLinks && (
            <>
              <Link
                to="/#features"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-navy hover:bg-skyblue-light"
              >
                <Sparkles className="size-4.5" />
                ฟีเจอร์
              </Link>
              <Link
                to="/#contact"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-navy hover:bg-skyblue-light"
              >
                <PhoneCall className="size-4.5" />
                ติดต่อเรา
              </Link>
            </>
          )}
        </nav>

        {showAuthLinks && (
          <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
            <Link
              to="/login"
              onClick={onClose}
              className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold text-navy hover:bg-skyblue-light"
            >
              <LogIn className="size-4.5" /> เข้าสู่ระบบ
            </Link>
            <Link
              to="/register"
              onClick={onClose}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary-bright"
            >
              <UserPlus className="size-4.5" /> สมัครสมาชิก
            </Link>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
