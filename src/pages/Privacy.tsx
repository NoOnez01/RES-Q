import { useEffect } from 'react'
import { ShieldCheck } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
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
    <AppShell variant="public" title={t(PRIVACY_TITLE)}>
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink">
            <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden="true" /> {t(PRIVACY_TITLE)}
          </h1>
          <p className="text-xs text-muted">{t(PRIVACY_UPDATED_LABEL, { date: PRIVACY_UPDATED })}</p>
          <p className="text-sm leading-relaxed text-ink">{t(PRIVACY_INTRO)}</p>
          <p className="rounded-xl bg-skyblue-pale px-3.5 py-2.5 text-sm text-ink">{t(PRIVACY_PROTOTYPE)}</p>
        </div>

        {PRIVACY_SECTIONS.map((section, i) => (
          <Card key={section.id} id={section.id} className="space-y-2.5">
            <h2 className="font-bold text-ink">
              {i + 1}. {t(section.title)}
            </h2>
            {section.paragraphs?.map((p) => (
              <p key={p} className="text-sm leading-relaxed text-ink">
                {t(p)}
              </p>
            ))}
            {section.items && (
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink">
                {section.items.map((item) => (
                  <li key={item}>{t(item)}</li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </AppShell>
  )
}
