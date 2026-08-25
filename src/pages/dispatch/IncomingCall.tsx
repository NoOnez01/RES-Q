import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, PhoneCall, Video } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { EmergencyCaseCard } from '@/components/EmergencyCaseCard'
import { EmptyState } from '@/components/States'
import { Button } from '@/components/ui/Button'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { PulseRing } from '@/components/backgrounds/PulseRing'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'

export default function IncomingCall() {
  const navigate = useNavigate()
  const cases = useStore((s) => s.cases)
  const answerCall = useStore((s) => s.answerCall)

  // Only calls actually happening right now — ringing (not yet answered) or
  // already answered and connected. Once the citizen hangs up and finishes
  // filling in incident details, the case moves to 'called-1669'/'received'
  // and shows on the dashboard instead, not here.
  const incomingCases = useMemo(
    () =>
      Object.values(cases)
        .filter((c) => c.callStatus === 'connecting' || c.callStatus === 'in-call')
        .sort((a, b) => b.createdAt - a.createdAt),
    [cases],
  )

  function handleAnswer(caseId: string, caseNumber: string) {
    answerCall(caseId)
    toast({ title: 'รับสายแล้ว', message: `กำลังสนทนากับผู้แจ้งเหตุ เคส ${caseNumber}`, tone: 'success' })
    navigate(`/dispatch/call/${caseId}`)
  }

  return (
    <AppShell variant="dashboard" title="สายเรียกเข้า">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
            <PulseRing tone="success" size="sm" />
            กำลังรับฟังสายเรียกเข้าแบบเรียลไทม์
          </div>

          {incomingCases.length === 0 ? (
            <EmptyState
              title="ไม่มีสายเรียกเข้าขณะนี้"
              description="สายเรียกเข้าใหม่จะปรากฏที่นี่โดยอัตโนมัติ"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {incomingCases.map((c, index) => {
                const ringing = c.callStatus === 'connecting'
                return (
                  <div
                    key={c.id}
                    className="relative animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(index, 8) * 80}ms`, animationFillMode: 'backwards' }}
                  >
                    <span className="absolute -top-2 left-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-emergency px-3 py-1 text-xs font-bold text-white shadow-card animate-pulse">
                      <PulseRing tone="emergency" size="sm" />
                      {ringing ? 'สายเรียกเข้าใหม่' : 'กำลังสนทนา'}
                    </span>
                    <EmergencyCaseCard
                      emergencyCase={c}
                      to={`/dispatch/case/${c.id}`}
                      actions={
                        ringing ? (
                          <Button
                            size="sm"
                            variant="success"
                            icon={<PhoneCall className="size-4" />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAnswer(c.id, c.caseNumber)
                            }}
                          >
                            รับสาย
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            icon={<Video className="size-4" />}
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/dispatch/call/${c.id}`)
                            }}
                          >
                            เข้าสู่หน้าสาย
                          </Button>
                        )
                      }
                    />
                    <p className="mt-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted">
                      <Phone className="size-3.5" />
                      {ringing ? 'กำลังโทรเข้า รอรับสาย' : 'กำลังสนทนากับผู้แจ้งเหตุ'}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
