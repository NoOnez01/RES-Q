import clsx from 'clsx'
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, ShieldCheck, Stethoscope, Users, XCircle } from 'lucide-react'
import { Card } from './ui/Card'
import { SeverityBadge } from './SeverityBadge'
import {
  CAPABILITY_LABEL,
  compareWithRecommended,
  type PatientNeeds,
  type RankedHospital,
  type RiskLevel,
  type RiskReason,
} from '@/lib/hospitalRisk'
import type { HospitalDecision } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ความเสี่ยงต่ำ: 'Low risk',
  ความเสี่ยงปานกลาง: 'Moderate risk',
  ความเสี่ยงสูง: 'High risk',
  // Reasons (lib/hospitalRisk.ts)
  ห้องฉุกเฉินพร้อมรับผู้ป่วย: 'ER ready for patients',
  'ห้องฉุกเฉินเต็ม อาจต้องรอหรือถูกส่งต่อ': 'ER full: may have to wait or be sent on',
  'ถึงภายในประมาณ {eta} นาที ทันเวลาสำหรับระดับความรุนแรงนี้': 'About {eta} min away, in time for this severity',
  'ใช้เวลาเดินทางประมาณ {eta} นาที เกินเวลาที่ควรถึง ({target} นาที)': 'About {eta} min away, longer than it should take ({target} min)',
  'ภาวะนี้ควรถึงห้องฉุกเฉินที่ใกล้ที่สุดก่อน ช้ากว่าทางเลือกที่เร็วที่สุด {extra} นาที':
    'This condition needs the nearest ER first: {extra} min slower than the quickest option',
  'มีศักยภาพด้าน{cap}': '{cap}: listed',
  'ไม่ได้ระบุศักยภาพด้าน{cap} ผู้ป่วยอาจต้องถูกส่งต่ออีกครั้ง': '{cap}: not listed, the patient may need another transfer',
  'ไม่ได้ระบุศักยภาพด้าน{cap}': '{cap}: not listed',
  ไม่มีเตียงว่างรับผู้ป่วยใน: 'No free inpatient beds',
  'ใช้เวลาเดินทางนานกว่าประมาณ {extra} นาที': 'About {extra} min longer to get there',
  '{recommended} ระบุศักยภาพด้าน{cap} แต่โรงพยาบาลที่เลือกไม่ได้ระบุ': "{cap}: listed by {recommended}, not by the chosen hospital",
  ห้องฉุกเฉินของโรงพยาบาลที่เลือกเต็ม: "The chosen hospital's ER is full",
  // Capabilities
  อุบัติเหตุและการบาดเจ็บ: 'Trauma',
  ศัลยกรรม: 'Surgery',
  สมองและระบบประสาท: 'Neurology',
  หัวใจ: 'Cardiac',
  กระดูกและข้อ: 'Orthopaedics',
  'กุมารเวช (เด็ก)': 'Paediatrics',
  'สูติ-นรีเวช': 'Obstetrics & gynaecology',
  แผลไฟไหม้: 'Burns',
  พิษวิทยา: 'Toxicology',
  จิตเวช: 'Psychiatry',
  // Needs card
  ประเมินความเสี่ยงของโรงพยาบาล: 'Hospital risk assessment',
  การดูแลที่ผู้ป่วยต้องการ: 'Care this patient needs',
  ห้องฉุกเฉินทั่วไป: 'Any emergency room',
  'ควรถึงโรงพยาบาลภายใน {n} นาที': 'Should reach hospital within {n} min',
  ภาวะนี้ควรนำส่งห้องฉุกเฉินที่ใกล้ที่สุดก่อน: 'Take this patient to the nearest ER first',
  'ยังไม่มีข้อมูล CBD หรือระดับความรุนแรง ประเมินจากเวลาเดินทางและความพร้อมของห้องฉุกเฉินเท่านั้น':
    'No CBD or severity yet: assessed on travel time and ER readiness only',
  'ประเมินจาก CBD ระดับความรุนแรง เวลาเดินทาง ความพร้อมของห้องฉุกเฉิน และศักยภาพที่โรงพยาบาลระบุไว้ ใช้ประกอบการตัดสินใจ ไม่แทนดุลยพินิจของเจ้าหน้าที่':
    "Based on the CBD, severity, travel time, ER readiness and the specialties each hospital lists. A guide for the decision, not a replacement for the crew's judgement",
  // Family briefing
  ข้อมูลสำหรับแจ้งญาติ: 'What to tell the family',
  'เทียบกับ {name} (โรงพยาบาลที่แนะนำ)': 'Compared with {name} (recommended)',
  โรงพยาบาลนี้เป็นทางเลือกที่แนะนำ: 'This is the recommended hospital',
  // Decision card
  โรงพยาบาลที่เลือก: 'Selected hospital',
  'ความเสี่ยงที่ประเมินตอนเลือก · เดินทางประมาณ {eta} นาที': 'Risk assessed when chosen · about {eta} min away',
  'ญาติเลือกเอง แทน {name} ที่แนะนำ (ลงนามรับทราบแล้ว)': 'Chosen by the family over {name}, the recommended hospital (signed)',
  'เลือกแทน {name} ที่แนะนำ': 'Chosen over {name}, the recommended hospital',
})

const LEVEL: Record<RiskLevel, { label: string; className: string; Icon: typeof ShieldCheck }> = {
  low: { label: 'ความเสี่ยงต่ำ', className: 'border-success/30 bg-success/10 text-success', Icon: ShieldCheck },
  moderate: { label: 'ความเสี่ยงปานกลาง', className: 'border-warning/30 bg-warning/10 text-warning', Icon: AlertTriangle },
  high: { label: 'ความเสี่ยงสูง', className: 'border-emergency/30 bg-emergency/10 text-emergency', Icon: ShieldAlert },
}

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const t = useT()
  const { label, className: tone, Icon } = LEVEL[level]
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold', tone, className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {t(label)}
    </span>
  )
}

const TONE: Record<RiskReason['tone'], { Icon: typeof CheckCircle2; className: string }> = {
  good: { Icon: CheckCircle2, className: 'text-success' },
  warn: { Icon: AlertTriangle, className: 'text-warning' },
  bad: { Icon: XCircle, className: 'text-emergency' },
}

/** A reason in the reader's language -- including the capability and any
 * other word it names. */
export function useRiskText() {
  const t = useT()
  return (r: RiskReason) => {
    const vars = r.vars && Object.fromEntries(Object.entries(r.vars).map(([k, v]) => [k, typeof v === 'string' ? t(v) : v]))
    return t(r.key, vars)
  }
}

export function RiskReasons({ reasons, limit, className }: { reasons: RiskReason[]; limit?: number; className?: string }) {
  const text = useRiskText()
  return (
    <ul className={clsx('flex flex-col gap-1.5', className)}>
      {reasons.slice(0, limit).map((r) => {
        const { Icon, className: tone } = TONE[r.tone]
        return (
          <li key={`${r.key}:${JSON.stringify(r.vars ?? {})}`} className="flex items-start gap-2 text-sm text-ink">
            <Icon className={clsx('mt-0.5 size-4 shrink-0', tone)} aria-hidden="true" />
            <span>{text(r)}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** What this patient needs from a hospital, from the CBD and triage level. */
export function PatientNeedsCard({
  caseNumber,
  incidentType,
  needs,
}: {
  caseNumber: string
  incidentType?: string
  needs: PatientNeeds
}) {
  const t = useT()
  const known = needs.cbd !== undefined || needs.severity !== undefined
  return (
    <Card className="flex flex-col gap-4 animate-fade-in-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-bold text-primary">{caseNumber}</p>
          <p className="mt-1 font-semibold text-ink">{incidentType ?? t('รอรายละเอียดเหตุการณ์')}</p>
        </div>
        {needs.severity && <SeverityBadge severity={needs.severity} />}
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-skyblue-pale/60 p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <Stethoscope className="size-3.5" aria-hidden="true" /> {t('การดูแลที่ผู้ป่วยต้องการ')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {needs.primary.length === 0 && needs.secondary.length === 0 ? (
            <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink">{t('ห้องฉุกเฉินทั่วไป')}</span>
          ) : (
            <>
              {needs.primary.map((cap) => (
                <span key={cap} className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                  {t(CAPABILITY_LABEL[cap])}
                </span>
              ))}
              {needs.secondary.map((cap) => (
                <span key={cap} className="rounded-full border border-primary/30 bg-surface px-2.5 py-1 text-xs font-semibold text-primary">
                  {t(CAPABILITY_LABEL[cap])}
                </span>
              ))}
            </>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-ink">
          <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {t('ควรถึงโรงพยาบาลภายใน {n} นาที', { n: needs.targetMin })}
        </p>
        {needs.nearestFirst && (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emergency">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            {t('ภาวะนี้ควรนำส่งห้องฉุกเฉินที่ใกล้ที่สุดก่อน')}
          </p>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted">
        {known
          ? t('ประเมินจาก CBD ระดับความรุนแรง เวลาเดินทาง ความพร้อมของห้องฉุกเฉิน และศักยภาพที่โรงพยาบาลระบุไว้ ใช้ประกอบการตัดสินใจ ไม่แทนดุลยพินิจของเจ้าหน้าที่')
          : t('ยังไม่มีข้อมูล CBD หรือระดับความรุนแรง ประเมินจากเวลาเดินทางและความพร้อมของห้องฉุกเฉินเท่านั้น')}
      </p>
    </Card>
  )
}

/**
 * The chosen hospital's risk in words the crew can read out to the family,
 * and -- when it isn't the recommended one -- what that choice trades away.
 */
export function FamilyBriefing({
  chosen,
  recommended,
  needs,
  children,
}: {
  chosen: RankedHospital
  recommended: RankedHospital
  needs: PatientNeeds
  /** The family's acknowledgement (checkbox), under the comparison. */
  children?: React.ReactNode
}) {
  const t = useT()
  const isRecommended = chosen.hospital.id === recommended.hospital.id
  const comparison = isRecommended ? [] : compareWithRecommended(chosen, recommended, needs)
  return (
    <Card className="flex flex-col gap-4 border-primary/30 animate-scale-in" role="status">
      <h3 className="flex items-center gap-2 font-bold text-ink">
        <Users className="size-4 text-primary" aria-hidden="true" /> {t('ข้อมูลสำหรับแจ้งญาติ')}
      </h3>
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-ink">{chosen.hospital.name}</p>
          <RiskBadge level={chosen.risk.level} />
        </div>
        <RiskReasons reasons={chosen.risk.reasons} />
      </div>
      {isRecommended ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" /> {t('โรงพยาบาลนี้เป็นทางเลือกที่แนะนำ')}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-bg p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{t('เทียบกับ {name} (โรงพยาบาลที่แนะนำ)', { name: recommended.hospital.name })}</p>
            <RiskBadge level={recommended.risk.level} />
          </div>
          {comparison.length > 0 && <RiskReasons reasons={comparison} />}
        </div>
      )}
      {children}
    </Card>
  )
}

/** The hospital decision on a case page, with the risk it was made on. */
export function HospitalDecisionCard({ decision, hospitalName, address }: { decision?: HospitalDecision | null; hospitalName: string; address?: string }) {
  const t = useT()
  const risk = decision?.risk
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-ink">{t('โรงพยาบาลที่เลือก')}</h3>
          <p className="mt-1 text-sm text-ink">{hospitalName}</p>
          {address && <p className="text-xs text-muted">{address}</p>}
        </div>
        {risk && <RiskBadge level={risk.level} />}
      </div>
      {risk && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('ความเสี่ยงที่ประเมินตอนเลือก · เดินทางประมาณ {eta} นาที', { eta: risk.etaMin })}
          </p>
          <RiskReasons reasons={risk.reasons} />
          {risk.recommended && (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg p-3">
              <p className="text-sm font-semibold text-ink">
                {decision?.type === 'declined-nearest-chose-own'
                  ? t('ญาติเลือกเอง แทน {name} ที่แนะนำ (ลงนามรับทราบแล้ว)', { name: risk.recommended.name })
                  : t('เลือกแทน {name} ที่แนะนำ', { name: risk.recommended.name })}
              </p>
              {risk.recommended.comparison.length > 0 && <RiskReasons reasons={risk.recommended.comparison} />}
            </div>
          )}
        </>
      )}
    </Card>
  )
}
