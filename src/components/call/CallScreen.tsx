import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import type { Track } from 'livekit-client'
import { AlertTriangle, ChevronDown, Mic, MicOff, PhoneOff, SwitchCamera, UserPlus, Video, VideoOff, Volume2 } from 'lucide-react'
import type { CallParticipant, LiveKitCall } from '@/lib/useLiveKitCall'
import type { EmergencyCase } from '@/lib/types'
import { formatDuration } from '@/lib/utils'
import { useT, registerTranslations } from '@/lib/i18n'
import { CallAvatar, callRoleOf, type CallRole } from './CallAvatar'

registerTranslations({
  'ศูนย์สั่งการ 1669': 'Dispatch Center 1669',
  หน่วยกู้ชีพ: 'Rescue team',
  ผู้แจ้งเหตุ: 'Reporter',
  'กำลังโทร...': 'Calling...',
  'กำลังเชื่อมต่อ...': 'Connecting...',
  สิ้นสุดการโทร: 'Call ended',
  กำลังสนทนา: 'In conversation',
  เชื่อมต่อสายไม่สำเร็จ: 'Could not connect the call',
  'ตรวจสอบสัญญาณอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง': 'Check your internet connection and try again',
  'ไม่ได้รับอนุญาตให้ใช้กล้อง/ไมโครโฟน': 'Camera/microphone access was not granted',
  ไม่พบกล้องหรือไมโครโฟนบนอุปกรณ์นี้: 'No camera or microphone found on this device',
  ย่อหน้าจอสาย: 'Minimize call',
  กลับไปที่หน้าจอสาย: 'Back to the call',
  สลับมุมมอง: 'Swap views',
  ภาพจากกล้องของคุณ: 'Your camera',
  'สลับกล้องหน้า/หลัง': 'Switch front/back camera',
  กล้อง: 'Camera',
  ไมโครโฟน: 'Microphone',
  วางสาย: 'Hang up',
  แตะเพื่อเปิดเสียง: 'Tap to turn on sound',
  ปิดกล้องอยู่: 'Camera off',
  ปิดไมโครโฟนอยู่: 'Muted',
})

type Translate = ReturnType<typeof useT>

function roleName(role: CallRole, c: EmergencyCase, t: Translate): string {
  if (role === 'dispatch') return t('ศูนย์สั่งการ 1669')
  if (role === 'rescue') return c.assignedRescueTeam?.name ?? t('หน่วยกู้ชีพ')
  return c.reporterName ?? t('ผู้แจ้งเหตุ')
}

function TrackVideo({ track, mirrored = false, contain = false }: { track: Track; mirrored?: boolean; contain?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    track.attach(el)
    return () => {
      track.detach(el)
    }
  }, [track])
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      // A phone's portrait video fills a phone screen; on a wide screen it's
      // shown whole rather than cropped to a strip of someone's face.
      className={clsx('h-full w-full object-cover', contain && 'sm:object-contain', mirrored && '-scale-x-100')}
    />
  )
}

function TrackAudio({ track }: { track: Track }) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    track.attach(el)
    return () => {
      track.detach(el)
    }
  }, [track])
  return <audio ref={ref} autoPlay />
}

const GLOW = 'bg-[radial-gradient(circle_at_50%_38%,rgb(var(--color-primary)/0.35),transparent_68%)]'

function ParticipantView({
  participant,
  name,
  contain = false,
  labelled = false,
  compact = false,
}: {
  participant: CallParticipant
  name: string
  contain?: boolean
  /** Name tag on the tile -- for a group call, where the header can't say whose tile is whose. */
  labelled?: boolean
  compact?: boolean
}) {
  const t = useT()
  return (
    <div className="relative h-full w-full overflow-hidden bg-navy">
      {participant.videoTrack ? (
        <TrackVideo track={participant.videoTrack} contain={contain} />
      ) : (
        <div className={clsx('absolute inset-0 flex flex-col items-center justify-center gap-3', GLOW)}>
          <CallAvatar role={callRoleOf(participant.role)} size={compact ? 'sm' : labelled ? 'md' : 'lg'} speaking={participant.isSpeaking} />
          {!compact && !labelled && <p className="text-sm font-medium text-white/75">{t('ปิดกล้องอยู่')}</p>}
        </div>
      )}
      {labelled && (
        <span className="absolute bottom-2 left-2 inline-flex max-w-[85%] items-center gap-1 rounded-full bg-navy/60 px-2.5 py-1 text-xs font-semibold backdrop-blur">
          {!participant.micOn && <MicOff className="size-3 shrink-0" aria-label={t('ปิดไมโครโฟนอยู่')} />}
          <span className="truncate">{name}</span>
        </span>
      )}
    </div>
  )
}

function SelfView({ call, compact = false }: { call: LiveKitCall; compact?: boolean }) {
  return call.localVideoTrack ? (
    <TrackVideo track={call.localVideoTrack} mirrored={call.facingMode === 'user'} />
  ) : (
    <div className={clsx('flex h-full w-full items-center justify-center text-white/70', GLOW)}>
      <VideoOff className={compact ? 'size-5' : 'size-10'} aria-hidden="true" />
    </div>
  )
}

type Corner = 'tl' | 'tr' | 'bl' | 'br'

/**
 * Drag a floating tile anywhere; let go and it settles into the nearest
 * corner. A tap (no real movement) is left to the element's own click, so
 * the tile still works as a button from the keyboard.
 */
function useCornerDrag(initial: Corner) {
  const [corner, setCorner] = useState<Corner>(initial)
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null)
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  // The click a browser fires at the end of a drag isn't a tap.
  const swallowClick = useRef(false)

  const bind = {
    onPointerDown(e: ReactPointerEvent<HTMLElement>) {
      e.currentTarget.setPointerCapture(e.pointerId)
      gesture.current = { x: e.clientX, y: e.clientY, moved: false }
      swallowClick.current = false
    },
    onPointerMove(e: ReactPointerEvent<HTMLElement>) {
      const g = gesture.current
      if (!g) return
      const x = e.clientX - g.x
      const y = e.clientY - g.y
      if (!g.moved && Math.hypot(x, y) < 8) return
      g.moved = true
      setOffset({ x, y })
    },
    onPointerUp(e: ReactPointerEvent<HTMLElement>) {
      const g = gesture.current
      gesture.current = null
      if (!g?.moved) return
      const r = e.currentTarget.getBoundingClientRect()
      const top = r.top + r.height / 2 < window.innerHeight / 2
      const left = r.left + r.width / 2 < window.innerWidth / 2
      setCorner(`${top ? 't' : 'b'}${left ? 'l' : 'r'}`)
      setOffset(null)
      swallowClick.current = true
    },
    onPointerCancel() {
      gesture.current = null
      setOffset(null)
    },
  }
  const tapped = () => {
    const wasDrag = swallowClick.current
    swallowClick.current = false
    return !wasDrag
  }
  return { corner, offset, bind, tapped }
}

function FloatingTile({
  drag,
  corners,
  label,
  onTap,
  className,
  children,
}: {
  drag: ReturnType<typeof useCornerDrag>
  corners: Record<Corner, string>
  label: string
  onTap?: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...drag.bind}
      onClick={(e) => {
        e.stopPropagation()
        if (drag.tapped()) onTap?.()
      }}
      style={drag.offset ? { transform: `translate(${drag.offset.x}px, ${drag.offset.y}px)` } : undefined}
      className={clsx(
        'fixed touch-none overflow-hidden rounded-2xl bg-navy text-white shadow-card-lg ring-1 ring-white/25',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60',
        drag.offset ? 'cursor-grabbing' : 'cursor-grab',
        corners[drag.corner],
        className,
      )}
    >
      {children}
    </button>
  )
}

const PIP_CORNERS: Record<Corner, string> = {
  tl: 'left-3 top-[calc(env(safe-area-inset-top)+5.5rem)]',
  tr: 'right-3 top-[calc(env(safe-area-inset-top)+5.5rem)]',
  bl: 'left-3 bottom-[calc(env(safe-area-inset-bottom)+8rem)]',
  br: 'right-3 bottom-[calc(env(safe-area-inset-bottom)+8rem)]',
}
// Clear of the app's header and any bottom bar on the page underneath.
const MINI_CORNERS: Record<Corner, string> = {
  tl: 'left-3 top-20',
  tr: 'right-3 top-20',
  bl: 'left-3 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)]',
  br: 'right-3 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)]',
}

function DockButton({
  label,
  pressed,
  end = false,
  disabled,
  onClick,
  children,
}: {
  label: string
  /** For on/off toggles: pressed = on. Off shows solid white, like a lit switch. */
  pressed?: boolean
  end?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'flex size-14 items-center justify-center rounded-full transition-colors duration-150 [&>svg]:size-6',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50 disabled:pointer-events-none disabled:opacity-40',
        end
          ? 'bg-emergency text-white hover:bg-emergency-dark'
          : pressed === false
            ? 'bg-white text-navy hover:bg-white/90'
            : 'bg-white/15 text-white hover:bg-white/25',
      )}
    >
      {children}
    </button>
  )
}

function RoundIconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50 disabled:opacity-40 [&>svg]:size-5"
    >
      {children}
    </button>
  )
}

const ENDED_MS = 1500
const CONTROLS_HIDE_MS = 4000

export interface CallScreenProps {
  call: LiveKitCall
  emergencyCase: EmergencyCase
  /** A call is on. The screen shows while it is, then "call ended" briefly. */
  open: boolean
  /** Your outgoing call hasn't been answered yet. */
  ringing?: boolean
  /** Who's on the other end -- names the call until they're actually in it. */
  peer: CallRole
  durationSec?: number
  /** Hang up / cancel. Left out, there's no end button -- a citizen doesn't
   * hang up on staff mid-call; staff end it. */
  onEnd?: () => void
  endLabel?: string
  /** A line above the controls, e.g. the ring timeout or who ends the call. */
  note?: string
  /** Top-right action, e.g. dispatch pulling the rescue team into the call. */
  action?: { label: string; onClick: () => void }
  /** A status pill under the header, e.g. an invite that's ringing. */
  banner?: { text: string; actionLabel?: string; onAction?: () => void }
}

/**
 * A video call, full screen the way phone call apps do it: whoever you're
 * talking to fills the screen, your own camera floats in a corner (drag it
 * anywhere; tap it to swap views), and the controls sit in a row of round
 * buttons along the bottom that fade out while you watch and come back on a
 * tap. While it rings, your own camera fills the screen behind who you're
 * calling. Minimizing shrinks the call to a floating tile so the page
 * underneath (the case, the map) stays usable; tap it to come back.
 */
export function CallScreen({
  call,
  emergencyCase: c,
  open,
  ringing = false,
  peer,
  durationSec,
  onEnd,
  endLabel,
  note,
  action,
  banner,
}: CallScreenProps) {
  const t = useT()
  const [minimized, setMinimized] = useState(false)
  const [swapped, setSwapped] = useState(false)
  const [endedAt, setEndedAt] = useState<number | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    setEndedAt(open ? null : Date.now())
    if (open) {
      setMinimized(false)
      setSwapped(false)
    }
  }
  useEffect(() => {
    if (endedAt === null) return
    const timer = setTimeout(() => setEndedAt(null), ENDED_MS)
    return () => clearTimeout(timer)
  }, [endedAt])

  const ended = !open
  const visible = open || endedAt !== null
  const expanded = visible && !minimized

  const remotes = call.remotes
  const failed = open && (call.connectionState === 'failed' || call.connectionState === 'disconnected')
  const hero = ended || failed || remotes.length === 0
  const group = remotes.length > 1
  const isSwapped = swapped && remotes.length === 1
  const mainHasVideo = group ? remotes.some((p) => p.videoTrack) : isSwapped ? !!call.localVideoTrack : !!remotes[0]?.videoTrack

  // Controls fade out once there's video to watch, and come back on a tap
  // (or any mouse movement / keyboard focus).
  const autoHide = expanded && !hero && !ringing && mainHasVideo
  const [controlsShown, setControlsShown] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const showControls = useCallback(() => {
    setControlsShown(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setControlsShown(false), CONTROLS_HIDE_MS)
  }, [])
  useEffect(() => {
    if (!autoHide) return
    hideTimer.current = setTimeout(() => setControlsShown(false), CONTROLS_HIDE_MS)
    return () => clearTimeout(hideTimer.current)
  }, [autoHide])
  const controlsVisible = !autoHide || controlsShown

  // Flipping only makes sense with a second camera (phones, not laptops).
  const [canFlip, setCanFlip] = useState(false)
  const hasLocalVideo = !!call.localVideoTrack
  useEffect(() => {
    if (!hasLocalVideo || !navigator.mediaDevices?.enumerateDevices) return
    let cancelled = false
    navigator.mediaDevices.enumerateDevices().then(
      (devices) => {
        if (!cancelled) setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1)
      },
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [hasLocalVideo])

  // A phone must not dim and lock mid-call.
  useEffect(() => {
    if (!open || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = () => {
      if (document.visibilityState !== 'visible') return
      navigator.wakeLock.request('screen').then(
        (l) => {
          if (cancelled) void l.release()
          else lock = l
        },
        () => {},
      )
    }
    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release()
    }
  }, [open])

  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!expanded) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.body.style.overflow = previous
    }
  }, [expanded])

  const pipDrag = useCornerDrag('tr')
  const miniDrag = useCornerDrag('br')

  if (!visible) return null

  const names = [...new Set(remotes.map((p) => roleName(callRoleOf(p.role), c, t)))]
  const title = names.length > 0 ? names.join(' · ') : roleName(peer, c, t)
  const status = ended
    ? t('สิ้นสุดการโทร')
    : failed
      ? t('เชื่อมต่อสายไม่สำเร็จ')
      : ringing
        ? t('กำลังโทร...')
        : remotes.length === 0
          ? t('กำลังเชื่อมต่อ...')
          : durationSec !== undefined
            ? formatDuration(durationSec)
            : t('กำลังสนทนา')
  const cameraError =
    call.cameraState === 'denied'
      ? t('ไม่ได้รับอนุญาตให้ใช้กล้อง/ไมโครโฟน')
      : call.cameraState === 'unavailable'
        ? t('ไม่พบกล้องหรือไมโครโฟนบนอุปกรณ์นี้')
        : null

  // Your own account on another tab/device is your own voice -- playing it
  // would feed the speaker back into the microphone (echo loop).
  const audio = remotes.map((p) => p.audioTrack && !p.sameUser && <TrackAudio key={p.identity} track={p.audioTrack} />)

  if (minimized) {
    const first = remotes[0]
    return createPortal(
      <>
        <FloatingTile
          drag={miniDrag}
          corners={MINI_CORNERS}
          label={t('กลับไปที่หน้าจอสาย')}
          onTap={() => setMinimized(false)}
          className="z-[95] aspect-[3/4] w-32 animate-scale-in sm:aspect-video sm:w-56"
        >
          {first ? (
            <ParticipantView participant={first} name={title} compact />
          ) : (
            <div className={clsx('flex h-full w-full items-center justify-center', GLOW)}>
              <CallAvatar role={peer} size="sm" ringing={ringing} />
            </div>
          )}
          <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-navy/90 to-transparent px-2 pb-1.5 pt-5 text-left text-[11px] font-semibold tabular-nums">
            {status}
          </span>
        </FloatingTile>
        {audio}
      </>,
      document.body,
    )
  }

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      className="fixed inset-0 z-[95] flex select-none flex-col overflow-hidden bg-navy text-white outline-none animate-fade-in"
      onClick={() => {
        if (!autoHide) return
        if (controlsShown) {
          clearTimeout(hideTimer.current)
          setControlsShown(false)
        } else showControls()
      }}
      onPointerMove={(e) => {
        if (autoHide && e.pointerType === 'mouse') showControls()
      }}
      onFocusCapture={autoHide ? showControls : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !ended) setMinimized(true)
      }}
    >
      {/* Stage */}
      <div className="absolute inset-0">
        {hero ? (
          <>
            {open && call.localVideoTrack ? (
              <div className="absolute inset-0">
                <TrackVideo track={call.localVideoTrack} mirrored={call.facingMode === 'user'} />
                <div className="absolute inset-0 bg-navy/55" />
              </div>
            ) : (
              <div className={clsx('absolute inset-0', GLOW)} />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 pb-28 text-center">
              {failed ? (
                <span className="flex size-28 items-center justify-center rounded-full bg-warning/15 text-warning sm:size-32">
                  <AlertTriangle className="size-12" aria-hidden="true" />
                </span>
              ) : (
                <CallAvatar role={peer} size="lg" ringing={ringing && !ended} />
              )}
              <div>
                <p className="text-2xl font-bold sm:text-3xl">{title}</p>
                <p className={clsx('mt-1.5 text-sm font-medium', failed ? 'text-warning' : 'text-white/75')} aria-live="polite">
                  {status}
                </p>
                {failed && (
                  <p className="mx-auto mt-1 max-w-[260px] text-xs text-white/60">
                    {t('ตรวจสอบสัญญาณอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง')}
                  </p>
                )}
              </div>
            </div>
          </>
        ) : group ? (
          <div className={clsx('grid h-full gap-1 p-1', remotes.length === 2 ? 'grid-rows-2 sm:grid-cols-2 sm:grid-rows-1' : 'grid-cols-2')}>
            {remotes.map((p) => (
              <div key={p.identity} className="overflow-hidden rounded-2xl">
                <ParticipantView participant={p} name={roleName(callRoleOf(p.role), c, t)} labelled />
              </div>
            ))}
          </div>
        ) : isSwapped ? (
          <SelfView call={call} />
        ) : (
          <ParticipantView participant={remotes[0]} name={title} contain />
        )}
      </div>

      {/* Header */}
      <div
        onClick={stop}
        className={clsx(
          'relative flex items-start gap-3 bg-gradient-to-b from-navy/80 via-navy/40 to-transparent px-3 pb-10 pt-[calc(env(safe-area-inset-top)+0.75rem)] transition-opacity duration-300',
          controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <RoundIconButton label={t('ย่อหน้าจอสาย')} onClick={() => setMinimized(true)} disabled={ended}>
          <ChevronDown />
        </RoundIconButton>
        <div className="min-w-0 flex-1 pt-0.5 text-center">
          {!hero && (
            <>
              <p className="flex items-center justify-center gap-1.5 font-bold">
                <span className="truncate">{title}</span>
                {!group && !isSwapped && !remotes[0].micOn && (
                  <MicOff className="size-4 shrink-0 text-white/80" aria-label={t('ปิดไมโครโฟนอยู่')} />
                )}
              </p>
              <p className="text-xs font-medium tabular-nums text-white/75" aria-live="polite">
                {status}
              </p>
            </>
          )}
        </div>
        {action ? (
          <RoundIconButton label={action.label} onClick={action.onClick} disabled={ended}>
            <UserPlus />
          </RoundIconButton>
        ) : (
          <span className="size-11 shrink-0" aria-hidden="true" />
        )}
      </div>

      {(banner || cameraError) && (
        <div onClick={stop} className="relative mx-auto -mt-6 flex max-w-sm flex-col items-center gap-2 px-4">
          {banner && (
            <div className="flex max-w-full items-center gap-3 rounded-full bg-navy/60 py-1.5 pl-4 pr-1.5 text-sm backdrop-blur-md">
              <span className="truncate">{banner.text}</span>
              {banner.actionLabel && banner.onAction && (
                <button
                  type="button"
                  onClick={banner.onAction}
                  className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  {banner.actionLabel}
                </button>
              )}
            </div>
          )}
          {cameraError && <p className="rounded-full bg-navy/60 px-3 py-1 text-xs font-medium text-warning backdrop-blur-md">{cameraError}</p>}
        </div>
      )}

      {!hero && (
        <FloatingTile
          drag={pipDrag}
          corners={PIP_CORNERS}
          label={remotes.length === 1 ? t('สลับมุมมอง') : t('ภาพจากกล้องของคุณ')}
          onTap={remotes.length === 1 ? () => setSwapped((s) => !s) : undefined}
          className="z-10 aspect-[3/4] w-28 sm:aspect-video sm:w-48"
        >
          {isSwapped ? <ParticipantView participant={remotes[0]} name={title} compact /> : <SelfView call={call} compact />}
        </FloatingTile>
      )}

      {/* Controls */}
      <div
        onClick={stop}
        className={clsx(
          'relative mt-auto flex flex-col items-center gap-3 bg-gradient-to-t from-navy/85 via-navy/40 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-12 transition-opacity duration-300',
          controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        {call.audioBlocked && open && (
          <button
            type="button"
            onClick={call.startAudio}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy shadow-card-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
          >
            <Volume2 className="size-4" aria-hidden="true" />
            {t('แตะเพื่อเปิดเสียง')}
          </button>
        )}
        {note && !ended && <p className="max-w-xs text-center text-xs leading-relaxed text-white/70">{note}</p>}
        <div className="flex items-center gap-3 rounded-full bg-navy/40 p-2 backdrop-blur-md sm:gap-4">
          {canFlip && call.cameraOn && (
            <DockButton label={t('สลับกล้องหน้า/หลัง')} onClick={call.switchCamera} disabled={ended}>
              <SwitchCamera />
            </DockButton>
          )}
          <DockButton label={t('กล้อง')} pressed={call.cameraOn} onClick={call.toggleCamera} disabled={ended}>
            {call.cameraOn ? <Video /> : <VideoOff />}
          </DockButton>
          <DockButton label={t('ไมโครโฟน')} pressed={call.micOn} onClick={call.toggleMic} disabled={ended}>
            {call.micOn ? <Mic /> : <MicOff />}
          </DockButton>
          {onEnd && (
            <DockButton label={endLabel ?? t('วางสาย')} end onClick={onEnd} disabled={ended}>
              <PhoneOff />
            </DockButton>
          )}
        </div>
      </div>

      {audio}
    </div>,
    document.body,
  )
}
