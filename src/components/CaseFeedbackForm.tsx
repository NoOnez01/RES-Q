import { useState } from 'react'
import { Star, MessageSquareText } from 'lucide-react'
import clsx from 'clsx'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Textarea } from './ui/Field'
import { toast } from '@/lib/toast'
import { submitCaseFeedback } from '@/lib/caseFeedback'
import type { EmergencyCase } from '@/lib/types'

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="ให้คะแนนความพึงพอใจ">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ดาว`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="p-1"
        >
          <Star
            className={clsx(
              'size-8 transition-colors',
              (hover || value) >= n ? 'fill-warning text-warning' : 'fill-transparent text-border',
            )}
          />
        </button>
      ))}
    </div>
  )
}

export function CaseFeedbackForm({
  emergencyCase,
  onSubmitted,
}: {
  emergencyCase: EmergencyCase
  onSubmitted: () => void
}) {
  const [rating, setRating] = useState(0)
  const [complaint, setComplaint] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (rating === 0) {
      toast({ title: 'กรุณาให้คะแนนก่อนส่ง', tone: 'warning' })
      return
    }
    setSubmitting(true)
    try {
      await submitCaseFeedback({
        caseId: emergencyCase.caseNumber,
        rescueTeamId: emergencyCase.assignedRescueTeam?.id,
        rescueTeamName: emergencyCase.assignedRescueTeam?.name,
        rating,
        complaint,
      })
      onSubmitted()
      toast({ title: 'ขอบคุณสำหรับความคิดเห็น', tone: 'success' })
    } catch {
      toast({ title: 'ส่งความคิดเห็นไม่สำเร็จ', message: 'กรุณาลองใหม่อีกครั้ง', tone: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="font-bold text-navy">ให้คะแนนความพึงพอใจ</p>
        <p className="mt-0.5 text-sm text-muted">ความคิดเห็นของท่านช่วยให้เราปรับปรุงบริการได้ดียิ่งขึ้น</p>
      </div>
      <StarPicker value={rating} onChange={setRating} />
      <Textarea
        label="ข้อเสนอแนะหรือข้อร้องเรียน (ถ้ามี)"
        hint="ไม่บังคับ"
        rows={3}
        value={complaint}
        onChange={(e) => setComplaint(e.target.value)}
      />
      <Button
        variant="primary"
        fullWidth
        icon={<MessageSquareText className="size-4" />}
        loading={submitting}
        onClick={handleSubmit}
      >
        ส่งความคิดเห็น
      </Button>
    </Card>
  )
}
