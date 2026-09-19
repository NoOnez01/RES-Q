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
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  เบอร์โทรศัพท์ไม่ถูกต้อง: 'Invalid phone number',
  เพิ่มเบอร์ญาติผู้ป่วยแล้ว: "Patient's family contact added",
  เบอร์ญาติผู้ป่วย: "Patient's family contacts",
  เพิ่มเบอร์: 'Add contact',
  ยังไม่มีเบอร์ติดต่อญาติผู้ป่วย: "No family contact numbers yet",
  ไม่ระบุชื่อ: 'No name given',
  'เพิ่มโดย {role}': 'Added by {role}',
  'ชื่อญาติ (ถ้ามี)': 'Family member name (if any)',
  เบอร์โทรศัพท์: 'Phone number',
  บันทึก: 'Save',
  ยกเลิก: 'Cancel',
})

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
  const t = useT()

  const list = contacts ?? []

  function handleAdd() {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 9 || digits.length > 10) {
      setError(t('เบอร์โทรศัพท์ไม่ถูกต้อง'))
      return
    }
    addRelativeContact(caseId, phone.trim(), name.trim() || undefined)
    toast({ title: t('เพิ่มเบอร์ญาติผู้ป่วยแล้ว'), tone: 'success' })
    setName('')
    setPhone('')
    setError(undefined)
    setAdding(false)
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold text-ink">
          <Users className="size-4 text-primary" /> {t('เบอร์ญาติผู้ป่วย')}
        </h3>
        {!adding && (
          <Button variant="outline" size="sm" icon={<Plus className="size-3.5" />} onClick={() => setAdding(true)}>
            {t('เพิ่มเบอร์')}
          </Button>
        )}
      </div>

      {list.length === 0 && !adding && <p className="text-sm text-muted">{t('ยังไม่มีเบอร์ติดต่อญาติผู้ป่วย')}</p>}

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
                <p className="truncate text-sm font-semibold text-ink">{contact.name || t('ไม่ระบุชื่อ')}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <Phone className="size-3 shrink-0" /> {contact.phone}
                </p>
              </div>
              <div className="shrink-0 text-right text-[11px] text-muted">
                <p>{t('เพิ่มโดย {role}', { role: t(roleLabel(contact.addedBy)) })}</p>
                <p>{formatDateTime(contact.addedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-border p-3">
          <Input label={t('ชื่อญาติ (ถ้ามี)')} value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label={t('เบอร์โทรศัพท์')}
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
              {t('บันทึก')}
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
              {t('ยกเลิก')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
