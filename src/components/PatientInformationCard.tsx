import { Activity, HeartPulse, Thermometer, Wind, Gauge } from 'lucide-react'
import type { PatientInfo, Responsiveness } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { Card } from './ui/Card'

const vitalItems = [
  { key: 'bloodPressure', label: 'ความดันโลหิต', icon: Gauge, unit: 'mmHg' },
  { key: 'pulse', label: 'ชีพจร', icon: HeartPulse, unit: 'ครั้ง/นาที' },
  { key: 'temperature', label: 'อุณหภูมิ', icon: Thermometer, unit: '°C' },
  { key: 'respiration', label: 'อัตราการหายใจ', icon: Wind, unit: 'ครั้ง/นาที' },
  { key: 'oxygenSat', label: 'ออกซิเจนในเลือด', icon: Activity, unit: '%' },
] as const

const RESPONSIVENESS_LABEL: Record<Responsiveness, string> = {
  A: 'A - รู้สึกตัวดี',
  V: 'V - ตอบสนองต่อเสียงเรียก',
  P: 'P - ตอบสนองต่อความเจ็บปวด',
  U: 'U - ไม่ตอบสนอง',
}

const PRIMARY_SURVEY_ITEMS = [
  { key: 'generalImpression', letter: 'G', label: 'ภาพรวมผู้ป่วย' },
  { key: 'exsanguinatingHemorrhage', letter: 'X', label: 'การห้ามเลือด' },
  { key: 'airway', letter: 'A', label: 'ทางเดินหายใจ' },
  { key: 'breathing', letter: 'B', label: 'การหายใจ' },
  { key: 'circulation', letter: 'C', label: 'การไหลเวียนโลหิต' },
  { key: 'exposure', letter: 'E', label: 'สิ่งแวดล้อม' },
] as const

const HEMORRHAGE_CLASS_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: 'Class I (< 15%)',
  2: 'Class II (15-30%)',
  3: 'Class III (30-40%)',
  4: 'Class IV (> 40%)',
}

export function PatientInformationCard({
  patient,
  updates,
}: {
  patient: PatientInfo
  /** Follow-up condition notes logged after this record, newest last. */
  updates?: { id: string; note: string; recordedAt: number }[]
}) {
  // Older locally-cached cases may predate this field entirely, so every
  // access below goes through optional chaining -- a render crash here
  // would otherwise blank the whole page (no error boundary catches it).
  const survey = patient.primarySurvey
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-navy">ข้อมูลผู้ป่วย</h3>
        {patient.recordedAt && (
          <span className="text-xs text-muted">บันทึกเมื่อ {formatDateTime(patient.recordedAt)}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-muted">ชื่อผู้ป่วย</p>
          <p className="font-semibold text-navy">{patient.name || 'ไม่ทราบชื่อ'}</p>
        </div>
        <div>
          <p className="text-muted">อายุ</p>
          <p className="font-semibold text-navy">{patient.age || '-'}</p>
        </div>
        <div>
          <p className="text-muted">เพศ</p>
          <p className="font-semibold text-navy">{patient.gender || '-'}</p>
        </div>
        <div>
          <p className="text-muted">เลขบัตรประชาชน</p>
          <p className="font-semibold text-navy">{patient.idNumber || '-'}</p>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-sm font-semibold text-navy">การประเมินเบื้องต้น (G-R-X-A-B-C-D-E)</p>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-xl bg-skyblue-pale p-3">
            <p className="text-xs text-muted">R/D - การตอบสนอง/ระบบประสาท</p>
            <p className="text-sm font-semibold text-navy">
              {survey?.responsiveness ? RESPONSIVENESS_LABEL[survey.responsiveness] : '-'}
            </p>
          </div>
          {PRIMARY_SURVEY_ITEMS.map(({ key, letter, label }) => (
            <div key={key} className="rounded-xl bg-skyblue-pale p-3">
              <p className="text-xs text-muted">
                {letter} - {label}
                {key === 'exsanguinatingHemorrhage' && survey?.hemorrhageClass && (
                  <span className="ml-1 font-bold text-emergency">{HEMORRHAGE_CLASS_LABEL[survey.hemorrhageClass]}</span>
                )}
              </p>
              <p className="text-sm font-semibold text-navy truncate">{survey?.[key] || '-'}</p>
              {survey?.treatments?.[key] && (
                <p className="mt-1 text-xs text-muted truncate">รักษาแล้ว: {survey.treatments[key]}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {updates && updates.length > 0 && (
        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-semibold text-navy">อัปเดตอาการล่าสุด</p>
          <div className="flex flex-col gap-2">
            {[...updates]
              .sort((a, b) => b.recordedAt - a.recordedAt)
              .map((u) => (
                <div key={u.id} className="rounded-xl bg-skyblue-pale p-3">
                  <p className="text-sm text-navy whitespace-pre-wrap">{u.note}</p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(u.recordedAt)}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3">
        {vitalItems.map(({ key, label, icon: Icon, unit }) => (
          <div key={key} className="flex items-start gap-2 rounded-xl bg-skyblue-pale p-3">
            <Icon className="size-4 shrink-0 mt-0.5 text-primary" />
            <div className="min-w-0">
              <p className="text-xs text-muted">{label}</p>
              <p className="text-sm font-semibold text-navy truncate">
                {patient.vitals?.[key] || '-'} {patient.vitals?.[key] ? unit : ''}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm font-semibold text-navy">การปฐมพยาบาลเบื้องต้น</p>
        <p className="mt-1 text-sm text-muted whitespace-pre-wrap">{patient.firstAid || 'ไม่มีข้อมูล'}</p>
      </div>
    </Card>
  )
}
