import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, X } from 'lucide-react'
import { checkForAppUpdate } from '@/lib/appUpdateCheck'
import { Button } from './ui/Button'

const DISMISSED_KEY = 'resq-update-dismissed-version'

export function AppUpdateBanner() {
  const [update, setUpdate] = useState<{ version: string; downloadUrl: string } | null>(null)

  useEffect(() => {
    void checkForAppUpdate().then((result) => {
      if (!result) return
      if (localStorage.getItem(DISMISSED_KEY) === result.version) return
      setUpdate(result)
    })
  }, [])

  if (!update) return null

  function dismiss() {
    if (update) localStorage.setItem(DISMISSED_KEY, update.version)
    setUpdate(null)
  }

  return createPortal(
    <div className="fixed inset-x-0 top-0 z-[150] flex items-center gap-3 bg-primary px-4 py-2.5 text-sm text-white shadow-card">
      <Download className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 truncate">
        มีเวอร์ชันใหม่ (v{update.version}) พร้อมใช้งาน
      </p>
      <a href={update.downloadUrl} target="_blank" rel="noreferrer">
        <Button size="sm" variant="secondary" className="!bg-white !text-primary">
          ดาวน์โหลด
        </Button>
      </a>
      <button onClick={dismiss} aria-label="ปิด" className="shrink-0 rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white">
        <X className="size-4" />
      </button>
    </div>,
    document.body,
  )
}
