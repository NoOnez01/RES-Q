import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import { X, Copy, Check } from 'lucide-react'
import { Button } from './ui/Button'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ปิด: 'Close',
  แชร์ให้ญาติติดตามสถานะ: 'Share so family can track status',
  'สแกน QR หรือคัดลอกลิงก์เพื่อส่งให้ญาติดูสถานะการนำส่งแบบเรียลไทม์':
    'Scan the QR code or copy the link to let family view the transport status in real time',
  'QR Code สำหรับแชร์เคส': 'QR code for sharing the case',
  'กำลังสร้าง QR...': 'Generating QR...',
  คัดลอกแล้ว: 'Copied',
  คัดลอกลิงก์: 'Copy link',
})

interface ShareCaseModalProps {
  open: boolean
  url: string
  onClose: () => void
  title?: string
  description?: string
}

export function ShareCaseModal({ open, url, onClose, title, description }: ShareCaseModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const t = useT()
  const resolvedTitle = title ?? t('แชร์ให้ญาติติดตามสถานะ')
  const resolvedDescription = description ?? t('สแกน QR หรือคัดลอกลิงก์เพื่อส่งให้ญาติดูสถานะการนำส่งแบบเรียลไทม์')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    // impeccable-disable-next-line design-system-color -- QR modules need
    // genuine max-contrast black/white to stay scannable, not theme tokens
    // that shift with light/dark mode.
    QRCode.toDataURL(url, { width: 240, margin: 1, color: { dark: '#0B1F3A', light: '#FFFFFF' } })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open, url])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API unavailable/denied -- the link is still shown as
      // selectable text below, so the reporter can copy it manually
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-navy/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-case-title"
        className="relative w-full overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-card-lg animate-scale-in sm:max-w-sm sm:rounded-3xl"
      >
        <button
          onClick={onClose}
          aria-label={t('ปิด')}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted transition-colors hover:bg-skyblue-light hover:text-ink"
        >
          <X className="size-5" />
        </button>

        <h2 id="share-case-title" className="pr-8 text-lg font-bold text-ink">
          {resolvedTitle}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {resolvedDescription}
        </p>

        <div className="mt-5 flex justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={t('QR Code สำหรับแชร์เคส')} className="size-48 rounded-2xl border border-border" />
          ) : (
            <div className="flex size-48 items-center justify-center rounded-2xl border border-border bg-skyblue-pale/50 text-xs text-muted">
              {t('กำลังสร้าง QR...')}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-border bg-skyblue-pale/40 px-3 py-2.5">
          <p className="select-all break-all text-xs text-ink">{url}</p>
        </div>

        <Button
          variant="primary"
          fullWidth
          className="mt-3"
          icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          onClick={handleCopy}
        >
          {copied ? t('คัดลอกแล้ว') : t('คัดลอกลิงก์')}
        </Button>
      </div>
    </div>,
    document.body,
  )
}
