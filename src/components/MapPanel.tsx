import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import clsx from 'clsx'
import { MapPin, Ambulance, Building2, Ban, Layers, Check } from 'lucide-react'
import { useT, registerTranslations } from '@/lib/i18n'
import { BASEMAPS, noteTileError, noteTileLoaded, setBasemap, useBasemap } from '@/lib/map/basemaps'

registerTranslations({
  'เส้นทางการเดินทางไปยัง {label}': 'Route to {label}',
  จุดหมาย: 'destination',
  เลือกแผนที่: 'Choose map',
  'แผนที่ Longdo': 'Longdo Map',
  'ชื่อถนนและสถานที่ภาษาไทย': 'Thai street and place names',
  ภาพดาวเทียม: 'Satellite',
  'THAICHOTE จาก GISTDA เห็นสภาพพื้นที่จริง': "GISTDA's THAICHOTE imagery: see the ground as it is",
  'แผนที่เปิดของชุมชน ใช้ได้เสมอโดยไม่ต้องใช้คีย์': 'Community open map, always available with no key',
  '{label} ไม่ตอบสนอง กำลังใช้ OpenStreetMap แทน': '{label} is not responding; using OpenStreetMap instead',
})

// The app's theme is the `.dark` class on <html> (ThemeBridge).
function subscribeDark(listener: () => void) {
  const observer = new MutationObserver(listener)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}
function useDarkTheme(): boolean {
  return useSyncExternalStore(subscribeDark, () => document.documentElement.classList.contains('dark'))
}

/** Every map's base layer, from the provider the user picked (lib/map/basemaps). */
function BaseLayer() {
  const { active } = useBasemap()
  const dark = useDarkTheme()
  return (
    <TileLayer
      // A new provider is a new layer, not new URLs on the old one.
      key={`${active.id}:${dark}`}
      url={active.url(dark)}
      attribution={active.attribution}
      maxNativeZoom={active.maxNativeZoom}
      maxZoom={20}
      eventHandlers={{ tileload: () => noteTileLoaded(active.id), tileerror: () => noteTileError(active.id) }}
    />
  )
}

function BasemapPicker() {
  const t = useT()
  const { chosen, failedOver } = useBasemap()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const options = BASEMAPS.filter((b) => b.available)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  // Nothing to choose between without a Longdo key.
  if (options.length < 2) return null

  return (
    <div ref={ref} className="absolute right-2.5 top-2.5 z-[1000] flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t('เลือกแผนที่')}
        title={t('เลือกแผนที่')}
        className="flex size-9 items-center justify-center rounded-xl border border-border bg-surface text-ink shadow-card transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
      >
        <Layers className="size-4" />
      </button>
      {open && (
        <div role="menu" className="w-60 rounded-xl border border-border bg-surface p-1.5 shadow-card-lg">
          {options.map((b) => (
            <button
              key={b.id}
              type="button"
              role="menuitemradio"
              aria-checked={chosen.id === b.id}
              onClick={() => {
                setBasemap(b.id)
                setOpen(false)
              }}
              className={clsx(
                'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-skyblue-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                chosen.id === b.id && 'bg-skyblue-pale',
              )}
            >
              <Check className={clsx('mt-0.5 size-4 shrink-0 text-primary', chosen.id !== b.id && 'invisible')} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{t(b.label)}</span>
                <span className="block text-xs text-muted">{t(b.description)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {failedOver && !open && (
        <p className="max-w-[15rem] rounded-lg bg-surface/95 px-2.5 py-1.5 text-xs text-ink shadow-card">
          {t('{label} ไม่ตอบสนอง กำลังใช้ OpenStreetMap แทน', { label: t(chosen.label) })}
        </p>
      )}
    </div>
  )
}

export interface MapPin {
  id: string
  lat: number
  lng: number
  label: string
  /** 'closure' = a reported road closure the route avoids. */
  kind: 'incident' | 'rescue' | 'hospital' | 'closure'
}

const pinColors: Record<MapPin['kind'], string> = {
  incident: '#D92D20',
  rescue: '#0B6EBD',
  hospital: '#12B76A',
  closure: '#B54708',
}

const pinIcons: Record<MapPin['kind'], React.ElementType> = {
  incident: MapPin,
  rescue: Ambulance,
  hospital: Building2,
  closure: Ban,
}

function buildIcon(kind: MapPin['kind']) {
  const Icon = pinIcons[kind]
  const color = pinColors[kind]
  const html = renderToStaticMarkup(
    <div style={{ width: 38, height: 38, position: 'relative' }}>
      {kind === 'incident' && <span className="resq-marker-pulse bg-fx" />}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: '50% 50% 50% 0',
          background: color,
          transform: 'rotate(-45deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(18,48,74,0.35)',
          border: '2px solid white',
          position: 'relative',
          zIndex: 1,
        }}
        className="resq-marker-pin"
      >
        <div style={{ transform: 'rotate(45deg)' }}>
          <Icon color="white" size={18} strokeWidth={2.5} />
        </div>
      </div>
    </div>,
  )
  return L.divIcon({
    html,
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -36],
  })
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

interface MapPanelProps {
  pins: MapPin[]
  center?: [number, number]
  zoom?: number
  height?: string
  showRoute?: boolean
  /** Real road-route geometry (decoded from OSRM's route polyline, see
   * lib/routing.ts) to draw instead of the straight pin-to-pin line
   * `showRoute` alone draws. Falls back to the straight line when absent
   * (route still loading, or the request failed) so every existing caller
   * keeps working unchanged. */
  routePoints?: [number, number][]
  className?: string
  /** When set, clicking the map reports the clicked coordinates instead of just panning. */
  onPickLocation?: (lat: number, lng: number) => void
}

export function MapPanel({
  pins,
  center,
  zoom = 14,
  height = '320px',
  showRoute = false,
  routePoints,
  className,
  onPickLocation,
}: MapPanelProps) {
  const resolvedCenter: [number, number] = center ?? (pins[0] ? [pins[0].lat, pins[0].lng] : [13.7563, 100.5018])
  const t = useT()

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        height,
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid #D9E7F2',
        cursor: onPickLocation ? 'crosshair' : undefined,
      }}
    >
      <BasemapPicker />
      <MapContainer
        center={resolvedCenter}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        {onPickLocation && <ClickHandler onPick={onPickLocation} />}
        <BaseLayer />
        {showRoute && routePoints && routePoints.length > 1 && (
          // The real road route once it's loaded -- solid, not dashed, since
          // this is an actual path a vehicle drives, not a placeholder.
          <Polyline positions={routePoints} pathOptions={{ color: '#0B6EBD', weight: 4, opacity: 0.7 }}>
            <Popup>{t('เส้นทางการเดินทางไปยัง {label}', { label: pins[pins.length - 1]?.label ?? t('จุดหมาย') })}</Popup>
          </Polyline>
        )}
        {showRoute && !routePoints && pins.length > 1 && (
          // Straight pin-to-pin placeholder while the real route is still
          // loading, or when routing isn't configured at all -- dashed so it
          // reads as "as the crow flies", not a real driving path.
          <Polyline
            positions={pins.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: '#0B6EBD', weight: 4, opacity: 0.6, dashArray: '2 10' }}
          >
            <Popup>{t('เส้นทางการเดินทางไปยัง {label}', { label: pins[pins.length - 1]?.label ?? t('จุดหมาย') })}</Popup>
          </Polyline>
        )}
        {pins.map((pin) => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={buildIcon(pin.kind)}>
            <Popup>{pin.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
