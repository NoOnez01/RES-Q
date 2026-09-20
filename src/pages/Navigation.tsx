import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MapPanel } from '@/components/MapPanel'
import type { MapPin as MapPinT } from '@/components/MapPanel'
import { ETAWidget } from '@/components/ETAWidget'
import { SpeechToTextPanel } from '@/components/SpeechToTextPanel'
import { ErrorState } from '@/components/States'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { clamp, estimateEtaMin, haversineKm, formatDateTime } from '@/lib/utils'
import { fetchRoute, pointAlongRoute, type RouteResult } from '@/lib/routing'
import { watchPosition, type Coords } from '@/lib/geolocation'
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
  'ไม่สามารถใช้ตำแหน่ง GPS ได้': "Couldn't get your GPS location",
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

  const [pct, setPct] = useState(c?.rescueEnRoutePct ?? 0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [updateNote, setUpdateNote] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)
  const [route, setRoute] = useState<RouteResult | null>(null)

  // Real device GPS is opt-in (defaults to the existing simulated progress
  // animation) -- most demo/training runs aren't an actual vehicle moving,
  // so simulated stays the default and this only takes over once someone
  // explicitly asks for it.
  const [gpsMode, setGpsMode] = useState(false)
  const [gpsPos, setGpsPos] = useState<Coords | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [gpsRoute, setGpsRoute] = useState<RouteResult | null>(null)
  const lastRouteFetchPosRef = useRef<Coords | null>(null)

  const isEnRoute = c?.status === 'rescue-en-route'
  const isTransporting = c?.status === 'transporting'
  const isNavigable = isEnRoute || isTransporting

  const base: GeoLocation | null = c?.assignedRescueTeam?.base ?? null
  const target: GeoLocation | null = isEnRoute ? c?.location ?? null : isTransporting ? c?.selectedHospital?.location ?? null : null
  const destinationLabel = isEnRoute ? t('จุดเกิดเหตุ') : isTransporting ? c?.selectedHospital?.name ?? t('โรงพยาบาล') : ''
  const arriveButtonLabel = isEnRoute ? t('ถึงจุดเกิดเหตุแล้ว') : t('ถึงโรงพยาบาลแล้ว')

  // Real road route + typical-speed ETA (see lib/routing.ts) for whichever
  // leg is currently active. Silently stays null -- and every value below
  // falls back to the old straight-line estimate -- if the routing request
  // fails (no key needed; OSRM's public server is called directly).
  useEffect(() => {
    if (!isNavigable || !base || !target) {
      setRoute(null)
      return
    }
    let cancelled = false
    setRoute(null)
    void fetchRoute(base, target).then((r) => {
      if (!cancelled) setRoute(r)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavigable, base?.lat, base?.lng, target?.lat, target?.lng])

  useEffect(() => {
    if (!c || !id || !isNavigable || !base || !target || gpsMode) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    setPct(c.rescueEnRoutePct)
    const step = 100 / 18
    intervalRef.current = setInterval(() => {
      setPct((prev) => clamp(prev + step, 0, 100))
    }, 700)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNavigable, gpsMode])

  useEffect(() => {
    if (!id || !isNavigable || gpsMode) return
    updateRescueProgress(id, Math.round(pct))
    if (pct >= 100 && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [pct, id, isNavigable, gpsMode, updateRescueProgress])

  // Live device position while GPS mode is on -- stops watching (and clears
  // any stale fix/route) the moment it's switched off or navigation ends.
  useEffect(() => {
    if (!gpsMode || !isNavigable) {
      setGpsPos(null)
      setGpsError(null)
      setGpsRoute(null)
      lastRouteFetchPosRef.current = null
      return
    }
    setGpsError(null)
    const stop = watchPosition(
      (pos) => {
        setGpsPos(pos)
        setGpsError(null)
      },
      (err) => {
        const reasonLabel =
          err.reason === 'denied'
            ? t('กรุณาอนุญาตการเข้าถึงตำแหน่งเพื่อระบุจุดเกิดเหตุ')
            : t('ไม่สามารถใช้ตำแหน่ง GPS ได้')
        setGpsError(reasonLabel)
      },
    )
    return stop
  }, [gpsMode, isNavigable, t])

  // Real road route + traffic-aware ETA from wherever the device actually
  // is right now, re-requested only once it's moved meaningfully -- not on
  // every single GPS fix, which can fire many times a second.
  useEffect(() => {
    if (!gpsMode || !gpsPos || !target) return
    const last = lastRouteFetchPosRef.current
    if (last && haversineKm(last, gpsPos) < REROUTE_THRESHOLD_KM) return
    lastRouteFetchPosRef.current = gpsPos
    let cancelled = false
    void fetchRoute({ ...gpsPos, address: '' }, target).then((r) => {
      if (!cancelled) setGpsRoute(r)
    })
    return () => {
      cancelled = true
    }
  }, [gpsMode, gpsPos, target])

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
  const activeRoute = gpsMode ? gpsRoute : route

  const pins: MapPinT[] = [
    { id: 'rescue', lat: livePos.lat, lng: livePos.lng, label: t('หน่วยกู้ชีพ'), kind: 'rescue' },
    { id: 'dest', lat: target.lat, lng: target.lng, label: destinationLabel, kind: isTransporting ? 'hospital' : 'incident' },
  ]

  // Real road distance + road-network ETA when available; the old
  // as-the-crow-flies estimate otherwise (straight-line from the real GPS
  // fix in GPS mode, from the simulated point in simulated mode).
  const distanceKm = activeRoute ? activeRoute.distanceKm : haversineKm(livePos, target)
  const etaMin = activeRoute ? activeRoute.durationMin : estimateEtaMin(distanceKm)
  // Simulated mode "arrives" when the fake progress timer completes; GPS
  // mode arrives based on actual proximity to the target. Either way,
  // reaching this state only enables the button below -- confirming is
  // still a manual tap.
  const arrived = gpsMode ? !!gpsPos && haversineKm(gpsPos, target) <= ARRIVAL_RADIUS_KM : pct >= 100

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
            <div className="ml-auto flex rounded-full border border-border bg-surface p-0.5 text-xs font-semibold shadow-card">
              <button
                type="button"
                onClick={() => setGpsMode(false)}
                className={clsx('rounded-full px-3 py-1.5 transition-colors', !gpsMode ? 'bg-primary text-white' : 'text-muted hover:text-ink')}
              >
                {t('จำลองการเดินทาง')}
              </button>
              <button
                type="button"
                onClick={() => setGpsMode(true)}
                className={clsx('rounded-full px-3 py-1.5 transition-colors', gpsMode ? 'bg-primary text-white' : 'text-muted hover:text-ink')}
              >
                {t('ใช้ GPS จริง')}
              </button>
            </div>
          </div>

          {gpsMode && gpsError && (
            <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">{gpsError}</p>
          )}
          {gpsMode && !gpsError && !gpsPos && (
            <p className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted">{t('กำลังค้นหาตำแหน่ง GPS...')}</p>
          )}

          <ETAWidget
            etaMin={etaMin}
            distanceKm={distanceKm}
            progressPct={gpsMode ? undefined : Math.round(pct)}
            routeProvider={activeRoute?.provider}
          />

          <Card className="!p-0 overflow-hidden">
            <MapPanel pins={pins} showRoute routePoints={activeRoute?.points} height="360px" />
          </Card>

          <Card className="flex items-center justify-center gap-2 py-4 text-center">
            {arrived ? (
              <span className="flex items-center gap-2 font-semibold text-success">
                <CheckCircle2 className="size-5" /> {t('ถึง{destination}แล้ว', { destination: destinationLabel })}
              </span>
            ) : gpsMode ? (
              <span className="flex items-center gap-2 font-semibold text-primary">
                <Loader2 className="size-5 animate-spin-slow" /> {t('กำลังเดินทาง...')}
              </span>
            ) : (
              <span className="flex items-center gap-2 font-semibold text-primary">
                <Loader2 className="size-5 animate-spin-slow" /> {t('กำลังเดินทาง...')}{' '}
                <span key={Math.round(pct)} className="inline-block animate-count-pop tabular-nums">
                  {Math.round(pct)}%
                </span>
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
