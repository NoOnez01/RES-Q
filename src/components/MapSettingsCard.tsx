import type { CSSProperties } from 'react'
import { Map as MapIcon, Satellite, Globe } from 'lucide-react'
import { Card } from './ui/Card'
import { SegmentedControl } from './ui/SegmentedControl'
import { BASEMAPS, setBasemap, useBasemap, type BasemapId } from '@/lib/map/basemaps'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  แผนที่: 'Map',
  แผนที่พื้นฐาน: 'Base map',
  'ใช้กับแผนที่ทุกหน้าในแอป เปลี่ยนได้จากปุ่มมุมขวาบนของแผนที่ด้วย': 'Used by every map in the app; also switchable from the button at the top right of a map',
})

const ICONS: Record<BasemapId, typeof MapIcon> = { longdo: MapIcon, thaichote: Satellite, osm: Globe }

/** Settings: which provider draws the app's maps. */
export function MapSettingsCard({ style }: { style?: CSSProperties }) {
  const t = useT()
  const { chosen, failedOver } = useBasemap()
  const options = BASEMAPS.filter((b) => b.available)
  // Without a Longdo key there's only OpenStreetMap -- nothing to choose.
  if (options.length < 2) return null

  return (
    <Card className="space-y-4 animate-fade-in-up" style={style}>
      <h3 className="flex items-center gap-2 font-bold text-ink">
        <MapIcon className="size-4 text-primary" /> {t('แผนที่')}
      </h3>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('แผนที่พื้นฐาน')}</p>
        <SegmentedControl
          variant="card"
          value={chosen.id}
          onChange={setBasemap}
          options={options.map((b) => ({ value: b.id, label: t(b.label), icon: ICONS[b.id] }))}
        />
        <p className="text-xs text-muted">{t(chosen.description)}</p>
        {failedOver && <p className="text-xs text-warning">{t('{label} ไม่ตอบสนอง กำลังใช้ OpenStreetMap แทน', { label: t(chosen.label) })}</p>}
        <p className="text-xs text-muted">{t('ใช้กับแผนที่ทุกหน้าในแอป เปลี่ยนได้จากปุ่มมุมขวาบนของแผนที่ด้วย')}</p>
      </div>
    </Card>
  )
}
