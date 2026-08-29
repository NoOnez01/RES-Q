import type { Severity } from './types'

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
    title: 'ระดับ 1: วิกฤต (Critical)',
    description: 'ต้องช่วยชีวิตทันที (ESI 1 - Resuscitation) เช่น หัวใจหยุดเต้น หยุดหายใจ ไม่ตอบสนอง',
    tone: 'emergency',
  },
  {
    value: 2,
    title: 'ระดับ 2: ฉุกเฉินสูง (High Emergency)',
    description: 'มีความเสี่ยงสูง อาการรุนแรงหรือซึมลง รอไม่ได้ (ESI 2 - Emergent)',
    tone: 'warning',
  },
  {
    value: 3,
    title: 'ระดับ 3: ฉุกเฉินปานกลาง (Moderate Emergency)',
    description: 'อาการคงที่แต่ต้องตรวจรักษาหลายรายการ (ESI 3 - Urgent)',
    tone: 'moderate',
  },
  {
    value: 4,
    title: 'ระดับ 4: ฉุกเฉินต่ำ (Low Emergency)',
    description: 'อาการไม่รุนแรง ต้องการการดูแลเพียงเล็กน้อย (ESI 4 - Less Urgent)',
    tone: 'default',
  },
  {
    value: 5,
    title: 'ระดับ 5: ไม่ฉุกเฉิน (Non-Urgent)',
    description:
      'พิจารณาให้เดินทางไปโรงพยาบาลด้วยตนเอง (เช่น ป่วยไข้หวัด) หรือกรณีผู้ป่วยเสียชีวิตแล้ว (ESI 5 - Non-Urgent)',
    tone: 'success',
  },
]
