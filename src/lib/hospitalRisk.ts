import type { Hospital, Severity } from './types'

/**
 * Risk of taking this patient to each hospital, so the rescue crew can
 * weigh the options and explain them to the family.
 *
 * Two things decide it: the patient's triage level and how long it takes
 * to get to the hospital from the scene. Each triage level has a window --
 * how soon a patient at that level should be seen by a doctor, from the
 * Canadian Triage and Acuity Scale (CTAS), which Thailand's MOPH ED Triage
 * is built on: level 2 within 15 minutes, 3 within 30, 4 within 60, 5
 * within 120. Level 1 is "immediately"; the project uses 10 minutes for it.
 * The journey is time the patient isn't yet with a doctor, so:
 * - reaching the hospital within the window: low risk;
 * - up to twice the window: moderate;
 * - longer: high.
 *
 * Whether a hospital's emergency room is taking patients, and its free
 * beds, are shown alongside as information for the crew and the family --
 * they don't change the level. The recommended hospital is the quickest to
 * reach whose emergency room is open.
 *
 * It supports the crew's judgement; it doesn't replace it.
 */

/** Minutes within which a patient at each triage level should be seen
 * (CTAS; level 1 "immediately" -- 10 minutes here). */
export const WINDOW_MIN: Record<Severity, number> = { 1: 10, 2: 15, 3: 30, 4: 60, 5: 120 }

export interface PatientNeeds {
  severity?: Severity
  /** Minutes to reach care for this triage level -- level 3's when the
   * patient hasn't been triaged yet. */
  windowMin: number
}

export function patientNeeds(severity: Severity | undefined): PatientNeeds {
  return { severity, windowMin: WINDOW_MIN[severity ?? 3] }
}

export type RiskLevel = 'low' | 'moderate' | 'high'
export type ReasonTone = 'good' | 'warn' | 'bad'

/** A line of the explanation: a Thai i18n key, plus its variables. */
export interface RiskReason {
  tone: ReasonTone
  key: string
  vars?: Record<string, string | number>
}

export interface HospitalRisk {
  level: RiskLevel
  etaMin: number
  reasons: RiskReason[]
}

export interface Travel {
  etaMin: number
  distanceKm: number
  /** From a real road route, or estimated from straight-line distance. */
  source: 'route' | 'estimate'
}

export function assessHospital(hospital: Hospital, travel: Travel, needs: PatientNeeds): HospitalRisk {
  const eta = travel.etaMin
  const window = needs.windowMin
  const level: RiskLevel = eta <= window ? 'low' : eta <= window * 2 ? 'moderate' : 'high'
  const reasons: RiskReason[] = [
    level === 'low'
      ? { tone: 'good', key: 'ถึงภายในประมาณ {eta} นาที ทันเวลาสำหรับระดับความฉุกเฉินนี้ ({window} นาที)', vars: { eta, window } }
      : {
          tone: level === 'high' ? 'bad' : 'warn',
          key: 'ใช้เวลาเดินทางประมาณ {eta} นาที เกินเวลาที่ควรได้พบแพทย์ ({window} นาที)',
          vars: { eta, window },
        },
    // Information: what's there when they arrive.
    hospital.erAvailable
      ? { tone: 'good', key: 'ห้องฉุกเฉินพร้อมรับผู้ป่วย' }
      : { tone: 'warn', key: 'ห้องฉุกเฉินเต็ม อาจต้องรอหรือถูกส่งต่อ' },
  ]
  if (hospital.erAvailable && hospital.bedsAvailable <= 0) reasons.push({ tone: 'warn', key: 'ไม่มีเตียงว่างรับผู้ป่วยใน' })
  return { level, etaMin: eta, reasons }
}

export interface RankedHospital {
  hospital: Hospital
  travel: Travel
  risk: HospitalRisk
}

/** Every hospital assessed: emergency rooms taking patients first, then
 * the quickest to reach -- the first is the recommendation. */
export function rankHospitals(hospitals: Hospital[], travel: (h: Hospital) => Travel, needs: PatientNeeds): RankedHospital[] {
  return hospitals
    .map((hospital) => {
      const t = travel(hospital)
      return { hospital, travel: t, risk: assessHospital(hospital, t, needs) }
    })
    .sort((a, b) => Number(b.hospital.erAvailable) - Number(a.hospital.erAvailable) || a.travel.etaMin - b.travel.etaMin)
}

/** What choosing `chosen` over `recommended` means, in terms a family can
 * weigh: how much longer, and whether its emergency room is full. */
export function compareWithRecommended(chosen: RankedHospital, recommended: RankedHospital): RiskReason[] {
  const out: RiskReason[] = []
  const extra = chosen.travel.etaMin - recommended.travel.etaMin
  if (extra > 0) out.push({ tone: chosen.risk.level === 'high' ? 'bad' : 'warn', key: 'ใช้เวลาเดินทางนานกว่าประมาณ {extra} นาที', vars: { extra } })
  if (recommended.hospital.erAvailable && !chosen.hospital.erAvailable) {
    out.push({ tone: 'bad', key: 'ห้องฉุกเฉินของโรงพยาบาลที่เลือกเต็ม' })
  }
  return out
}
