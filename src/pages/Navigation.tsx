import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { MapPanel } from '@/components/MapPanel'
import type { MapPin as MapPinT } from '@/components/MapPanel'
import { ETAWidget } from '@/components/ETAWidget'
import { SpeechToTextPanel } from '@/components/SpeechToTextPanel'
import { ErrorState } from '@/components/States'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { clamp, estimateEtaMin, haversineKm, formatDateTime } from '@/lib/utils'
import { pointAlongRoute } from '@/lib/routing'
import { useLiveRoute } from '@/lib/useLiveRoute'
import { useSimulatedProgress } from '@/lib/useSimulatedProgress'
import type { GeoLocation } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  กำลังนำทาง: 'Navigating',
  เคสนี้ไม่อยู่ในสถานะที่ต้องนำทาง: 'This case is not in a status that requires navigation',
  กลับไปยังรายละเอียดเคส: 'Back to case details',
  กำลังติดตามตำแหน่ง: 'Tracking location',
  'ถึง{destination}แล้ว': 'Arrived at {destination}',
  'กำลังเดินทาง...': 'En route...',
  ถึงโรงพยาบาลแล้ว: 'Arrived at the hospital',
  รอโรงพยาบาลยืนยันการรับผู้ป่วย: 'Waiting for the hospital to confirm patient admission',
  เริ่มบันทึกข้อมูลผู้ป่วยได้เลย: 'You can start recording patient data now',
  จำลองการเดินทาง: 'Simulated',
  'ใช้ GPS จริง': 'My GPS',
  'กำลังค้นหาตำแหน่ง GPS...': 'Finding your GPS location...',
  // The four possible messages GeolocationError can carry (see
  // lib/geolocation.ts) -- registered here so the raw `err.message` string
  // it throws can be translated directly wherever it's caught, instead of
  // each caller re-describing its own (necessarily coarser) version.
  อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง: 'This device does not support location detection',
  'ค้นหาตำแหน่งใช้เวลานานเกินไป กรุณาลองใหม่': 'Finding your location took too long, please try again',
  กรุณาอนุญาตการเข้าถึงตำแหน่งเพื่อระบุจุดเกิดเหตุ: 'Please allow location access',
  ไม่สามารถระบุตำแหน่งได้ในขณะนี้: 'Unable to determine your location right now',
})

/** Within this distance of the target, the "arrived" button becomes
 * enabled in real-GPS mode -- confirmation is still a manual tap (same as
 * simulated mode), this only decides when that tap is allowed. A phone GPS
 * fix is rarely accurate to better than ~10-20m, so this needs to be loose
 * enough to actually trigger while still meaning "you're basically there". */
const ARRIVAL_RADIUS_KM = 0.06

/** How far the real GPS position has to move before re-requesting a route
 * (real distance/ETA) for it -- watchPosition can fire many times a second
 * on a device with a live GPS chip, and every call is a network request to
 * a shared public routing server. */
const REROUTE_THRESHOLD_KM = 0.1

export default function NavigationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const c = useStore((s) => (id ? s.cases[id] : undefined))
  const updateRescueProgress = useStore((s) => s.updateRescueProgress)
  const rescueMarkArrived = useStore((s) => s.rescueMarkArrived)
  const markHospitalArrived = useStore((s) => s.markHospitalArrived)
  const addPatientUpdate = useStore((s) => s.addPatientUpdate)
  const t = useT()

  const [updateNote, setUpdateNote] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)

  // Real device GPS is opt-in (defaults to the existing simulated progress
  // animation) -- most demo/training runs aren't an actual vehicle moving,
  // so simulated stays the default and this only takes over once someone
  // explicitly asks for it.
  const [gpsMode, setGpsMode] = useState(false)

  const isEnRoute = c?.status === 'rescue-en-route'
  const isTransporting = c?.status === 'transporting'
  const isNavigable = isEnRoute || isTransporting

  const base: GeoLocation | null = c?.assignedRescueTeam?.base ?? null
  const target: GeoLocation | null = isEnRoute ? c?.location ?? null : isTransporting ? c?.selectedHospital?.location ?? null : null
  const destinationLabel = isEnRoute ? t('จุดเกิดเหตุ') : isTransporting ? c?.selectedHospital?.name ?? t('โรงพยาบาล') : ''
  const arriveButtonLabel = isEnRoute ? t('ถึงจุดเกิดเหตุแล้ว') : t('ถึงโรงพยาบาลแล้ว')

  // Route + live GPS tracking (see lib/useLiveRoute.ts) -- origin is the
  // device's real position in GPS mode, the rescue team's fixed base
  // otherwise, switching cleanly between the two as gpsMode toggles.
  const { route, gpsPos, gpsErrorMessage } = useLiveRoute({
    gpsMode,
    active: isNavigable,
    simulatedOrigin: base,
    target,
    rerouteThresholdKm: REROUTE_THRESHOLD_KM,
  })

  // Simulated-mode progress animation (see lib/useSimulatedProgress.ts) --
  // the counterpart to useLiveRoute above, active only while GPS mode is
  // off, so the two "where is the rescue unit" sources are each a single
  // self-contained hook rather than effects scattered across the component
  // and each individually gated by `gpsMode`.
  const pct = useSimulatedProgress({
    active: isNavigable && !gpsMode && !!base && !!target,
    caseId: c && isNavigable ? id : undefined,
    initialPct: c?.rescueEnRoutePct ?? 0,
    onProgress: updateRescueProgress,
  })

  if (!id || !c) {
    return (
      <AppShell variant="flow" title={t('กำลังนำทาง')} showBack onBack={() => navigate(-1)}>
        <div className="relative">
          <AnimatedBackground variant="map" />
          <div className="relative z-10">
            <ErrorState
              title={t('ไม่พบเคสนี้')}
              description={t('เคสอาจถูกลบหรือไม่มีอยู่ในระบบ')}
              onRetry={() => navigate('/rescue/dashboard')}
              retryLabel={t('กลับแดชบอร์ด')}
            />
          </div>
        </div>
      </AppShell>
    )
  }

  if (!isNavigable || !base || !target) {
    return (
      <AppShell variant="flow" title={t('กำลังนำทาง')} showBack onBack={() => navigate(`/rescue/case/${c.id}`)}>
        <div className="relative">
          <AnimatedBackground variant="map" />
          <div className="relative z-10">
            <Card className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="font-semibold text-ink">{t('เคสนี้ไม่อยู่ในสถานะที่ต้องนำทาง')}</p>
              <Link to={`/rescue/case/${c.id}`} className="text-sm font-semibold text-primary hover:text-primary-bright">
                {t('กลับไปยังรายละเอียดเคส')}
              </Link>
            </Card>
          </div>
        </div>
      </AppShell>
    )
  }

  const ratio = clamp(pct, 0, 100) / 100
  // Rides the real road geometry once it's loaded; falls back to the
  // original straight-line interpolation otherwise (route still loading,
  // or routing not configured) so this screen never blocks on it.
  const simulatedPos = route
    ? pointAlongRoute(route.points, ratio)
    : { lat: base.lat + (target.lat - base.lat) * ratio, lng: base.lng + (target.lng - base.lng) * ratio }
  // In GPS mode the rescue pin is the device's real position -- falls back
  // to the simulated point only for the brief moment before the first GPS
  // fix comes back, so the map/pin never has nothing to show.
  const livePos = gpsMode && gpsPos ? gpsPos : simulatedPos

  const pins: MapPinT[] = [
    { id: 'rescue', lat: livePos.lat, lng: livePos.lng, label: t('หน่วยกู้ชีพ'), kind: 'rescue' },
    { id: 'dest', lat: target.lat, lng: target.lng, label: destinationLabel, kind: isTransporting ? 'hospital' : 'incident' },
  ]

  // Real road distance + road-network ETA when available; the old
  // as-the-crow-flies estimate otherwise (straight-line from the real GPS
  // fix in GPS mode, from the simulated point in simulated mode).
  const distanceKm = route ? route.distanceKm : haversineKm(livePos, target)
  const etaMin = route ? route.durationMin : estimateEtaMin(distanceKm)
  // Simulated mode "arrives" when the fake progress timer completes; GPS
  // mode arrives based on actual proximity to the target. Either way,
  // reaching this state only enables the button below -- confirming is
  // still a manual tap.
  const arrived = gpsMode ? !!gpsPos && haversineKm(gpsPos, target) <= ARRIVAL_RADIUS_KM : pct >= 100
  // The simulated percentage only means anything in simulated mode -- GPS
  // mode has no equivalent "how far along" number, so this is undefined
  // there rather than each display site re-deciding that on its own.
  const displayPct = gpsMode ? undefined : Math.round(pct)

  function handleArrive() {
    if (!id) return
    if (isEnRoute) {
      rescueMarkArrived(id)
      toast({ title: t('ถึงจุดเกิดเหตุแล้ว'), message: t('เริ่มบันทึกข้อมูลผู้ป่วยได้เลย'), tone: 'success' })
    } else {
      markHospitalArrived(id)
      toast({ title: t('ถึงโรงพยาบาลแล้ว'), message: t('รอโรงพยาบาลยืนยันการรับผู้ป่วย'), tone: 'success' })
    }
    navigate(`/rescue/case/${id}`)
  }

  function handleAddUpdate() {
    if (!id || !updateNote.trim()) return
    setUpdateLoading(true)
    setTimeout(() => {
      addPatientUpdate(id, updateNote.trim())
      setUpdateNote('')
      setUpdateLoading(false)
      toast({ title: t('บันทึกอัปเดตอาการแล้ว'), message: t('ศูนย์สั่งการและโรงพยาบาลจะเห็นอัปเดตนี้ทันที'), tone: 'success' })
    }, 400)
  }

  return (
    <AppShell variant="flow" title={t('กำลังนำทาง')} showBack onBack={() => navigate(`/rescue/case/${c.id}`)}>
      <div className="relative">
        <AnimatedBackground variant="map" />
        <div className="relative z-10 flex flex-col gap-4 pb-24">
          <div className="flex flex-wrap items-center gap-2">
            {!arrived && (
              <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-surface/90 px-3 py-1.5 text-xs font-bold text-primary shadow-card" aria-live="off">
                <PulseRing tone="primary" size="sm" />
                {t('กำลังติดตามตำแหน่ง')}
              </div>
            )}
            <SegmentedControl
              className="ml-auto"
              value={gpsMode ? 'gps' : 'simulated'}
              onChange={(mode) => setGpsMode(mode === 'gps')}
              options={[
                { value: 'simulated', label: t('จำลองการเดินทาง') },
                { value: 'gps', label: t('ใช้ GPS จริง') },
              ]}
            />
          </div>

          {gpsMode && gpsErrorMessage && (
            <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">{t(gpsErrorMessage)}</p>
          )}
          {gpsMode && !gpsErrorMessage && !gpsPos && (
            <p className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted">{t('กำลังค้นหาตำแหน่ง GPS...')}</p>
          )}

          <ETAWidget etaMin={etaMin} distanceKm={distanceKm} progressPct={displayPct} routeProvider={route?.provider} />

          <Card className="!p-0 overflow-hidden">
            <MapPanel pins={pins} showRoute routePoints={route?.points} height="360px" />
          </Card>

          <Card className="flex items-center justify-center gap-2 py-4 text-center">
            {arrived ? (
              <span className="flex items-center gap-2 font-semibold text-success">
                <CheckCircle2 className="size-5" /> {t('ถึง{destination}แล้ว', { destination: destinationLabel })}
              </span>
            ) : (
              <span className="flex items-center gap-2 font-semibold text-primary">
                <Loader2 className="size-5 animate-spin-slow" /> {t('กำลังเดินทาง...')}
                {displayPct !== undefined && (
                  <span key={displayPct} className="inline-block animate-count-pop tabular-nums">
                    {displayPct}%
                  </span>
                )}
              </span>
            )}
          </Card>

          {c.patientInfo && (
            <Card className="space-y-3">
              <h3 className="font-bold text-ink">{t('อัปเดตอาการผู้ป่วย')}</h3>
              {c.patientUpdates.length > 0 && (
                <div className="rounded-xl bg-skyblue-pale p-3">
                  <p className="text-sm text-ink whitespace-pre-wrap">
                    {c.patientUpdates[c.patientUpdates.length - 1].note}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {t('อัปเดตล่าสุด {date}', { date: formatDateTime(c.patientUpdates[c.patientUpdates.length - 1].recordedAt) })}
                  </p>
                </div>
              )}
              <SpeechToTextPanel
                value={updateNote}
                onChange={setUpdateNote}
                label={t('มีการเปลี่ยนแปลงอาการหรือไม่ (พิมพ์หรือพูด)')}
              />
              <Button
                variant="secondary"
                size="sm"
                loading={updateLoading}
                disabled={!updateNote.trim()}
                onClick={handleAddUpdate}
              >
                {t('บันทึกอัปเดต')}
              </Button>
            </Card>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 p-4 backdrop-blur sm:relative sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mx-auto max-w-2xl">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!arrived}
              onClick={handleArrive}
              className={clsx(arrived && 'animate-pulse-glow')}
            >
              {arriveButtonLabel}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
