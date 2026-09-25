import type { Severity } from './types'
import { registerTranslations } from './i18n'

registerTranslations({
  'ระดับ 1: วิกฤต (Resuscitation)': 'Level 1: Resuscitation',
  'ต้องช่วยชีวิตทันที เช่น หัวใจหยุดเต้น หยุดหายใจ ไม่ตอบสนอง': 'Needs immediate resuscitation, e.g. cardiac arrest, not breathing, unresponsive',
  'ระดับ 2: ฉุกเฉิน (Emergency)': 'Level 2: Emergency',
  'มีความเสี่ยงสูง อาการรุนแรงหรือระดับความรู้สึกตัวลดลง ต้องได้รับการรักษาโดยเร็ว': 'High risk: severe symptoms or declining consciousness; needs treatment quickly',
  'ระดับ 3: เร่งด่วน (Urgent)': 'Level 3: Urgent',
  'อาการคงที่ แต่ต้องได้รับการตรวจรักษาหลายรายการ': 'Stable but requires several exams/treatments',
  'ระดับ 4: ไม่เร่งด่วน (Less-Urgent)': 'Level 4: Less-Urgent',
  'อาการไม่รุนแรง ต้องการการดูแลเพียงเล็กน้อย': 'Mild symptoms, needs only minor care',
  'ระดับ 5: ทั่วไป (Non-Urgent)': 'Level 5: Non-Urgent',
  'สามารถเดินทางไปโรงพยาบาลได้ด้วยตนเอง (เช่น ไข้หวัด) หรือผู้ป่วยเสียชีวิตแล้ว':
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
    title: 'ระดับ 1: วิกฤต (Resuscitation)',
    description: 'ต้องช่วยชีวิตทันที เช่น หัวใจหยุดเต้น หยุดหายใจ ไม่ตอบสนอง',
    tone: 'emergency',
  },
  {
    value: 2,
    title: 'ระดับ 2: ฉุกเฉิน (Emergency)',
    description: 'มีความเสี่ยงสูง อาการรุนแรงหรือระดับความรู้สึกตัวลดลง ต้องได้รับการรักษาโดยเร็ว',
    tone: 'warning',
  },
  {
    value: 3,
    title: 'ระดับ 3: เร่งด่วน (Urgent)',
    description: 'อาการคงที่ แต่ต้องได้รับการตรวจรักษาหลายรายการ',
    tone: 'moderate',
  },
  {
    value: 4,
    title: 'ระดับ 4: ไม่เร่งด่วน (Less-Urgent)',
    description: 'อาการไม่รุนแรง ต้องการการดูแลเพียงเล็กน้อย',
    tone: 'default',
  },
  {
    value: 5,
    title: 'ระดับ 5: ทั่วไป (Non-Urgent)',
    description: 'สามารถเดินทางไปโรงพยาบาลได้ด้วยตนเอง (เช่น ไข้หวัด) หรือผู้ป่วยเสียชีวิตแล้ว',
    tone: 'success',
  },
]
