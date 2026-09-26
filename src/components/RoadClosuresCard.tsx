import { useState } from 'react'
import clsx from 'clsx'
import { Ban } from 'lucide-react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { formatDateTime, formatTime } from '@/lib/utils'
import { CLOSURE_REASON_LABEL, clearRoadClosure, useRoadClosures } from '@/lib/roadClosures'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'เส้นทางที่ถูกปิด ({n})': 'Closed roads ({n})',
  'ระบบนำทางของทุกหน่วยจะเลี่ยงจุดเหล่านี้จนกว่าจะเปิดเส้นทางหรือหมดอายุ':
    "Every unit's navigation avoids these spots until they're reopened or expire",
  'แจ้งโดย {name} · {time}': 'Reported by {name} · {time}',
  'หมดอายุ {time}': 'Expires {time}',
  เปิดเส้นทางแล้ว: 'Reopened',
  'บันทึกว่าเปิดเส้นทางแล้ว': 'Road marked as reopened',
  เปิดเส้นทางไม่สำเร็จ: 'Could not reopen the road',
  ไม่ระบุ: 'Unspecified',
})

/**
 * Road closures reported by rescue crews, for dispatch to see and clear
 * once a road is passable again (see lib/roadClosures.ts). Renders nothing
 * while no road is closed.
 */
export function RoadClosuresCard({ className }: { className?: string }) {
  const closures = useRoadClosures()
  const currentUser = useStore((s) => s.currentUser)
  const [clearing, setClearing] = useState<string | null>(null)
  const t = useT()

  if (closures.length === 0) return null

  async function reopen(id: string) {
    if (!currentUser) return
    setClearing(id)
    try {
      await clearRoadClosure(id, currentUser.id)
      toast({ title: t('บันทึกว่าเปิดเส้นทางแล้ว'), tone: 'success' })
    } catch (err) {
      console.error('Failed to clear road closure:', err)
      toast({ title: t('เปิดเส้นทางไม่สำเร็จ'), tone: 'error' })
    } finally {
      setClearing(null)
    }
  }

  return (
    <Card className={clsx('flex flex-col gap-3 border-warning/30', className)}>
      <div>
        <h2 className="flex items-center gap-2 font-bold text-ink">
          <Ban className="size-4.5 text-warning" /> {t('เส้นทางที่ถูกปิด ({n})', { n: closures.length })}
        </h2>
        <p className="mt-0.5 text-xs text-muted">{t('ระบบนำทางของทุกหน่วยจะเลี่ยงจุดเหล่านี้จนกว่าจะเปิดเส้นทางหรือหมดอายุ')}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {closures.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {t(CLOSURE_REASON_LABEL[c.reason])}
                {c.note && <span className="font-normal text-muted"> · {c.note}</span>}
              </p>
              <p className="text-xs text-muted">
                {t('แจ้งโดย {name} · {time}', { name: c.reporterName ?? t('ไม่ระบุ'), time: formatDateTime(c.createdAt) })} ·{' '}
                {t('หมดอายุ {time}', { time: formatTime(c.expiresAt) })}
              </p>
            </div>
            <Button size="sm" variant="outline" loading={clearing === c.id} onClick={() => void reopen(c.id)}>
              {t('เปิดเส้นทางแล้ว')}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
