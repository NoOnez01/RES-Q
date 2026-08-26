import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppNotification,
  AppUser,
  AudioRecording,
  CallStatus,
  CaseStatus,
  DispatcherAssessment,
  EmergencyCase,
  EmergencyPhoto,
  GeoLocation,
  Hospital,
  IncidentDetails,
  NotificationAudience,
  PhotoCategory,
  PatientInfo,
  Role,
  RescueTeam,
} from './types'
import { statusMeta } from './types'
import { DEFAULT_INCIDENT_LOCATION, MOCK_HOSPITALS, MOCK_RESCUE_TEAMS } from './mockData'
import { formatCaseNumber, uid } from './utils'

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
    assignedRescueTeam: null,
    selectedHospital: null,
    rescueEnRoutePct: 0,
    rescueRejectedAt: null,
    timeline: [],
    reporterName,
    reporterPhone,
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
  setUser: (user: AppUser) => void
  logout: () => void

  // case lifecycle — public
  createCase: (reporterName?: string, reporterPhone?: string) => string
  setActiveCase: (caseId: string | null) => void
  deleteCase: (caseId: string) => void
  addPhoto: (caseId: string, dataUrl: string, category?: PhotoCategory) => void
  removePhoto: (caseId: string, photoId: string) => void
  addAudioRecording: (caseId: string, url: string, durationSec: number) => void
  removeAudioRecording: (caseId: string, recordingId: string) => void
  finishPhotoStep: (caseId: string) => void
  setLocation: (caseId: string, location: GeoLocation) => void
  setCallStatus: (caseId: string, status: CallStatus) => void
  tickCallDuration: (caseId: string) => void
  finishCall: (caseId: string) => void
  submitIncidentDetails: (caseId: string, details: IncidentDetails) => void

  // dispatcher
  answerCall: (caseId: string) => void
  submitDispatcherAssessment: (caseId: string, assessment: Omit<DispatcherAssessment, 'assessedAt'>) => void
  startFindingRescue: (caseId: string) => void
  assignRescueTeam: (caseId: string, team: RescueTeam) => void

  // rescue
  rescueAcceptCase: (caseId: string) => void
  rescueRejectCase: (caseId: string) => void
  updateRescueProgress: (caseId: string, pct: number) => void
  rescueMarkArrived: (caseId: string) => void
  submitPatientInfo: (caseId: string, info: PatientInfo) => void
  selectHospital: (caseId: string, hospital: Hospital) => void
  startTransport: (caseId: string) => void
  markHospitalArrived: (caseId: string) => void

  // hospital
  hospitalConfirmAdmission: (caseId: string) => void
  completeCase: (caseId: string) => void

  // notifications
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: (audience: NotificationAudience) => void

  // demo/reset
  seedDemoData: () => void
  resetAll: () => void
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

      setUser: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),

      createCase: (reporterName, reporterPhone) => {
        const seq = get().caseSeq + 1
        const c = makeNewCase(seq, reporterName, reporterPhone)
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

      addAudioRecording: (caseId, url, durationSec) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const recording: AudioRecording = { id: uid('audio'), url, durationSec, recordedAt: Date.now() }
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

      setCallStatus: (caseId, status) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: { ...c, callStatus: status, updatedAt: Date.now() } } }
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

      submitIncidentDetails: (caseId, details) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const withDetails = {
            ...c,
            incidentDetails: details,
            location: c.location ?? { ...DEFAULT_INCIDENT_LOCATION },
          }
          return { cases: { ...s.cases, [caseId]: pushStatus(withDetails, 'received') } }
        })
        const c = get().cases[caseId]
        notify(set, {
          audience: 'dispatch',
          caseId,
          title: 'มีเคสฉุกเฉินใหม่',
          message: `เคส ${c?.caseNumber ?? ''} ถูกส่งเข้าระบบแล้ว รอการมอบหมายหน่วยกู้ภัย`,
          tone: 'emergency',
        })
      },

      submitDispatcherAssessment: (caseId, assessment) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const updated: EmergencyCase = {
            ...c,
            assessment: { ...assessment, assessedAt: Date.now() },
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

      assignRescueTeam: (caseId, team) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const updated = pushStatus({ ...c, assignedRescueTeam: team }, 'rescue-assigned')
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
          title: 'มอบหมายหน่วยกู้ภัยแล้ว',
          message: `หน่วยกู้ภัย ${team.name} ได้รับมอบหมายเคสของคุณแล้ว`,
          tone: 'success',
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
          title: 'หน่วยกู้ภัยรับเคสแล้ว',
          message: `${c?.assignedRescueTeam?.name ?? 'หน่วยกู้ภัย'} กำลังเดินทางไปยังจุดเกิดเหตุ`,
          tone: 'success',
        })
        notify(set, {
          audience: 'public',
          caseId,
          title: 'หน่วยกู้ภัยกำลังเดินทาง',
          message: 'หน่วยกู้ภัยตอบรับเคสของคุณแล้วและกำลังเดินทางมา',
          tone: 'success',
        })
      },

      rescueRejectCase: (caseId) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const reverted = { ...c, assignedRescueTeam: null, rescueRejectedAt: Date.now() }
          return { cases: { ...s.cases, [caseId]: pushStatus(reverted, 'finding-rescue', 'หน่วยกู้ภัยปฏิเสธเคส ระบบกำลังค้นหาหน่วยใหม่') } }
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
          title: 'หน่วยกู้ภัยถึงจุดเกิดเหตุแล้ว',
          message: 'หน่วยกู้ภัยถึงที่เกิดเหตุและกำลังเข้าช่วยเหลือ',
          tone: 'success',
        })
      },

      submitPatientInfo: (caseId, info) =>
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          const updated = pushStatus({ ...c, patientInfo: { ...info, recordedAt: Date.now() } }, 'assisted')
          return { cases: { ...s.cases, [caseId]: updated } }
        }),

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
          message: 'หน่วยกู้ภัยกำลังนำส่งผู้ป่วยไปยังโรงพยาบาลที่เลือก',
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

      completeCase: (caseId) => {
        set((s) => {
          const c = s.cases[caseId]
          if (!c) return {}
          return { cases: { ...s.cases, [caseId]: pushStatus(c, 'completed') } }
        })
        notify(set, {
          audience: 'all',
          caseId,
          title: 'เคสเสร็จสิ้น',
          message: 'กระบวนการช่วยเหลือฉุกเฉินเสร็จสมบูรณ์แล้ว',
          tone: 'success',
        })
      },

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

        set((s) => ({
          cases: { ...s.cases, [demo.id]: demo },
          caseSeq: seq,
          hydratedDemo: true,
        }))
      },

      resetAll: () =>
        set({
          currentUser: null,
          cases: {},
          activeCaseId: null,
          notifications: [],
          caseSeq: 0,
          hydratedDemo: false,
        }),
    }),
    {
      name: 'resq-storage',
      version: 3,
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
