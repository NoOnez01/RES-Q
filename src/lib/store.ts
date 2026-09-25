import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppNotification,
  AppUser,
  AudioRecording,
  CallStatus,
  CallerRole,
  CaseStatus,
  Consciousness,
  DispatcherAssessment,
  EmergencyCase,
  EmergencyPhoto,
  GeoLocation,
  Hospital,
  IncidentDetails,
  NotificationAudience,
  PhotoCategory,
  PatientInfo,
  PatientUpdate,
  RelativeContact,
  Role,
  RescueTeam,
  RescueVehicle,
  Severity,
  HospitalDecisionType,
} from './types'
import { statusMeta } from './types'
import { DEFAULT_INCIDENT_LOCATION, MOCK_HOSPITALS, MOCK_RESCUE_TEAMS } from './mockData'
import { formatCaseNumber, uid } from './utils'
import { signOut as authSignOut } from './auth'
import { fetchOrgs } from './orgs'
import { t, registerTranslations } from './i18n'

registerTranslations({
  เริ่มการขอความช่วยเหลือ: 'Help request started',
  'สร้างเคส {caseNumber} เรียบร้อยแล้ว': 'Case {caseNumber} has been created',
  หน่วยกู้ชีพบันทึกเคสที่พบเอง: 'Rescue team logged a self-discovered case',
  '{teamName} พบเหตุและบันทึกเคส {caseNumber} ด้วยตนเอง': '{teamName} discovered the incident and logged case {caseNumber} themselves',
  มีเคสฉุกเฉินใหม่: 'New emergency case',
  'เคส {caseNumber} ถูกส่งเข้าระบบแล้ว รอเจ้าหน้าที่กรอกรายละเอียดและประเมิน':
    'Case {caseNumber} has been submitted, awaiting dispatch to fill in details and assess',
  เจ้าหน้าที่ประเมินระดับความรุนแรงแล้ว: 'Dispatch has assessed the severity',
  'เคส {caseNumber} ได้รับการประเมินจากศูนย์ 1669 แล้ว': 'Case {caseNumber} has been assessed by the 1669 center',
  ได้รับมอบหมายเคสใหม่: 'New case assigned to you',
  'คุณได้รับมอบหมายเคส {caseNumber} กรุณายืนยันการรับเคส': 'You have been assigned case {caseNumber}, please confirm acceptance',
  มอบหมายหน่วยกู้ชีพแล้ว: 'Rescue team assigned',
  'หน่วยกู้ชีพ {teamName} ได้รับมอบหมายเคสของคุณแล้ว': 'Rescue team {teamName} has been assigned to your case',
  ได้รับมอบหมายเป็นหน่วยสนับสนุน: 'Assigned as a support unit',
  'เคส {caseNumber} ต้องการอุปกรณ์เฉพาะทางจากหน่วยของคุณ': 'Case {caseNumber} needs specialized equipment from your team',
  เพิ่มหน่วยสนับสนุนแล้ว: 'Support unit added',
  'หน่วยกู้ชีพ {teamName} เข้าร่วมช่วยเหลือเคสของคุณ': 'Rescue team {teamName} has joined to help with your case',
  หน่วยกู้ชีพเสนอปรับระดับความรุนแรง: 'Rescue team proposed a severity change',
  'เคส {caseNumber}: หน่วยกู้ชีพประเมินจากที่เกิดเหตุแล้วเสนอปรับระดับความรุนแรง กรุณายืนยัน':
    'Case {caseNumber}: the rescue team assessed the scene and proposed a severity change, please confirm',
  หน่วยกู้ชีพรับเคสแล้ว: 'Rescue team accepted the case',
  '{teamName} กำลังเดินทางไปยังจุดเกิดเหตุ': '{teamName} is en route to the scene',
  หน่วยกู้ชีพ: 'Rescue team',
  หน่วยกู้ชีพกำลังเดินทาง: 'Rescue team en route',
  หน่วยกู้ชีพตอบรับเคสของคุณแล้วและกำลังเดินทางมา: 'The rescue team has accepted your case and is on the way',
  หน่วยกู้ชีพถึงจุดเกิดเหตุแล้ว: 'Rescue team arrived at the scene',
  หน่วยกู้ชีพถึงที่เกิดเหตุและกำลังเข้าช่วยเหลือ: 'The rescue team has arrived at the scene and is providing assistance',
  อัปเดตอาการผู้ป่วย: 'Patient condition update',
  'เคส {caseNumber}: {note}': 'Case {caseNumber}: {note}',
  มีผู้ป่วยกำลังนำส่ง: 'A patient is being transported',
  'เคส {caseNumber} เลือกส่งตัวมาที่โรงพยาบาลของท่าน กรุณาเตรียมทีมรักษา': 'Case {caseNumber} selected your hospital for transfer, please prepare the treatment team',
  เคสเสร็จสิ้น: 'Case completed',
  'เคส {caseNumber}: ญาติไม่ประสงค์ส่งโรงพยาบาล': 'Case {caseNumber}: family declined hospital transfer',
  กำลังนำส่งโรงพยาบาล: 'Transporting to hospital',
  หน่วยกู้ชีพกำลังนำส่งผู้ป่วยไปยังโรงพยาบาลที่เลือก: 'The rescue team is transporting the patient to the selected hospital',
  ผู้ป่วยถึงโรงพยาบาลแล้ว: 'Patient has arrived at the hospital',
  'เคส {caseNumber} ถึงโรงพยาบาลแล้ว กรุณายืนยันการรับผู้ป่วย': 'Case {caseNumber} has arrived at the hospital, please confirm patient receipt',
  โรงพยาบาลปฏิเสธเคส: 'Hospital declined the case',
  'เคส {caseNumber} ถูกปฏิเสธ กรุณาเลือกโรงพยาบาลใหม่': 'Case {caseNumber} was declined, please select a new hospital',
  โรงพยาบาลรับผู้ป่วยแล้ว: 'Hospital admitted patient',
  โรงพยาบาลยืนยันการรับตัวผู้ป่วยเรียบร้อยแล้ว: 'The hospital has confirmed receiving the patient',
  กระบวนการช่วยเหลือฉุกเฉินเสร็จสมบูรณ์แล้ว: 'The emergency response process is complete',
})

function pushStatus(c: EmergencyCase, status: CaseStatus, note?: string): EmergencyCase {
  const meta = statusMeta(status)
  // Guard against a genuine no-op re-call (already at this exact status), not
  // "has this status ever occurred" — a case can legitimately revisit an
  // earlier status (e.g. a rescue rejection sends it from rescue-assigned
  // back to finding-rescue), and that transition needs its own timeline
  // entry or the timeline permanently stops reflecting reality.
  const alreadyHere = c.status === status
  const timeline = alreadyHere
    ? c.timeline
    : [
        ...c.timeline,
        {
          id: uid('tl'),
          status,
          label: meta.label,
          org: meta.org,
          note,
          timestamp: Date.now(),
        },
      ]
  return { ...c, status, timeline, updatedAt: Date.now() }
}

function makeNewCase(seq: number, reporterName?: string, reporterPhone?: string): EmergencyCase {
  const now = Date.now()
  const base: EmergencyCase = {
    id: uid('case'),
    caseNumber: formatCaseNumber(seq),
    status: 'contacted',
    createdAt: now,
    updatedAt: now,
    location: null,
    photos: [],
    audioRecordings: [],
    callStatus: 'idle',
    callDurationSec: 0,
    incidentDetails: null,
    assessment: null,
    patientInfo: null,
    patientUpdates: [],
    assignedRescueTeam: null,
    selectedHospital: null,
    rescueEnRoutePct: 0,
    rescueRejectedAt: null,
    timeline: [],
    reporterName,
    reporterPhone,
    relativeContacts: [],
  }
  return pushStatus(base, 'contacted')
}

interface ResQState {
  currentUser: AppUser | null
  cases: Record<string, EmergencyCase>
  activeCaseId: string | null
  notifications: AppNotification[]
  caseSeq: number
  hydratedDemo: boolean

  // appearance / locale
  /** 'system' follows the OS/browser preference; resolved to an actual
   * light/dark value in ThemeBridge (see lib/theme.ts), which is also what
   * actually applies the `.dark` class the CSS variables key off. */
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  language: 'th' | 'en'
  setLanguage: (language: 'th' | 'en') => void
  /** False until the visitor has been through the first-visit theme/language
   * prompt once (see FirstVisitSetup.tsx) -- persisted so it only ever shows
   * once per browser, not once per session. */
  onboardingSeen: boolean
  setOnboardingSeen: (seen: boolean) => void

  // auth / role
  /** False until App.tsx's session bootstrap (anonymous session or a real
   * login) has resolved at least once -- RequireRole waits on this instead
   * of treating "no currentUser yet" as "not logged in," so a real
   * dispatch/rescue/hospital user refreshing the page doesn't get bounced
   * to /login during the moment before their session loads. */
  authResolved: boolean
  setAuthResolved: (resolved: boolean) => void
  setUser: (user: AppUser | null) => void
  logout: () => void
  /** Admin-only "view as" override for which role's sidebar/menu to show --
   * lets an admin open e.g. the rescue dashboard and still get the rescue
   * nav items (case history routes, etc.), not their own account's. Data
   * itself isn't scoped by this (RLS already gives admin everything
   * unfiltered); this only changes which menu renders. Ignored for a
   * non-admin currentUser. */
  viewingRole: Role | null
  setViewingRole: (role: Role | null) => void

  // case lifecycle — public
  createCase: (reporterName?: string, reporterPhone?: string) => string
  /** 1669 logging a case that didn't come through the citizen app -- a
   * phone-in report, a walk-in, etc. Starts directly at 'received' (there
   * was no citizen photo/call step to walk through) with the incident
   * already detailed and assessed, since the dispatcher has that
   * information in hand while taking the call. Returns the new case id. */
  createDispatchCase: (
    input: Omit<IncidentDetails, 'callbackPhone' | 'location'> &
      Omit<DispatcherAssessment, 'assessedAt'> & {
        location: GeoLocation
        reporterName?: string
        reporterPhone?: string
      },
  ) => string
  /** A rescue crew logging an incident they came across themselves, with no
   * prior report or dispatch assignment -- fast-forwards the case through
   * the normal intake/assignment statuses (self-assigned to their own
   * team) straight to 'rescue-arrived', since they're already on scene
   * writing this up. Returns the new case id. */
  createRescueFoundCase: (
    input: Omit<IncidentDetails, 'callbackPhone' | 'location'> &
      Omit<DispatcherAssessment, 'assessedAt'> & {
        location: GeoLocation
        team: RescueTeam
      },
  ) => string
  setActiveCase: (caseId: string | null) => void
  deleteCase: (caseId: string) => void
  addPhoto: (caseId: string, dataUrl: string, category?: PhotoCategory) => void
  removePhoto: (caseId: string, photoId: string) => void
  addAudioRecording: (caseId: string, url: string, durationSec: number, recordedBy?: 'public' | 'rescue') => void
  removeAudioRecording: (caseId: string, recordingId: string) => void
  finishPhotoStep: (caseId: string) => void
  setLocation: (caseId: string, location: GeoLocation) => void
  /** `callerRole` is only meaningful (and only need be passed) when setting
   * status to 'connecting' -- it stamps who's calling for CallScreen.tsx's
   * remote-party label; other status changes leave it as-is. */
  setCallStatus: (caseId: string, status: CallStatus, callerRole?: CallerRole) => void
  tickCallDuration: (caseId: string) => void
  finishCall: (caseId: string) => void
  // Rescue calling the reporter directly -- separate call relationship from
  // the citizen/rescue-to-1669 calls above (see EmergencyCase.rescueCallStatus).
  setRescueCallStatus: (caseId: string, status: CallStatus) => void
  answerRescueCall: (caseId: string) => void
  tickRescueCallDuration: (caseId: string) => void
  // Dispatcher pulling the assigned rescue crew into a live 1669 call (see
  // EmergencyCase.rescueCallInvite). Clearing is both "dispatcher cancels
  // the ring" and "the crew leaves the call".
  inviteRescueToCall: (caseId: string) => void
  acceptRescueCallInvite: (caseId: string) => void
  clearRescueCallInvite: (caseId: string) => void
  // Phone is entered on the photo step now, alongside the photos; the
  // report itself finalizes once the call ends. Incident details are
  // 1669's job (see submitDispatcherAssessment), not the caller's.
  setReporterPhone: (caseId: string, phone: string) => void
  /** Also collected on the photo step -- the reporter is the one actually
   * with the patient, so this prefills (not replaces) dispatch's own
   * consciousness field on the assessment form. */
  setReporterConsciousness: (caseId: string, consciousness: Consciousness) => void
  submitReport: (caseId: string) => void

  // dispatcher
  answerCall: (caseId: string) => void
  submitDispatcherAssessment: (
    caseId: string,
    data: Omit<IncidentDetails, 'callbackPhone'> & Omit<DispatcherAssessment, 'assessedAt'>,
  ) => void
  startFindingRescue: (caseId: string) => void
  assignRescueTeam: (caseId: string, team: RescueTeam, supportingTeam?: RescueTeam | null) => void
  /** Adds a second, equipped unit alongside an already-assigned primary
   * responder -- for when the equipment gap only becomes clear after the
   * fact, not just at the moment of initial assignment. */
  addSupportingRescueTeam: (caseId: string, team: RescueTeam) => void
  /** Rescue proposes an updated severity from on-scene findings (e.g. GCS)
   * -- sits pending until 1669 confirms or dismisses it. */
  proposeRescueSeverity: (caseId: string, severity: Severity, note?: string) => void
  /** 1669 confirms (copies the proposal into `assessment`) or dismisses a
   * pending rescue severity proposal. */
  confirmRescueSeverity: (caseId: string, accept: boolean) => void
  /** 1669 closes a case straight from `received` when the call was resolved
   * by phone advice alone -- no rescue/hospital pipeline needed. */
  closeCaseWithAdvice: (caseId: string, note: string) => void

  // shared -- addable by any role (reporter, 1669, rescue, or hospital) at
  // any point in the case lifecycle, not collected once up front.
  addRelativeContact: (caseId: string, phone: string, name?: string) => void

  // rescue
  rescueAcceptCase: (caseId: string) => void
  rescueRejectCase: (caseId: string) => void
  /** Which of the branch's own vehicles/crews actually handles this case --
   * picked by the branch's own staff, separate from (and after) dispatch's
   * branch-level assignment. `crewCount` defaults to the vehicle's own
   * static `members` when omitted. */
  assignVehicle: (caseId: string, vehicle: RescueVehicle, crewCount?: number) => void
  updateRescueProgress: (caseId: string, pct: number) => void
  rescueMarkArrived: (caseId: string) => void
  /** `severityProposal` is only passed when the rescuer's on-scene findings
   * suggest a different severity than the original phone assessment. */
  submitPatientInfo: (caseId: string, info: PatientInfo, severityProposal?: { severity: Severity; note?: string }) => void
  /** A follow-up note on the patient's condition after the initial record
   * -- syncs in real time to dispatch/hospital like the rest of the case. */
  addPatientUpdate: (caseId: string, note: string) => void
  /** Single entry point for how the hospital leg gets decided -- a normal
   * pick, or a documented refusal (see HospitalDecision). Sets
   * `selectedHospital` too when a hospital is included, and for
   * 'declined-all' takes the case straight to `completed`. */
  recordHospitalDecision: (
    caseId: string,
    input: { type: HospitalDecisionType; hospital?: Hospital; signatureUrl?: string; decidedBy?: string },
  ) => void
  startTransport: (caseId: string) => void
  markHospitalArrived: (caseId: string) => void

  // hospital
  hospitalAcceptingCases: boolean
  setHospitalAcceptingCases: (accepting: boolean) => void
  hospitalRejectCase: (caseId: string) => void
  hospitalConfirmAdmission: (caseId: string) => void
  completeCase: (caseId: string, opts?: { reason?: string; skippedPipeline?: boolean }) => void

  // public feedback
  markFeedbackSubmitted: (caseId: string) => void

  // notifications
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: (audience: NotificationAudience) => void

  // demo/reset
  seedDemoData: () => void
  resetAll: () => void

  // org rosters -- start as the static seed data (so pickers/assignment
  // work immediately) and get replaced by live Supabase rows once fetched,
  // so a self-registered new team/hospital (see src/lib/orgs.ts) actually
  // becomes visible/assignable app-wide, not just in its own profile.
  rescueTeams: RescueTeam[]
  hospitals: Hospital[]
  refreshOrgs: () => Promise<void>
}

function notify(
  set: (fn: (s: ResQState) => Partial<ResQState>) => void,
  n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>,
) {
  set((s) => ({
    notifications: [
      { ...n, id: uid('ntf'), createdAt: Date.now(), read: false },
      ...s.notifications,
    ].slice(0, 200),
  }))
}

export const useStore = create<ResQState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      authResolved: false,
      setAuthResolved: (resolved) => set({ authResolved: resolved }),
      cases: {},
      activeCaseId: null,
      notifications: [],
      caseSeq: 0,
      hydratedDemo: false,

      theme: 'light',
      setTheme: (theme) => set({ theme }),
      language: 'th',
      setLanguage: (language) => set({ language }),
      onboardingSeen: false,
      setOnboardingSeen: (seen) => set({ onboardingSeen: seen }),

      hospitalAcceptingCases: true,
      rescueTeams: MOCK_RESCUE_TEAMS,
      hospitals: MOCK_HOSPITALS,
      refreshOrgs: async () => {
        const orgs = await fetchOrgs()
        if (orgs) set({ rescueTeams: orgs.rescueTeams, hospitals: orgs.hospitals })
      },

      setUser: (user) => set({ currentUser: user }),
      logout: () => {
        set({ currentUser: null, viewingRole: null })
        void authSignOut()
      },

      viewingRole: null,
      setViewingRole: (role) => set({ viewingRole: role }),

      createCase: (reporterName, reporterPhone) => {
        const seq = get().caseSeq + 1
        const c = makeNewCase(seq, reporterName, reporterPhone)
        c.reporterUserId = get().currentUser?.id
        set((s) => ({
          cases: { ...s.cases, [c.id]: c },
          caseSeq: seq,
          activeCaseId: c.id,
        }))
        notify(set, {
          audience: 'public',
          caseId: c.id,
          title: t('เริ่มการขอความช่วยเหลือ'),
          message: t('สร้างเคส {caseNumber} เรียบร้อยแล้ว', { caseNumber: c.caseNumber }),
          tone: 'info',
        })
        return c.id
      },

      createDispatchCase: (input) => {
        const seq = get().caseSeq + 1
        const { incidentType, location, patientCount, conscious, notes, severity, injuryDescription, reporterName, reporterPhone } = input
        let c = makeNewCase(seq, reporterName, reporterPhone)
        c = pushStatus(c, 'received', 'บันทึกเคสโดยศูนย์สั่งการ 1669 (รับแจ้งเหตุทางโทรศัพท์ ไม่ผ่านแอปประชาชน)')
        c = {
          ...c,
          location,
          incidentDetails: { incidentType, location: location.address, patientCount, conscious, notes, callbackPhone: reporterPhone ?? '' },
          assessment: { severity, injuryDescription, assessedAt: Date.now() },
          reportedBy: 'dispatch',
        }
        set((s) => ({ cases: { ...s.cases, [c.id]: c }, caseSeq: seq, activeCaseId: c.id }))
        return c.id
      },

      createRescueFoundCase: (input) => {
        const seq = get().caseSeq + 1
        const { incidentType, location, patientCount, conscious, notes, severity, injuryDescription, team } = input
        let c = makeNewCase(seq)
        c = pushStatus(c, 'received', 'พบเหตุโดยหน่วยกู้ชีพเอง (ไม่ผ่านศูนย์สั่งการ)')
        c = pushStatus(c, 'finding-rescue')
        c = { ...c, assignedRescueTeam: team }
        c = pushStatus(c, 'rescue-assigned')
        c = { ...c, rescueEnRoutePct: 100 }
        c = pushStatus(c, 'rescue-en-route')
        c = pushStatus(c, 'rescue-arrived', 'หน่วยกู้ชีพถึงที่เกิดเหตุแล้ว (พบเหตุด้วยตนเอง)')
        c = {
          ...c,
          location,
          incidentDetails: { incidentType, location: location.address, patientCount, conscious, notes, callbackPhone: '' },
          assessment: { severity, injuryDescription, assessedAt: Date.now() },
          reportedBy: 'rescue',
        }
        set((s) => ({ cases: { ...s.cases, [c.id]: c }, caseSeq: seq, activeCaseId: c.id }))
        notify(set, {
          audience: 'dispatch',
          caseId: c.id,
          title: t('หน่วยกู้ชีพบันทึกเคสที่พบเอง'),
          message: t('{teamName} พบเหตุและบันทึกเคส {caseNumber} ด้วยตนเอง', { teamName: team.name, caseNumber: c.caseNumber }),
          tone: 'warning',
        })
        return c.id
      },

      setActiveCase: (caseId) => set({ activeCaseId: caseId }),

      // Discards an in-progress report draft (e.g. the reporter backs out of
      // the photo/details steps before submitting) so the next report starts
      // clean instead of resuming stale photos/audio/answers.
      deleteCase: (caseId) =>
        set((s) => {
          if (!(caseId in s.cases)) return {}
          const next = { ...s.cases }
          delete next[caseId]
          return { cases: next, activeCaseId: s.activeCaseId === caseId ? null : s.activeCaseId }
        }),

      addPhoto: (caseId, dataUrl, category) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const photo: EmergencyPhoto = { id: uid('photo'), dataUrl, takenAt: Date.now(), category }
          // Each guided category holds exactly one photo -- capturing a
          // retake replaces the existing one instead of piling up alongside it.
          const photos = category
            ? [...c.photos.filter((p) => p.category !== category), photo]
            : [...c.photos, photo]
          return { cases: { ...s.cases, [caseId]: { ...c, photos, updatedAt: Date.now() } } }
        }),

      removePhoto: (caseId, photoId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return {
            cases: {
              ...s.cases,
              [caseId]: { ...c, photos: c.photos.filter((p) => p.id !== photoId), updatedAt: Date.now() },
            },
          }
        }),

      addAudioRecording: (caseId, url, durationSec, recordedBy = 'public') =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const recording: AudioRecording = { id: uid('audio'), url, durationSec, recordedAt: Date.now(), recordedBy }
          return {
            cases: {
              ...s.cases,
              [caseId]: { ...c, audioRecordings: [...c.audioRecordings, recording], updatedAt: Date.now() },
            },
          }
        }),

      removeAudioRecording: (caseId, recordingId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return {
            cases: {
              ...s.cases,
              [caseId]: {
                ...c,
                audioRecordings: c.audioRecordings.filter((r) => r.id !== recordingId),
                updatedAt: Date.now(),
              },
            },
          }
        }),

      finishPhotoStep: (caseId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: pushStatus(c, 'photos-taken') } }
        }),

      setLocation: (caseId, location) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: { ...c, location, updatedAt: Date.now() } } }
        }),

      setCallStatus: (caseId, status, callerRole) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const updated = { ...c, callStatus: status, updatedAt: Date.now() }
          if (status === 'connecting' && callerRole) updated.activeCallerRole = callerRole
          // A crew invite only makes sense while that call is live.
          if (status !== 'in-call') updated.rescueCallInvite = undefined
          return { cases: { ...s.cases, [caseId]: updated } }
        }),

      // Dispatcher presses "รับสาย" on a ringing call — this is what actually
      // connects it, rather than the citizen's side auto-connecting itself.
      answerCall: (caseId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c || c.callStatus !== 'connecting') return {}
          return { cases: { ...s.cases, [caseId]: { ...c, callStatus: 'in-call', updatedAt: Date.now() } } }
        }),

      tickCallDuration: (caseId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return {
            cases: { ...s.cases, [caseId]: { ...c, callDurationSec: c.callDurationSec + 1 } },
          }
        }),

      setRescueCallStatus: (caseId, status) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const updated = { ...c, rescueCallStatus: status, updatedAt: Date.now() }
          if (status === 'connecting') updated.rescueCallDurationSec = 0
          return { cases: { ...s.cases, [caseId]: updated } }
        }),

      // The reporter presses "รับสาย" on a ringing rescue call -- mirrors
      // answerCall above but for this separate call relationship.
      answerRescueCall: (caseId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c || c.rescueCallStatus !== 'connecting') return {}
          return { cases: { ...s.cases, [caseId]: { ...c, rescueCallStatus: 'in-call', updatedAt: Date.now() } } }
        }),

      tickRescueCallDuration: (caseId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return {
            cases: { ...s.cases, [caseId]: { ...c, rescueCallDurationSec: (c.rescueCallDurationSec ?? 0) + 1 } },
          }
        }),

      inviteRescueToCall: (caseId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c || c.callStatus !== 'in-call' || !c.assignedRescueTeam) return {}
          return {
            cases: {
              ...s.cases,
              [caseId]: { ...c, rescueCallInvite: { status: 'ringing', invitedAt: Date.now() }, updatedAt: Date.now() },
            },
          }
        }),

      acceptRescueCallInvite: (caseId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c?.rescueCallInvite || c.callStatus !== 'in-call') return {}
          return {
            cases: {
              ...s.cases,
              [caseId]: { ...c, rescueCallInvite: { ...c.rescueCallInvite, status: 'joined' }, updatedAt: Date.now() },
            },
          }
        }),

      clearRescueCallInvite: (caseId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c?.rescueCallInvite) return {}
          return { cases: { ...s.cases, [caseId]: { ...c, rescueCallInvite: undefined, updatedAt: Date.now() } } }
        }),

      finishCall: (caseId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const updated = pushStatus({ ...c, callStatus: 'ended', rescueCallInvite: undefined }, 'called-1669')
          return { cases: { ...s.cases, [caseId]: updated } }
        }),

      setReporterPhone: (caseId, phone) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: { ...c, reporterPhone: phone, updatedAt: Date.now() } } }
        }),

      setReporterConsciousness: (caseId, consciousness) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: { ...c, reporterConsciousness: consciousness, updatedAt: Date.now() } } }
        }),

      submitReport: (caseId) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const updated = { ...c, location: c.location ?? { ...DEFAULT_INCIDENT_LOCATION } }
          return { cases: { ...s.cases, [caseId]: pushStatus(updated, 'received') } }
        })
        const c = get().cases[caseId]
        notify(set, {
          audience: 'dispatch',
          caseId,
          title: t('มีเคสฉุกเฉินใหม่'),
          message: t('เคส {caseNumber} ถูกส่งเข้าระบบแล้ว รอเจ้าหน้าที่กรอกรายละเอียดและประเมิน', { caseNumber: c?.caseNumber ?? '' }),
          tone: 'emergency',
        })
      },

      submitDispatcherAssessment: (caseId, data) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const { severity, injuryDescription, ...incident } = data
          const withData: EmergencyCase = {
            ...c,
            incidentDetails: { ...incident, callbackPhone: c.reporterPhone ?? '' },
            assessment: { severity, injuryDescription, assessedAt: Date.now() },
            updatedAt: Date.now(),
          }
          // A case reaching this page should already be 'received' (that's
          // what gates the dashboard/case-detail button that leads here),
          // but this is also reused to edit an existing assessment on a
          // case that's since moved further along -- so only ever advance
          // status forward to 'received' if it's currently earlier than
          // that, never regress an in-progress case being re-assessed.
          // Without this, a case that somehow reached this form before its
          // own status caught up to 'received' (e.g. a direct link) would
          // get real assessment data saved while staying stuck at an
          // earlier status forever -- every "find rescue team" action is
          // gated on status === 'received', so it would permanently hide
          // with no way to proceed.
          const updated =
            statusMeta(c.status).order < statusMeta('received').order ? pushStatus(withData, 'received') : withData
          return { cases: { ...s.cases, [caseId]: updated } }
        })
        const c = get().cases[caseId]
        notify(set, {
          audience: 'public',
          caseId,
          title: t('เจ้าหน้าที่ประเมินระดับความรุนแรงแล้ว'),
          message: t('เคส {caseNumber} ได้รับการประเมินจากศูนย์ 1669 แล้ว', { caseNumber: c?.caseNumber ?? '' }),
          tone: 'info',
        })
      },

      startFindingRescue: (caseId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: pushStatus(c, 'finding-rescue') } }
        }),

      assignRescueTeam: (caseId, team, supportingTeam) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const updated = pushStatus(
            { ...c, assignedRescueTeam: team, supportingRescueTeam: supportingTeam ?? null },
            'rescue-assigned',
          )
          return { cases: { ...s.cases, [caseId]: updated } }
        })
        const c = get().cases[caseId]
        notify(set, {
          audience: 'rescue',
          caseId,
          title: t('ได้รับมอบหมายเคสใหม่'),
          message: t('คุณได้รับมอบหมายเคส {caseNumber} กรุณายืนยันการรับเคส', { caseNumber: c?.caseNumber ?? '' }),
          tone: 'warning',
        })
        notify(set, {
          audience: 'public',
          caseId,
          title: t('มอบหมายหน่วยกู้ชีพแล้ว'),
          message: t('หน่วยกู้ชีพ {teamName} ได้รับมอบหมายเคสของคุณแล้ว', { teamName: team.name }),
          tone: 'success',
        })
      },

      addSupportingRescueTeam: (caseId, team) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: { ...c, supportingRescueTeam: team, updatedAt: Date.now() } } }
        })
        const c = get().cases[caseId]
        notify(set, {
          audience: 'rescue',
          caseId,
          title: t('ได้รับมอบหมายเป็นหน่วยสนับสนุน'),
          message: t('เคส {caseNumber} ต้องการอุปกรณ์เฉพาะทางจากหน่วยของคุณ', { caseNumber: c?.caseNumber ?? '' }),
          tone: 'warning',
        })
        notify(set, {
          audience: 'public',
          caseId,
          title: t('เพิ่มหน่วยสนับสนุนแล้ว'),
          message: t('หน่วยกู้ชีพ {teamName} เข้าร่วมช่วยเหลือเคสของคุณ', { teamName: team.name }),
          tone: 'info',
        })
      },

      proposeRescueSeverity: (caseId, severity, note) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const updated = { ...c, rescueSeverityProposal: { severity, note, proposedAt: Date.now() }, updatedAt: Date.now() }
          return { cases: { ...s.cases, [caseId]: updated } }
        })
        const c = get().cases[caseId]
        notify(set, {
          audience: 'dispatch',
          caseId,
          title: t('หน่วยกู้ชีพเสนอปรับระดับความรุนแรง'),
          message: t('เคส {caseNumber}: หน่วยกู้ชีพประเมินจากที่เกิดเหตุแล้วเสนอปรับระดับความรุนแรง กรุณายืนยัน', { caseNumber: c?.caseNumber ?? '' }),
          tone: 'warning',
        })
      },

      confirmRescueSeverity: (caseId, accept) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c || !c.rescueSeverityProposal) return {}
          const updated: EmergencyCase = accept
            ? {
                ...c,
                assessment: c.assessment
                  ? { ...c.assessment, severity: c.rescueSeverityProposal.severity, severityConfirmedAt: Date.now() }
                  : c.assessment,
                rescueSeverityProposal: null,
                updatedAt: Date.now(),
              }
            : { ...c, rescueSeverityProposal: null, updatedAt: Date.now() }
          return { cases: { ...s.cases, [caseId]: updated } }
        }),

      closeCaseWithAdvice: (caseId, note) => {
        const c = get().cases[caseId]
        if (!c || c.status !== 'received' || !note.trim()) return
        get().completeCase(caseId, { reason: note.trim(), skippedPipeline: true })
      },

      addRelativeContact: (caseId, phone, name) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const contact: RelativeContact = {
            id: uid('rc'),
            phone,
            name,
            addedBy: get().currentUser?.role ?? 'public',
            addedAt: Date.now(),
          }
          return {
            cases: {
              ...s.cases,
              [caseId]: { ...c, relativeContacts: [...(c.relativeContacts ?? []), contact], updatedAt: Date.now() },
            },
          }
        })
      },

      rescueAcceptCase: (caseId) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const updated = pushStatus({ ...c, rescueEnRoutePct: 0 }, 'rescue-en-route')
          return { cases: { ...s.cases, [caseId]: updated } }
        })
        const c = get().cases[caseId]
        notify(set, {
          audience: 'dispatch',
          caseId,
          title: t('หน่วยกู้ชีพรับเคสแล้ว'),
          message: t('{teamName} กำลังเดินทางไปยังจุดเกิดเหตุ', { teamName: c?.assignedRescueTeam?.name ?? t('หน่วยกู้ชีพ') }),
          tone: 'success',
        })
        notify(set, {
          audience: 'public',
          caseId,
          title: t('หน่วยกู้ชีพกำลังเดินทาง'),
          message: t('หน่วยกู้ชีพตอบรับเคสของคุณแล้วและกำลังเดินทางมา'),
          tone: 'success',
        })
      },

      rescueRejectCase: (caseId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const reverted = {
            ...c,
            assignedRescueTeam: null,
            assignedVehicle: null,
            supportingRescueTeam: null,
            rescueRejectedAt: Date.now(),
          }
          return { cases: { ...s.cases, [caseId]: pushStatus(reverted, 'finding-rescue', 'หน่วยกู้ชีพปฏิเสธเคส ระบบกำลังค้นหาหน่วยใหม่') } }
        }),

      assignVehicle: (caseId, vehicle, crewCount) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const updated = {
            ...c,
            assignedVehicle: vehicle,
            assignedVehicleCrewCount: crewCount ?? vehicle.members,
            updatedAt: Date.now(),
          }
          return { cases: { ...s.cases, [caseId]: updated } }
        }),

      updateRescueProgress: (caseId, pct) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: { ...c, rescueEnRoutePct: pct } } }
        }),

      rescueMarkArrived: (caseId) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: pushStatus({ ...c, rescueEnRoutePct: 100 }, 'rescue-arrived') } }
        })
        notify(set, {
          audience: 'public',
          caseId,
          title: t('หน่วยกู้ชีพถึงจุดเกิดเหตุแล้ว'),
          message: t('หน่วยกู้ชีพถึงที่เกิดเหตุและกำลังเข้าช่วยเหลือ'),
          tone: 'success',
        })
      },

      submitPatientInfo: (caseId, info, severityProposal) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const withInfo = { ...c, patientInfo: { ...info, recordedAt: Date.now() } }
          const withProposal = severityProposal
            ? { ...withInfo, rescueSeverityProposal: { ...severityProposal, proposedAt: Date.now() } }
            : withInfo
          const updated = pushStatus(withProposal, 'assisted')
          return { cases: { ...s.cases, [caseId]: updated } }
        }),

      addPatientUpdate: (caseId, note) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const update: PatientUpdate = { id: uid('pu'), note, recordedAt: Date.now() }
          return {
            cases: {
              ...s.cases,
              [caseId]: { ...c, patientUpdates: [...(c.patientUpdates ?? []), update], updatedAt: Date.now() },
            },
          }
        })
        const c = get().cases[caseId]
        notify(set, {
          audience: 'dispatch',
          caseId,
          title: t('อัปเดตอาการผู้ป่วย'),
          message: t('เคส {caseNumber}: {note}', { caseNumber: c?.caseNumber ?? '', note: note ?? '' }),
          tone: 'info',
        })
        notify(set, {
          audience: 'hospital',
          caseId,
          title: t('อัปเดตอาการผู้ป่วย'),
          message: t('เคส {caseNumber}: {note}', { caseNumber: c?.caseNumber ?? '', note: note ?? '' }),
          tone: 'info',
        })
      },

      recordHospitalDecision: (caseId, input) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          let updated: EmergencyCase = {
            ...c,
            hospitalDecision: { ...input, decidedAt: Date.now() },
            updatedAt: Date.now(),
          }
          if (input.hospital) updated = { ...updated, selectedHospital: input.hospital }
          if (input.type === 'declined-all') {
            updated = pushStatus(
              { ...updated, closedWithoutDispatch: true },
              'completed',
              'ญาติไม่ประสงค์ส่งโรงพยาบาล',
            )
          }
          return { cases: { ...s.cases, [caseId]: updated } }
        })
        const c = get().cases[caseId]
        if (input.type === 'declined-all') {
          notify(set, {
            audience: 'all',
            caseId,
            title: t('เคสเสร็จสิ้น'),
            message: t('เคส {caseNumber}: ญาติไม่ประสงค์ส่งโรงพยาบาล', { caseNumber: c?.caseNumber ?? '' }),
            tone: 'info',
          })
        } else if (input.hospital) {
          notify(set, {
            audience: 'hospital',
            caseId,
            title: t('มีผู้ป่วยกำลังนำส่ง'),
            message: t('เคส {caseNumber} เลือกส่งตัวมาที่โรงพยาบาลของท่าน กรุณาเตรียมทีมรักษา', { caseNumber: c?.caseNumber ?? '' }),
            tone: 'emergency',
          })
        }
      },

      startTransport: (caseId) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: pushStatus({ ...c, rescueEnRoutePct: 0 }, 'transporting') } }
        })
        notify(set, {
          audience: 'public',
          caseId,
          title: t('กำลังนำส่งโรงพยาบาล'),
          message: t('หน่วยกู้ชีพกำลังนำส่งผู้ป่วยไปยังโรงพยาบาลที่เลือก'),
          tone: 'info',
        })
      },

      markHospitalArrived: (caseId) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: pushStatus({ ...c, rescueEnRoutePct: 100 }, 'hospital-arrived') } }
        })
        const c = get().cases[caseId]
        notify(set, {
          audience: 'hospital',
          caseId,
          title: t('ผู้ป่วยถึงโรงพยาบาลแล้ว'),
          message: t('เคส {caseNumber} ถึงโรงพยาบาลแล้ว กรุณายืนยันการรับผู้ป่วย', { caseNumber: c?.caseNumber ?? '' }),
          tone: 'warning',
        })
      },

      setHospitalAcceptingCases: (accepting) => set({ hospitalAcceptingCases: accepting }),

      hospitalRejectCase: (caseId) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const reverted = { ...c, selectedHospital: null, rescueEnRoutePct: 0 }
          return {
            cases: {
              ...s.cases,
              [caseId]: pushStatus(reverted, 'assisted', 'โรงพยาบาลปฏิเสธเคส กรุณาเลือกโรงพยาบาลใหม่'),
            },
          }
        })
        const c = get().cases[caseId]
        notify(set, {
          audience: 'rescue',
          caseId,
          title: t('โรงพยาบาลปฏิเสธเคส'),
          message: t('เคส {caseNumber} ถูกปฏิเสธ กรุณาเลือกโรงพยาบาลใหม่', { caseNumber: c?.caseNumber ?? '' }),
          tone: 'warning',
        })
      },

      hospitalConfirmAdmission: (caseId) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: pushStatus(c, 'hospital-received') } }
        })
        notify(set, {
          audience: 'public',
          caseId,
          title: t('โรงพยาบาลรับผู้ป่วยแล้ว'),
          message: t('โรงพยาบาลยืนยันการรับตัวผู้ป่วยเรียบร้อยแล้ว'),
          tone: 'success',
        })
      },

      completeCase: (caseId, opts) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const withFlag = opts?.skippedPipeline ? { ...c, closedWithoutDispatch: true } : c
          return { cases: { ...s.cases, [caseId]: pushStatus(withFlag, 'completed', opts?.reason) } }
        })
        notify(set, {
          audience: 'all',
          caseId,
          title: t('เคสเสร็จสิ้น'),
          message: opts?.reason ?? t('กระบวนการช่วยเหลือฉุกเฉินเสร็จสมบูรณ์แล้ว'),
          tone: 'success',
        })
        // Scene photos/audio stay in the case record for the hospital's
        // records -- dispatch and rescue just stop *displaying* them once
        // the case is completed (see the `completed` gate in their case
        // detail views), so there's no separate per-agency copy to delete.
      },

      markFeedbackSubmitted: (caseId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: { ...c, feedbackSubmitted: true, updatedAt: Date.now() } } }
        }),

      addNotification: (n) => notify(set, n),

      markNotificationRead: (id) =>
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),

      markAllNotificationsRead: (audience) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.audience === audience || audience === 'all' ? { ...n, read: true } : n,
          ),
        })),

      seedDemoData: () => {
        if (get().hydratedDemo || Object.keys(get().cases).length > 0) return
        const seq = get().caseSeq + 1
        let demo = makeNewCase(seq, 'สมชาย ใจดี', '081-234-5678')
        demo = pushStatus(demo, 'photos-taken')
        demo = pushStatus(demo, 'called-1669')
        demo = {
          ...demo,
          location: { ...DEFAULT_INCIDENT_LOCATION },
          incidentDetails: {
            incidentType: 'อุบัติเหตุทางถนน',
            location: DEFAULT_INCIDENT_LOCATION.address,
            patientCount: 1,
            conscious: 'conscious',
            callbackPhone: '081-234-5678',
            notes: 'ผู้บาดเจ็บรู้สึกตัวดี แต่มีอาการเจ็บบริเวณขาขวา',
          },
        }
        demo = pushStatus(demo, 'received')
        demo = {
          ...demo,
          assessment: {
            severity: 2,
            injuryDescription: 'ผู้บาดเจ็บมีแผลที่ขาและศีรษะจากอุบัติเหตุรถจักรยานยนต์',
            assessedAt: Date.now(),
          },
        }
        demo = pushStatus(demo, 'finding-rescue')
        demo = { ...demo, assignedRescueTeam: MOCK_RESCUE_TEAMS[0] }
        demo = pushStatus(demo, 'rescue-assigned')
        demo = { ...demo, rescueEnRoutePct: 45 }
        demo = pushStatus(demo, 'rescue-en-route')
        demo = { ...demo, isDemo: true }

        set((s) => ({
          cases: { ...s.cases, [demo.id]: demo },
          caseSeq: seq,
          hydratedDemo: true,
        }))
      },

      resetAll: () =>
        set({
          cases: {},
          activeCaseId: null,
          notifications: [],
          caseSeq: 0,
          hydratedDemo: false,
        }),
    }),
    {
      name: 'resq-storage',
      version: 8,
      // currentUser is no longer trustworthy from localStorage alone -- it's
      // derived fresh from the live Supabase session + profile on load (see
      // App.tsx), so persisting the old value here would just be a second,
      // conflicting source of truth (and the pre-auth version had no
      // approvalStatus/isAdmin fields at all).
      partialize: (state) => {
        const { currentUser: _currentUser, authResolved: _authResolved, ...rest } = state
        return rest
      },
      migrate: (persisted: any, version: number) => {
        if (version < 2 && persisted?.cases) {
          for (const c of Object.values(persisted.cases) as any[]) {
            if (c && !Array.isArray(c.audioRecordings)) {
              c.audioRecordings = []
            }
          }
        }
        if (version < 3 && persisted?.cases) {
          for (const c of Object.values(persisted.cases) as any[]) {
            if (c && c.rescueRejectedAt === undefined) {
              c.rescueRejectedAt = null
            }
          }
        }
        if (version < 4 && persisted?.cases) {
          for (const c of Object.values(persisted.cases) as any[]) {
            if (c && !Array.isArray(c.patientUpdates)) {
              c.patientUpdates = []
            }
          }
        }
        if (version < 6 && persisted?.cases) {
          for (const c of Object.values(persisted.cases) as any[]) {
            if (c && !Array.isArray(c.relativeContacts)) {
              c.relativeContacts = []
            }
          }
        }
        if (version < 7 && Array.isArray(persisted?.rescueTeams)) {
          // Branch/vehicle split (see rescueAssignment.ts) made `vehicles`
          // required on RescueTeam. A team cached before that split has none
          // at all -- fold its old flat unitCode/vehicle/equipment fields
          // (if any) into a single vehicle instead of just defaulting to []
          // so `team.vehicles.some(...)` doesn't crash on stale localStorage.
          for (const team of persisted.rescueTeams as any[]) {
            if (team && !Array.isArray(team.vehicles)) {
              team.vehicles = team.unitCode
                ? [
                    {
                      id: `${team.id}-v1`,
                      rescueTeamId: team.id,
                      unitCode: team.unitCode,
                      members: team.members ?? 1,
                      vehicle: team.vehicle ?? '',
                      equipment: team.equipment ?? [],
                      driverName: team.driverName,
                      plateNumber: team.plateNumber,
                    },
                  ]
                : []
            }
          }
        }
        if (version < 8 && Array.isArray(persisted?.rescueTeams)) {
          // Vehicle capability tiers (CLS/ALS/BLS) are new -- a vehicle
          // cached before this defaults to the lowest/safest tier rather
          // than claim capability that was never confirmed.
          for (const team of persisted.rescueTeams as any[]) {
            for (const v of team?.vehicles ?? []) {
              if (v && !v.level) v.level = 'BLS'
            }
          }
        }
        return persisted
      },
    },
  ),
)

export function getCaseById(caseId: string | null | undefined): EmergencyCase | null {
  if (!caseId) return null
  return useStore.getState().cases[caseId] ?? null
}

export { MOCK_HOSPITALS, MOCK_RESCUE_TEAMS }
export type { Role }
