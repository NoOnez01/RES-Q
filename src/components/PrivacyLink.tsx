import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ShieldCheck } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { PRIVACY_LINK_LABEL } from '@/lib/privacyNotice'

/**
 * A line of privacy information with a link to the full notice (/privacy),
 * for the places where the app collects personal data. It only informs --
 * nothing to tick or dismiss -- so it never stands between a person and
 * reporting an emergency.
 */
export function PrivacyLink({ note, className }: { note?: string; className?: string }) {
  const t = useT()
  return (
    <p className={clsx('flex items-start gap-1.5 text-xs text-muted', className)}>
      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
      <span>
        {note && <>{t(note)} </>}
        <Link to="/privacy" className="font-semibold text-primary hover:underline focus-visible:underline focus-visible:outline-none">
          {t(PRIVACY_LINK_LABEL)}
        </Link>
      </span>
    </p>
  )
}
