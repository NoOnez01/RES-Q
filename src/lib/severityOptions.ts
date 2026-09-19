import type { Severity } from './types'
import { registerTranslations } from './i18n'

registerTranslations({
  'ระดับ 1: Resuscitation': 'Level 1: Resuscitation',
  'ต้องช่วยชีวิตทันที เช่น หัวใจหยุดเต้น หยุดหายใจ ไม่ตอบสนอง': 'Needs immediate resuscitation, e.g. cardiac arrest, not breathing, unresponsive',
  'ระดับ 2: Emergency': 'Level 2: Emergency',
  'มีความเสี่ยงสูง อาการรุนแรงหรือซึมลง รอไม่ได้': 'High risk, severe symptoms or declining consciousness, cannot wait',
  'ระดับ 3: Urgent': 'Level 3: Urgent',
  อาการคงที่แต่ต้องตรวจรักษาหลายรายการ: 'Stable but requires several exams/treatments',
  'ระดับ 4: Less-Urgent': 'Level 4: Less-Urgent',
  'อาการไม่รุนแรง ต้องการการดูแลเพียงเล็กน้อย': 'Mild symptoms, needs only minor care',
  'ระดับ 5: Non-Urgent': 'Level 5: Non-Urgent',
  'พิจารณาให้เดินทางไปโรงพยาบาลด้วยตนเอง (เช่น ป่วยไข้หวัด) หรือกรณีผู้ป่วยเสียชีวิตแล้ว':
    'Can travel to hospital on their own (e.g. common cold), or the patient has already deceased',
})

// Matched against the Emergency Severity Index (ESI) -- the 5-level triage
// scale taught in Thai EMS/hospital accreditation training -- so a
// dispatcher's or rescuer's call maps onto criteria staff already know,
// instead of an ad-hoc scale unique to this app. Shared between dispatch's
// initial assessment (EmergencyAssessment.tsx) and rescue's on-scene
// severity re-proposal (PatientRecord.tsx) so the two never drift apart.
export const SEVERITY_OPTIONS: {
  value: Severity
  title: string
  description?: string
  tone: 'emergency' | 'warning' | 'moderate' | 'default' | 'success'
}[] = [
  {
    value: 1,
    title: 'ระดับ 1: Resuscitation',
    description: 'ต้องช่วยชีวิตทันที เช่น หัวใจหยุดเต้น หยุดหายใจ ไม่ตอบสนอง',
    tone: 'emergency',
  },
  {
    value: 2,
    title: 'ระดับ 2: Emergency',
    description: 'มีความเสี่ยงสูง อาการรุนแรงหรือซึมลง รอไม่ได้',
    tone: 'warning',
  },
  {
    value: 3,
    title: 'ระดับ 3: Urgent',
    description: 'อาการคงที่แต่ต้องตรวจรักษาหลายรายการ',
    tone: 'moderate',
  },
  {
    value: 4,
    title: 'ระดับ 4: Less-Urgent',
    description: 'อาการไม่รุนแรง ต้องการการดูแลเพียงเล็กน้อย',
    tone: 'default',
  },
  {
    value: 5,
    title: 'ระดับ 5: Non-Urgent',
    description: 'พิจารณาให้เดินทางไปโรงพยาบาลด้วยตนเอง (เช่น ป่วยไข้หวัด) หรือกรณีผู้ป่วยเสียชีวิตแล้ว',
    tone: 'success',
  },
]
