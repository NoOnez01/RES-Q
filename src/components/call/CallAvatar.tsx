import clsx from 'clsx'
import { Ambulance, Headset, UserRound } from 'lucide-react'

export type CallRole = 'dispatch' | 'rescue' | 'public'

/** A LiveKit participant's role attribute (see livekit-token) as a CallRole. */
export function callRoleOf(role: string | undefined): CallRole {
  return role === 'dispatch' || role === 'rescue' ? role : 'public'
}

const SIZES = {
  sm: { box: 'size-11', icon: 'size-5' },
  md: { box: 'size-20', icon: 'size-9' },
  lg: { box: 'size-28 sm:size-32', icon: 'size-12 sm:size-14' },
}

/**
 * Who's on the other end of a call. Profiles carry no photo, so it's the
 * role's icon: a headset for 1669, an ambulance for a rescue team, a person
 * for the reporter. Ripples while the call rings; ringed green while that
 * person is speaking.
 */
export function CallAvatar({
  role,
  size = 'md',
  ringing = false,
  speaking = false,
}: {
  role: CallRole
  size?: keyof typeof SIZES
  ringing?: boolean
  speaking?: boolean
}) {
  const Icon = role === 'dispatch' ? Headset : role === 'rescue' ? Ambulance : UserRound
  const s = SIZES[size]
  return (
    <span className={clsx('relative inline-flex shrink-0 items-center justify-center', s.box)}>
      {ringing && (
        <>
          <span className="bg-fx absolute inset-0 rounded-full bg-white/20 animate-ping-slow" aria-hidden="true" />
          <span
            className="bg-fx absolute inset-0 rounded-full bg-white/10 animate-ping-slow [animation-delay:0.7s]"
            aria-hidden="true"
          />
        </>
      )}
      <span
        className={clsx(
          'relative flex items-center justify-center rounded-full bg-gradient-to-br from-primary-bright to-primary text-white shadow-card-lg transition-shadow duration-200',
          s.box,
          speaking ? 'ring-4 ring-success/80' : 'ring-1 ring-white/20',
        )}
      >
        <Icon className={s.icon} aria-hidden="true" />
      </span>
    </span>
  )
}
