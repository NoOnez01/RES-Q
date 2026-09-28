import { Clock3, Navigation } from 'lucide-react'
import clsx from 'clsx'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  เวลาที่คาดว่าจะถึงจุดหมาย: 'Estimated time to destination',
  เส้นทางที่เร็วที่สุดตามสภาพจราจร: 'Fastest route for current traffic',
  เส้นทางตามถนนจริง: 'Real road route',
  'D* Lite · สภาพจราจรปัจจุบัน': 'D* Lite · live traffic',
  'D* Lite · สภาพจราจรคาดการณ์': 'D* Lite · predicted traffic',
  'D* Lite · ความเร็วโดยประมาณ': 'D* Lite · estimated speeds',
  นาที: 'min',
  'ระยะทาง {km} กม.': 'Distance {km} km',
})

export function ETAWidget({
  etaMin,
  distanceKm,
  progressPct,
  routeProvider,
  routeTraffic,
  className,
}: {
  etaMin: number
  distanceKm?: number
  progressPct?: number
  /** Which routing provider produced this ETA (see lib/routing.ts) --
   * 'longdo' means the ETA reflects live Thailand traffic, 'osrm' means a
   * real road route but typical-speed only, and undefined means neither
   * loaded yet (still a straight-line estimate). Shown as two different
   * badges so the label never overclaims what data backs the number.
   * 'dstarlite' is the app's own router (lib/pathfinding/), labelled with the traffic
   * data it actually used (routeTraffic). */
  routeProvider?: 'dstarlite' | 'longdo' | 'osrm'
  routeTraffic?: 'real-time' | 'predicted' | 'none'
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
          {routeProvider === 'dstarlite' && (
            <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
              {routeTraffic === 'real-time'
                ? t('D* Lite · สภาพจราจรปัจจุบัน')
                : routeTraffic === 'predicted'
                  ? t('D* Lite · สภาพจราจรคาดการณ์')
                  : t('D* Lite · ความเร็วโดยประมาณ')}
            </span>
          )}
          {routeProvider === 'longdo' && (
            <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
              {t('เส้นทางที่เร็วที่สุดตามสภาพจราจร')}
            </span>
          )}
          {routeProvider === 'osrm' && (
            <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
              {t('เส้นทางตามถนนจริง')}
            </span>
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
