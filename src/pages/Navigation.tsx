import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Ban, CheckCircle2, Loader2 } from 'lucide-react'
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
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { Textarea } from '@/components/ui/Field'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { clamp, estimateEtaMin, haversineKm, formatDateTime } from '@/lib/utils'
import { pointAlongRoute } from '@/lib/routing'
import { useLiveRoute } from '@/lib/useLiveRoute'
import { useSimulatedProgress } from '@/lib/useSimulatedProgress'
import { CLOSURE_REASON_LABEL, reportRoadClosure, useRoadClosures, type ClosureReason } from '@/lib/roadClosures'
import type { GeoLocation } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'
import { revealMissingField } from '@/lib/formErrors'

registerTranslations({
  กรุณาระบุอาการของผู้ป่วยก่อนบันทึก: "Describe the patient's condition before saving",
  แจ้งเส้นทางถูกปิด: 'Report road closed',
  'เจอถนนที่ผ่านไม่ได้ แจ้งไว้เพื่อให้ทุกหน่วยเลี่ยงเส้นทางนี้': "Found a road you can't get through? Report it so every unit avoids it",
  'ระบบจะบันทึกตำแหน่งปัจจุบันของรถเป็นจุดที่ถนนถูกปิด และคำนวณเส้นทางใหม่ที่เลี่ยงจุดนี้ให้ทุกหน่วย (หมดอายุอัตโนมัติใน 6 ชั่วโมง)':
    "The vehicle's current position is saved as the closed spot, and every unit's route is recalculated to avoid it (expires automatically after 6 hours)",
  สาเหตุ: 'Reason',
  'รายละเอียดเพิ่มเติม (ถ้ามี)': 'More details (if any)',
  ยืนยันแจ้งเส้นทางถูกปิด: 'Report closure',
  'บันทึกเส้นทางถูกปิดแล้ว': 'Road closure reported',
  'กำลังคำนวณเส้นทางใหม่ที่เลี่ยงจุดนี้': 'Recalculating a route that avoids it',
  แจ้งเส้นทางถูกปิดไม่สำเร็จ: 'Could not report the closure',
  'เส้นทางถูกปิด: {reason}': 'Road closed: {reason}',
  กำลังนำทาง: 'Navigating',
  เหตุนี้ไม่อยู่ในสถานะที่ต้องนำทาง: 'This case is not in a status that requires navigation',
  กลับไปยังรายละเอียดเหตุ: 'Back to case details',
  กำลังติดตามตำแหน่ง: 'Tracking location',
  'ถึง{destination}แล้ว': 'Arrived at {destination}',
  'กำลังเดินทาง...': 'En route...',
  ถึงโรงพยาบาลแล้ว: 'Arrived at the hospital',
  รอโรงพยาบาลยืนยันการรับผู้ป่วย: 'Waiting for the hospital to confirm patient admission',
  สามารถเริ่มบันทึกข้อมูลผู้ป่วยได้: 'You can start recording patient data now',
  จำลองการเดินทาง: 'Simulated',
  'ใช้ตำแหน่ง GPS จริง': 'My GPS',
  'กำลังค้นหาตำแหน่ง GPS...': 'Finding your GPS location...',
  // The four possible messages GeolocationError can carry (see
  // lib/geolocation.ts) -- registered here so the raw `err.message` string
  // it throws can be translated directly wherever it's caught, instead of
  // each caller re-describing its own (necessarily coarser) version.
  อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง: 'This device does not support location detection',
  'การค้นหาตำแหน่งใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง': 'Finding your location took too long, please try again',
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
  const [updateMissing, setUpdateMissing] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)

  // Real device GPS is opt-in (defaults to the existing simulated progress
  // animation) -- most demo/training runs aren't an actual vehicle moving,
  // so simulated stays the default and this only takes over once someone
  // explicitly asks for it.
  const [gpsMode, setGpsMode] = useState(false)
  const closures = useRoadClosures()
  const [closureOpen, setClosureOpen] = useState(false)
  const [closureReason, setClosureReason] = useState<ClosureReason>('flood')
  const [closureNote, setClosureNote] = useState('')
  const [reportingClosure, setReportingClosure] = useState(false)

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
  const { route, progress, gpsPos, gpsErrorMessage } = useLiveRoute({
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
              title={t('ไม่พบเหตุนี้')}
              description={t('เหตุนี้อาจถูกลบหรือไม่มีอยู่ในระบบ')}
              onRetry={() => navigate('/rescue/dashboard')}
              retryLabel={t('กลับไปหน้าภาพรวม')}
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
              <p className="font-semibold text-ink">{t('เหตุนี้ไม่อยู่ในสถานะที่ต้องนำทาง')}</p>
              <Link to={`/rescue/case/${c.id}`} className="text-sm font-semibold text-primary hover:text-primary-bright">
                {t('กลับไปยังรายละเอียดเหตุ')}
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
    ...closures.map((cl) => ({
      id: `closure-${cl.id}`,
      lat: cl.lat,
      lng: cl.lng,
      label: t('เส้นทางถูกปิด: {reason}', { reason: t(CLOSURE_REASON_LABEL[cl.reason]) }) + (cl.note ? ` — ${cl.note}` : ''),
      kind: 'closure' as const,
    })),
  ]

  async function submitClosure() {
    setReportingClosure(true)
    try {
      await reportRoadClosure({
        lat: livePos.lat,
        lng: livePos.lng,
        reason: closureReason,
        note: closureNote,
        reporterName: c?.assignedRescueTeam?.name,
      })
      toast({ title: t('บันทึกเส้นทางถูกปิดแล้ว'), message: t('กำลังคำนวณเส้นทางใหม่ที่เลี่ยงจุดนี้'), tone: 'success' })
      setClosureOpen(false)
      setClosureNote('')
    } catch (err) {
      console.error('Failed to report road closure:', err)
      toast({ title: t('แจ้งเส้นทางถูกปิดไม่สำเร็จ'), tone: 'error' })
    } finally {
      setReportingClosure(false)
    }
  }

  // Real road distance + road-network ETA when available; the old
  // as-the-crow-flies estimate otherwise (straight-line from the real GPS
  // fix in GPS mode, from the simulated point in simulated mode).
  // With live GPS, what's left from where the vehicle is now -- it counts
  // down as they drive instead of staying at the planned route's totals.
  const distanceKm = progress ? progress.remainingKm : route ? route.distanceKm : haversineKm(livePos, target)
  const etaMin = progress ? progress.remainingMin : route ? route.durationMin : estimateEtaMin(distanceKm)
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
      toast({ title: t('ถึงจุดเกิดเหตุแล้ว'), message: t('สามารถเริ่มบันทึกข้อมูลผู้ป่วยได้'), tone: 'success' })
    } else {
      markHospitalArrived(id)
      toast({ title: t('ถึงโรงพยาบาลแล้ว'), message: t('รอโรงพยาบาลยืนยันการรับผู้ป่วย'), tone: 'success' })
    }
    navigate(`/rescue/case/${id}`)
  }

  function handleAddUpdate() {
    if (!id) return
    if (!updateNote.trim()) {
      setUpdateMissing(true)
      revealMissingField()
      return
    }
    setUpdateLoading(true)
    setTimeout(() => {
      addPatientUpdate(id, updateNote.trim())
      setUpdateNote('')
      setUpdateLoading(false)
      toast({ title: t('บันทึกอาการล่าสุดแล้ว'), message: t('ศูนย์สั่งการและโรงพยาบาลจะได้รับข้อมูลนี้ทันที'), tone: 'success' })
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
                { value: 'gps', label: t('ใช้ตำแหน่ง GPS จริง') },
              ]}
            />
          </div>

          {gpsMode && gpsErrorMessage && (
            <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">{t(gpsErrorMessage)}</p>
          )}
          {gpsMode && !gpsErrorMessage && !gpsPos && (
            <p className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted">{t('กำลังค้นหาตำแหน่ง GPS...')}</p>
          )}

          <ETAWidget etaMin={etaMin} distanceKm={distanceKm} progressPct={displayPct} route={route} />

          <Card className="!p-0 overflow-hidden">
            <MapPanel pins={pins} showRoute routePoints={progress?.points ?? route?.points} height="360px" />
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-muted">{t('เจอถนนที่ผ่านไม่ได้ แจ้งไว้เพื่อให้ทุกหน่วยเลี่ยงเส้นทางนี้')}</p>
            <Button size="sm" variant="outline" icon={<Ban className="size-4" />} onClick={() => setClosureOpen(true)}>
              {t('แจ้งเส้นทางถูกปิด')}
            </Button>
          </div>

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
              <h3 className="font-bold text-ink">{t('รายงานอาการผู้ป่วย')}</h3>
              {c.patientUpdates.length > 0 && (
                <div className="rounded-xl bg-skyblue-pale p-3">
                  <p className="text-sm text-ink whitespace-pre-wrap">
                    {c.patientUpdates[c.patientUpdates.length - 1].note}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {t('ปรับปรุงล่าสุด {date}', { date: formatDateTime(c.patientUpdates[c.patientUpdates.length - 1].recordedAt) })}
                  </p>
                </div>
              )}
              <SpeechToTextPanel
                value={updateNote}
                onChange={setUpdateNote}
                label={t('มีการเปลี่ยนแปลงอาการหรือไม่ (พิมพ์หรือพูด)')}
                error={updateMissing && !updateNote.trim() ? t('กรุณาระบุอาการของผู้ป่วยก่อนบันทึก') : undefined}
              />
              <Button
                variant="secondary"
                size="sm"
                loading={updateLoading}
                onClick={handleAddUpdate}
              >
                {t('บันทึกอาการ')}
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

      <ConfirmationModal
        open={closureOpen}
        title={t('แจ้งเส้นทางถูกปิด')}
        message={t('ระบบจะบันทึกตำแหน่งปัจจุบันของรถเป็นจุดที่ถนนถูกปิด และคำนวณเส้นทางใหม่ที่เลี่ยงจุดนี้ให้ทุกหน่วย (หมดอายุอัตโนมัติใน 6 ชั่วโมง)')}
        confirmLabel={t('ยืนยันแจ้งเส้นทางถูกปิด')}
        confirmLoading={reportingClosure}
        onConfirm={() => void submitClosure()}
        onCancel={() => setClosureOpen(false)}
      >
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">{t('สาเหตุ')}</p>
          <SegmentedControl<ClosureReason>
            variant="card"
            value={closureReason}
            onChange={setClosureReason}
            options={(Object.keys(CLOSURE_REASON_LABEL) as ClosureReason[]).map((r) => ({ value: r, label: t(CLOSURE_REASON_LABEL[r]) }))}
          />
        </div>
        <Textarea
          label={t('รายละเอียดเพิ่มเติม (ถ้ามี)')}
          rows={2}
          maxLength={300}
          value={closureNote}
          onChange={(e) => setClosureNote(e.target.value)}
        />
      </ConfirmationModal>
    </AppShell>
  )
}
