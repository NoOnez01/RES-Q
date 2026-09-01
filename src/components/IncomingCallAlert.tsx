import { createPortal } from 'react-dom'
import { PhoneCall } from 'lucide-react'
import { Button } from './ui/Button'

/**
 * The ringtone in CallRingtoneBridge is audible from any page, but until now
 * nothing told a dispatcher *which* case was calling unless they happened to
 * already be on /dispatch/incoming-call -- someone on the dashboard or a
 * case detail page just heard a ring with no on-screen indication. This is
 * the visual half: a persistent (non-auto-dismissing) alert that follows the
 * ring itself, so answering is one click from wherever they are.
 */
export function IncomingCallAlert({
  caseNumber,
  onAnswer,
  onDismiss,
}: {
  caseNumber: string
  onAnswer: () => void
  onDismiss: () => void
}) {
  return createPortal(
    <div className="fixed inset-x-0 top-0 z-[210] flex justify-center p-3 sm:p-4">
      <div
        role="alert"
        className="flex w-full max-w-sm items-center gap-3 rounded-2xl bg-emergency p-3 pl-4 text-white shadow-card-lg animate-fade-in-up"
      >
        <span className="relative inline-flex size-2.5 shrink-0" aria-hidden="true">
          <span className="absolute inset-0 animate-ping-slow rounded-full bg-white/50" />
          <span className="relative inline-flex size-2.5 rounded-full bg-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">สายเรียกเข้าใหม่</p>
          <p className="truncate text-xs text-white/85">เคส {caseNumber} กำลังโทรเข้า</p>
        </div>
        <Button size="sm" variant="secondary" icon={<PhoneCall className="size-4" />} onClick={onAnswer}>
          รับสาย
        </Button>
        <button
          onClick={onDismiss}
          aria-label="ซ่อนการแจ้งเตือนสายนี้"
          className="rounded-full px-2 py-1 text-xs font-medium text-white/70 hover:text-white"
        >
          ปิด
        </button>
      </div>
    </div>,
    document.body,
  )
}
