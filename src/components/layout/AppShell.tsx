import { useState, type ReactNode } from 'react'
import { useStore } from '@/lib/store'
import { navItemsForRole } from '@/lib/nav'
import { TopNavigation } from './TopNavigation'
import { Sidebar } from './Sidebar'
import { MobileMenu } from './MobileMenu'
import { BottomNavigation } from './BottomNavigation'

interface AppShellProps {
  variant: 'public' | 'flow' | 'dashboard'
  title?: string
  showBack?: boolean
  onBack?: () => void
  children: ReactNode
}

export function AppShell({ variant, title, showBack, onBack, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const currentUser = useStore((s) => s.currentUser)
  const items = navItemsForRole(currentUser?.role ?? null)

  if (variant === 'dashboard') {
    return (
      <div className="flex min-h-screen bg-bg">
        <Sidebar items={items} role={currentUser?.role ?? null} />
        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} items={items} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <TopNavigation variant="dashboard" title={title} onMenuClick={() => setMenuOpen(true)} />
          <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 sm:pb-8 lg:px-8">{children}</main>
          <BottomNavigation items={items} />
        </div>
      </div>
    )
  }

  if (variant === 'flow') {
    return (
      <div className="flex min-h-screen flex-col bg-bg">
        <TopNavigation variant="flow" title={title} onBack={onBack} showBack={showBack ?? true} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} items={items} showAuthLinks />
      <TopNavigation variant="public" title={title} onMenuClick={() => setMenuOpen(true)} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
