export type Role = 'public' | 'dispatch' | 'rescue' | 'hospital'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface AppUser {
  id: string
  name: string
  role: Role
  phone?: string
  /** Which specific rescue team this user represents -- only set for the
   * 'rescue' role. Drives case visibility (a rescue user only ever sees
   * cases assigned to their own team). */
  rescueTeamId?: string
  /** Which specific hospital this user represents -- only set for the
   * 'hospital' role. Drives case visibility the same way. */
  hospitalId?: string
  approvalStatus: ApprovalStatus
  /** Granted by hand only (never through registration) -- bypasses all
   * team/hospital scoping and can approve/reject any pending account. */
  isAdmin: boolean
  /** Granted by dispatch/admin (or another lead of the same org) -- can
   * approve/reject pending registrations for their own rescue team or
   * hospital only, without needing full admin/dispatch power. */
  isOrgLead?: boolean
  /** True for the transparent anonymous session every citizen visitor gets
   * (see ensureAnonymousSession). Not a real account -- the UI must not
   * treat this as "logged in" (e.g. top nav should still show
   * login/register, not a profile menu). */
  isAnonymous?: boolean

  // Personal/medical details, editable on the Profile page -- useful
  // context for dispatch/rescue/hospital in a real emergency, not just
  // account info.
  avatarUrl?: string
  nickname?: string
  /** ISO date string ('YYYY-MM-DD'); age is computed from this, not stored. */
  birthdate?: string
  bloodType?: string
  allergies?: string
  chronicConditions?: string

  /** LINE user id (`sub`) this account is linked to, if any -- separate from
   * how the account originally signed up. Lets a LINE-first account and an
   * email/Google-first account converge on one identity via account linking
   * (see linkLineIdentity/unlinkLineIdentity in lib/auth.ts). */
  lineUserId?: string
}

/** Whole years between a 'YYYY-MM-DD' birthdate and today. */
export function calculateAge(birthdate: string): number {
  const birth = new Date(birthdate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export type Severity = 1 | 2 | 3 | 4 | 5

// "เร่งด่วน" vs "ฉุกเฉิน" used to be mixed across levels (level 4 was the
// only one saying "เร่งด่วนต่ำ") -- standardized on "ฉุกเฉิน" throughout to
// match levels 2/3/5, so the wording reads as one consistent scale.
export const SEVERITY_LABEL: Record<Severity, string> = {
  1: 'ระดับ 1: วิกฤต',
  2: 'ระดับ 2: ฉุกเฉินสูง',
  3: 'ระดับ 3: ฉุกเฉินปานกลาง',
  4: 'ระดับ 4: ฉุกเฉินต่ำ',
  5: 'ระดับ 5: ไม่ฉุกเฉิน',
}

export const SEVERITY_SHORT_LABEL: Record<Severity, string> = {
  1: 'วิกฤต',
  2: 'ฉุกเฉินสูง',
  3: 'ฉุกเฉินปานกลาง',
  4: 'ฉุกเฉินต่ำ',
  5: 'ไม่ฉุกเฉิน',
}

export type CallStatus = 'idle' | 'connecting' | 'in-call' | 'ended'

/** Who initiated the current/most recent call on this case -- lets 1669's
 * call screen show the right remote-party label (reporter vs. rescue crew)
 * since either can now ring in at any time, not just the original reporter
 * during intake. Stamped whenever a caller sets callStatus to 'connecting'. */
export type CallerRole = 'public' | 'rescue'

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

/** A family/relative contact for the patient -- an append-only list (like
 * PatientUpdate below) since more than one can come in over the course of
 * a case, from whichever role happens to have them at the time. */
export interface RelativeContact {
  id: string
  name?: string
  phone: string
  addedBy: Role
  addedAt: number
}

/** A follow-up note on the patient's condition logged after the initial
 * patient-record submission -- syncs in real time like the rest of the
 * case so dispatch/hospital see changes as they happen. */
export interface PatientUpdate {
  id: string
  note: string
  recordedAt: number
}

export type Consciousness = 'conscious' | 'unconscious' | 'unknown'

export interface IncidentDetails {
  incidentType: string
  location: string
  patientCount: number
  conscious: Consciousness
  callbackPhone: string
  notes?: string
}

export interface DispatcherAssessment {
  severity: Severity
  injuryDescription: string
  assessedAt: number
  /** Set when dispatch confirms a rescue-proposed severity update (see
   * EmergencyCase.rescueSeverityProposal) -- absent means severity is still
   * exactly what was set at the original assessedAt. */
  severityConfirmedAt?: number
}

/** A severity re-assessment rescue proposes after their own on-scene
 * findings (e.g. a GCS score) suggest the phone-reported severity was off --
 * sits alongside the original DispatcherAssessment until 1669 confirms or
 * dismisses it (see confirmRescueSeverity in store.ts). */
export interface RescueSeverityProposal {
  severity: Severity
  note?: string
  proposedAt: number
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

/** Glasgow Coma Scale -- a separate, numeric neuro score alongside AVPU
 * (kept distinct rather than replacing it, since AVPU is faster to check in
 * the field and existing records only ever had AVPU). Total is 3-15,
 * derived rather than stored so it can never drift from its parts. */
export interface GcsScore {
  eye: 1 | 2 | 3 | 4
  verbal: 1 | 2 | 3 | 4 | 5
  motor: 1 | 2 | 3 | 4 | 5 | 6
}

export function gcsTotal(g: GcsScore): number {
  return g.eye + g.verbal + g.motor
}

/** ATLS/PHTLS hemorrhagic shock classification (Class I <15% blood loss
 * through Class IV >40%) -- structured instead of free text since it's a
 * recognized scale that drives real treatment decisions, not just a
 * description. */
export type HemorrhageClass = 1 | 2 | 3 | 4

/** The free-text G-X-A-B-C-E findings a treatment note can be logged
 * against -- kept as a separate keyed map (not merged into each finding
 * field) so existing records, which only ever had the finding text, don't
 * need a migration. */
export type PrimarySurveyFindingKey = 'generalImpression' | 'exsanguinatingHemorrhage' | 'airway' | 'breathing' | 'circulation' | 'exposure'

/** Primary survey per the G-R-X-A-B-C-D-E framework used in Thai EMS
 * fieldwork: general impression, responsiveness (AVPU, doubling as the R/D
 * neuro/consciousness check), exsanguinating hemorrhage, airway, breathing,
 * circulation, exposure. Every free-text field can be filled by typing or
 * by speech-to-text. */
export interface PrimarySurvey {
  generalImpression?: string
  responsiveness?: Responsiveness
  /** Only set when all three sub-scores are recorded -- a partial GCS total
   * would be clinically misleading, so this is all-or-nothing. */
  gcs?: GcsScore
  exsanguinatingHemorrhage?: string
  hemorrhageClass?: HemorrhageClass
  airway?: string
  breathing?: string
  circulation?: string
  exposure?: string
  /** What's already been done for each finding above, keyed the same way. */
  treatments?: Partial<Record<PrimarySurveyFindingKey, string>>
}

export interface PatientInfo {
  name?: string
  age?: string
  gender?: string
  /** Thai national ID number, 13 digits -- optional, usually filled from
   * scanning the patient's ID card (see IdCardScannerModal) rather than
   * typed by hand. */
  idNumber?: string
  vitals: VitalSigns
  primarySurvey: PrimarySurvey
  firstAid: string
  recordedAt?: number
}

/** Vehicle capability tier, highest to lowest -- drives dispatch's
 * level-filtered search (see rescueAssignment.ts) and the escalation prompt
 * when a severity re-assessment gets worse. Flip this one array if the
 * intended order turns out to be reversed. */
export type VehicleLevel = 'CLS' | 'ALS' | 'BLS'

export const VEHICLE_LEVEL_RANK: VehicleLevel[] = ['CLS', 'ALS', 'BLS']

export const VEHICLE_LEVEL_LABEL: Record<VehicleLevel, string> = {
  CLS: 'CLS',
  ALS: 'ALS',
  BLS: 'BLS',
}

/** One specific vehicle/crew within a rescue branch (RescueTeam) -- a
 * branch typically runs several of these, each with its own equipment. */
export interface RescueVehicle {
  id: string
  rescueTeamId: string
  unitCode: string
  members: number
  vehicle: string
  /** Special-purpose gear this vehicle carries, e.g. 'เครื่องตัดถ่าง' -- used
   * to match a unit to incidents that need it, not just whoever's nearest. */
  equipment: string[]
  /** Capability tier -- optional at the type level only so an older cached
   * RescueVehicle embedded in a case's assignedVehicle still type-checks;
   * every live read defaults a missing level to 'BLS' (see rowToRescueVehicle
   * in orgs.ts and the v8 migrate() backfill in store.ts). */
  level?: VehicleLevel
  driverName?: string
  plateNumber?: string
}

/** A provincial rescue branch/sub-unit -- dispatch assigns a case to the
 * branch as a whole (see rescueAssignment.ts); the branch's own staff then
 * pick which of its `vehicles` actually handles it (see
 * EmergencyCase.assignedVehicle). Staff accounts belong to a branch
 * (profiles.rescue_team_id), not to an individual vehicle. */
export interface RescueTeam {
  id: string
  name: string
  phone: string
  base: GeoLocation
  vehicles: RescueVehicle[]
  /** @deprecated Kept only for reading older cached case data that
   * predates the branch/vehicle split -- new code should use `vehicles`. */
  unitCode?: string
  /** @deprecated see unitCode */
  members?: number
  /** @deprecated see unitCode */
  vehicle?: string
  /** @deprecated see unitCode */
  equipment?: string[]
  /** @deprecated see unitCode */
  driverName?: string
  /** @deprecated see unitCode */
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

/** How the hospital leg of a case was actually decided -- distinguishes a
 * normal pick from a family's informed refusal, which needs its own
 * documentation trail (see signatureUrl). */
export type HospitalDecisionType = 'selected' | 'declined-all' | 'declined-nearest-chose-own'

export interface HospitalDecision {
  type: HospitalDecisionType
  /** Absent only for 'declined-all' -- every other type ends with a real
   * hospital target (also mirrored onto EmergencyCase.selectedHospital so
   * existing status gates that read it keep working unchanged). */
  hospital?: Hospital
  /** Drawn-signature PNG data URL (see SignaturePad/uploadCaseSignature) --
   * required for either declined-* type when severity is 1 or 2. */
  signatureUrl?: string
  decidedAt: number
  /** The relative's name, if captured alongside the signature. */
  decidedBy?: string
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
  /** Set alongside callStatus 'connecting' -- see CallerRole. */
  activeCallerRole?: CallerRole
  incidentDetails: IncidentDetails | null
  assessment: DispatcherAssessment | null
  patientInfo: PatientInfo | null
  /** Follow-up condition notes logged after the initial patient record,
   * newest last. */
  patientUpdates: PatientUpdate[]
  /** Which branch is responsible -- dispatch assigns at this level (see
   * rescueAssignment.ts). */
  assignedRescueTeam: RescueTeam | null
  /** Which of the branch's vehicles/crews actually handles it -- picked by
   * the branch's own staff after the branch accepts, not by dispatch. */
  assignedVehicle?: RescueVehicle | null
  /** Crew headcount for THIS dispatch, chosen by the branch's own staff
   * alongside the vehicle -- separate from RescueVehicle.members (that
   * vehicle's static default), so one crew size doesn't leak across runs.
   * Falls back to assignedVehicle.members when absent (older cases). */
  assignedVehicleCrewCount?: number
  /** Second unit co-assigned alongside the primary responder when no single
   * available/nearby unit had the equipment the incident needed. */
  supportingRescueTeam?: RescueTeam | null
  /** A severity re-assessment rescue proposed from on-scene findings,
   * awaiting 1669's confirmation -- see confirmRescueSeverity in store.ts. */
  rescueSeverityProposal?: RescueSeverityProposal | null
  selectedHospital: Hospital | null
  /** How the hospital leg was actually decided -- see HospitalDecision. */
  hospitalDecision?: HospitalDecision | null
  rescueEnRoutePct: number
  rescueRejectedAt: number | null
  /** True once closed via 1669's advice-only path (see closeCaseWithAdvice)
   * -- distinguishes it from a normal full-pipeline completion in history. */
  closedWithoutDispatch?: boolean
  timeline: TimelineEvent[]
  reporterName?: string
  reporterPhone?: string
  /** Collected from the reporter during the photo step, before dispatch
   * ever sees the case -- prefills (but doesn't lock) dispatch's own
   * consciousness field on the assessment form, since the reporter is the
   * one actually standing next to the patient. */
  reporterConsciousness?: Consciousness
  /** The reporter's Supabase auth id (their anonymous session, transparent
   * to them) -- lets RLS scope "their own case" without a visible login.
   * Set once at creation and never touched by any other role's updates. */
  reporterUserId?: string
  /** A patient's family/relative contacts -- addable at any point in the
   * case lifecycle by whoever has them at the time (the reporter, 1669,
   * rescue, or the hospital), not just collected once up front. */
  relativeContacts: RelativeContact[]
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
