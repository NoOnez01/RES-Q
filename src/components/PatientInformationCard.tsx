import { Activity, HeartPulse, Thermometer, Wind, Gauge, Brain } from 'lucide-react'
import type { PatientInfo } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { Card } from './ui/Card'

const vitalItems = [
  { key: 'bloodPressure', label: 'ความดันโลหิต', icon: Gauge, unit: 'mmHg' },
  { key: 'pulse', label: 'ชีพจร', icon: HeartPulse, unit: 'ครั้ง/นาที' },
  { key: 'temperature', label: 'อุณหภูมิ', icon: Thermometer, unit: '°C' },
  { key: 'respiration', label: 'อัตราการหายใจ', icon: Wind, unit: 'ครั้ง/นาที' },
  { key: 'oxygenSat', label: 'ออกซิเจนในเลือด', icon: Activity, unit: '%' },
  { key: 'consciousness', label: 'ระดับความรู้สึกตัว', icon: Brain, unit: '' },
] as const

export function PatientInformationCard({ patient }: { patient: PatientInfo }) {
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
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3">
        {vitalItems.map(({ key, label, icon: Icon, unit }) => (
          <div key={key} className="flex items-start gap-2 rounded-xl bg-skyblue-pale p-3">
            <Icon className="size-4 shrink-0 mt-0.5 text-primary" />
            <div className="min-w-0">
              <p className="text-xs text-muted">{label}</p>
              <p className="text-sm font-semibold text-navy truncate">
                {patient.vitals[key] || '-'} {patient.vitals[key] ? unit : ''}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm font-semibold text-navy">การปฐมพยาบาลเบื้องต้น</p>
        <p className="mt-1 text-sm text-muted whitespace-pre-wrap">{patient.firstAid || 'ไม่มีข้อมูล'}</p>
      </div>

      {patient.additionalNotes && (
        <div className="border-t border-border pt-4">
          <p className="text-sm font-semibold text-navy">หมายเหตุเพิ่มเติม</p>
          <p className="mt-1 text-sm text-muted whitespace-pre-wrap">{patient.additionalNotes}</p>
        </div>
      )}
    </Card>
  )
}
