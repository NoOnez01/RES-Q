import { useRef, useState } from 'react'
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react'
import { Button } from './ui/Button'
import { formatDuration } from '@/lib/utils'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  บันทึกเสียงบันทึกเพิ่มเติม: 'Record additional voice note',
  'อุปกรณ์นี้ไม่รองรับการบันทึกเสียง สามารถพิมพ์บันทึกแทนได้': 'This device does not support audio recording, you can type a note instead',
  เริ่มบันทึกเสียง: 'Start recording',
  หยุดบันทึก: 'Stop recording',
  หยุดชั่วคราว: 'Pause',
  เล่นเสียง: 'Play',
  'บันทึกแล้ว {duration}': 'Recorded {duration}',
  ลบการบันทึกเสียง: 'Delete recording',
})

export function AudioRecorder({
  label,
  onSave,
  resetAfterSave = false,
}: {
  label?: string
  onSave?: (blob: Blob, seconds: number) => void
  /** For a caller that renders its own persisted list of saved recordings
   * elsewhere on the page (see EmergencyPhoto.tsx): skip this widget's own
   * play/discard preview after a save, since that list is already the
   * single place recordings are played back or removed from the case --
   * showing it here too duplicated the just-saved clip, and this widget's
   * own "discard" only ever cleared its local preview, never the save. */
  resetAfterSave?: boolean
}) {
  const t = useT()
  const resolvedLabel = label ?? t('บันทึกเสียงบันทึกเพิ่มเติม')
  const [supported] = useState(() => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const secondsRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  async function startRecording() {
    if (!supported) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach((track) => track.stop())
        onSave?.(blob, secondsRef.current)
        if (resetAfterSave) setSeconds(0)
        else setAudioUrl(URL.createObjectURL(blob))
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      secondsRef.current = 0
      setSeconds(0)
      setRecording(true)
      timerRef.current = setInterval(() => {
        secondsRef.current += 1
        setSeconds(secondsRef.current)
      }, 1000)
    } catch {
      setRecording(false)
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  function discard() {
    setAudioUrl(null)
    setSeconds(0)
    setPlaying(false)
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-ink mb-3">{resolvedLabel}</p>

      {!supported && (
        <p className="text-xs text-muted mb-2">{t('อุปกรณ์นี้ไม่รองรับการบันทึกเสียง สามารถพิมพ์บันทึกแทนได้')}</p>
      )}

      {!audioUrl ? (
        <div className="flex items-center gap-3">
          {!recording ? (
            <Button variant="secondary" icon={<Mic className="size-4" />} onClick={startRecording} disabled={!supported}>
              {t('เริ่มบันทึกเสียง')}
            </Button>
          ) : (
            <>
              <Button variant="danger" icon={<Square className="size-4" />} onClick={stopRecording}>
                {t('หยุดบันทึก')}
              </Button>
              <span className="flex items-center gap-2 text-sm font-semibold text-emergency">
                <span className="size-2 animate-pulse rounded-full bg-emergency" />
                {formatDuration(seconds)}
              </span>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            onClick={togglePlay}
          >
            {playing ? t('หยุดชั่วคราว') : t('เล่นเสียง')}
          </Button>
          <span className="text-sm text-muted">{t('บันทึกแล้ว {duration}', { duration: formatDuration(seconds) })}</span>
          <button onClick={discard} aria-label={t('ลบการบันทึกเสียง')} className="text-muted hover:text-emergency ml-auto">
            <Trash2 className="size-4" />
          </button>
          <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
        </div>
      )}
    </div>
  )
}
