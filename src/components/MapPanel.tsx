import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapPin, Ambulance, Building2 } from 'lucide-react'

export interface MapPin {
  id: string
  lat: number
  lng: number
  label: string
  kind: 'incident' | 'rescue' | 'hospital'
}

const pinColors: Record<MapPin['kind'], string> = {
  incident: '#D92D20',
  rescue: '#0B6EBD',
  hospital: '#12B76A',
}

const pinIcons: Record<MapPin['kind'], React.ElementType> = {
  incident: MapPin,
  rescue: Ambulance,
  hospital: Building2,
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
  className,
  onPickLocation,
}: MapPanelProps) {
  const resolvedCenter: [number, number] = center ?? (pins[0] ? [pins[0].lat, pins[0].lng] : [13.7563, 100.5018])

  return (
    <div
      className={className}
      style={{
        height,
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid #D9E7F2',
        cursor: onPickLocation ? 'crosshair' : undefined,
      }}
    >
      <MapContainer
        center={resolvedCenter}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        {onPickLocation && <ClickHandler onPick={onPickLocation} />}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {showRoute && pins.length > 1 && (
          <Polyline
            positions={pins.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: '#0B6EBD', weight: 4, opacity: 0.6, dashArray: '2 10' }}
          >
            <Popup>เส้นทางการเดินทางไปยัง {pins[pins.length - 1]?.label ?? 'จุดหมาย'}</Popup>
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
