import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Info, CheckCircle2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { HospitalSelector } from '@/components/HospitalSelector'
import { SeverityBadge } from '@/components/SeverityBadge'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import type { Hospital } from '@/lib/types'

export default function HospitalSelectionPage() {
  const [searchParams] = useSearchParams()
  const caseId = searchParams.get('caseId')
  const navigate = useNavigate()

  const c = useStore((s) => (caseId ? s.cases[caseId] : undefined))
  const hospitals = useStore((s) => s.hospitals)
  const selectHospital = useStore((s) => s.selectHospital)

  const [selected, setSelected] = useState<Hospital | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  const isFlowMode = !!caseId && !!c

  function handleConfirm() {
    if (!selected || !caseId) return
    setLoading(true)
    setTimeout(() => {
      selectHospital(caseId, selected)
      setLoading(false)
      toast({ title: 'เลือกโรงพยาบาลเรียบร้อยแล้ว', message: `เลือกส่งตัวไปยัง ${selected.name}`, tone: 'success' })
      navigate(`/rescue/case/${caseId}`)
    }, 700)
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

          <div className="animate-fade-in-up" style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}>
            <HospitalSelector hospitals={hospitals} selectedId={selected?.id} onSelect={setSelected} />
          </div>

          {isFlowMode && selected && (
            <div
              key={selected.id}
              role="status"
              className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 px-4 py-3 animate-scale-in"
            >
              <CheckCircle2 className="size-5 shrink-0 text-success" />
              <p className="text-sm font-semibold text-navy">
                เลือก {selected.name} แล้ว พร้อมยืนยันการส่งตัว
              </p>
            </div>
          )}

          {isFlowMode && (
            <Button size="lg" fullWidth disabled={!selected} loading={loading} onClick={handleConfirm}>
              ยืนยันเลือกโรงพยาบาล
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  )
}
