import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { PictureInPicture2, QrCode } from 'lucide-react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'

/**
 * Shows the case-tracking QR immediately on the page (not gated behind the
 * share modal), plus an optional "floating window" button that uses the
 * real Document Picture-in-Picture API to keep the QR visible and
 * scannable even after switching browser tabs/apps -- e.g. handing the
 * phone to someone else while continuing to use it yourself. Chromium-only
 * (Chrome/Edge); the button simply doesn't render where the API doesn't
 * exist (Safari, Firefox), rather than showing a dead button.
 */
export function CaseQrPanel({ url }: { url: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [pipSupported] = useState(() => typeof window !== 'undefined' && !!window.documentPictureInPicture)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#0B1F3A', light: '#FFFFFF' } })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [url])

  async function openFloatingWindow() {
    if (!qrDataUrl || !window.documentPictureInPicture) return
    try {
      const pipWindow = await window.documentPictureInPicture.requestWindow({ width: 260, height: 320 })
      const body = pipWindow.document.body
      Object.assign(body.style, {
        margin: '0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
      })

      const img = pipWindow.document.createElement('img')
      img.src = qrDataUrl
      img.alt = 'QR Code ติดตามเคส'
      Object.assign(img.style, { width: '220px', height: '220px', borderRadius: '16px' })

      const caption = pipWindow.document.createElement('p')
      caption.textContent = 'สแกนเพื่อติดตามสถานะเคส'
      Object.assign(caption.style, { marginTop: '12px', fontSize: '13px', color: '#5b6b7c' })

      body.append(img, caption)
    } catch {
      // User dismissed the permission prompt, or the API rejected -- no
      // fallback needed, the QR is still visible on the page itself.
    }
  }

  return (
    <Card className="flex flex-col items-center gap-3 text-center">
      <p className="flex items-center gap-1.5 text-sm font-bold text-navy">
        <QrCode className="size-4 text-primary" />
        สแกนเพื่อติดตามเคสนี้
      </p>
      {qrDataUrl ? (
        <img src={qrDataUrl} alt="QR Code สำหรับติดตามเคส" className="size-40 rounded-2xl border border-border" />
      ) : (
        <div className="flex size-40 items-center justify-center rounded-2xl border border-border bg-skyblue-pale/50 text-xs text-muted">
          กำลังสร้าง QR...
        </div>
      )}
      {pipSupported && (
        <Button
          variant="outline"
          size="sm"
          icon={<PictureInPicture2 className="size-4" />}
          onClick={openFloatingWindow}
          disabled={!qrDataUrl}
        >
          เปิดหน้าลอย QR
        </Button>
      )}
    </Card>
  )
}
