import { useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from './ui/Button'
import type { EmergencyPhoto } from '@/lib/types'

interface ImageUploaderProps {
  photos: EmergencyPhoto[]
  onAdd: (dataUrl: string) => void
  onRemove: (id: string) => void
}

export function ImageUploader({ photos, onAdd, onRemove }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') onAdd(reader.result)
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <Button variant="secondary" fullWidth icon={<Upload className="size-5" />} onClick={() => inputRef.current?.click()}>
        อัปโหลดรูปภาพ
      </Button>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border">
              <img src={p.dataUrl} alt="รูปภาพจุดเกิดเหตุ" className="size-full object-cover" />
              <button
                onClick={() => onRemove(p.id)}
                aria-label="ลบรูปภาพ"
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-navy/70 text-white opacity-90 transition-opacity hover:bg-emergency"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
