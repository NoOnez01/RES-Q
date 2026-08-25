import { useRef, useState } from 'react'
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react'
import { Button } from './ui/Button'
import { formatDuration } from '@/lib/utils'

export function AudioRecorder({
  label = 'บันทึกเสียงบันทึกเพิ่มเติม',
  onSave,
}: {
  label?: string
  onSave?: (blob: Blob, seconds: number) => void
}) {
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
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
        onSave?.(blob, secondsRef.current)
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
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-sm font-semibold text-navy mb-3">{label}</p>

      {!supported && (
        <p className="text-xs text-muted mb-2">อุปกรณ์นี้ไม่รองรับการบันทึกเสียง สามารถพิมพ์บันทึกแทนได้</p>
      )}

      {!audioUrl ? (
        <div className="flex items-center gap-3">
          {!recording ? (
            <Button variant="secondary" icon={<Mic className="size-4" />} onClick={startRecording} disabled={!supported}>
              เริ่มบันทึกเสียง
            </Button>
          ) : (
            <>
              <Button variant="danger" icon={<Square className="size-4" />} onClick={stopRecording}>
                หยุดบันทึก
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
            {playing ? 'หยุดชั่วคราว' : 'เล่นเสียง'}
          </Button>
          <span className="text-sm text-muted">บันทึกแล้ว {formatDuration(seconds)}</span>
          <button onClick={discard} aria-label="ลบการบันทึกเสียง" className="text-muted hover:text-emergency ml-auto">
            <Trash2 className="size-4" />
          </button>
          <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
        </div>
      )}
    </div>
  )
}
