import { useState } from 'react'
import { Phone, Plus, UserRound, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { roleLabel } from '@/lib/nav'
import { formatDateTime } from '@/lib/utils'
import type { RelativeContact } from '@/lib/types'

/**
 * Family/relative contacts for the patient -- addable by whoever has them
 * at the time (reporter, 1669, rescue, or hospital), at any point in the
 * case's lifecycle, not just collected once up front. Shown identically
 * across all four roles' case-detail pages.
 */
export function RelativeContacts({ caseId, contacts }: { caseId: string; contacts?: RelativeContact[] }) {
  const addRelativeContact = useStore((s) => s.addRelativeContact)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string>()

  const list = contacts ?? []

  function handleAdd() {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 9 || digits.length > 10) {
      setError('เบอร์โทรศัพท์ไม่ถูกต้อง')
      return
    }
    addRelativeContact(caseId, phone.trim(), name.trim() || undefined)
    toast({ title: 'เพิ่มเบอร์ญาติผู้ป่วยแล้ว', tone: 'success' })
    setName('')
    setPhone('')
    setError(undefined)
    setAdding(false)
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold text-navy">
          <Users className="size-4 text-primary" /> เบอร์ญาติผู้ป่วย
        </h3>
        {!adding && (
          <Button variant="outline" size="sm" icon={<Plus className="size-3.5" />} onClick={() => setAdding(true)}>
            เพิ่มเบอร์
          </Button>
        )}
      </div>

      {list.length === 0 && !adding && <p className="text-sm text-muted">ยังไม่มีเบอร์ติดต่อญาติผู้ป่วย</p>}

      {list.length > 0 && (
        <div className="flex flex-col gap-2">
          {list.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-bg p-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-skyblue-light text-primary">
                <UserRound className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy">{contact.name || 'ไม่ระบุชื่อ'}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <Phone className="size-3 shrink-0" /> {contact.phone}
                </p>
              </div>
              <div className="shrink-0 text-right text-[11px] text-muted">
                <p>เพิ่มโดย {roleLabel(contact.addedBy)}</p>
                <p>{formatDateTime(contact.addedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-border p-3">
          <Input label="ชื่อญาติ (ถ้ามี)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="เบอร์โทรศัพท์"
            required
            type="tel"
            value={phone}
            error={error}
            onChange={(e) => {
              setPhone(e.target.value)
              if (error) setError(undefined)
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" fullWidth onClick={handleAdd}>
              บันทึก
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAdding(false)
                setName('')
                setPhone('')
                setError(undefined)
              }}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
