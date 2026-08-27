export type Role = 'public' | 'dispatch' | 'rescue' | 'hospital'

export interface AppUser {
  id: string
  name: string
  role: Role
  phone?: string
  org?: string
}

export type Severity = 1 | 2 | 3 | 4 | 5

export const SEVERITY_LABEL: Record<Severity, string> = {
  1: 'ระดับ 1: วิกฤต',
  2: 'ระดับ 2: ฉุกเฉินสูง',
  3: 'ระดับ 3: ฉุกเฉินปานกลาง',
  4: 'ระดับ 4: เร่งด่วนต่ำ',
  5: 'ระดับ 5: ไม่ฉุกเฉิน',
}

export const SEVERITY_SHORT_LABEL: Record<Severity, string> = {
  1: 'วิกฤต',
  2: 'ฉุกเฉินสูง',
  3: 'ฉุกเฉินปานกลาง',
  4: 'เร่งด่วนต่ำ',
  5: 'ไม่ฉุกเฉิน',
}

export type CallStatus = 'idle' | 'connecting' | 'in-call' | 'ended'

export type CaseStatus =
  | 'contacted' // 1 ติดต่อเจ้าหน้าที่แล้ว
  | 'photos-taken' // 2 ถ่ายรูปจุดเกิดเหตุแล้ว
  | 'called-1669' // 3 ติดต่อ 1669 แล้ว
  | 'received' // 4 รับแจ้งเหตุแล้ว
  | 'finding-rescue' // 5 กำลังค้นหาหน่วยกู้ชีพ
  | 'rescue-assigned' // 6 มอบหมายหน่วยกู้ชีพแล้ว
  | 'rescue-en-route' // 7 หน่วยกู้ชีพกำลังเดินทาง
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
  org: 'ประชาชน' | 'ศูนย์ 1669' | 'หน่วยกู้ชีพ' | 'โรงพยาบาล' | 'ระบบ'
}

export const CASE_STATUS_FLOW: CaseStatusMeta[] = [
  { key: 'contacted', order: 1, label: 'ติดต่อเจ้าหน้าที่แล้ว', org: 'ประชาชน' },
  { key: 'photos-taken', order: 2, label: 'ถ่ายรูปจุดเกิดเหตุแล้ว', org: 'ประชาชน' },
  { key: 'called-1669', order: 3, label: 'ติดต่อ 1669 แล้ว', org: 'ประชาชน' },
  { key: 'received', order: 4, label: 'รับแจ้งเหตุแล้ว', org: 'ศูนย์ 1669' },
  { key: 'finding-rescue', order: 5, label: 'กำลังค้นหาหน่วยกู้ชีพ', org: 'ศูนย์ 1669' },
  { key: 'rescue-assigned', order: 6, label: 'มอบหมายหน่วยกู้ชีพแล้ว', org: 'ศูนย์ 1669' },
  { key: 'rescue-en-route', order: 7, label: 'หน่วยกู้ชีพกำลังเดินทาง', org: 'หน่วยกู้ชีพ' },
  { key: 'rescue-arrived', order: 8, label: 'ถึงจุดเกิดเหตุแล้ว', org: 'หน่วยกู้ชีพ' },
  { key: 'assisted', order: 9, label: 'เข้าช่วยเหลือแล้ว', org: 'หน่วยกู้ชีพ' },
  { key: 'transporting', order: 10, label: 'กำลังนำส่งโรงพยาบาล', org: 'หน่วยกู้ชีพ' },
  { key: 'hospital-arrived', order: 11, label: 'ถึงโรงพยาบาลแล้ว', org: 'หน่วยกู้ชีพ' },
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

export type PhotoCategory = 'scene' | 'environment' | 'landmark'

export interface EmergencyPhoto {
  id: string
  dataUrl: string
  takenAt: number
  category?: PhotoCategory
}

export interface AudioRecording {
  id: string
  url: string
  durationSec: number
  recordedAt: number
  /** Who recorded this clip -- lets the hospital tell a citizen's report
   * apart from a rescue crew's field note. Missing on older recordings
   * (assume 'public', the only source before rescue could record). */
  recordedBy?: 'public' | 'rescue'
}

/** A follow-up note on the patient's condition logged after the initial
 * patient-record submission -- syncs in real time like the rest of the
 * case so dispatch/hospital see changes as they happen. */
export interface PatientUpdate {
  id: string
  note: string
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
}

/** AVPU scale for the R (Responsiveness) step of the primary survey. */
export type Responsiveness = 'A' | 'V' | 'P' | 'U'

/** Primary survey per the G-R-X-A-B-C-D-E framework used in Thai EMS
 * fieldwork: general impression, responsiveness+disability (AVPU plus a
 * neuro-exam detail -- both are about neurological/consciousness status,
 * so they're recorded together), exsanguinating hemorrhage, airway,
 * breathing, circulation, exposure. Every free-text field can be filled by
 * typing or by speech-to-text. */
export interface PrimarySurvey {
  generalImpression?: string
  responsiveness?: Responsiveness
  /** D (Disability) detail -- pupils, movement, GCS-like notes -- recorded
   * alongside the R (Responsiveness/AVPU) selection above. */
  disabilityDetail?: string
  exsanguinatingHemorrhage?: string
  airway?: string
  breathing?: string
  circulation?: string
  exposure?: string
}

export interface PatientInfo {
  name?: string
  age?: string
  gender?: string
  vitals: VitalSigns
  primarySurvey: PrimarySurvey
  firstAid: string
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
  /** Special-purpose gear this unit carries, e.g. 'เครื่องตัดถ่าง' -- used to
   * match a unit to incidents that need it, not just whoever's nearest. */
  equipment: string[]
  /** Driver shown once the unit accepts the case, alongside their vehicle
   * plate and which unit they belong to. */
  driverName?: string
  plateNumber?: string
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
  /** Follow-up condition notes logged after the initial patient record,
   * newest last. */
  patientUpdates: PatientUpdate[]
  assignedRescueTeam: RescueTeam | null
  /** Second unit co-assigned alongside the primary responder when no single
   * available/nearby unit had the equipment the incident needed. */
  supportingRescueTeam?: RescueTeam | null
  selectedHospital: Hospital | null
  rescueEnRoutePct: number
  rescueRejectedAt: number | null
  timeline: TimelineEvent[]
  reporterName?: string
  reporterPhone?: string
  /** Set once the reporter's post-case rating/complaint has been submitted
   * (to Supabase's case_feedback table), so the form doesn't show again. */
  feedbackSubmitted?: boolean
  /** Local sample case shown to a first-time visitor with no cases yet.
   * Never synced to Supabase -- it's not a real incident. */
  isDemo?: boolean
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
