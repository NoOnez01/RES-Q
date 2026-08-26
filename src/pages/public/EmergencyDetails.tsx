import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneCall } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { SuccessState } from '@/components/States'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { useStore } from '@/lib/store'

export default function EmergencyDetails() {
  const navigate = useNavigate()
  const activeCaseId = useStore((s) => s.activeCaseId)
  const cases = useStore((s) => s.cases)
  const submitCallbackPhone = useStore((s) => s.submitCallbackPhone)
  const deleteCase = useStore((s) => s.deleteCase)

  const caseId = activeCaseId
  const activeCase = caseId ? cases[caseId] : null

  const [callbackPhone, setCallbackPhone] = useState(activeCase?.reporterPhone ?? '')
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!caseId || !activeCase) {
    return (
      <AppShell variant="flow" title="เบอร์ติดต่อกลับ" showBack>
        <div className="py-16 text-center text-sm text-muted">ไม่พบข้อมูลเคส</div>
      </AppShell>
    )
  }

  function handleBack() {
    if (caseId) deleteCase(caseId)
    navigate(-1)
  }

  function handleSubmit() {
    if (submitting || !caseId) return
    const digits = callbackPhone.replace(/\D/g, '')
    if (!callbackPhone.trim()) {
      setError('กรุณาระบุเบอร์โทรศัพท์สำหรับติดต่อกลับ')
      return
    }
    if (digits.length < 9 || digits.length > 10) {
      setError('เบอร์โทรศัพท์ไม่ถูกต้อง')
      return
    }
    setError(undefined)
    setSubmitting(true)
    setTimeout(() => {
      submitCallbackPhone(caseId, callbackPhone)
      setSubmitting(false)
      setSubmitted(true)
      setTimeout(() => {
        navigate(`/public/case/${caseId}`)
      }, 1200)
    }, 500)
  }

  if (submitted) {
    return (
      <AppShell variant="flow" title="เบอร์ติดต่อกลับ" showBack={false}>
        <SuccessState title="ส่งข้อมูลสำเร็จ" description="เจ้าหน้าที่ได้รับแจ้งเหตุของคุณแล้ว" />
      </AppShell>
    )
  }

  return (
    <AppShell variant="flow" title="เบอร์ติดต่อกลับ" showBack onBack={handleBack}>
      <div className="relative">
        <AnimatedBackground variant="emergency" />

        <div className="relative z-10 flex flex-col gap-5 pb-8">
          <div>
            <h1 className="text-xl font-bold text-navy">เบอร์ติดต่อกลับ</h1>
            <p className="mt-1.5 text-sm text-muted">
              เจ้าหน้าที่ศูนย์ 1669 จะกรอกรายละเอียดเหตุการณ์ให้ กรุณาระบุเบอร์โทรศัพท์เผื่อเจ้าหน้าที่ต้องติดต่อกลับ
            </p>
          </div>

          <Card className="flex flex-col gap-4">
            <Input
              label="เบอร์โทรศัพท์สำหรับติดต่อกลับ"
              type="tel"
              required
              autoFocus
              value={callbackPhone}
              error={error}
              onChange={(e) => setCallbackPhone(e.target.value)}
            />
          </Card>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<PhoneCall className="size-5" />}
            loading={submitting}
            onClick={handleSubmit}
          >
            ส่งข้อมูลให้เจ้าหน้าที่
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
