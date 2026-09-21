import { useNavigate } from 'react-router-dom'
import { MapPin, Users, Clock, ChevronRight, Ambulance, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import type { EmergencyCase } from '@/lib/types'
import { statusMeta } from '@/lib/types'
import { SeverityBadge } from './SeverityBadge'
import { StatusBadge } from './StatusBadge'
import { formatDateTime } from '@/lib/utils'
import { checkCaseConsistency } from '@/lib/caseHealth'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  รอหน่วยกู้ชีพตอบรับ: 'Awaiting rescue team response',
  หน่วยกู้ชีพตอบรับแล้ว: 'Rescue team responded',
  หน่วยกู้ชีพปฏิเสธเคส: 'Rescue team declined the case',
  รอรายละเอียดเหตุการณ์: 'Awaiting incident details',
  ยังไม่ระบุตำแหน่ง: 'No location set yet',
  'ผู้ป่วย {n} คน': '{n} patient(s)',
  ดูรายละเอียดเคส: 'View case details',
  // Consistency-check messages from lib/caseHealth.ts -- registered here
  // since this card is the one place they're actually shown to a user.
  'มีการประเมินความรุนแรงแล้ว แต่สถานะเคสยังไม่ถึง "รับแจ้งเหตุแล้ว"':
    'Severity has been assessed, but the case status hasn’t reached "Received" yet',
  'มอบหมายหน่วยกู้ชีพแล้ว แต่สถานะเคสยังไม่ถึง "มอบหมายหน่วยกู้ชีพแล้ว"':
    'A rescue team is assigned, but the case status hasn’t reached "Rescue team assigned" yet',
  'บันทึกข้อมูลผู้ป่วยแล้ว แต่สถานะเคสยังไม่ถึง "ถึงจุดเกิดเหตุแล้ว"':
    'Patient info is recorded, but the case status hasn’t reached "Arrived at scene" yet',
  'เคสถูกรับแจ้งแล้ว แต่ยังไม่มีรายละเอียดเหตุการณ์': 'The case has been received, but has no incident details yet',
  ข้อมูลเคสไม่สอดคล้องกัน: 'Case data is inconsistent',
})

type RescueResponseColor = 'yellow' | 'green' | 'red'

const RESCUE_RESPONSE_STYLE: Record<RescueResponseColor, { classes: string; label: string }> = {
  yellow: { classes: 'bg-warning text-white border-warning/40', label: 'รอหน่วยกู้ชีพตอบรับ' },
  green: { classes: 'bg-success text-white border-success/40', label: 'หน่วยกู้ชีพตอบรับแล้ว' },
  red: { classes: 'bg-emergency text-white border-emergency/40', label: 'หน่วยกู้ชีพปฏิเสธเคส' },
}

type CardTone = 'completed' | 'new' | 'warning' | 'default'

const CARD_TONE_STYLE: Record<CardTone, { card: string; caseNumber: string }> = {
  completed: { card: 'border-success/30 bg-success/[0.04]', caseNumber: 'text-success' },
  new: { card: 'border-emergency/40 bg-emergency/[0.035] ring-1 ring-emergency/15', caseNumber: 'text-emergency-dark' },
  warning: { card: 'border-warning/50 bg-warning/[0.04] ring-1 ring-warning/20', caseNumber: 'text-warning' },
  default: { card: 'border-border bg-surface', caseNumber: 'text-primary' },
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
  // A case whose status hasn't caught up to data it already has (see
  // lib/caseHealth.ts) -- e.g. the exact bug fixed in
  // submitDispatcherAssessment, where an assessment saved but status never
  // advanced, silently hiding whatever action should come next. Flagged
  // distinctly (amber, not the "isNew" emergency-red) since this isn't a
  // fresh case needing triage, it's an existing case stuck in a state a
  // dispatcher needs to notice and go fix.
  const issues = checkCaseConsistency(c)
  const hasIssues = issues.length > 0
  const tone: CardTone = isCompleted ? 'completed' : isNew ? 'new' : hasIssues ? 'warning' : 'default'
  const t = useT()

  return (
    <div className={clsx('relative rounded-2xl border p-5 shadow-card transition-shadow hover:shadow-card-lg', CARD_TONE_STYLE[tone].card)}>
      {hasIssues && (
        <span
          role="alert"
          title={issues.map((i) => t(i.message)).join(' · ')}
          aria-label={t('ข้อมูลเคสไม่สอดคล้องกัน')}
          className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-warning text-white shadow-card"
        >
          <AlertTriangle className="size-3.5" />
        </span>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={clsx('font-mono text-sm font-bold', CARD_TONE_STYLE[tone].caseNumber)}>{c.caseNumber}</p>
          <p className="mt-1 font-semibold text-ink">{c.incidentDetails?.incidentType ?? t('รอรายละเอียดเหตุการณ์')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {c.assessment && <SeverityBadge severity={c.assessment.severity} />}
          {rescueColor && (
            <span
              title={t(RESCUE_RESPONSE_STYLE[rescueColor].label)}
              aria-label={t(RESCUE_RESPONSE_STYLE[rescueColor].label)}
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
          <span className="truncate">{c.location?.address ?? t('ยังไม่ระบุตำแหน่ง')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="size-4 shrink-0 text-primary" />
          <span>{t('ผู้ป่วย {n} คน', { n: c.incidentDetails?.patientCount ?? '-' })}</span>
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
          {t('ดูรายละเอียดเคส')}
          <ChevronRight className="size-4" />
        </button>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}
