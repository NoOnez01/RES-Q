import { useNavigate } from 'react-router-dom'
import { MapPin, Users, Clock, ChevronRight, Siren, Ambulance } from 'lucide-react'
import clsx from 'clsx'
import type { EmergencyCase } from '@/lib/types'
import { statusMeta } from '@/lib/types'
import { SeverityBadge } from './SeverityBadge'
import { StatusBadge } from './StatusBadge'
import { formatDateTime } from '@/lib/utils'

type RescueResponseColor = 'yellow' | 'green' | 'red'

const RESCUE_RESPONSE_STYLE: Record<RescueResponseColor, { classes: string; label: string }> = {
  yellow: { classes: 'bg-warning text-white border-warning/40', label: 'รอหน่วยกู้ภัยตอบรับ' },
  green: { classes: 'bg-success text-white border-success/40', label: 'หน่วยกู้ภัยตอบรับแล้ว' },
  red: { classes: 'bg-emergency text-white border-emergency/40', label: 'หน่วยกู้ภัยปฏิเสธเคส' },
}

/** Sent to a team (yellow) -> accepted (green) or rejected, back to searching (red). */
function rescueResponseColor(c: EmergencyCase): RescueResponseColor | null {
  if (c.status === 'rescue-assigned') return 'yellow'
  if (c.status === 'finding-rescue' && c.rescueRejectedAt) return 'red'
  if (statusMeta(c.status).order >= statusMeta('rescue-en-route').order) return 'green'
  return null
}

export function EmergencyCaseCard({
  emergencyCase,
  to,
  actions,
}: {
  emergencyCase: EmergencyCase
  to: string
  actions?: React.ReactNode
}) {
  const navigate = useNavigate()
  const c = emergencyCase
  const isCompleted = c.status === 'completed'
  // Received but nobody has assessed it yet — the case a dispatcher must act on first.
  const isNew = c.status === 'received' && !c.assessment
  const rescueColor = rescueResponseColor(c)

  return (
    <div
      className={clsx(
        'rounded-2xl border p-5 shadow-card transition-shadow hover:shadow-card-lg',
        isCompleted && 'border-success/30 bg-success/[0.04]',
        isNew && 'border-emergency/40 bg-emergency/[0.035] ring-1 ring-emergency/15',
        !isCompleted && !isNew && 'border-border bg-white',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className={clsx(
              'font-mono text-sm font-bold',
              isCompleted ? 'text-success' : isNew ? 'text-emergency-dark' : 'text-primary',
            )}
          >
            {c.caseNumber}
          </p>
          <p className="mt-1 font-semibold text-navy">{c.incidentDetails?.incidentType ?? 'รอรายละเอียดเหตุการณ์'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isNew && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emergency/30 bg-emergency text-white px-3 py-1 text-xs font-bold whitespace-nowrap animate-pulse">
              <Siren className="size-3.5" />
              เคสใหม่
            </span>
          )}
          {c.assessment && <SeverityBadge severity={c.assessment.severity} />}
          {rescueColor && (
            <span
              title={RESCUE_RESPONSE_STYLE[rescueColor].label}
              aria-label={RESCUE_RESPONSE_STYLE[rescueColor].label}
              className={clsx(
                'inline-flex size-6 shrink-0 items-center justify-center rounded-full border',
                RESCUE_RESPONSE_STYLE[rescueColor].classes,
              )}
            >
              <Ambulance className="size-3.5" />
            </span>
          )}
          <StatusBadge status={c.status} />
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="size-4 shrink-0 text-primary" />
          <span className="truncate">{c.location?.address ?? 'ยังไม่ระบุตำแหน่ง'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="size-4 shrink-0 text-primary" />
          <span>ผู้ป่วย {c.incidentDetails?.patientCount ?? '-'} คน</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-4 shrink-0 text-primary" />
          <span>{formatDateTime(c.createdAt)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <button
          onClick={() => navigate(to)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-bright"
        >
          ดูรายละเอียดเคส
          <ChevronRight className="size-4" />
        </button>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}
