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

  // auth / role
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
  selectHospital: (caseId: string, hospital: Hospital) => void
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
      cases: {},
      activeCaseId: null,
      notifications: [],
      caseSeq: 0,
      hydratedDemo: false,
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
          title: 'เริ่มการขอความช่วยเหลือ',
          message: `สร้างเคส ${c.caseNumber} เรียบร้อยแล้ว`,
          tone: 'info',
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

      finishCall: (caseId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const updated = pushStatus({ ...c, callStatus: 'ended' }, 'called-1669')
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
          title: 'มีเคสฉุกเฉินใหม่',
          message: `เคส ${c?.caseNumber ?? ''} ถูกส่งเข้าระบบแล้ว รอเจ้าหน้าที่กรอกรายละเอียดและประเมิน`,
          tone: 'emergency',
        })
      },

      submitDispatcherAssessment: (caseId, data) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const { severity, injuryDescription, ...incident } = data
          const updated: EmergencyCase = {
            ...c,
            incidentDetails: { ...incident, callbackPhone: c.reporterPhone ?? '' },
            assessment: { severity, injuryDescription, assessedAt: Date.now() },
            updatedAt: Date.now(),
          }
          return { cases: { ...s.cases, [caseId]: updated } }
        })
        const c = get().cases[caseId]
        notify(set, {
          audience: 'public',
          caseId,
          title: 'เจ้าหน้าที่ประเมินระดับความรุนแรงแล้ว',
          message: `เคส ${c?.caseNumber ?? ''} ได้รับการประเมินจากศูนย์ 1669 แล้ว`,
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
          title: 'ได้รับมอบหมายเคสใหม่',
          message: `คุณได้รับมอบหมายเคส ${c?.caseNumber ?? ''} กรุณายืนยันการรับเคส`,
          tone: 'warning',
        })
        notify(set, {
          audience: 'public',
          caseId,
          title: 'มอบหมายหน่วยกู้ชีพแล้ว',
          message: `หน่วยกู้ชีพ ${team.name} ได้รับมอบหมายเคสของคุณแล้ว`,
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
          title: 'ได้รับมอบหมายเป็นหน่วยสนับสนุน',
          message: `เคส ${c?.caseNumber ?? ''} ต้องการอุปกรณ์เฉพาะทางจากหน่วยของคุณ`,
          tone: 'warning',
        })
        notify(set, {
          audience: 'public',
          caseId,
          title: 'เพิ่มหน่วยสนับสนุนแล้ว',
          message: `หน่วยกู้ชีพ ${team.name} เข้าร่วมช่วยเหลือเคสของคุณ`,
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
          title: 'หน่วยกู้ชีพเสนอปรับระดับความรุนแรง',
          message: `เคส ${c?.caseNumber ?? ''}: หน่วยกู้ชีพประเมินจากที่เกิดเหตุแล้วเสนอปรับระดับความรุนแรง กรุณายืนยัน`,
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
          title: 'หน่วยกู้ชีพรับเคสแล้ว',
          message: `${c?.assignedRescueTeam?.name ?? 'หน่วยกู้ชีพ'} กำลังเดินทางไปยังจุดเกิดเหตุ`,
          tone: 'success',
        })
        notify(set, {
          audience: 'public',
          caseId,
          title: 'หน่วยกู้ชีพกำลังเดินทาง',
          message: 'หน่วยกู้ชีพตอบรับเคสของคุณแล้วและกำลังเดินทางมา',
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
          title: 'หน่วยกู้ชีพถึงจุดเกิดเหตุแล้ว',
          message: 'หน่วยกู้ชีพถึงที่เกิดเหตุและกำลังเข้าช่วยเหลือ',
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
          title: 'อัปเดตอาการผู้ป่วย',
          message: `เคส ${c?.caseNumber ?? ''}: ${note}`,
          tone: 'info',
        })
        notify(set, {
          audience: 'hospital',
          caseId,
          title: 'อัปเดตอาการผู้ป่วย',
          message: `เคส ${c?.caseNumber ?? ''}: ${note}`,
          tone: 'info',
        })
      },

      selectHospital: (caseId, hospital) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: { ...c, selectedHospital: hospital, updatedAt: Date.now() } } }
        })
        const c = get().cases[caseId]
        notify(set, {
          audience: 'hospital',
          caseId,
          title: 'มีผู้ป่วยกำลังนำส่ง',
          message: `เคส ${c?.caseNumber ?? ''} เลือกส่งตัวมาที่โรงพยาบาลของท่าน กรุณาเตรียมทีมรักษา`,
          tone: 'emergency',
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
            title: 'เคสเสร็จสิ้น',
            message: `เคส ${c?.caseNumber ?? ''}: ญาติไม่ประสงค์ส่งโรงพยาบาล`,
            tone: 'info',
          })
        } else if (input.hospital) {
          notify(set, {
            audience: 'hospital',
            caseId,
            title: 'มีผู้ป่วยกำลังนำส่ง',
            message: `เคส ${c?.caseNumber ?? ''} เลือกส่งตัวมาที่โรงพยาบาลของท่าน กรุณาเตรียมทีมรักษา`,
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
          title: 'กำลังนำส่งโรงพยาบาล',
          message: 'หน่วยกู้ชีพกำลังนำส่งผู้ป่วยไปยังโรงพยาบาลที่เลือก',
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
          title: 'ผู้ป่วยถึงโรงพยาบาลแล้ว',
          message: `เคส ${c?.caseNumber ?? ''} ถึงโรงพยาบาลแล้ว กรุณายืนยันการรับผู้ป่วย`,
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
          title: 'โรงพยาบาลปฏิเสธเคส',
          message: `เคส ${c?.caseNumber ?? ''} ถูกปฏิเสธ กรุณาเลือกโรงพยาบาลใหม่`,
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
          title: 'โรงพยาบาลรับผู้ป่วยแล้ว',
          message: 'โรงพยาบาลยืนยันการรับตัวผู้ป่วยเรียบร้อยแล้ว',
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
          title: 'เคสเสร็จสิ้น',
          message: opts?.reason ?? 'กระบวนการช่วยเหลือฉุกเฉินเสร็จสมบูรณ์แล้ว',
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
        const { currentUser: _currentUser, ...rest } = state
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
