import type { Hospital, Severity } from './types'

/**
 * Risk of taking this patient to each hospital, so the rescue crew can
 * weigh the options and explain them to the family.
 *
 * Two things about the patient drive it:
 * - the CBD (chief-complaint group) says what kind of care they need --
 *   a heart team for chest pain, a stroke team for stroke signs, a trauma
 *   team for a crash -- and whether the nearest emergency room comes first
 *   (cardiac arrest, a blocked airway, anaphylaxis, drowning: stabilise
 *   now, specialise later);
 * - the triage level says how much every minute and every gap matters: a
 *   level 1 patient should reach care within 15 minutes, and a hospital
 *   without the right team means a second transfer they may not survive;
 *   a level 5 patient can reasonably go further.
 *
 * Against each hospital: travel time from the scene, whether its emergency
 * room is taking patients, free beds, and whether its listed specialties
 * cover what the patient needs. A hospital's specialty list is whatever
 * was entered for it, so a need it doesn't list is reported as "not
 * listed", never as "doesn't have".
 *
 * It supports the crew's judgement; it doesn't replace it.
 */

export type Capability =
  | 'trauma'
  | 'surgery'
  | 'neuro'
  | 'cardiac'
  | 'ortho'
  | 'pediatric'
  | 'obstetric'
  | 'burn'
  | 'toxicology'
  | 'psychiatric'

export const CAPABILITY_LABEL: Record<Capability, string> = {
  trauma: 'อุบัติเหตุและการบาดเจ็บ',
  surgery: 'ศัลยกรรม',
  neuro: 'สมองและระบบประสาท',
  cardiac: 'หัวใจ',
  ortho: 'กระดูกและข้อ',
  pediatric: 'กุมารเวช (เด็ก)',
  obstetric: 'สูติ-นรีเวช',
  burn: 'แผลไฟไหม้',
  toxicology: 'พิษวิทยา',
  psychiatric: 'จิตเวช',
}

// How a hospital's free-text specialties name each capability.
const CAPABILITY_WORDS: Record<Capability, string[]> = {
  trauma: ['อุบัติเหตุ', 'บาดเจ็บ', 'trauma'],
  surgery: ['ศัลยกรรม', 'ผ่าตัด', 'surg'],
  neuro: ['สมอง', 'ประสาท', 'neuro', 'stroke'],
  cardiac: ['หัวใจ', 'cardi', 'pci', 'cath'],
  ortho: ['กระดูก', 'ortho'],
  pediatric: ['เด็ก', 'กุมาร', 'ทารก', 'pediat', 'paediat'],
  obstetric: ['สูติ', 'นรีเวช', 'คลอด', 'obstet', 'gyn'],
  burn: ['ไฟไหม้', 'แผลไหม้', 'burn'],
  toxicology: ['พิษ', 'tox'],
  psychiatric: ['จิตเวช', 'psych'],
}

export function hospitalHas(hospital: Pick<Hospital, 'specialties'>, cap: Capability): boolean {
  const listed = hospital.specialties.map((s) => s.toLowerCase())
  return CAPABILITY_WORDS[cap].some((w) => listed.some((s) => s.includes(w)))
}

interface CbdNeed {
  /** The care that actually treats it -- without it, a second transfer. */
  primary: Capability[]
  /** Helps, but any emergency room can start. */
  secondary: Capability[]
  /** Stabilise at the nearest emergency room first. */
  nearestFirst?: boolean
}

// By CBD number (lib/mockData.ts INCIDENT_TYPES).
const CBD_NEEDS: Record<number, CbdNeed> = {
  1: { primary: ['surgery'], secondary: [] }, // ปวดท้อง หลัง เชิงกราน
  2: { primary: [], secondary: [], nearestFirst: true }, // ภูมิแพ้รุนแรง
  3: { primary: [], secondary: ['toxicology'] }, // สัตว์กัด
  4: { primary: ['surgery'], secondary: [] }, // เลือดออก
  5: { primary: [], secondary: [], nearestFirst: true }, // หายใจลำบาก
  6: { primary: ['cardiac'], secondary: [], nearestFirst: true }, // หัวใจหยุดเต้น
  7: { primary: ['cardiac'], secondary: [] }, // เจ็บแน่นหน้าอก
  8: { primary: [], secondary: [], nearestFirst: true }, // อุดกั้นทางเดินหายใจ
  9: { primary: [], secondary: [] }, // เบาหวาน
  10: { primary: ['toxicology'], secondary: [] }, // สิ่งแวดล้อม / สัตว์มีพิษ
  11: { primary: [], secondary: [] }, // อาการทั่วไป
  12: { primary: ['neuro'], secondary: [] }, // ปวดศีรษะ ลำคอ
  13: { primary: ['psychiatric'], secondary: [] }, // จิตเวช
  14: { primary: ['toxicology'], secondary: [] }, // สารพิษ ยาเกินขนาด
  15: { primary: ['obstetric'], secondary: ['pediatric'] }, // การคลอด นรีเวช
  16: { primary: ['neuro'], secondary: [] }, // ชัก
  17: { primary: [], secondary: [] }, // อ่อนเพลีย
  18: { primary: ['neuro'], secondary: [] }, // สัญญาณโรคหลอดเลือดสมอง
  19: { primary: ['neuro'], secondary: ['cardiac'] }, // หมดสติ วูบ
  20: { primary: ['pediatric'], secondary: [] }, // เด็ก ทารก
  21: { primary: ['trauma'], secondary: ['surgery'] }, // ถูกทำร้าย
  22: { primary: ['burn'], secondary: ['trauma'] }, // ไฟไหม้ ไฟช็อต
  23: { primary: [], secondary: [], nearestFirst: true }, // จมน้ำ
  24: { primary: ['trauma'], secondary: ['ortho', 'neuro'] }, // พลัดตกหกล้ม
  25: { primary: ['trauma', 'surgery'], secondary: ['neuro', 'ortho'] }, // อุบัติเหตุจราจร
}

// Older free-text incident types, from before the CBD list.
const LEGACY_CBD: [string, number][] = [
  ['หมดสติ', 19],
  ['เจ็บหน้าอก', 7],
  ['หัวใจ', 7],
  ['อุบัติเหตุทางถนน', 25],
  ['จราจร', 25],
  ['พลัดตก', 24],
  ['ไฟไหม้', 22],
  ['จมน้ำ', 23],
  ['ชัก', 16],
  ['คลอด', 15],
  ['หายใจ', 5],
]

export function cbdNumber(incidentType: string | undefined): number | undefined {
  if (!incidentType) return undefined
  const m = /CBD\s*(\d+)/i.exec(incidentType)
  if (m) return Number(m[1])
  return LEGACY_CBD.find(([word]) => incidentType.includes(word))?.[1]
}

// How soon a patient at each triage level should reach a hospital.
const TARGET_MIN: Record<Severity, number> = { 1: 15, 2: 30, 3: 45, 4: 60, 5: 60 }

export interface PatientNeeds {
  cbd?: number
  severity?: Severity
  primary: Capability[]
  secondary: Capability[]
  nearestFirst: boolean
  /** Minutes to reach care for this triage level. */
  targetMin: number
}

export function patientNeeds(incidentType: string | undefined, severity: Severity | undefined): PatientNeeds {
  const cbd = cbdNumber(incidentType)
  const need = cbd ? CBD_NEEDS[cbd] : undefined
  return {
    cbd,
    severity,
    primary: need?.primary ?? [],
    secondary: need?.secondary ?? [],
    // Nearest-first only matters while the patient is actually in danger.
    nearestFirst: !!need?.nearestFirst && (severity ?? 3) <= 2,
    targetMin: TARGET_MIN[severity ?? 3],
  }
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
  /** Higher is riskier -- for ranking. */
  score: number
  etaMin: number
  reasons: RiskReason[]
}

export interface Travel {
  etaMin: number
  distanceKm: number
  /** From a real road route, or estimated from straight-line distance. */
  source: 'route' | 'estimate'
}

// How much each kind of problem weighs, by triage level (1 = most urgent).
// At level 1-2 a missing primary alone is high risk: a second transfer.
const W_MISSING_PRIMARY: Record<Severity, number> = { 1: 45, 2: 40, 3: 22, 4: 8, 5: 5 }
const W_MISSING_SECONDARY: Record<Severity, number> = { 1: 8, 2: 6, 3: 4, 4: 2, 5: 1 }
// Secondary gaps together never outweigh one missing primary.
const SECONDARY_CAP = 12
const W_ER_FULL: Record<Severity, number> = { 1: 45, 2: 40, 3: 25, 4: 15, 5: 12 }
const W_NO_BEDS: Record<Severity, number> = { 1: 15, 2: 15, 3: 10, 4: 5, 5: 3 }
const W_LATE: Record<Severity, number> = { 1: 40, 2: 30, 3: 20, 4: 10, 5: 8 }

export function assessHospital(hospital: Hospital, travel: Travel, needs: PatientNeeds, fastestEtaMin: number): HospitalRisk {
  const sev = needs.severity ?? 3
  const reasons: RiskReason[] = []
  let score = 0

  if (hospital.erAvailable) {
    reasons.push({ tone: 'good', key: 'ห้องฉุกเฉินพร้อมรับผู้ป่วย' })
  } else {
    score += W_ER_FULL[sev]
    reasons.push({ tone: sev <= 3 ? 'bad' : 'warn', key: 'ห้องฉุกเฉินเต็ม อาจต้องรอหรือถูกส่งต่อ' })
  }

  const eta = travel.etaMin
  if (eta <= needs.targetMin) {
    reasons.push({ tone: 'good', key: 'ถึงภายในประมาณ {eta} นาที ทันเวลาสำหรับระดับความรุนแรงนี้', vars: { eta } })
  } else {
    // Late by up to half the target again is a concern; beyond that, serious.
    const serious = eta > needs.targetMin * 1.5
    score += serious ? W_LATE[sev] : W_LATE[sev] / 2
    reasons.push({
      tone: serious && sev <= 3 ? 'bad' : 'warn',
      key: 'ใช้เวลาเดินทางประมาณ {eta} นาที เกินเวลาที่ควรถึง ({target} นาที)',
      vars: { eta, target: needs.targetMin },
    })
  }

  // Cardiac arrest, a blocked airway, anaphylaxis, drowning: every minute
  // before the first emergency room counts more than any specialty.
  const extra = eta - fastestEtaMin
  if (needs.nearestFirst && extra > 5) {
    score += Math.min(40, extra * 3)
    reasons.push({ tone: 'bad', key: 'ภาวะนี้ควรถึงห้องฉุกเฉินที่ใกล้ที่สุดก่อน ช้ากว่าทางเลือกที่เร็วที่สุด {extra} นาที', vars: { extra } })
  }

  // With nearest-first, the specialty can wait for a later transfer.
  const specialtyWeight = needs.nearestFirst ? 0.5 : 1
  for (const cap of needs.primary) {
    if (hospitalHas(hospital, cap)) {
      reasons.push({ tone: 'good', key: 'มีศักยภาพด้าน{cap}', vars: { cap: CAPABILITY_LABEL[cap] } })
    } else {
      score += W_MISSING_PRIMARY[sev] * specialtyWeight
      reasons.push({
        tone: sev <= 3 && !needs.nearestFirst ? 'bad' : 'warn',
        key: 'ไม่ได้ระบุศักยภาพด้าน{cap} ผู้ป่วยอาจต้องถูกส่งต่ออีกครั้ง',
        vars: { cap: CAPABILITY_LABEL[cap] },
      })
    }
  }
  let secondaryScore = 0
  for (const cap of needs.secondary) {
    if (hospitalHas(hospital, cap)) {
      reasons.push({ tone: 'good', key: 'มีศักยภาพด้าน{cap}', vars: { cap: CAPABILITY_LABEL[cap] } })
    } else {
      secondaryScore += W_MISSING_SECONDARY[sev] * specialtyWeight
      reasons.push({ tone: 'warn', key: 'ไม่ได้ระบุศักยภาพด้าน{cap}', vars: { cap: CAPABILITY_LABEL[cap] } })
    }
  }
  score += Math.min(SECONDARY_CAP, secondaryScore)

  if (hospital.erAvailable && hospital.bedsAvailable <= 0) {
    score += W_NO_BEDS[sev]
    reasons.push({ tone: 'warn', key: 'ไม่มีเตียงว่างรับผู้ป่วยใน' })
  }

  const level: RiskLevel = score >= 40 ? 'high' : score >= 15 ? 'moderate' : 'low'
  // The problems first, worst first.
  const order: Record<ReasonTone, number> = { bad: 0, warn: 1, good: 2 }
  reasons.sort((a, b) => order[a.tone] - order[b.tone])
  return { level, score, etaMin: eta, reasons }
}

export interface RankedHospital {
  hospital: Hospital
  travel: Travel
  risk: HospitalRisk
}

/** Every hospital assessed, lowest risk first (then quickest). */
export function rankHospitals(hospitals: Hospital[], travel: (h: Hospital) => Travel, needs: PatientNeeds): RankedHospital[] {
  const withTravel = hospitals.map((hospital) => ({ hospital, travel: travel(hospital) }))
  // "Nearest emergency room" means one that's actually taking patients.
  const open = withTravel.filter((x) => x.hospital.erAvailable)
  const fastest = Math.min(...(open.length ? open : withTravel).map((x) => x.travel.etaMin))
  return withTravel
    .map((x) => ({ ...x, risk: assessHospital(x.hospital, x.travel, needs, fastest) }))
    .sort((a, b) => a.risk.score - b.risk.score || a.travel.etaMin - b.travel.etaMin)
}

/**
 * What choosing `chosen` over `recommended` means, in the terms a family
 * can weigh: how much longer, which care the recommended hospital lists
 * that this one doesn't, whether its emergency room is full.
 */
export function compareWithRecommended(chosen: RankedHospital, recommended: RankedHospital, needs: PatientNeeds): RiskReason[] {
  const out: RiskReason[] = []
  const extra = chosen.travel.etaMin - recommended.travel.etaMin
  if (extra > 0) out.push({ tone: extra > 10 ? 'bad' : 'warn', key: 'ใช้เวลาเดินทางนานกว่าประมาณ {extra} นาที', vars: { extra } })
  for (const cap of [...needs.primary, ...needs.secondary]) {
    if (hospitalHas(recommended.hospital, cap) && !hospitalHas(chosen.hospital, cap)) {
      out.push({
        tone: needs.primary.includes(cap) ? 'bad' : 'warn',
        key: '{recommended} ระบุศักยภาพด้าน{cap} แต่โรงพยาบาลที่เลือกไม่ได้ระบุ',
        vars: { recommended: recommended.hospital.name, cap: CAPABILITY_LABEL[cap] },
      })
    }
  }
  if (recommended.hospital.erAvailable && !chosen.hospital.erAvailable) {
    out.push({ tone: 'bad', key: 'ห้องฉุกเฉินของโรงพยาบาลที่เลือกเต็ม' })
  }
  return out
}
