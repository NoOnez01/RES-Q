import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, Building2, Ambulance, Share2 } from 'lucide-react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/StatusBadge'
import { SeverityBadge } from '@/components/SeverityBadge'
import { CaseTimeline } from '@/components/CaseTimeline'
import { MapPanel } from '@/components/MapPanel'
import { ShareCaseModal } from '@/components/ShareCaseModal'
import { CaseFeedbackForm } from '@/components/CaseFeedbackForm'
import { ErrorState, LoadingState } from '@/components/States'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { useStore } from '@/lib/store'
import { supabase, supabaseEnabled } from '@/lib/supabase'
import { formatDateTime, estimateEtaMin, haversineKm, clamp } from '@/lib/utils'
import { DEFAULT_INCIDENT_LOCATION } from '@/lib/mockData'
import type { EmergencyCase } from '@/lib/types'

export default function CaseTracking() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const storedCase = useStore((s) => (id ? s.cases[id] : undefined))
  const markFeedbackSubmitted = useStore((s) => s.markFeedbackSubmitted)

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
      .then(({ data, error }) => {
        if (!error && data) setRemoteCase(data as EmergencyCase)
        setRemoteStatus('done')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedCase, id])

  const activeCase = storedCase ?? remoteCase ?? undefined
  const isRemoteOnly = !storedCase && !!remoteCase

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

  if (!activeCase) {
    return (
      <AppShell variant="flow" title="ติดตามเคส" showBack onBack={() => navigate('/')}>
        {storedCase === undefined && remoteStatus === 'loading' ? (
          <LoadingState label="กำลังค้นหาเคส..." />
        ) : (
          <ErrorState title="ไม่พบเคสนี้" description="เคสอาจถูกลบหรือรหัสไม่ถูกต้อง" />
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

  // Same base->incident (and, once transporting, incident->hospital)
  // interpolation the rescue team's own navigation screen uses for its live
  // position, driven by the same synced rescueEnRoutePct -- so the citizen
  // sees the vehicle actually moving across the map for BOTH legs of the
  // trip instead of a pin frozen at the team's home base throughout.
  const ratio = clamp(activeCase.rescueEnRoutePct, 0, 100) / 100
  const leg =
    isEnRoute
      ? { from: team?.base ?? null, to: location, label: 'จุดเกิดเหตุ', kind: 'incident' as const }
      : isTransporting
        ? { from: location, to: hospitalLoc, label: activeCase.selectedHospital?.name ?? 'โรงพยาบาล', kind: 'hospital' as const }
        : null
  const rescuePos =
    team && leg && leg.from && leg.to
      ? { lat: leg.from.lat + (leg.to.lat - leg.from.lat) * ratio, lng: leg.from.lng + (leg.to.lng - leg.from.lng) * ratio }
      : team
        ? team.base
        : null

  let etaMin: number | null = null
  if (team && leg?.to && rescuePos) {
    const distanceKm = haversineKm(rescuePos, leg.to)
    etaMin = estimateEtaMin(distanceKm || 0.1)
  }

  const pins =
    team && rescuePos
      ? [
          ...(leg?.to
            ? [{ id: 'destination', lat: leg.to.lat, lng: leg.to.lng, label: leg.label, kind: leg.kind }]
            : [{ id: 'incident', lat: location.lat, lng: location.lng, label: 'จุดเกิดเหตุ', kind: 'incident' as const }]),
          { id: 'rescue', lat: rescuePos.lat, lng: rescuePos.lng, label: team.name, kind: 'rescue' as const },
        ]
      : []

  return (
    <AppShell variant="flow" title="ติดตามเคส" showBack onBack={() => navigate('/')}>
      <div className="relative">
        <AnimatedBackground variant="emergency" />

        <div className="relative z-10 flex flex-col gap-5 pb-8">
          {activeCase.status === 'completed' && (
            <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 animate-fade-in-up">
              <CheckCircle2 className="size-6 shrink-0 text-success" />
              <p className="text-sm font-semibold text-navy">เคสเสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ ResQ</p>
            </div>
          )}

          {activeCase.status === 'completed' &&
            (activeCase.feedbackSubmitted || remoteFeedbackSubmitted ? (
              <Card className="flex items-center gap-3">
                <CheckCircle2 className="size-5 shrink-0 text-success" />
                <p className="text-sm font-medium text-navy">ขอบคุณสำหรับความคิดเห็นของท่าน</p>
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
              <h1 className="text-lg font-bold text-navy">{activeCase.caseNumber}</h1>
              <StatusBadge status={activeCase.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeCase.assessment && <SeverityBadge severity={activeCase.assessment.severity} />}
              <span className="text-xs text-muted">แจ้งเหตุเมื่อ {formatDateTime(activeCase.createdAt)}</span>
            </div>
            <Button variant="outline" size="sm" icon={<Share2 className="size-4" />} onClick={() => setShareOpen(true)} className="self-start">
              แชร์ให้ญาติติดตามสถานะ
            </Button>
          </Card>

          {team && (
            <Card className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                <Ambulance className="size-4 text-primary" /> หน่วยกู้ชีพที่รับผิดชอบ
              </div>
              <div className="text-sm">
                <p className="font-semibold text-navy">{team.name}</p>
                {activeCase.assignedVehicle && <p className="text-muted">{activeCase.assignedVehicle.vehicle}</p>}
                {activeCase.status !== 'rescue-assigned' && activeCase.assignedVehicle?.driverName && (
                  <p className="mt-1 text-muted">
                    คนขับ {activeCase.assignedVehicle.driverName} · ทะเบียน {activeCase.assignedVehicle.plateNumber} · สังกัด{' '}
                    {activeCase.assignedVehicle.unitCode}
                  </p>
                )}
              </div>
              {etaMin !== null && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-skyblue-light px-3 py-1 text-xs font-bold text-primary">
                    คาดว่าถึงในอีกประมาณ {etaMin} นาที
                  </span>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                    กำลังเดินทาง {Math.round(activeCase.rescueEnRoutePct)}%
                  </span>
                </div>
              )}
              <MapPanel pins={pins} height="220px" showRoute />
            </Card>
          )}

          {activeCase.selectedHospital && (
            <Card className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                <Building2 className="size-4 text-primary" /> โรงพยาบาลปลายทาง
              </div>
              <p className="text-sm font-semibold text-navy">{activeCase.selectedHospital.name}</p>
              <p className="text-sm text-muted">{activeCase.selectedHospital.location.address}</p>
            </Card>
          )}

          <Card
            className={clsx(
              'transition-shadow duration-500',
              justUpdated && 'ring-4 ring-primary/30',
            )}
          >
            <h2 className="mb-4 text-sm font-bold text-navy">ขั้นตอนการดำเนินการ</h2>
            <CaseTimeline
              timeline={activeCase.timeline}
              currentStatus={activeCase.status}
              hiddenSteps={['contacted', 'photos-taken', 'called-1669', 'received', 'rescue-assigned', 'assisted', 'hospital-received']}
            />
          </Card>

          {activeCase.photos.length > 0 && (
            <Card className="flex flex-col gap-3">
              <h2 className="text-sm font-bold text-navy">รูปภาพที่แนบ</h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {activeCase.photos.map((p) => (
                  <img
                    key={p.id}
                    src={p.dataUrl}
                    alt="รูปภาพจุดเกิดเหตุ"
                    className="aspect-square rounded-xl border border-border object-cover"
                  />
                ))}
              </div>
            </Card>
          )}

          <div className="space-y-0.5 text-center text-xs text-muted">
            <p>ระบบนี้เป็นต้นแบบสำหรับการสาธิตและการวิจัย</p>
            <p>ข้อมูลในระบบเป็นข้อมูลจำลองและไม่ใช่ข้อมูลผู้ป่วยจริง</p>
          </div>
        </div>
      </div>

      <ShareCaseModal open={shareOpen} url={window.location.href} onClose={() => setShareOpen(false)} />
    </AppShell>
  )
}
