import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Info, CheckCircle2, HeartCrack } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card, Checkbox } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { HospitalSelector } from '@/components/HospitalSelector'
import { FamilyBriefing, PatientNeedsCard } from '@/components/HospitalRisk'
import { SignaturePad } from '@/components/SignaturePad'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { compareWithRecommended, patientNeeds, rankHospitals } from '@/lib/hospitalRisk'
import { useHospitalTravel } from '@/lib/useHospitalTravel'
import { uploadCaseSignature } from '@/lib/storageUploads'
import type { Hospital, HospitalDecisionRisk } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  บันทึกการปฏิเสธนำส่งโรงพยาบาลแล้ว: 'Hospital transport refusal recorded',
  ปิดเหตุนี้เรียบร้อยแล้ว: 'This case has been closed as complete',
  เลือกโรงพยาบาลเรียบร้อยแล้ว: 'Hospital selected',
  'เลือกนำส่งผู้ป่วยไปยัง {name}': 'Chose to transport to {name}',
  เลือกโรงพยาบาล: 'Select a hospital',
  รอรายละเอียดเหตุการณ์: 'Awaiting incident details',
  หน้านี้ใช้สำหรับเลือกโรงพยาบาลระหว่างขั้นตอนการช่วยเหลือเหตุฉุกเฉิน: "This page is used to select a hospital during an emergency case's rescue process",
  'เลือก {name} แล้ว พร้อมยืนยันการนำส่ง': 'Selected {name}, ready to confirm transport',
  'ญาติรับทราบความเสี่ยง และเลือก {chosen} แทน {recommended} (โรงพยาบาลที่แนะนำ)':
    'The family understands the risk and chose {chosen} over {recommended} (recommended)',
  ญาติไม่ประสงค์นำส่งโรงพยาบาล: 'Family declines hospital transport',
  'ญาติไม่ประสงค์นำส่งโรงพยาบาล เหตุนี้จะถูกปิดโดยไม่นำส่งโรงพยาบาล':
    'Family declines hospital transport — this case will be closed as complete without hospital transport',
  ยกเลิกและกลับไปเลือกโรงพยาบาล: 'Cancel, go back to selecting a hospital',
  'ชื่อญาติผู้ลงนาม (ถ้ามี)': "Signing family member's name (if any)",
  'ลงชื่อรับทราบการปฏิเสธ (จำเป็น)': 'Signature acknowledging the refusal (required)',
  ยืนยันการปิดเหตุ: 'Confirm closing case',
  ยืนยันเลือกโรงพยาบาล: 'Confirm hospital selection',
  บันทึกลายเซ็นไม่สำเร็จ: "Couldn't save the signature",
  กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง: 'Check the internet connection and try again',
})

export default function HospitalSelectionPage() {
  const [searchParams] = useSearchParams()
  const caseId = searchParams.get('caseId')
  const navigate = useNavigate()

  const c = useStore((s) => (caseId ? s.cases[caseId] : undefined))
  const hospitals = useStore((s) => s.hospitals)
  const recordHospitalDecision = useStore((s) => s.recordHospitalDecision)
  const t = useT()

  const [selected, setSelected] = useState<Hospital | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [decliningAll, setDecliningAll] = useState(false)
  const [declinedRecommended, setDeclinedRecommended] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [decidedByName, setDecidedByName] = useState('')

  const isFlowMode = !!caseId && !!c

  // Each hospital's risk for this patient (lib/hospitalRisk.ts) -- from the
  // CBD and triage level, travel from the scene, and what the hospital can
  // do -- lowest risk first. The recommendation is the lowest-risk one.
  const needs = useMemo(() => patientNeeds(c?.assessment?.severity), [c?.assessment?.severity])
  const travel = useHospitalTravel(c?.location, hospitals)
  const ranked = useMemo(() => (isFlowMode ? rankHospitals(hospitals, travel, needs) : null), [isFlowMode, hospitals, travel, needs])
  const assessments = useMemo(() => (ranked ? Object.fromEntries(ranked.map((r) => [r.hospital.id, r])) : undefined), [ranked])
  const rankedHospitals = ranked ? ranked.map((r) => r.hospital) : hospitals
  const recommended = ranked?.[0] ?? null
  const recommendedHospitalId = recommended?.hospital.id ?? hospitals.find((h) => h.erAvailable)?.id
  const chosen = selected ? assessments?.[selected.id] : undefined

  const isDecliningRecommended = !!selected && !!recommended && selected.id !== recommended.hospital.id && declinedRecommended
  // Signature is required for any refusal of recommended care -- declining
  // transport entirely or declining the nearest hospital in favor of one
  // the family picked themselves -- regardless of severity, since it's a
  // consent record, not just a high-acuity safeguard.
  const needsSignature = decliningAll || isDecliningRecommended

  // The signature is the record of the family's decision: if it can't be
  // saved, say so and let the crew try again rather than failing silently.
  // null = it failed.
  async function saveSignature(): Promise<string | undefined | null> {
    if (!signatureDataUrl) return undefined
    try {
      return await uploadCaseSignature(c!.caseNumber, signatureDataUrl)
    } catch {
      toast({ title: t('บันทึกลายเซ็นไม่สำเร็จ'), message: t('กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง'), tone: 'error' })
      return null
    }
  }

  async function handleConfirm() {
    if (!caseId) return
    if (decliningAll) {
      if (needsSignature && !signatureDataUrl) return
      setLoading(true)
      try {
        const signatureUrl = await saveSignature()
        if (signatureUrl === null) return
        recordHospitalDecision(caseId, { type: 'declined-all', signatureUrl, decidedBy: decidedByName.trim() || undefined })
        toast({ title: t('บันทึกการปฏิเสธนำส่งโรงพยาบาลแล้ว'), message: t('ปิดเหตุนี้เรียบร้อยแล้ว'), tone: 'success' })
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
      const signatureUrl = await saveSignature()
      if (signatureUrl === null) return
      // The assessment the decision was made on -- what the family was told.
      const risk: HospitalDecisionRisk | undefined = chosen && {
        level: chosen.risk.level,
        etaMin: chosen.travel.etaMin,
        reasons: chosen.risk.reasons,
        recommended:
          recommended && recommended.hospital.id !== chosen.hospital.id
            ? {
                name: recommended.hospital.name,
                level: recommended.risk.level,
                etaMin: recommended.travel.etaMin,
                comparison: compareWithRecommended(chosen, recommended),
              }
            : undefined,
      }
      recordHospitalDecision(caseId, {
        type: isDecliningRecommended ? 'declined-nearest-chose-own' : 'selected',
        hospital: selected,
        signatureUrl,
        decidedBy: decidedByName.trim() || undefined,
        risk,
      })
      toast({ title: t('เลือกโรงพยาบาลเรียบร้อยแล้ว'), message: t('เลือกนำส่งผู้ป่วยไปยัง {name}', { name: selected.name }), tone: 'success' })
      navigate(`/rescue/case/${caseId}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell variant="public" title={t('เลือกโรงพยาบาล')}>
      <div className="relative">
        <AnimatedBackground variant="hospital" />
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
          {isFlowMode && c ? (
            <PatientNeedsCard caseNumber={c.caseNumber} incidentType={c.incidentDetails?.incidentType} needs={needs} />
          ) : (
            <Card className="flex items-start gap-3 bg-skyblue-pale animate-fade-in-up">
              <Info className="mt-0.5 size-5 shrink-0 text-primary" />
              <p className="text-sm text-ink">
                {t('หน้านี้ใช้สำหรับเลือกโรงพยาบาลระหว่างขั้นตอนการช่วยเหลือเหตุฉุกเฉิน')}
              </p>
            </Card>
          )}

          {!decliningAll && (
            <div className="animate-fade-in-up" style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}>
              <HospitalSelector
                hospitals={rankedHospitals}
                selectedId={selected?.id}
                recommendedId={recommendedHospitalId}
                assessments={assessments}
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
                <p className="text-sm font-semibold text-ink">
                  {t('เลือก {name} แล้ว พร้อมยืนยันการนำส่ง', { name: selected.name })}
                </p>
              </div>
            </div>
          )}

          {!decliningAll && chosen && recommended && (
            <FamilyBriefing key={chosen.hospital.id} chosen={chosen} recommended={recommended}>
              {chosen.hospital.id !== recommended.hospital.id && (
                <Checkbox
                  checked={declinedRecommended}
                  onChange={setDeclinedRecommended}
                  label={t('ญาติรับทราบความเสี่ยง และเลือก {chosen} แทน {recommended} (โรงพยาบาลที่แนะนำ)', {
                    chosen: chosen.hospital.name,
                    recommended: recommended.hospital.name,
                  })}
                />
              )}
            </FamilyBriefing>
          )}

          {isFlowMode && !decliningAll && (
            <Button variant="outline" fullWidth icon={<HeartCrack className="size-4" />} onClick={() => setDecliningAll(true)}>
              {t('ญาติไม่ประสงค์นำส่งโรงพยาบาล')}
            </Button>
          )}

          {decliningAll && (
            <Card className="flex flex-col gap-3 border-warning/30 bg-warning/5 animate-fade-in-up">
              <p className="flex items-start gap-2 text-sm font-semibold text-ink">
                <HeartCrack className="mt-0.5 size-4 shrink-0 text-warning" />
                {t('ญาติไม่ประสงค์นำส่งโรงพยาบาล เหตุนี้จะถูกปิดโดยไม่นำส่งโรงพยาบาล')}
              </p>
              <Button variant="ghost" size="sm" className="self-start" onClick={() => setDecliningAll(false)}>
                {t('ยกเลิกและกลับไปเลือกโรงพยาบาล')}
              </Button>
            </Card>
          )}

          {needsSignature && (
            <div className="flex flex-col gap-3 animate-fade-in-up">
              <Input
                label={t('ชื่อญาติผู้ลงนาม (ถ้ามี)')}
                value={decidedByName}
                onChange={(e) => setDecidedByName(e.target.value)}
              />
              <SignaturePad label={t('ลงชื่อรับทราบการปฏิเสธ (จำเป็น)')} onChange={setSignatureDataUrl} />
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
              {decliningAll ? t('ยืนยันการปิดเหตุ') : t('ยืนยันเลือกโรงพยาบาล')}
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  )
}
