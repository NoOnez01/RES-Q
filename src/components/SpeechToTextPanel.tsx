import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Button } from './ui/Button'
import { Textarea } from './ui/Field'

interface SpeechToTextPanelProps {
  value: string
  onChange: (v: string) => void
  label?: string
}

export function SpeechToTextPanel({ value, onChange, label = 'พูดเพื่อบันทึกข้อความ' }: SpeechToTextPanelProps) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
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
      recognitionRef.current.start()
      setListening(true)
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
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="พิมพ์หรือพูดเพื่อบันทึกข้อความ..." />
    </div>
  )
}
