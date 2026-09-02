import { jsPDF } from 'jspdf'
import type { EmergencyCase, PrimarySurveyFindingKey } from './types'
import { gcsTotal } from './types'
import { formatDateTime } from './utils'
import { SEVERITY_OPTIONS } from './severityOptions'

// Mirrors the labels already shown to a dispatcher/rescuer in
// EmergencyAssessment.tsx / dispatch/NewCase.tsx / rescue/NewCase.tsx --
// kept as its own copy here (rather than exported/shared) since this is
// display-only text for a printed document, not form UI.
const CONSCIOUS_LABEL: Record<string, string> = {
  conscious: 'มีสติ (Conscious)',
  unconscious: 'ไม่มีสติ (Unconscious)',
  unknown: 'ไม่ทราบ (Unknown)',
}

// Mirrors rescue/PatientRecord.tsx's RESPONSIVENESS_OPTIONS/HEMORRHAGE_CLASS_OPTIONS/
// PRIMARY_SURVEY_FIELDS -- same reasoning as CONSCIOUS_LABEL above.
const RESPONSIVENESS_LABEL: Record<string, string> = {
  A: 'A - รู้สึกตัวดี',
  V: 'V - ตอบสนองต่อเสียงเรียก',
  P: 'P - ตอบสนองต่อความเจ็บปวด',
  U: 'U - ไม่ตอบสนอง',
}

const HEMORRHAGE_CLASS_LABEL: Record<number, string> = {
  1: 'Class I (< 15%)',
  2: 'Class II (15-30%)',
  3: 'Class III (30-40%)',
  4: 'Class IV (> 40%)',
}

const PRIMARY_SURVEY_FIELDS: { key: PrimarySurveyFindingKey; letter: string; label: string }[] = [
  { key: 'generalImpression', letter: 'G', label: 'ภาพรวมผู้ป่วย (General Impression)' },
  { key: 'exsanguinatingHemorrhage', letter: 'X', label: 'การห้ามเลือด (Exsanguinating Hemorrhage)' },
  { key: 'airway', letter: 'A', label: 'ทางเดินหายใจ (Airway)' },
  { key: 'breathing', letter: 'B', label: 'การหายใจ (Breathing)' },
  { key: 'circulation', letter: 'C', label: 'การไหลเวียนโลหิต (Circulation)' },
  { key: 'exposure', letter: 'E', label: 'สิ่งแวดล้อม (Exposure/Environment)' },
]

// jsPDF's built-in fonts have no Thai glyphs -- this embeds the same family
// the app already uses on-screen (see index.html's Google Fonts link).
// Fetched from our own bundled static assets (not the Google Fonts CDN) so
// this keeps working inside the Capacitor app, which has no network access
// to a third-party CDN guaranteed at the moment a rescuer taps "export".
// Cached at module scope so a second export in the same session doesn't
// re-fetch it.
let cachedFontBase64: Promise<string> | null = null

function loadThaiFontBase64(): Promise<string> {
  if (!cachedFontBase64) {
    cachedFontBase64 = fetch(`${import.meta.env.BASE_URL}fonts/NotoSansThai-Variable.ttf`)
      .then((res) => {
        if (!res.ok) throw new Error(`โหลดฟอนต์ไม่สำเร็จ (${res.status})`)
        return res.arrayBuffer()
      })
      .then(arrayBufferToBase64)
      .catch((err) => {
        // Don't leave a rejected promise cached -- the next export attempt
        // (e.g. after the user reconnects) should retry the fetch instead
        // of failing forever from one transient network error.
        cachedFontBase64 = null
        throw err
      })
  }
  return cachedFontBase64
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 16
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const NAVY: [number, number, number] = [18, 48, 74]
const PRIMARY: [number, number, number] = [11, 110, 189]
const MUTED: [number, number, number] = [102, 112, 133]

/**
 * Builds a printable "ใบเคส" (case report / run sheet) for a rescue crew --
 * incident, assessment, primary survey, patient info, and timeline, in the
 * same terms already used across the case-detail/patient-record pages --
 * and triggers a browser download of the resulting PDF.
 */
export async function generateCaseSheetPdf(c: EmergencyCase): Promise<void> {
  const fontBase64 = await loadThaiFontBase64()

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.addFileToVFS('NotoSansThai.ttf', fontBase64)
  doc.addFont('NotoSansThai.ttf', 'NotoSansThai', 'normal')
  doc.setFont('NotoSansThai', 'normal')

  let y = MARGIN

  function ensureSpace(next: number) {
    if (y + next > PAGE_HEIGHT - MARGIN) {
      doc.addPage()
      doc.setFont('NotoSansThai', 'normal')
      y = MARGIN
    }
  }

  function sectionTitle(text: string) {
    ensureSpace(12)
    y += 4
    doc.setFontSize(12)
    doc.setTextColor(...PRIMARY)
    doc.text(text, MARGIN, y)
    doc.setDrawColor(...PRIMARY)
    doc.setLineWidth(0.4)
    doc.line(MARGIN, y + 1.5, PAGE_WIDTH - MARGIN, y + 1.5)
    y += 6
  }

  function field(label: string, value?: string | number | null) {
    if (value === undefined || value === null || value === '') return
    const lines = doc.splitTextToSize(String(value), CONTENT_WIDTH)
    ensureSpace(4.5 + lines.length * 4.6 + 2)
    doc.setTextColor(...MUTED)
    doc.setFontSize(8.5)
    doc.text(label, MARGIN, y)
    doc.setTextColor(...NAVY)
    doc.setFontSize(10.5)
    doc.text(lines, MARGIN, y + 4.3)
    y += 4.3 + lines.length * 4.6 + 2
  }

  function paragraph(text: string, size = 9.5) {
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH)
    for (const line of lines) {
      ensureSpace(5)
      doc.setTextColor(...NAVY)
      doc.text(line, MARGIN, y)
      y += 4.6
    }
    y += 1
  }

  // Header
  doc.setFontSize(18)
  doc.setTextColor(...PRIMARY)
  doc.text('ResQ', MARGIN, y)
  doc.setFontSize(13)
  doc.setTextColor(...NAVY)
  doc.text('ใบสรุปเคสหน่วยกู้ชีพ', MARGIN + 24, y)
  y += 7
  doc.setDrawColor(...PRIMARY)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 6

  doc.setFontSize(10)
  doc.setTextColor(...MUTED)
  doc.text(`เลขที่เคส ${c.caseNumber}`, MARGIN, y)
  doc.text(`ออกเอกสารเมื่อ ${formatDateTime(Date.now())}`, PAGE_WIDTH - MARGIN, y, { align: 'right' })
  y += 8

  if (c.assessment) {
    const sev = SEVERITY_OPTIONS.find((s) => s.value === c.assessment!.severity)
    doc.setFontSize(11)
    doc.setTextColor(...NAVY)
    doc.text(`ระดับความรุนแรง: ${sev?.title ?? c.assessment.severity}`, MARGIN, y)
    y += 7
  }

  sectionTitle('รายละเอียดเหตุการณ์')
  if (c.incidentDetails) {
    field('ประเภทเหตุการณ์', c.incidentDetails.incidentType)
    field('จุดเกิดเหตุ', c.incidentDetails.location)
    field('จำนวนผู้ป่วย', `${c.incidentDetails.patientCount} คน`)
    field('สภาวะรู้สึกตัวขณะแจ้งเหตุ', CONSCIOUS_LABEL[c.incidentDetails.conscious] ?? c.incidentDetails.conscious)
    field('หมายเหตุจากผู้แจ้งเหตุ', c.incidentDetails.notes)
  } else {
    paragraph('ยังไม่มีการกรอกรายละเอียดเหตุการณ์')
  }

  sectionTitle('ผู้แจ้งเหตุ')
  field('ชื่อ', c.reporterName || 'ไม่ระบุ')
  field('เบอร์ติดต่อ', c.reporterPhone || 'ไม่ระบุ')

  if (c.assessment) {
    sectionTitle('การประเมินจากศูนย์สั่งการ 1669')
    field('ลักษณะการบาดเจ็บ', c.assessment.injuryDescription)
    field('ประเมินเมื่อ', formatDateTime(c.assessment.assessedAt))
  }

  if (c.assignedRescueTeam) {
    sectionTitle('หน่วยกู้ชีพที่รับผิดชอบ')
    field('หน่วย', c.assignedRescueTeam.name)
    field('เบอร์ติดต่อหน่วย', c.assignedRescueTeam.phone)
    if (c.assignedVehicle) {
      field('รถ/ทีมที่ปฏิบัติงาน', `${c.assignedVehicle.unitCode} · ${c.assignedVehicle.vehicle}`)
      field('ทะเบียนรถ', c.assignedVehicle.plateNumber)
      field('คนขับ', c.assignedVehicle.driverName)
      field('จำนวนทีม', `${c.assignedVehicleCrewCount ?? c.assignedVehicle.members} คน`)
    }
    if (c.supportingRescueTeam) {
      field('หน่วยสนับสนุน', c.supportingRescueTeam.name)
    }
  }

  const survey = c.patientInfo?.primarySurvey
  if (survey) {
    sectionTitle('การประเมินขั้นต้น ณ จุดเกิดเหตุ (G-R-X-A-B-C-D-E)')
    if (survey.responsiveness) {
      field('R/D - การตอบสนองและระบบประสาท', RESPONSIVENESS_LABEL[survey.responsiveness] ?? survey.responsiveness)
    }
    if (survey.gcs) {
      field(
        'Glasgow Coma Scale (GCS)',
        `E${survey.gcs.eye} V${survey.gcs.verbal} M${survey.gcs.motor} = ${gcsTotal(survey.gcs)} คะแนน`,
      )
    }
    for (const f of PRIMARY_SURVEY_FIELDS) {
      const value = survey[f.key]
      if (!value) continue
      field(f.label, value)
      if (f.key === 'exsanguinatingHemorrhage' && survey.hemorrhageClass) {
        field('ระดับการเสียเลือด (Hemorrhage Class)', HEMORRHAGE_CLASS_LABEL[survey.hemorrhageClass])
      }
      const treatment = survey.treatments?.[f.key]
      if (treatment) field(`การรักษาที่ให้ (${f.letter})`, treatment)
    }
  }

  if (c.patientInfo) {
    sectionTitle('ข้อมูลผู้ป่วย')
    field('ชื่อผู้ป่วย', c.patientInfo.name || 'ไม่ทราบชื่อ')
    field('เลขบัตรประชาชน', c.patientInfo.idNumber)
    field('อายุ', c.patientInfo.age)
    field('เพศ', c.patientInfo.gender)
    const v = c.patientInfo.vitals
    const vitalsParts = [
      v.bloodPressure && `ความดันโลหิต ${v.bloodPressure}`,
      v.pulse && `ชีพจร ${v.pulse} ครั้ง/นาที`,
      v.temperature && `อุณหภูมิ ${v.temperature}°C`,
      v.respiration && `การหายใจ ${v.respiration} ครั้ง/นาที`,
      v.oxygenSat && `SpO2 ${v.oxygenSat}%`,
    ].filter(Boolean)
    if (vitalsParts.length) field('สัญญาณชีพ', vitalsParts.join('  ·  '))
    field('การปฐมพยาบาลเบื้องต้น', c.patientInfo.firstAid)
    if (c.patientInfo.recordedAt) field('บันทึกเมื่อ', formatDateTime(c.patientInfo.recordedAt))
  }

  if (c.patientUpdates.length > 0) {
    sectionTitle('อัปเดตอาการระหว่างการนำส่ง')
    for (const u of c.patientUpdates) {
      paragraph(`${formatDateTime(u.recordedAt)}  —  ${u.note}`)
    }
  }

  if (c.selectedHospital) {
    sectionTitle('โรงพยาบาลปลายทาง')
    field('โรงพยาบาล', c.selectedHospital.name)
    field('เบอร์ติดต่อ', c.selectedHospital.phone)
  }

  if (c.timeline.length > 0) {
    sectionTitle('ลำดับเหตุการณ์')
    for (const t of c.timeline) {
      paragraph(`${formatDateTime(t.timestamp)}  ·  ${t.label}  ·  ${t.org}${t.note ? `  —  ${t.note}` : ''}`, 9)
    }
  }

  ensureSpace(24)
  y += 6
  doc.setDrawColor(...MUTED)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, y, MARGIN + 70, y)
  doc.line(PAGE_WIDTH - MARGIN - 70, y, PAGE_WIDTH - MARGIN, y)
  y += 5
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text('ผู้บันทึก / หน่วยกู้ชีพ', MARGIN, y)
  doc.text('วันที่', PAGE_WIDTH - MARGIN - 70, y)

  const safeCaseNumber = c.caseNumber.replace(/[^a-zA-Z0-9-]/g, '')
  doc.save(`case-${safeCaseNumber}.pdf`)
}
