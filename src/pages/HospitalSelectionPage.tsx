import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Info, CheckCircle2, HeartCrack } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card, Checkbox } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { HospitalSelector } from '@/components/HospitalSelector'
import { SeverityBadge } from '@/components/SeverityBadge'
import { SignaturePad } from '@/components/SignaturePad'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { haversineKm } from '@/lib/utils'
import { uploadCaseSignature } from '@/lib/storageUploads'
import type { Hospital } from '@/lib/types'

export default function HospitalSelectionPage() {
  const [searchParams] = useSearchParams()
  const caseId = searchParams.get('caseId')
  const navigate = useNavigate()

  const c = useStore((s) => (caseId ? s.cases[caseId] : undefined))
  const hospitals = useStore((s) => s.hospitals)
  const recordHospitalDecision = useStore((s) => s.recordHospitalDecision)

  const [selected, setSelected] = useState<Hospital | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [decliningAll, setDecliningAll] = useState(false)
  const [declinedNearest, setDeclinedNearest] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [decidedByName, setDecidedByName] = useState('')

  const isFlowMode = !!caseId && !!c

  // The static Hospital.distanceKm seed field isn't relative to this
  // incident -- "nearest" has to be computed against the actual location.
  const nearestHospital = useMemo(() => {
    if (!c?.location || hospitals.length === 0) return null
    return hospitals.reduce((closest, h) =>
      haversineKm(c.location!, h.location) < haversineKm(c.location!, closest.location) ? h : closest,
    )
  }, [c?.location, hospitals])

  // "Recommended" mirrors the same philosophy as rescue-team ranking:
  // available (ER not full) first, then nearest -- surfaced to
  // HospitalSelector as a sorted list plus which one to spotlight, rather
  // than leaving hospitals in whatever arbitrary order the store holds them.
  const rankedHospitals = useMemo(() => {
    if (!c?.location) return hospitals
    return [...hospitals].sort((a, b) => {
      if (a.erAvailable !== b.erAvailable) return a.erAvailable ? -1 : 1
      return haversineKm(c.location!, a.location) - haversineKm(c.location!, b.location)
    })
  }, [c?.location, hospitals])
  const recommendedHospitalId = rankedHospitals.find((h) => h.erAvailable)?.id ?? rankedHospitals[0]?.id

  const isHighSeverity = !!c?.assessment && c.assessment.severity <= 2
  const isDecliningNearest = !!selected && !!nearestHospital && selected.id !== nearestHospital.id && declinedNearest
  const needsSignature = isHighSeverity && (decliningAll || isDecliningNearest)

  async function handleConfirm() {
    if (!caseId) return
    if (decliningAll) {
      if (needsSignature && !signatureDataUrl) return
      setLoading(true)
      try {
        const signatureUrl = signatureDataUrl ? await uploadCaseSignature(c!.caseNumber, signatureDataUrl) : undefined
        recordHospitalDecision(caseId, { type: 'declined-all', signatureUrl, decidedBy: decidedByName.trim() || undefined })
        toast({ title: 'บันทึกการปฏิเสธนำส่งโรงพยาบาลแล้ว', message: 'เคสนี้ปิดเป็นเสร็จสิ้นแล้ว', tone: 'success' })
        navigate('/rescue/dashboard')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!selected) return
    if (needsSignature && !signatureDataUrl) return
    setLoading(true)
    try {
      const signatureUrl = signatureDataUrl ? await uploadCaseSignature(c!.caseNumber, signatureDataUrl) : undefined
      recordHospitalDecision(caseId, {
        type: isDecliningNearest ? 'declined-nearest-chose-own' : 'selected',
        hospital: selected,
        signatureUrl,
        decidedBy: decidedByName.trim() || undefined,
      })
      toast({ title: 'เลือกโรงพยาบาลเรียบร้อยแล้ว', message: `เลือกส่งตัวไปยัง ${selected.name}`, tone: 'success' })
      navigate(`/rescue/case/${caseId}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell variant="public" title="เลือกโรงพยาบาล">
      <div className="relative">
        <AnimatedBackground variant="hospital" />
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
          {isFlowMode && c ? (
            <Card className="flex flex-wrap items-center justify-between gap-3 animate-fade-in-up">
              <div>
                <p className="font-mono text-sm font-bold text-primary">{c.caseNumber}</p>
                <p className="mt-1 font-semibold text-navy">
                  {c.incidentDetails?.incidentType ?? 'รอรายละเอียดเหตุการณ์'}
                </p>
              </div>
              {c.assessment && <SeverityBadge severity={c.assessment.severity} />}
            </Card>
          ) : (
            <Card className="flex items-start gap-3 bg-skyblue-pale animate-fade-in-up">
              <Info className="mt-0.5 size-5 shrink-0 text-primary" />
              <p className="text-sm text-navy">
                หน้านี้ใช้สำหรับเลือกโรงพยาบาลระหว่างขั้นตอนการช่วยเหลือเคสฉุกเฉิน
              </p>
            </Card>
          )}

          {!decliningAll && (
            <div className="animate-fade-in-up" style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}>
              <HospitalSelector
                hospitals={rankedHospitals}
                selectedId={selected?.id}
                recommendedId={recommendedHospitalId}
                onSelect={setSelected}
              />
            </div>
          )}

          {!decliningAll && isFlowMode && selected && (
            <div
              key={selected.id}
              role="status"
              className="flex flex-col gap-2 rounded-xl border border-success/20 bg-success/5 px-4 py-3 animate-scale-in"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 shrink-0 text-success" />
                <p className="text-sm font-semibold text-navy">
                  เลือก {selected.name} แล้ว พร้อมยืนยันการส่งตัว
                </p>
              </div>
              {nearestHospital && selected.id !== nearestHospital.id && (
                <Checkbox
                  checked={declinedNearest}
                  onChange={setDeclinedNearest}
                  label={`ญาติไม่ประสงค์ไปยัง ${nearestHospital.name} (โรงพยาบาลที่ใกล้ที่สุด) เลือก ${selected.name} เอง`}
                />
              )}
            </div>
          )}

          {isFlowMode && !decliningAll && (
            <Button variant="outline" fullWidth icon={<HeartCrack className="size-4" />} onClick={() => setDecliningAll(true)}>
              ญาติไม่ประสงค์ส่งโรงพยาบาล
            </Button>
          )}

          {decliningAll && (
            <Card className="flex flex-col gap-3 border-warning/30 bg-warning/5 animate-fade-in-up">
              <p className="flex items-start gap-2 text-sm font-semibold text-navy">
                <HeartCrack className="mt-0.5 size-4 shrink-0 text-warning" />
                ญาติไม่ประสงค์ส่งโรงพยาบาล — เคสนี้จะปิดเป็นเสร็จสิ้นโดยไม่นำส่งโรงพยาบาล
              </p>
              <Button variant="ghost" size="sm" className="self-start" onClick={() => setDecliningAll(false)}>
                ยกเลิก กลับไปเลือกโรงพยาบาล
              </Button>
            </Card>
          )}

          {needsSignature && (
            <div className="flex flex-col gap-3 animate-fade-in-up">
              <Input
                label="ชื่อญาติผู้ลงนาม (ถ้ามี)"
                value={decidedByName}
                onChange={(e) => setDecidedByName(e.target.value)}
              />
              <SignaturePad
                label="ลงชื่อรับทราบการปฏิเสธ (จำเป็นสำหรับเคสความรุนแรงสูง)"
                onChange={setSignatureDataUrl}
              />
            </div>
          )}

          {isFlowMode && (decliningAll || selected) && (
            <Button
              size="lg"
              fullWidth
              disabled={(!decliningAll && !selected) || (needsSignature && !signatureDataUrl)}
              loading={loading}
              onClick={handleConfirm}
            >
              {decliningAll ? 'ยืนยันปิดเคส' : 'ยืนยันเลือกโรงพยาบาล'}
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  )
}
