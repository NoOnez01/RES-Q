import type { CSSProperties } from 'react'
import clsx from 'clsx'
import { Map as MapIcon, Satellite, Globe, Check } from 'lucide-react'
import { Card } from './ui/Card'
import { SegmentedControl } from './ui/SegmentedControl'
import { BASEMAPS, setBasemap, useBasemap, type BasemapId } from '@/lib/map/basemaps'
import { availableRoutingProviders, setRoutingPreference, useRoutingPreference, type RoutingPreference } from '@/lib/map/routing/providers'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  แผนที่: 'Map',
  แผนที่พื้นฐาน: 'Base map',
  'ใช้กับแผนที่ทุกหน้าในแอป เปลี่ยนได้จากปุ่มมุมขวาบนของแผนที่ด้วย': 'Used by every map in the app; also switchable from the button at the top right of a map',
  ผู้ให้บริการเส้นทาง: 'Routing provider',
  'อัตโนมัติ (แนะนำ)': 'Automatic (recommended)',
  'ลำดับ: {list}': 'In order: {list}',
  'ถ้าผู้ให้บริการที่เลือกหาเส้นทางไม่ได้ ระบบจะใช้รายถัดไปให้เอง': "If the chosen provider can't find a route, the next one takes over",
})

const ICONS: Record<BasemapId, typeof MapIcon> = { longdo: MapIcon, thaichote: Satellite, osm: Globe }

/** Settings: which providers draw the app's maps and plan its routes. */
export function MapSettingsCard({ style }: { style?: CSSProperties }) {
  const t = useT()
  const { chosen, failedOver } = useBasemap()
  const preference = useRoutingPreference()
  const basemaps = BASEMAPS.filter((b) => b.available)
  const routers = availableRoutingProviders()
  const routeOptions: { value: RoutingPreference; label: string; description: string }[] = [
    { value: 'auto', label: t('อัตโนมัติ (แนะนำ)'), description: t('ลำดับ: {list}', { list: routers.map((p) => t(p.label)).join(' → ') }) },
    ...routers.map((p) => ({ value: p.id, label: t(p.label), description: t(p.description) })),
  ]

  return (
    <Card className="space-y-5 animate-fade-in-up" style={style}>
      <h3 className="flex items-center gap-2 font-bold text-ink">
        <MapIcon className="size-4 text-primary" /> {t('แผนที่')}
      </h3>

      {/* Without a Longdo key there's only OpenStreetMap -- nothing to choose. */}
      {basemaps.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('แผนที่พื้นฐาน')}</p>
          <SegmentedControl
            variant="card"
            value={chosen.id}
            onChange={setBasemap}
            options={basemaps.map((b) => ({ value: b.id, label: t(b.label), icon: ICONS[b.id] }))}
          />
          <p className="text-xs text-muted">{t(chosen.description)}</p>
          {failedOver && <p className="text-xs text-warning">{t('{label} ไม่ตอบสนอง กำลังใช้ OpenStreetMap แทน', { label: t(chosen.label) })}</p>}
          <p className="text-xs text-muted">{t('ใช้กับแผนที่ทุกหน้าในแอป เปลี่ยนได้จากปุ่มมุมขวาบนของแผนที่ด้วย')}</p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('ผู้ให้บริการเส้นทาง')}</p>
        <div role="radiogroup" aria-label={t('ผู้ให้บริการเส้นทาง')} className="flex flex-col gap-1.5">
          {routeOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={preference === o.value}
              onClick={() => setRoutingPreference(o.value)}
              className={clsx(
                'flex items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
                preference === o.value ? 'border-primary bg-skyblue-light' : 'border-border bg-surface hover:border-primary/40',
              )}
            >
              <Check className={clsx('mt-0.5 size-4 shrink-0 text-primary', preference !== o.value && 'invisible')} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{o.label}</span>
                <span className="block text-xs text-muted">{o.description}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{t('ถ้าผู้ให้บริการที่เลือกหาเส้นทางไม่ได้ ระบบจะใช้รายถัดไปให้เอง')}</p>
      </div>
    </Card>
  )
}
