import { useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { useT } from '@/lib/i18n'
import { PRIVACY_INTRO, PRIVACY_PROTOTYPE, PRIVACY_SECTIONS, PRIVACY_TITLE, PRIVACY_UPDATED, PRIVACY_UPDATED_LABEL } from '@/lib/privacyNotice'

/** The privacy notice (lib/privacyNotice.ts), open to everyone. */
export default function Privacy() {
  const t = useT()
  // Reached from links at the foot of long pages -- start reading at the top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <AppShell variant="public">
      <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="border-b border-border pb-6">
          <h1 className="text-[1.625rem] font-bold leading-snug tracking-tight text-ink">{t(PRIVACY_TITLE)}</h1>
          <p className="mt-1 text-meta text-muted">{t(PRIVACY_UPDATED_LABEL, { date: PRIVACY_UPDATED })}</p>
          <p className="mt-4 text-body leading-relaxed text-ink">{t(PRIVACY_INTRO)}</p>
          <p className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-small text-ink/80">{t(PRIVACY_PROTOTYPE)}</p>
        </header>

        {PRIVACY_SECTIONS.map((section, i) => (
          <section key={section.id} id={section.id} className="scroll-mt-20 border-b border-border py-6 last:border-0">
            <h2 className="text-heading text-ink">
              <span className="mr-1.5 tabular-nums text-muted">{i + 1}.</span>
              {t(section.title)}
            </h2>
            {section.paragraphs?.map((p) => (
              <p key={p} className="mt-2.5 text-body leading-relaxed text-ink/90">
                {t(p)}
              </p>
            ))}
            {section.items && (
              <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-body leading-relaxed text-ink/90 marker:text-muted">
                {section.items.map((item) => (
                  <li key={item}>{t(item)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>
    </AppShell>
  )
}
