import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, Building2, Ambulance, Share2, Phone, Coins } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/StatusBadge'
import { SeverityBadge } from '@/components/SeverityBadge'
import { CaseTimeline } from '@/components/CaseTimeline'
import { RescueEnRouteProgress } from '@/components/RescueEnRouteProgress'
import { MapPanel } from '@/components/MapPanel'
import { ShareCaseModal } from '@/components/ShareCaseModal'
import { CaseQrPanel } from '@/components/CaseQrPanel'
import { CaseFeedbackForm } from '@/components/CaseFeedbackForm'
import { CallScreen } from '@/components/call/CallScreen'
import { ErrorState, LoadingState } from '@/components/States'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { useStore } from '@/lib/store'
import { useLiveKitCall } from '@/lib/useLiveKitCall'
import { fetchCaseReward } from '@/lib/coins'
import { closuresKey, useRoadClosures } from '@/lib/roadClosures'
import { supabase, supabaseEnabled } from '@/lib/supabase'
import { formatDateTime, estimateEtaMin, haversineKm, clamp } from '@/lib/utils'
import { fetchRoute, pointAlongRoute, type RouteResult } from '@/lib/routing'
import { DEFAULT_INCIDENT_LOCATION } from '@/lib/mockData'
import type { EmergencyCase } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'คุณได้รับ {n} เหรียญจากการแจ้งเหตุครั้งนี้': 'You earned {n} coins for this report',
  ดูเหรียญของฉัน: 'View my coins',
  ติดตามการช่วยเหลือ: 'Track response',
  'กำลังค้นหาข้อมูลเหตุ...': 'Looking up the case...',
  ไม่พบเหตุนี้: 'Case not found',
  'ข้อมูลเหตุอาจถูกลบ หรือรหัสไม่ถูกต้อง': 'This case may have been deleted, or the code is incorrect',
  หน่วยกู้ชีพจะเป็นผู้วางสายเมื่อสิ้นสุดการสนทนา: 'The rescue team will end the call when the conversation is finished',
  'การช่วยเหลือเสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ ResQ': 'Response complete — thank you for using ResQ',
  ขอบคุณสำหรับความคิดเห็นของท่าน: 'Thank you for your feedback',
  ส่งต่อให้ญาติติดตามสถานะ: 'Share so family can track status',
  'ติดต่อศูนย์สั่งการ 1669': 'Contact Dispatch Center 1669',
  หน่วยกู้ชีพที่รับผิดชอบ: 'Assigned rescue team',
  'คนขับ {driver} · ทะเบียน {plate} · สังกัด {unit}': 'Driver {driver} · plate {plate} · unit {unit}',
  'คาดว่าจะถึงในอีกประมาณ {n} นาที': 'Estimated arrival in about {n} min',
  'เดินทางแล้ว {n}%': '{n}% en route',
  โรงพยาบาลปลายทาง: 'Destination hospital',
  ขั้นตอนการดำเนินการ: 'Progress',
  รูปภาพที่แนบ: 'Attached photos',
  รูปภาพจุดเกิดเหตุ: 'Scene photo',
  ระบบนี้เป็นต้นแบบสำหรับการสาธิตและการวิจัย: 'This system is a prototype for demonstration and research.',
  ข้อมูลในระบบเป็นข้อมูลจำลองและไม่ใช่ข้อมูลผู้ป่วยจริง: 'Data in the system is simulated, not real patient data.',
  'แจ้งเหตุเมื่อ {date}': 'Reported {date}',
})

export default function CaseTracking() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const storedCase = useStore((s) => (id ? s.cases[id] : undefined))
  const markFeedbackSubmitted = useStore((s) => s.markFeedbackSubmitted)
  const t = useT()

  const [justUpdated, setJustUpdated] = useState(false)
  const prevStatusRef = useRef<string | undefined>(undefined)
  const [shareOpen, setShareOpen] = useState(false)

  // A case reported through the LINE bot has no Supabase Auth session
  // behind it (reporter_user_id is null), so it never syncs into this
  // browser's live `cases` store the way a self-reported web case does --
  // fall back to a one-time read-only snapshot via get_case_snapshot (see
  // supabase-case-tracking-by-id.sql) when the normal lookup comes up
  // empty. No live updates on this path; refresh the page to re-check.
  const [remoteCase, setRemoteCase] = useState<EmergencyCase | null>(null)
  const [remoteFeedbackSubmitted, setRemoteFeedbackSubmitted] = useState(false)
  const [remoteStatus, setRemoteStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  useEffect(() => {
    if (storedCase || !id || !supabaseEnabled || !supabase || remoteStatus !== 'idle') return
    setRemoteStatus('loading')
    supabase
      .rpc('get_case_snapshot', { p_case_id: id })
      .then(
        ({ data, error }) => {
          if (!error && data) setRemoteCase(data as EmergencyCase)
          setRemoteStatus('done')
        },
        // A dropped connection rejects this promise instead of resolving with
        // an `error` field -- without this rejection handler, remoteStatus
        // would stay 'loading' forever and strand the citizen on the spinner
        // with no way out. Treat it the same as "not found" below, but the
        // retry button lets them try again once they're back online.
        () => setRemoteStatus('done'),
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedCase, id])

  const activeCase = storedCase ?? remoteCase ?? undefined
  const isRemoteOnly = !storedCase && !!remoteCase

  // Rescue calling the reporter directly -- a separate call relationship
  // from the citizen/rescue-to-1669 calls (Contact1669.tsx), in its own
  // LiveKit room so it can't collide with one already in progress on the
  // case's 1669 room. Only meaningful for a live-synced case (isRemoteOnly is a
  // read-only snapshot with no session to answer from), same gating as the
  // "ติดต่อศูนย์สั่งการ 1669" button below. The ring itself is answered from
  // the full-screen incoming call (CallRingtoneBridge), which brings the
  // citizen here; they join the room only once they have -- joining while it
  // rang would show rescue their camera before they'd picked up.
  // The call's length is counted by rescue, who placed it (CallScreen keeps
  // its own count here) -- both sides adding a second each to the one
  // synced number just overwrote each other.
  const rescueCallActive = !isRemoteOnly && activeCase?.rescueCallStatus === 'in-call'
  const rescueCall = useLiveKitCall(activeCase?.id ?? null, 'rescue-citizen', 'public', rescueCallActive)

  useEffect(() => {
    if (!activeCase) return
    const prev = prevStatusRef.current
    prevStatusRef.current = activeCase.status
    if (prev !== undefined && prev !== activeCase.status) {
      setJustUpdated(true)
      const t = window.setTimeout(() => setJustUpdated(false), 1200)
      return () => window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase?.status])

  // Real road route + typical-speed ETA for whichever leg is currently live
  // (rescue team -> incident, or incident -> hospital) -- see lib/routing.ts.
  // Stays null (every value below then falls back to the old straight-line
  // estimate) if the routing request fails.
  const [route, setRoute] = useState<RouteResult | null>(null)
  // Re-planned when a road closure is reported or cleared.
  const closures = closuresKey(useRoadClosures())
  useEffect(() => {
    if (!activeCase?.assignedRescueTeam) {
      setRoute(null)
      return
    }
    const teamBase = activeCase.assignedRescueTeam.base
    const origin =
      activeCase.status === 'rescue-en-route'
        ? teamBase
        : activeCase.status === 'transporting'
          ? (activeCase.location ?? DEFAULT_INCIDENT_LOCATION)
          : null
    const destination =
      activeCase.status === 'rescue-en-route'
        ? (activeCase.location ?? DEFAULT_INCIDENT_LOCATION)
        : activeCase.status === 'transporting'
          ? activeCase.selectedHospital?.location ?? null
          : null
    if (!origin || !destination) {
      setRoute(null)
      return
    }
    let cancelled = false
    setRoute(null)
    void fetchRoute(origin, destination).then((r) => {
      if (!cancelled) setRoute(r)
    })
    return () => {
      cancelled = true
    }
  }, [
    activeCase?.assignedRescueTeam,
    activeCase?.status,
    activeCase?.location,
    activeCase?.selectedHospital?.location,
    closures,
  ])

  // Coins the reporter earned on this case -- awarded by the database the
  // moment staff complete it (supabase-coin-system.sql), so look once it is.
  // Null for anyone else viewing (RLS only returns the reporter's own rows).
  const [earnedCoins, setEarnedCoins] = useState<number | null>(null)
  const caseNumber = activeCase?.caseNumber
  const completed = activeCase?.status === 'completed'
  useEffect(() => {
    if (!supabaseEnabled || !completed || !caseNumber) return
    let cancelled = false
    fetchCaseReward(caseNumber).then(
      (n) => {
        if (!cancelled) setEarnedCoins(n)
      },
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [completed, caseNumber])

  if (!activeCase) {
    return (
      <AppShell variant="flow" title={t('ติดตามการช่วยเหลือ')} showBack onBack={() => navigate('/')}>
        {storedCase === undefined && remoteStatus === 'loading' ? (
          <LoadingState label={t('กำลังค้นหาข้อมูลเหตุ...')} />
        ) : (
          <ErrorState
            title={t('ไม่พบเหตุนี้')}
            description={t('ข้อมูลเหตุอาจถูกลบ หรือรหัสไม่ถูกต้อง')}
            onRetry={() => setRemoteStatus('idle')}
          />
        )}
      </AppShell>
    )
  }

  const location = activeCase.location ?? DEFAULT_INCIDENT_LOCATION
  const team = activeCase.assignedRescueTeam
  const isCompleted = activeCase.status === 'completed'
  const isEnRoute = activeCase.status === 'rescue-en-route'
  const isTransporting = activeCase.status === 'transporting'
  const hospitalLoc = activeCase.selectedHospital?.location ?? null

  // Same base->incident (and, once transporting, incident->hospital) leg
  // the rescue team's own navigation screen tracks, driven by the same
  // synced rescueEnRoutePct -- so the citizen sees the vehicle actually
  // moving across the map for BOTH legs instead of a pin frozen at the
  // team's home base throughout. Rides the real route geometry once it's
  // loaded (see the fetchRoute effect above); falls back to the original
  // straight-line interpolation otherwise.
  const ratio = clamp(activeCase.rescueEnRoutePct, 0, 100) / 100
  const leg =
    isEnRoute
      ? { from: team?.base ?? null, to: location, label: t('จุดเกิดเหตุ'), kind: 'incident' as const }
      : isTransporting
        ? { from: location, to: hospitalLoc, label: activeCase.selectedHospital?.name ?? t('โรงพยาบาล'), kind: 'hospital' as const }
        : null
  const rescuePos =
    team && route
      ? pointAlongRoute(route.points, ratio)
      : team && leg && leg.from && leg.to
        ? { lat: leg.from.lat + (leg.to.lat - leg.from.lat) * ratio, lng: leg.from.lng + (leg.to.lng - leg.from.lng) * ratio }
        : team
          ? team.base
          : null

  let etaMin: number | null = null
  if (route) {
    etaMin = route.durationMin
  } else if (team && leg?.to && rescuePos) {
    const distanceKm = haversineKm(rescuePos, leg.to)
    etaMin = estimateEtaMin(distanceKm || 0.1)
  }

  const pins =
    team && rescuePos
      ? [
          ...(leg?.to
            ? [{ id: 'destination', lat: leg.to.lat, lng: leg.to.lng, label: leg.label, kind: leg.kind }]
            : [{ id: 'incident', lat: location.lat, lng: location.lng, label: t('จุดเกิดเหตุ'), kind: 'incident' as const }]),
          { id: 'rescue', lat: rescuePos.lat, lng: rescuePos.lng, label: team.name, kind: 'rescue' as const },
        ]
      : []

  return (
    <AppShell variant="flow" title={t('ติดตามการช่วยเหลือ')} showBack onBack={() => navigate('/')}>
      <div className="relative">
        <AnimatedBackground variant="emergency" />

        <div className="relative z-10 flex flex-col gap-5 pb-8">
          {/* Only rescue can end this call -- there is deliberately no
              hang-up button for the reporter: staff controls when the call
              is actually finished, not a citizen who may be distressed or
              acting on impulse. */}
          <CallScreen
            call={rescueCall}
            emergencyCase={activeCase}
            open={rescueCallActive}
            peer="rescue"
            durationSec={activeCase.rescueCallDurationSec ?? 0}
            note={t('หน่วยกู้ชีพจะเป็นผู้วางสายเมื่อสิ้นสุดการสนทนา')}
          />

          {activeCase.status === 'completed' && (
            <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 animate-fade-in-up">
              <CheckCircle2 className="size-6 shrink-0 text-success" />
              <p className="text-sm font-semibold text-ink">{t('การช่วยเหลือเสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ ResQ')}</p>
            </div>
          )}

          {isCompleted && earnedCoins !== null && (
            <Card className="flex flex-wrap items-center justify-between gap-3 animate-fade-in-up">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Coins className="size-5 shrink-0 text-warning" aria-hidden="true" />
                {t('คุณได้รับ {n} เหรียญจากการแจ้งเหตุครั้งนี้', { n: earnedCoins.toLocaleString() })}
              </p>
              <Button size="sm" variant="outline" onClick={() => navigate('/coins')}>
                {t('ดูเหรียญของฉัน')}
              </Button>
            </Card>
          )}

          {activeCase.status === 'completed' &&
            (activeCase.feedbackSubmitted || remoteFeedbackSubmitted ? (
              <Card className="flex items-center gap-3">
                <CheckCircle2 className="size-5 shrink-0 text-success" />
                <p className="text-sm font-medium text-ink">{t('ขอบคุณสำหรับความคิดเห็นของท่าน')}</p>
              </Card>
            ) : (
              <CaseFeedbackForm
                emergencyCase={activeCase}
                onSubmitted={() => (isRemoteOnly ? setRemoteFeedbackSubmitted(true) : id && markFeedbackSubmitted(id))}
              />
            ))}

          <Card
            className={clsx(
              'flex flex-col gap-3 transition-all duration-500',
              isCompleted ? 'border-success/40 bg-success/5' : 'border-primary/30 shadow-[0_0_0_4px_rgba(11,110,189,0.10)]',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-lg font-bold text-ink">{activeCase.caseNumber}</h1>
              <StatusBadge status={activeCase.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeCase.assessment && <SeverityBadge severity={activeCase.assessment.severity} />}
              <span className="text-xs text-muted">{t('แจ้งเหตุเมื่อ {date}', { date: formatDateTime(activeCase.createdAt) })}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" icon={<Share2 className="size-4" />} onClick={() => setShareOpen(true)}>
                {t('ส่งต่อให้ญาติติดตามสถานะ')}
              </Button>
              {!isRemoteOnly && !isCompleted && id && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Phone className="size-4" />}
                  onClick={() => navigate(`/contact-1669/${id}`)}
                >
                  {t('ติดต่อศูนย์สั่งการ 1669')}
                </Button>
              )}
            </div>
          </Card>

          <CaseQrPanel url={window.location.href} />

          {team && (
            <Card className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Ambulance className="size-4 text-primary" /> {t('หน่วยกู้ชีพที่รับผิดชอบ')}
              </div>
              <div className="text-sm">
                <p className="font-semibold text-ink">{team.name}</p>
                {activeCase.assignedVehicle && <p className="text-muted">{activeCase.assignedVehicle.vehicle}</p>}
                {activeCase.status !== 'rescue-assigned' && activeCase.assignedVehicle?.driverName && (
                  <p className="mt-1 text-muted">
                    {t('คนขับ {driver} · ทะเบียน {plate} · สังกัด {unit}', {
                      driver: activeCase.assignedVehicle.driverName,
                      plate: activeCase.assignedVehicle.plateNumber ?? '',
                      unit: activeCase.assignedVehicle.unitCode,
                    })}
                  </p>
                )}
              </div>
              {etaMin !== null && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-skyblue-light px-3 py-1 text-xs font-bold text-primary">
                      {t('คาดว่าจะถึงในอีกประมาณ {n} นาที', { n: etaMin })}
                    </span>
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                      {t('เดินทางแล้ว {n}%', { n: Math.round(activeCase.rescueEnRoutePct) })}
                    </span>
                    {route && (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                        {t('เส้นทางตามถนนจริง')}
                      </span>
                    )}
                  </div>
                  <RescueEnRouteProgress pct={activeCase.rescueEnRoutePct} />
                </div>
              )}
              <MapPanel pins={pins} height="220px" showRoute routePoints={route?.points} />
            </Card>
          )}

          {activeCase.selectedHospital && (
            <Card className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Building2 className="size-4 text-primary" /> {t('โรงพยาบาลปลายทาง')}
              </div>
              <p className="text-sm font-semibold text-ink">{activeCase.selectedHospital.name}</p>
              <p className="text-sm text-muted">{activeCase.selectedHospital.location.address}</p>
            </Card>
          )}

          <Card
            className={clsx(
              'transition-shadow duration-500',
              justUpdated && 'ring-4 ring-primary/30',
            )}
          >
            <h2 className="mb-4 text-sm font-bold text-ink">{t('ขั้นตอนการดำเนินการ')}</h2>
            <CaseTimeline
              timeline={activeCase.timeline}
              currentStatus={activeCase.status}
              hiddenSteps={['contacted', 'photos-taken', 'called-1669', 'received', 'rescue-assigned', 'assisted', 'hospital-received']}
            />
          </Card>

          {activeCase.photos.length > 0 && (
            <Card className="flex flex-col gap-3">
              <h2 className="text-sm font-bold text-ink">{t('รูปภาพที่แนบ')}</h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {activeCase.photos.map((p) => (
                  <img
                    key={p.id}
                    src={p.dataUrl}
                    alt={t('รูปภาพจุดเกิดเหตุ')}
                    className="aspect-square rounded-xl border border-border object-cover"
                  />
                ))}
              </div>
            </Card>
          )}

          <div className="space-y-0.5 text-center text-xs text-muted">
            <p>{t('ระบบนี้เป็นต้นแบบสำหรับการสาธิตและการวิจัย')}</p>
            <p>{t('ข้อมูลในระบบเป็นข้อมูลจำลองและไม่ใช่ข้อมูลผู้ป่วยจริง')}</p>
          </div>
        </div>
      </div>

      <ShareCaseModal open={shareOpen} url={window.location.href} onClose={() => setShareOpen(false)} />
    </AppShell>
  )
}
