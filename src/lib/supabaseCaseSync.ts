import { supabase, supabaseEnabled } from './supabase'
import { useStore } from './store'
import type { EmergencyCase } from './types'

let initialized = false
const lastPushed = new Map<string, string>()
const lastPulled = new Map<string, string>()
const pendingPushTimers = new Map<string, ReturnType<typeof setTimeout>>()
const PUSH_DEBOUNCE_MS = 250
// A case just deleted locally (e.g. a discarded report draft) can still have
// its own earlier "created"/"updated" realtime event in flight -- without
// this, that late echo would land after the delete and silently resurrect
// the case via applyRemote(). Once an id is deleted in this tab it stays
// deleted for the rest of the session.
const deletedIds = new Set<string>()

function serialize(c: EmergencyCase): string {
  return JSON.stringify(c)
}

// Supabase's jsonb column round-trips `undefined` fields inconsistently
// depending on nesting; a JSON round-trip strips them the same way
// JSON.stringify already does for serialize(), keeping push/pull dedup exact.
function toPlainObject(c: EmergencyCase): Record<string, unknown> {
  return JSON.parse(JSON.stringify(c))
}

function toRow(c: EmergencyCase) {
  return {
    case_id: c.caseNumber,
    status: c.status,
    incident_type: c.incidentDetails?.incidentType ?? null,
    location: c.incidentDetails?.location ?? c.location?.address ?? null,
    patient_count: c.incidentDetails?.patientCount ?? null,
    conscious: c.incidentDetails?.conscious ?? null,
    callback_phone: c.incidentDetails?.callbackPhone ?? null,
    notes: c.incidentDetails?.notes ?? null,
    reporter_name: c.reporterName ?? null,
    reporter_phone: c.reporterPhone ?? null,

    // ศูนย์ 1669
    severity: c.assessment?.severity ?? null,
    injury_description: c.assessment?.injuryDescription ?? null,
    assessed_at: c.assessment ? new Date(c.assessment.assessedAt).toISOString() : null,

    // หน่วยกู้ชีพ: assignment + progress
    rescue_team_name: c.assignedRescueTeam?.name ?? null,
    rescue_team_unit_code: c.assignedRescueTeam?.unitCode ?? null,
    rescue_team_phone: c.assignedRescueTeam?.phone ?? null,
    rescue_en_route_pct: c.rescueEnRoutePct ?? null,

    // หน่วยกู้ชีพ: patient info recorded at the scene
    patient_name: c.patientInfo?.name ?? null,
    patient_age: c.patientInfo?.age ?? null,
    patient_gender: c.patientInfo?.gender ?? null,
    patient_vitals: c.patientInfo?.vitals ?? null,
    first_aid: c.patientInfo?.firstAid ?? null,

    // โรงพยาบาล
    selected_hospital_name: c.selectedHospital?.name ?? null,
    selected_hospital_phone: c.selectedHospital?.phone ?? null,

    timeline: c.timeline,

    created_at: new Date(c.createdAt).toISOString(),
    updated_at: new Date(c.updatedAt).toISOString(),

    // The full case, mirroring what Firestore used to hold as a whole
    // document — this is what pull/reconciliation actually reads back; the
    // columns above are just for convenient SQL querying/reporting.
    data: toPlainObject(c),
  }
}

/**
 * Real-time two-way sync between the local zustand `cases` store and
 * Supabase's `cases` table — the single backend now, replacing the old
 * Firebase/Supabase split. Both directions are deduped against their own
 * last known value to avoid an endless push -> pull -> push loop. Requires
 * supabase-realtime-sync.sql to have been run (adds the `data` column,
 * turns on REPLICA IDENTITY FULL, and enables the realtime publication).
 */
export function initSupabaseCaseSync(): void {
  if (initialized || !supabaseEnabled || !supabase) return
  initialized = true
  const client = supabase

  function applyRemote(remote: EmergencyCase) {
    if (deletedIds.has(remote.id)) return
    const json = serialize(remote)
    if (lastPushed.get(remote.id) === json) return
    // Belt-and-suspenders alongside the push-side debounce below: reject an
    // incoming version older than what's already applied locally, so a
    // stale/out-of-order echo can't revert a case backwards.
    const local = useStore.getState().cases[remote.id]
    if (local && local.updatedAt > remote.updatedAt) return
    lastPulled.set(remote.id, json)
    useStore.setState((s) => ({ cases: { ...s.cases, [remote.id]: remote } }))
  }

  function cancelPendingPush(id: string) {
    const timer = pendingPushTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      pendingPushTimers.delete(id)
    }
  }

  function removeRemote(id: string) {
    deletedIds.add(id)
    cancelPendingPush(id)
    lastPushed.delete(id)
    lastPulled.delete(id)
    useStore.setState((s) => {
      if (!(id in s.cases)) return {}
      const next = { ...s.cases }
      delete next[id]
      return { cases: next }
    })
  }

  function pushCase(c: EmergencyCase) {
    if (c.isDemo) return
    const row = toRow(c)
    const json = serialize(c)
    if (lastPulled.get(c.id) === json) return
    lastPushed.set(c.id, json)
    void client
      .from('cases')
      .upsert(row, { onConflict: 'case_id' })
      .then(({ error }) => {
        if (error) console.error('Supabase case sync failed:', error.message)
      })
  }

  /**
   * A case mutated several times in quick succession (e.g. the whole
   * create -> submit details -> assess -> assign chain) fires an overlapping
   * push per step, all within the same millisecond. Realtime echoes aren't
   * guaranteed to arrive in send order, so an out-of-order echo of an
   * *earlier* push could otherwise land after a newer one and silently
   * revert the case backwards. Debouncing collapses a rapid burst into one
   * push of the final state, so there's nothing to arrive out of order.
   */
  function schedulePush(caseId: string) {
    cancelPendingPush(caseId)
    const timer = setTimeout(() => {
      pendingPushTimers.delete(caseId)
      const latest = useStore.getState().cases[caseId]
      if (latest) pushCase(latest)
    }, PUSH_DEBOUNCE_MS)
    pendingPushTimers.set(caseId, timer)
  }

  // Initial full pull — realtime subscriptions only deliver changes from
  // the moment they're established, not what's already in the table.
  void client
    .from('cases')
    .select('data')
    .then(({ data: rows, error }) => {
      if (error) {
        console.error('Supabase initial case fetch failed:', error.message)
        return
      }
      for (const row of rows ?? []) {
        if (row.data) applyRemote(row.data as EmergencyCase)
      }
      // Push whatever's already in the local store on startup (e.g. seeded
      // demo data) once the initial pull has settled.
      for (const c of Object.values(useStore.getState().cases)) pushCase(c)
    })

  client
    .channel('cases-sync')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cases' }, (payload) => {
      const row = payload.new as { data?: EmergencyCase }
      if (row.data) applyRemote(row.data)
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cases' }, (payload) => {
      const row = payload.new as { data?: EmergencyCase }
      if (row.data) applyRemote(row.data)
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'cases' }, (payload) => {
      const row = payload.old as { data?: EmergencyCase }
      if (row.data?.id) removeRemote(row.data.id)
    })
    .subscribe()

  useStore.subscribe((state, prevState) => {
    if (state.cases === prevState.cases) return
    for (const [id, c] of Object.entries(state.cases)) {
      if (prevState.cases[id] === c) continue
      schedulePush(id)
    }
    // A case that disappeared locally (e.g. a discarded report draft) needs
    // its row deleted too, otherwise the next initial pull just resurrects it.
    for (const [id, prevCase] of Object.entries(prevState.cases)) {
      if (id in state.cases) continue
      deletedIds.add(id)
      cancelPendingPush(id)
      lastPushed.delete(id)
      lastPulled.delete(id)
      void client
        .from('cases')
        .delete()
        .eq('case_id', prevCase.caseNumber)
        .then(({ error }) => {
          if (error) console.error('Failed to delete Supabase case:', error.message)
        })
    }
  })
}

/**
 * "Clear all data" needs to delete the synced Supabase rows too, otherwise
 * they just sit there under the app's back and get pulled right back in via
 * realtime/the next initial fetch.
 */
export async function clearAllSupabaseCases(): Promise<void> {
  if (!supabaseEnabled || !supabase) return
  // A still-pending debounced push would otherwise fire after the delete and
  // resurrect whatever case it was about to send.
  for (const timer of pendingPushTimers.values()) clearTimeout(timer)
  pendingPushTimers.clear()
  const [casesResult, mediaResult] = await Promise.all([
    supabase.from('cases').delete().not('case_id', 'is', null),
    supabase.from('case_media').delete().not('id', 'is', null),
  ])
  if (casesResult.error) console.error('Failed to clear Supabase cases:', casesResult.error.message)
  if (mediaResult.error) console.error('Failed to clear Supabase case_media:', mediaResult.error.message)
  lastPushed.clear()
  lastPulled.clear()
}
