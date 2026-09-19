import { useEffect } from 'react'
import { useStore } from '@/lib/store'

/**
 * Headless component (mounted once at app root) that keeps the `.dark`
 * class on <html> in sync with the theme setting -- Tailwind's `darkMode:
 * 'class'` and every CSS variable in index.css key off that class, so this
 * is the one place that actually decides which palette is showing.
 * 'system' re-resolves live if the OS preference changes while the tab is
 * open, the same way a native app's "match system" setting would.
 */
export function ThemeBridge() {
  const theme = useStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function apply() {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      root.classList.toggle('dark', dark)
    }

    apply()
    if (theme === 'system') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
  }, [theme])

  return null
}
