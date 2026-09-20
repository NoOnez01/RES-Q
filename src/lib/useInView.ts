import { useEffect, useRef, useState } from 'react'

export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px', ...options },
    )
    observer.observe(el)
    return () => observer.disconnect()
    // `options` intentionally omitted -- callers typically pass an inline
    // object literal, which would have a new identity every render and
    // tear down/recreate the observer constantly instead of running once
    // on mount (this hook already disconnects itself after first
    // intersection, so it isn't meant to react to options changing anyway).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return [ref, inView] as const
}
