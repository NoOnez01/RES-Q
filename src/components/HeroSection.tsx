import type { ReactNode } from 'react'
import clsx from 'clsx'

export function HeroSection({
  children,
  wide = false,
  background = true,
  fullScreen = false,
  decoration,
}: {
  children: ReactNode
  wide?: boolean
  background?: boolean
  fullScreen?: boolean
  decoration?: ReactNode
}) {
  return (
    <section
      className={clsx(
        'relative flex flex-col justify-center px-4 py-14 sm:py-20',
        fullScreen && 'min-h-[calc(100vh-4rem)]',
        background && 'bg-gradient-to-b from-skyblue-light via-skyblue-pale to-bg',
      )}
    >
      {decoration}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        className={clsx(
          'relative mx-auto flex flex-col items-center gap-8',
          wide ? 'w-full max-w-7xl text-center lg:text-left' : 'max-w-3xl text-center',
        )}
      >
        {children}
      </div>
    </section>
  )
}
