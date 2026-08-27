import { Mic } from 'lucide-react'
import type { AudioRecording, EmergencyPhoto } from '@/lib/types'
import { formatDateTime, formatDuration } from '@/lib/utils'
import { Card } from './ui/Card'

const SOURCE_LABEL: Record<NonNullable<AudioRecording['recordedBy']>, string> = {
  public: 'เสียงจากผู้แจ้งเหตุ',
  rescue: 'เสียงจากหน่วยกู้ชีพ',
}

export function CaseMediaGallery({
  photos,
  audioRecordings,
}: {
  photos: EmergencyPhoto[]
  audioRecordings: AudioRecording[]
}) {
  if (photos.length === 0 && audioRecordings.length === 0) return null

  return (
    <Card className="space-y-4">
      <h3 className="font-bold text-navy">ภาพและเสียงจากที่เกิดเหตุ</h3>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p) => (
            <img
              key={p.id}
              src={p.dataUrl}
              alt="ภาพจุดเกิดเหตุ"
              className="aspect-square w-full rounded-xl border border-border object-cover"
            />
          ))}
        </div>
      )}

      {audioRecordings.length > 0 && (
        <div className="flex flex-col gap-2">
          {audioRecordings.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-border bg-bg p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Mic className="size-4 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-navy">{SOURCE_LABEL[r.recordedBy ?? 'public']}</p>
                  <p className="text-xs text-muted">
                    {formatDuration(r.durationSec)} · {formatDateTime(r.recordedAt)}
                  </p>
                </div>
              </div>
              <audio controls src={r.url} className="h-9 w-full sm:w-64" />
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
