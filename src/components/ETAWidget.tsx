import { Clock3, Navigation } from 'lucide-react'
import clsx from 'clsx'
import { useT, registerTranslations } from '@/lib/i18n'
import { routeBadge } from '@/lib/map/routing/providers'
import type { RouteResult } from '@/lib/routing'

registerTranslations({
  เวลาที่คาดว่าจะถึงจุดหมาย: 'Estimated time to destination',
  นาที: 'min',
  'ระยะทาง {km} กม.': 'Distance {km} km',
})

export function ETAWidget({
  etaMin,
  distanceKm,
  progressPct,
  route,
  className,
}: {
  etaMin: number
  distanceKm?: number
  progressPct?: number
  /** The route behind this ETA; its provider says what data backs the
   * number (map/routing). Absent while it's still a straight-line estimate. */
  route?: Pick<RouteResult, 'provider' | 'traffic'> | null
  className?: string
}) {
  const t = useT()
  return (
    <div
      className={clsx(
        'relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-4',
        className,
      )}
    >
      <Clock3 className="size-5 shrink-0 self-start text-primary" aria-hidden="true" />
      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-xs text-muted">{t('เวลาที่คาดว่าจะถึงจุดหมาย')}</p>
          {route && (
            <span className="rounded bg-success/10 px-1.5 py-px text-[11px] font-semibold text-success-ink">{t(routeBadge(route))}</span>
          )}
        </div>
        <p key={etaMin} className="mt-0.5 animate-fade-in text-2xl font-semibold tabular-nums text-ink">
          {etaMin} <span className="text-sm font-medium text-muted">{t('นาที')}</span>
        </p>
        {typeof distanceKm === 'number' && (
          <p className="flex items-center gap-1 text-xs text-muted mt-0.5">
            <Navigation className="size-3" /> {t('ระยะทาง {km} กม.', { km: distanceKm.toFixed(1) })}
          </p>
        )}
      </div>
      {typeof progressPct === 'number' && (
        <div className="hidden sm:block w-28 shrink-0">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-skyblue-light">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[11px] font-semibold text-primary">{progressPct}%</p>
        </div>
      )}
    </div>
  )
}
