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
        'relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-card',
        className,
      )}
    >
      <span className="bg-fx pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-primary/10 blur-2xl animate-glow-breathe" aria-hidden="true" />
      <div className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-skyblue-light text-primary">
        <span className="bg-fx absolute inset-0 animate-ping-slow rounded-full bg-primary/20" aria-hidden="true" />
        <Clock3 className="relative size-5" />
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-xs text-muted">{t('เวลาที่คาดว่าจะถึงจุดหมาย')}</p>
          {route && (
            <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">{t(routeBadge(route))}</span>
          )}
        </div>
        <p key={etaMin} className="animate-fade-in text-xl font-extrabold text-ink">
          {etaMin} <span className="text-sm font-semibold text-muted">{t('นาที')}</span>
        </p>
        {typeof distanceKm === 'number' && (
          <p className="flex items-center gap-1 text-xs text-muted mt-0.5">
            <Navigation className="size-3" /> {t('ระยะทาง {km} กม.', { km: distanceKm.toFixed(1) })}
          </p>
        )}
      </div>
      {typeof progressPct === 'number' && (
        <div className="hidden sm:block w-28 shrink-0">
          <div className="h-2 w-full overflow-hidden rounded-full bg-skyblue-light">
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
