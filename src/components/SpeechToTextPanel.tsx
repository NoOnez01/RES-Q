import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, AlertTriangle, AlertCircle } from 'lucide-react'
import { Button } from './ui/Button'
import { Textarea } from './ui/Field'

interface SpeechToTextPanelProps {
  value: string
  onChange: (v: string) => void
  label?: string
  /** Form-validation error (e.g. "required") -- distinct from errorLabel
   * below, which is the speech-recognition service's own failure state. */
  error?: string
  textareaClassName?: string
}

// Chrome's implementation of this API isn't on-device -- it streams audio to
// Google's speech servers and needs a live connection to return anything at
// all, so a 'network' error here is the expected failure mode on a moving
// rescue vehicle's spotty signal, not an edge case.
const ERROR_LABEL: Record<string, string> = {
  network: 'ไม่สามารถพูดบันทึกได้ขณะนี้ (ต้องใช้สัญญาณอินเทอร์เน็ต) กรุณาพิมพ์แทน',
  'not-allowed': 'ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน',
  'service-not-allowed': 'ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน',
  'audio-capture': 'ไม่พบไมโครโฟนบนอุปกรณ์นี้',
}

export function SpeechToTextPanel({
  value,
  onChange,
  label = 'พูดเพื่อบันทึกข้อความ',
  error,
  textareaClassName,
}: SpeechToTextPanelProps) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const [errorLabel, setErrorLabel] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }
    setSupported(true)
    const recognition = new SpeechRecognition()
    recognition.lang = 'th-TH'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript
      }
      if (finalTranscript) onChange((value ? value + ' ' : '') + finalTranscript.trim())
    }
    // Without this, any failure (a network drop being the most common one in
    // a moving vehicle) left `listening` stuck true forever -- the button
    // kept showing "กำลังฟัง..." with no feedback and no way to tell it had
    // silently died versus genuinely still listening.
    recognition.onerror = (event: { error: string }) => {
      setListening(false)
      if (event.error === 'no-speech' || event.error === 'aborted') return
      setErrorLabel(ERROR_LABEL[event.error] ?? 'พูดบันทึกไม่สำเร็จ กรุณาลองใหม่หรือพิมพ์แทน')
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    return () => recognition.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function toggle() {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      setErrorLabel(null)
      try {
        recognitionRef.current.start()
        setListening(true)
      } catch {
        // start() throws if a recognition session is already active from a
        // rapid double-tap -- surfacing nothing is correct here since one is
        // already running.
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-navy">{label}</p>
        {supported ? (
          <Button
            variant={listening ? 'danger' : 'secondary'}
            size="sm"
            icon={listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            onClick={toggle}
          >
            {listening ? 'กำลังฟัง...' : 'พูดบันทึก'}
          </Button>
        ) : (
          <span className="text-xs text-muted">อุปกรณ์นี้ไม่รองรับการพูดบันทึกข้อความ</span>
        )}
      </div>
      {errorLabel && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
          <AlertTriangle className="size-3.5 shrink-0" /> {errorLabel}
        </p>
      )}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="พิมพ์หรือพูดเพื่อบันทึกข้อความ..."
        className={textareaClassName}
      />
      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-emergency">
          <AlertCircle className="size-3.5" /> {error}
        </p>
      )}
    </div>
  )
}
