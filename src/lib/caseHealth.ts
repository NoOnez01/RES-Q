import { statusMeta } from './types'
import type { EmergencyCase } from './types'

/** A single detected inconsistency between a case's `status` and the data
 * that's actually been recorded on it -- see checkCaseConsistency below for
 * what "inconsistency" means here. */
export interface CaseIssue {
  /** Thai source string, already registered as a translation key by
   * whichever component renders it. Distinct per check, so it doubles as
   * the React list key. */
  message: string
}

function order(status: EmergencyCase['status']): number {
  return statusMeta(status).order
}

/**
 * Flags cases where a later-stage field has real data but `status` never
 * advanced to match -- the exact shape of bug fixed in store.ts's
 * submitDispatcherAssessment (assessment saved, status silently left
 * behind at an earlier stage, permanently hiding whatever status-gated
 * action should come next). That fix prevents new cases from getting into
 * this state going forward, but doesn't repair cases already stuck there
 * from before the fix (or from any other path that sets data without also
 * advancing status) -- this is the detector half: surfacing those so a
 * dispatcher can find and fix them (e.g. by re-submitting the relevant
 * form, which now correctly advances status too) instead of a case just
 * silently going quiet with no visible next action.
 *
 * Deliberately conservative: only flags a field that's actually present
 * pointing at a status that hasn't caught up -- never flags a case for
 * data that's simply not filled in yet (that's normal, in-progress state,
 * not an inconsistency).
 */
export function checkCaseConsistency(c: EmergencyCase): CaseIssue[] {
  const issues: CaseIssue[] = []
  const currentOrder = order(c.status)

  if (c.assessment && currentOrder < order('received')) {
    issues.push({ message: 'มีการประเมินความรุนแรงแล้ว แต่สถานะเคสยังไม่ถึง "รับแจ้งเหตุแล้ว"' })
  }
  if (c.assignedRescueTeam && currentOrder < order('rescue-assigned')) {
    issues.push({ message: 'มอบหมายหน่วยกู้ชีพแล้ว แต่สถานะเคสยังไม่ถึง "มอบหมายหน่วยกู้ชีพแล้ว"' })
  }
  // NOT selectedHospital-ahead-of-transporting: that's normal, expected
  // state, not a stuck case. recordHospitalDecision sets `selectedHospital`
  // while status stays at 'assisted'; startTransport is a distinct, later
  // action a rescue crew takes explicitly from its own screen (see
  // rescue/CaseDetail.tsx's "Start Transport" button, gated on exactly
  // `status === 'assisted' && c.selectedHospital`). Flagging that gap here
  // would put a false "inconsistent data" warning on every ordinary case
  // between hospital selection and transport start.
  if (c.patientInfo && currentOrder < order('rescue-arrived')) {
    issues.push({ message: 'บันทึกข้อมูลผู้ป่วยแล้ว แต่สถานะเคสยังไม่ถึง "ถึงจุดเกิดเหตุแล้ว"' })
  }
  // The reverse direction: a case dispatch has already received should have
  // the incident details that step is supposed to capture.
  if (currentOrder >= order('received') && !c.incidentDetails) {
    issues.push({ message: 'เคสถูกรับแจ้งแล้ว แต่ยังไม่มีรายละเอียดเหตุการณ์' })
  }

  return issues
}
