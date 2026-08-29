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
import type { GeoLocation } from '@/lib/types'

export default function NavigationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const c = useStore((s) => (id ? s.cases[id] : undefined))
  const updateRescueProgress = useStore((s) => s.updateRescueProgress)
  const rescueMarkArrived = useStore((s) => s.rescueMarkArrived)
  const markHospitalArrived = useStore((s) => s.markHospitalArrived)
  const addPatientUpdate = useStore((s) => s.addPatientUpdate)

  const [pct, setPct] = useState(c?.rescueEnRoutePct ?? 0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [updateNote, setUpdateNote] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)

  const isEnRoute = c?.status === 'rescue-en-route'
  const isTransporting = c?.status === 'transporting'
  const isNavigable = isEnRoute || isTransporting

  const base: GeoLocation | null = c?.assignedRescueTeam?.base ?? null
  const target: GeoLocation | null = isEnRoute ? c?.location ?? null : isTransporting ? c?.selectedHospital?.location ?? null : null
  const destinationLabel = isEnRoute ? 'จุดเกิดเหตุ' : isTransporting ? c?.selectedHospital?.name ?? 'โรงพยาบาล' : ''
  const arriveButtonLabel = isEnRoute ? 'ถึงจุดเกิดเหตุแล้ว' : 'ถึงโรงพยาบาลแล้ว'

  useEffect(() => {
    if (!c || !id || !isNavigable || !base || !target) return
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
  }, [id, isNavigable])

  useEffect(() => {
    if (!id || !isNavigable) return
    updateRescueProgress(id, Math.round(pct))
    if (pct >= 100 && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [pct, id, isNavigable, updateRescueProgress])

  if (!id || !c) {
    return (
      <AppShell variant="flow" title="กำลังนำทาง" showBack onBack={() => navigate(-1)}>
        <div className="relative">
          <AnimatedBackground variant="map" />
          <div className="relative z-10">
            <ErrorState
              title="ไม่พบเคสนี้"
              description="เคสอาจถูกลบหรือไม่มีอยู่ในระบบ"
              onRetry={() => navigate('/rescue/dashboard')}
              retryLabel="กลับแดชบอร์ด"
            />
          </div>
        </div>
      </AppShell>
    )
  }

  if (!isNavigable || !base || !target) {
    return (
      <AppShell variant="flow" title="กำลังนำทาง" showBack onBack={() => navigate(`/rescue/case/${c.id}`)}>
        <div className="relative">
          <AnimatedBackground variant="map" />
          <div className="relative z-10">
            <Card className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="font-semibold text-navy">เคสนี้ไม่อยู่ในสถานะที่ต้องนำทาง</p>
              <Link to={`/rescue/case/${c.id}`} className="text-sm font-semibold text-primary hover:text-primary-bright">
                กลับไปยังรายละเอียดเคส
              </Link>
            </Card>
          </div>
        </div>
      </AppShell>
    )
  }

  const ratio = clamp(pct, 0, 100) / 100
  const livePos = {
    lat: base.lat + (target.lat - base.lat) * ratio,
    lng: base.lng + (target.lng - base.lng) * ratio,
  }

  const pins: MapPinT[] = [
    { id: 'rescue', lat: livePos.lat, lng: livePos.lng, label: 'หน่วยกู้ชีพ', kind: 'rescue' },
    { id: 'dest', lat: target.lat, lng: target.lng, label: destinationLabel, kind: isTransporting ? 'hospital' : 'incident' },
  ]

  const distanceKm = haversineKm(base, target)
  const etaMin = estimateEtaMin(distanceKm)
  const arrived = pct >= 100

  function handleArrive() {
    if (!id) return
    if (isEnRoute) {
      rescueMarkArrived(id)
      toast({ title: 'ถึงจุดเกิดเหตุแล้ว', message: 'เริ่มบันทึกข้อมูลผู้ป่วยได้เลย', tone: 'success' })
    } else {
      markHospitalArrived(id)
      toast({ title: 'ถึงโรงพยาบาลแล้ว', message: 'รอโรงพยาบาลยืนยันการรับผู้ป่วย', tone: 'success' })
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
      toast({ title: 'บันทึกอัปเดตอาการแล้ว', message: 'ศูนย์สั่งการและโรงพยาบาลจะเห็นอัปเดตนี้ทันที', tone: 'success' })
    }, 400)
  }

  return (
    <AppShell variant="flow" title="กำลังนำทาง" showBack onBack={() => navigate(`/rescue/case/${c.id}`)}>
      <div className="relative">
        <AnimatedBackground variant="map" />
        <div className="relative z-10 flex flex-col gap-4 pb-24">
          {!arrived && (
            <div className="flex items-center gap-2 self-start rounded-full border border-primary/20 bg-white/90 px-3 py-1.5 text-xs font-bold text-primary shadow-card" aria-live="off">
              <PulseRing tone="primary" size="sm" />
              กำลังติดตามตำแหน่ง
            </div>
          )}

          <ETAWidget etaMin={etaMin} distanceKm={distanceKm} progressPct={Math.round(pct)} />

          <Card className="!p-0 overflow-hidden">
            <MapPanel pins={pins} showRoute height="360px" />
          </Card>

          <Card className="flex items-center justify-center gap-2 py-4 text-center">
            {arrived ? (
              <span className="flex items-center gap-2 font-semibold text-success">
                <CheckCircle2 className="size-5" /> ถึง{destinationLabel}แล้ว
              </span>
            ) : (
              <span className="flex items-center gap-2 font-semibold text-primary">
                <Loader2 className="size-5 animate-spin-slow" /> กำลังเดินทาง...{' '}
                <span key={Math.round(pct)} className="inline-block animate-count-pop tabular-nums">
                  {Math.round(pct)}%
                </span>
              </span>
            )}
          </Card>

          {c.patientInfo && (
            <Card className="space-y-3">
              <h3 className="font-bold text-navy">อัปเดตอาการผู้ป่วย</h3>
              {c.patientUpdates.length > 0 && (
                <div className="rounded-xl bg-skyblue-pale p-3">
                  <p className="text-sm text-navy whitespace-pre-wrap">
                    {c.patientUpdates[c.patientUpdates.length - 1].note}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    อัปเดตล่าสุด {formatDateTime(c.patientUpdates[c.patientUpdates.length - 1].recordedAt)}
                  </p>
                </div>
              )}
              <SpeechToTextPanel
                value={updateNote}
                onChange={setUpdateNote}
                label="มีการเปลี่ยนแปลงอาการหรือไม่ (พิมพ์หรือพูด)"
              />
              <Button
                variant="secondary"
                size="sm"
                loading={updateLoading}
                disabled={!updateNote.trim()}
                onClick={handleAddUpdate}
              >
                บันทึกอัปเดต
              </Button>
            </Card>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 p-4 backdrop-blur sm:relative sm:border-0 sm:bg-transparent sm:p-0">
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
