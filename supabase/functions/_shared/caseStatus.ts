// Mirrors src/lib/types.ts's CaseStatus/CASE_STATUS_FLOW -- shared between
// line-webhook (creates cases) and line-push-notify (reports on status
// changes) so a status label can't drift between the two functions. Keep in
// sync if the web app's status pipeline ever changes.

export type CaseStatus =
  | 'contacted'
  | 'photos-taken'
  | 'called-1669'
  | 'received'
  | 'finding-rescue'
  | 'rescue-assigned'
  | 'rescue-en-route'
  | 'rescue-arrived'
  | 'assisted'
  | 'transporting'
  | 'hospital-arrived'
  | 'hospital-received'
  | 'completed'

export const STATUS_META: Record<CaseStatus, { label: string; org: string }> = {
  contacted: { label: 'ติดต่อเจ้าหน้าที่แล้ว', org: 'ประชาชน' },
  'photos-taken': { label: 'ถ่ายรูปจุดเกิดเหตุแล้ว', org: 'ประชาชน' },
  'called-1669': { label: 'ติดต่อ 1669 แล้ว', org: 'ประชาชน' },
  received: { label: 'รับแจ้งเหตุแล้ว', org: 'ศูนย์ 1669' },
  'finding-rescue': { label: 'กำลังค้นหาหน่วยกู้ชีพ', org: 'ศูนย์ 1669' },
  'rescue-assigned': { label: 'มอบหมายหน่วยกู้ชีพแล้ว', org: 'ศูนย์ 1669' },
  'rescue-en-route': { label: 'หน่วยกู้ชีพกำลังเดินทาง', org: 'หน่วยกู้ชีพ' },
  'rescue-arrived': { label: 'ถึงจุดเกิดเหตุแล้ว', org: 'หน่วยกู้ชีพ' },
  assisted: { label: 'เข้าช่วยเหลือแล้ว', org: 'หน่วยกู้ชีพ' },
  transporting: { label: 'กำลังนำส่งโรงพยาบาล', org: 'หน่วยกู้ชีพ' },
  'hospital-arrived': { label: 'ถึงโรงพยาบาลแล้ว', org: 'หน่วยกู้ชีพ' },
  'hospital-received': { label: 'โรงพยาบาลรับผู้ป่วยแล้ว', org: 'โรงพยาบาล' },
  completed: { label: 'เสร็จสิ้น', org: 'ระบบ' },
}
