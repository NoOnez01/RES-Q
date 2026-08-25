export type Role = 'public' | 'dispatch' | 'rescue' | 'hospital'

export interface AppUser {
  id: string
  name: string
  role: Role
  phone?: string
  org?: string
}

export type Severity = 1 | 2 | 3 | 4

export const SEVERITY_LABEL: Record<Severity, string> = {
  1: 'ระดับ 1: วิกฤต',
  2: 'ระดับ 2: ฉุกเฉินสูง',
  3: 'ระดับ 3: ฉุกเฉินปานกลาง',
  4: 'ระดับ 4: เร่งด่วนต่ำ',
}

export const SEVERITY_SHORT_LABEL: Record<Severity, string> = {
  1: 'วิกฤต',
  2: 'ฉุกเฉินสูง',
  3: 'ฉุกเฉินปานกลาง',
  4: 'เร่งด่วนต่ำ',
}

export type CallStatus = 'idle' | 'connecting' | 'in-call' | 'ended'

export type CaseStatus =
  | 'contacted' // 1 ติดต่อเจ้าหน้าที่แล้ว
  | 'photos-taken' // 2 ถ่ายรูปจุดเกิดเหตุแล้ว
  | 'called-1669' // 3 ติดต่อ 1669 แล้ว
  | 'received' // 4 รับแจ้งเหตุแล้ว
  | 'finding-rescue' // 5 กำลังค้นหาหน่วยกู้ภัย
  | 'rescue-assigned' // 6 มอบหมายหน่วยกู้ภัยแล้ว
  | 'rescue-en-route' // 7 หน่วยกู้ภัยกำลังเดินทาง
  | 'rescue-arrived' // 8 ถึงจุดเกิดเหตุแล้ว
  | 'assisted' // 9 เข้าช่วยเหลือแล้ว
  | 'transporting' // 10 กำลังนำส่งโรงพยาบาล
  | 'hospital-arrived' // 11 ถึงโรงพยาบาลแล้ว
  | 'hospital-received' // 12 โรงพยาบาลรับผู้ป่วยแล้ว
  | 'completed' // 13 เสร็จสิ้น

export interface CaseStatusMeta {
  key: CaseStatus
  order: number
  label: string
  org: 'ประชาชน' | 'ศูนย์ 1669' | 'หน่วยกู้ภัย' | 'โรงพยาบาล' | 'ระบบ'
}

export const CASE_STATUS_FLOW: CaseStatusMeta[] = [
  { key: 'contacted', order: 1, label: 'ติดต่อเจ้าหน้าที่แล้ว', org: 'ประชาชน' },
  { key: 'photos-taken', order: 2, label: 'ถ่ายรูปจุดเกิดเหตุแล้ว', org: 'ประชาชน' },
  { key: 'called-1669', order: 3, label: 'ติดต่อ 1669 แล้ว', org: 'ประชาชน' },
  { key: 'received', order: 4, label: 'รับแจ้งเหตุแล้ว', org: 'ศูนย์ 1669' },
  { key: 'finding-rescue', order: 5, label: 'กำลังค้นหาหน่วยกู้ภัย', org: 'ศูนย์ 1669' },
  { key: 'rescue-assigned', order: 6, label: 'มอบหมายหน่วยกู้ภัยแล้ว', org: 'ศูนย์ 1669' },
  { key: 'rescue-en-route', order: 7, label: 'หน่วยกู้ภัยกำลังเดินทาง', org: 'หน่วยกู้ภัย' },
  { key: 'rescue-arrived', order: 8, label: 'ถึงจุดเกิดเหตุแล้ว', org: 'หน่วยกู้ภัย' },
  { key: 'assisted', order: 9, label: 'เข้าช่วยเหลือแล้ว', org: 'หน่วยกู้ภัย' },
  { key: 'transporting', order: 10, label: 'กำลังนำส่งโรงพยาบาล', org: 'หน่วยกู้ภัย' },
  { key: 'hospital-arrived', order: 11, label: 'ถึงโรงพยาบาลแล้ว', org: 'หน่วยกู้ภัย' },
  { key: 'hospital-received', order: 12, label: 'โรงพยาบาลรับผู้ป่วยแล้ว', org: 'โรงพยาบาล' },
  { key: 'completed', order: 13, label: 'เสร็จสิ้น', org: 'ระบบ' },
]

export function statusMeta(status: CaseStatus): CaseStatusMeta {
  return CASE_STATUS_FLOW.find((s) => s.key === status) ?? CASE_STATUS_FLOW[0]
}

export interface TimelineEvent {
  id: string
  status: CaseStatus
  label: string
  org: string
  note?: string
  timestamp: number
}

export interface GeoLocation {
  lat: number
  lng: number
  address: string
}

export interface EmergencyPhoto {
  id: string
  dataUrl: string
  takenAt: number
}

export interface AudioRecording {
  id: string
  url: string
  durationSec: number
  recordedAt: number
}

export interface IncidentDetails {
  incidentType: string
  location: string
  patientCount: number
  conscious: 'conscious' | 'unconscious' | 'unknown'
  callbackPhone: string
  notes?: string
}

export interface DispatcherAssessment {
  severity: Severity
  injuryDescription: string
  assessedAt: number
}

export interface VitalSigns {
  bloodPressure?: string
  pulse?: string
  temperature?: string
  respiration?: string
  oxygenSat?: string
  consciousness?: string
}

export interface PatientInfo {
  name?: string
  age?: string
  gender?: string
  vitals: VitalSigns
  firstAid: string
  additionalNotes?: string
  recordedAt?: number
}

export interface RescueTeam {
  id: string
  name: string
  unitCode: string
  members: number
  vehicle: string
  phone: string
  base: GeoLocation
}

export interface Hospital {
  id: string
  name: string
  distanceKm: number
  etaMin: number
  erAvailable: boolean
  bedsAvailable: number
  specialties: string[]
  location: GeoLocation
  phone: string
}

export interface EmergencyCase {
  id: string
  caseNumber: string
  status: CaseStatus
  createdAt: number
  updatedAt: number
  location: GeoLocation | null
  photos: EmergencyPhoto[]
  audioRecordings: AudioRecording[]
  callStatus: CallStatus
  callDurationSec: number
  incidentDetails: IncidentDetails | null
  assessment: DispatcherAssessment | null
  patientInfo: PatientInfo | null
  assignedRescueTeam: RescueTeam | null
  selectedHospital: Hospital | null
  rescueEnRoutePct: number
  rescueRejectedAt: number | null
  timeline: TimelineEvent[]
  reporterName?: string
  reporterPhone?: string
}

export type NotificationAudience = Role | 'all'

export interface AppNotification {
  id: string
  audience: NotificationAudience
  caseId: string | null
  title: string
  message: string
  createdAt: number
  read: boolean
  tone: 'info' | 'success' | 'warning' | 'emergency'
}
