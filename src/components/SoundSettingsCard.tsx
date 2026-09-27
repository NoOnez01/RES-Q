import type { CSSProperties } from 'react'
import { Play, Volume2, VolumeX } from 'lucide-react'
import { Card } from './ui/Card'
import { SegmentedControl } from './ui/SegmentedControl'
import { previewSound, setUiSoundsEnabled, useUiSoundsEnabled, type SoundPreview } from '@/lib/sounds'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  เสียง: 'Sound',
  เสียงเมื่อกดปุ่มและแจ้งผล: 'Button and feedback sounds',
  'เสียงแตะปุ่ม เสียงบันทึกสำเร็จ และเสียงเตือนเมื่อกรอกข้อมูลสำคัญไม่ครบ':
    'Taps, a chime when something is saved, and a warning when required information is missing',
  เปิดเสียง: 'On',
  ปิดเสียง: 'Off',
  'เสียงสายเรียกเข้าและเสียงแจ้งเตือนเหตุจะดังเสมอ เพื่อไม่ให้พลาดเหตุหรือสายสำคัญ':
    'Ringtones and case alerts always sound, so no case or call is missed',
  ฟังตัวอย่างเสียง: 'Preview sounds',
  การโทร: 'Calls',
  เสียงสายเรียกเข้า: 'Incoming call',
  กำลังโทรออก: 'Calling out',
  ต่อสายสำเร็จ: 'Call connected',
  สิ้นสุดการโทร: 'Call ended',
  แจ้งเตือนเหตุ: 'Case alerts',
  'เหตุใหม่ (ยังไม่ประเมิน)': 'New case (not yet assessed)',
  'เหตุระดับ {n}': 'Severity {n} case',
  หน่วยกู้ชีพปฏิเสธเหตุ: 'Rescue team declined',
  'ผู้ป่วยกำลังนำส่ง (โรงพยาบาล)': 'Patient incoming (hospital)',
  แจ้งเตือนทั่วไป: 'General alert',
  ปุ่มและการแจ้งผล: 'Buttons and feedback',
  แตะปุ่ม: 'Tap',
  สำเร็จ: 'Success',
  กรอกข้อมูลไม่ครบ: 'Missing information',
  คำเตือน: 'Warning',
})

const GROUPS: { title: string; items: { label: string; vars?: Record<string, number>; sound: SoundPreview }[] }[] = [
  {
    title: 'การโทร',
    items: [
      { label: 'เสียงสายเรียกเข้า', sound: { kind: 'ring', ring: 'incoming' } },
      { label: 'กำลังโทรออก', sound: { kind: 'ring', ring: 'outgoing' } },
      { label: 'ต่อสายสำเร็จ', sound: { kind: 'call', name: 'connected' } },
      { label: 'สิ้นสุดการโทร', sound: { kind: 'call', name: 'ended' } },
    ],
  },
  {
    title: 'แจ้งเตือนเหตุ',
    items: [
      { label: 'เหตุใหม่ (ยังไม่ประเมิน)', sound: { kind: 'alert', event: 'case-new' } },
      ...([1, 2, 3, 4, 5] as const).map((n) => ({
        label: 'เหตุระดับ {n}',
        vars: { n },
        sound: { kind: 'alert', event: 'case-new', severity: n } as SoundPreview,
      })),
      { label: 'หน่วยกู้ชีพปฏิเสธเหตุ', sound: { kind: 'alert', event: 'rescue-rejected' } },
      { label: 'ผู้ป่วยกำลังนำส่ง (โรงพยาบาล)', sound: { kind: 'alert', event: 'hospital-incoming', severity: 2 } },
      { label: 'แจ้งเตือนทั่วไป', sound: { kind: 'alert', event: 'notice' } },
    ],
  },
  {
    title: 'ปุ่มและการแจ้งผล',
    items: [
      { label: 'แตะปุ่ม', sound: { kind: 'ui', name: 'tap' } },
      { label: 'สำเร็จ', sound: { kind: 'ui', name: 'success' } },
      { label: 'กรอกข้อมูลไม่ครบ', sound: { kind: 'ui', name: 'error' } },
      { label: 'คำเตือน', sound: { kind: 'ui', name: 'warning' } },
    ],
  },
]

/** Settings: turn interface sounds on/off, and hear every sound the app makes. */
export function SoundSettingsCard({ style }: { style?: CSSProperties }) {
  const t = useT()
  const uiOn = useUiSoundsEnabled()

  return (
    <Card className="space-y-4 animate-fade-in-up" style={style}>
      <h3 className="flex items-center gap-2 font-bold text-ink">
        <Volume2 className="size-4 text-primary" /> {t('เสียง')}
      </h3>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('เสียงเมื่อกดปุ่มและแจ้งผล')}</p>
        <SegmentedControl
          variant="card"
          value={uiOn ? 'on' : 'off'}
          onChange={(v) => setUiSoundsEnabled(v === 'on')}
          options={[
            { value: 'on', label: t('เปิดเสียง'), icon: Volume2 },
            { value: 'off', label: t('ปิดเสียง'), icon: VolumeX },
          ]}
        />
        <p className="text-xs text-muted">{t('เสียงแตะปุ่ม เสียงบันทึกสำเร็จ และเสียงเตือนเมื่อกรอกข้อมูลสำคัญไม่ครบ')}</p>
      </div>

      <p className="rounded-xl bg-skyblue-pale px-3.5 py-2.5 text-sm text-ink">
        {t('เสียงสายเรียกเข้าและเสียงแจ้งเตือนเหตุจะดังเสมอ เพื่อไม่ให้พลาดเหตุหรือสายสำคัญ')}
      </p>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('ฟังตัวอย่างเสียง')}</p>
        {GROUPS.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <p className="text-sm font-semibold text-ink">{t(group.title)}</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {group.items.map((item) => {
                const label = t(item.label, item.vars)
                return (
                  <button
                    key={label}
                    type="button"
                    // The preview is the sound -- no tap tick on top of it.
                    data-no-tap-sound
                    onClick={() => previewSound(item.sound)}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm text-ink transition-colors hover:border-primary/50 hover:bg-skyblue-pale focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Play className="size-3.5 translate-x-px" aria-hidden="true" />
                    </span>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
