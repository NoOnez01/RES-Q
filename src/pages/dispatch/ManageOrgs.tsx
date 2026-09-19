import { useState } from 'react'
import clsx from 'clsx'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card, Checkbox } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { EmptyState, ErrorState } from '@/components/States'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import {
  createRescueTeam,
  createHospital,
  updateRescueTeam,
  updateHospital,
  deleteRescueTeam,
  deleteHospital,
  createRescueVehicle,
  updateRescueVehicle,
  deleteRescueVehicle,
  type NewRescueTeamInput,
  type NewRescueVehicleInput,
  type NewHospitalInput,
} from '@/lib/orgs'
import { VEHICLE_LEVEL_RANK, VEHICLE_LEVEL_LABEL } from '@/lib/types'
import type { RescueTeam, RescueVehicle, Hospital } from '@/lib/types'
import { VehicleLevelBadge, VEHICLE_LEVEL_SELECTED_CLASSES } from '@/components/VehicleLevelBadge'
import { Ambulance, Building2, Plus, Pencil, Trash2, Truck } from 'lucide-react'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  กรุณากรอกชื่อหน่วยและเบอร์โทรศัพท์: 'Please enter the team name and phone number',
  บันทึกข้อมูลหน่วยกู้ชีพแล้ว: 'Rescue team details saved',
  สร้างหน่วยกู้ชีพใหม่แล้ว: 'New rescue team created',
  บันทึกไม่สำเร็จ: 'Failed to save',
  'ชื่อหน่วยกู้ชีพ (สาขา/จังหวัด)': 'Rescue team name (branch/province)',
  เบอร์โทรศัพท์: 'Phone number',
  ที่ตั้งหน่วย: 'Base location',
  บันทึก: 'Save',
  ยกเลิก: 'Cancel',
  'กรุณากรอกรหัสรถ/ทีม': 'Please enter the vehicle/crew code',
  'รหัสรถ/ทีม': 'Vehicle/crew code',
  จำนวนสมาชิก: 'Number of members',
  ยานพาหนะ: 'Vehicle',
  ทะเบียนรถ: 'License plate',
  ชื่อคนขับ: 'Driver name',
  ระดับรถ: 'Vehicle level',
  'อุปกรณ์เฉพาะทาง (คั่นด้วยจุลภาค)': 'Specialized equipment (comma-separated)',
  'เครื่องตัดถ่าง, เฝือกดามคอ': 'Jaws of life, cervical collar',
  กรุณากรอกชื่อเบอร์โทรศัพท์และที่อยู่โรงพยาบาล: "Please enter the hospital's name, phone number, and address",
  บันทึกข้อมูลโรงพยาบาลแล้ว: 'Hospital details saved',
  สร้างโรงพยาบาลใหม่แล้ว: 'New hospital created',
  ชื่อโรงพยาบาล: 'Hospital name',
  ที่อยู่: 'Address',
  จำนวนเตียงว่าง: 'Beds available',
  ห้องฉุกเฉินพร้อมรับผู้ป่วย: 'Emergency room ready to receive patients',
  'ความเชี่ยวชาญเฉพาะทาง (คั่นด้วยจุลภาค)': 'Specialties (comma-separated)',
  'ศัลยกรรมประสาท, หัวใจ': 'Neurosurgery, cardiology',
  'บันทึกข้อมูลรถ/ทีมแล้ว': 'Vehicle/crew details saved',
  'เพิ่มรถ/ทีมใหม่แล้ว': 'New vehicle/crew added',
  'รถ/ทีม ({n})': 'Vehicles/crews ({n})',
  'เพิ่มรถ/ทีม': 'Add vehicle/crew',
  'ยังไม่มีรถ/ทีมในหน่วยนี้': 'No vehicles/crews in this team yet',
  '{vehicle} · {n} คน': '{vehicle} · {n} people',
  แก้ไข: 'Edit',
  ลบ: 'Delete',
  'จัดการหน่วยกู้ชีพ/โรงพยาบาล': 'Manage rescue teams / hospitals',
  ไม่มีสิทธิ์เข้าถึงหน้านี้: 'No access to this page',
  'เฉพาะแอดมินเท่านั้นที่จัดการหน่วยกู้ชีพ/โรงพยาบาลได้': 'Only admins can manage rescue teams / hospitals',
  ลบหน่วยกู้ชีพแล้ว: 'Rescue team deleted',
  ลบไม่สำเร็จ: 'Delete failed',
  'ลบรถ/ทีมแล้ว': 'Vehicle/crew deleted',
  ลบโรงพยาบาลแล้ว: 'Hospital deleted',
  'หน่วยกู้ชีพ (สาขา/จังหวัด)': 'Rescue teams (branch/province)',
  เพิ่มหน่วยกู้ชีพ: 'Add rescue team',
  ยังไม่มีหน่วยกู้ชีพในระบบ: 'No rescue teams in the system yet',
  เพิ่มหน่วยกู้ชีพแรกได้ที่ปุ่มด้านบน: 'Add the first rescue team using the button above',
  โรงพยาบาล: 'Hospital',
  เพิ่มโรงพยาบาล: 'Add hospital',
  ยังไม่มีโรงพยาบาลในระบบ: 'No hospitals in the system yet',
  เพิ่มโรงพยาบาลแรกได้ที่ปุ่มด้านบน: 'Add the first hospital using the button above',
  'เตียงว่าง {n} · {phone}': 'Beds available {n} · {phone}',
  ยืนยันการลบหน่วยกู้ชีพ: 'Confirm deleting this rescue team',
  'ต้องการลบ "{name}" หรือไม่ รถ/ทีมทั้งหมดในหน่วยนี้จะถูกลบไปด้วย เคสที่มอบหมายไว้ก่อนหน้าจะไม่ถูกลบ แต่จะไม่สามารถมอบหมายเคสใหม่ให้หน่วยนี้ได้อีก':
    'Delete "{name}"? All vehicles/crews in this team will also be deleted. Previously assigned cases are not deleted, but no new case can be assigned to this team.',
  ยืนยันลบ: 'Confirm delete',
  'ยืนยันการลบรถ/ทีม': 'Confirm deleting this vehicle/crew',
  'ต้องการลบ "{name}" หรือไม่': 'Delete "{name}"?',
  ยืนยันการลบโรงพยาบาล: 'Confirm deleting this hospital',
  'ต้องการลบ "{name}" หรือไม่ เคสที่ส่งไว้ก่อนหน้าจะไม่ถูกลบ แต่จะไม่สามารถเลือกส่งผู้ป่วยไปที่นี่ได้อีก':
    'Delete "{name}"? Previously sent cases are not deleted, but no new patient can be sent here.',
})

const EMPTY_TEAM_FORM: NewRescueTeamInput = { name: '', phone: '', baseAddress: '' }
const EMPTY_VEHICLE_FORM: NewRescueVehicleInput = { unitCode: '', members: 3, vehicle: '', equipment: [], level: 'BLS' }
const EMPTY_HOSPITAL_FORM: NewHospitalInput = { name: '', phone: '', address: '', erAvailable: true, bedsAvailable: 0, specialties: [] }

function splitList(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function RescueTeamForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: RescueTeam | null
  onCancel: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<NewRescueTeamInput>(
    initial
      ? {
          name: initial.name,
          phone: initial.phone,
          baseAddress: initial.base.address,
          baseLat: initial.base.lat,
          baseLng: initial.base.lng,
        }
      : EMPTY_TEAM_FORM,
  )
  const [saving, setSaving] = useState(false)
  const t = useT()

  async function handleSave() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast({ title: t('กรุณากรอกชื่อหน่วยและเบอร์โทรศัพท์'), tone: 'error' })
      return
    }
    setSaving(true)
    try {
      if (initial) await updateRescueTeam(initial.id, form)
      else await createRescueTeam(form)
      toast({ title: initial ? t('บันทึกข้อมูลหน่วยกู้ชีพแล้ว') : t('สร้างหน่วยกู้ชีพใหม่แล้ว'), tone: 'success' })
      onSaved()
    } catch {
      toast({ title: t('บันทึกไม่สำเร็จ'), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label={t('ชื่อหน่วยกู้ชีพ (สาขา/จังหวัด)')} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label={t('เบอร์โทรศัพท์')} required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input
          label={t('ที่ตั้งหน่วย')}
          className="sm:col-span-2"
          value={form.baseAddress}
          onChange={(e) => setForm({ ...form, baseAddress: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" loading={saving} onClick={handleSave}>
          {t('บันทึก')}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          {t('ยกเลิก')}
        </Button>
      </div>
    </Card>
  )
}

function VehicleForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: RescueVehicle | null
  onCancel: () => void
  onSaved: (input: NewRescueVehicleInput) => Promise<void>
}) {
  const [form, setForm] = useState<NewRescueVehicleInput>(
    initial
      ? {
          unitCode: initial.unitCode,
          members: initial.members,
          vehicle: initial.vehicle,
          equipment: initial.equipment,
          level: initial.level ?? 'BLS',
          driverName: initial.driverName,
          plateNumber: initial.plateNumber,
        }
      : EMPTY_VEHICLE_FORM,
  )
  const [equipmentText, setEquipmentText] = useState(initial?.equipment.join(', ') ?? '')
  const [saving, setSaving] = useState(false)
  const t = useT()

  async function handleSave() {
    if (!form.unitCode.trim()) {
      toast({ title: t('กรุณากรอกรหัสรถ/ทีม'), tone: 'error' })
      return
    }
    setSaving(true)
    try {
      await onSaved({ ...form, equipment: splitList(equipmentText) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3 border-primary/20 bg-skyblue-pale">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label={t('รหัสรถ/ทีม')} required value={form.unitCode} onChange={(e) => setForm({ ...form, unitCode: e.target.value })} />
        <Input
          label={t('จำนวนสมาชิก')}
          type="number"
          min={1}
          value={form.members}
          onChange={(e) => setForm({ ...form, members: Number(e.target.value) || 1 })}
        />
        <Input label={t('ยานพาหนะ')} value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} />
        <Input label={t('ทะเบียนรถ')} value={form.plateNumber ?? ''} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} />
        <Input label={t('ชื่อคนขับ')} value={form.driverName ?? ''} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">{t('ระดับรถ')}</label>
        <div className="flex gap-2">
          {VEHICLE_LEVEL_RANK.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setForm({ ...form, level: lvl })}
              className={clsx(
                'flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition-colors',
                (form.level ?? 'BLS') === lvl
                  ? VEHICLE_LEVEL_SELECTED_CLASSES[lvl]
                  : 'border-border bg-surface text-muted hover:border-primary/40',
              )}
            >
              {VEHICLE_LEVEL_LABEL[lvl]}
            </button>
          ))}
        </div>
      </div>
      <Input
        label={t('อุปกรณ์เฉพาะทาง (คั่นด้วยจุลภาค)')}
        placeholder={t('เครื่องตัดถ่าง, เฝือกดามคอ')}
        value={equipmentText}
        onChange={(e) => setEquipmentText(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" loading={saving} onClick={handleSave}>
          {t('บันทึก')}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          {t('ยกเลิก')}
        </Button>
      </div>
    </Card>
  )
}

function HospitalForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: Hospital | null
  onCancel: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<NewHospitalInput>(
    initial
      ? {
          name: initial.name,
          phone: initial.phone,
          address: initial.location.address,
          lat: initial.location.lat,
          lng: initial.location.lng,
          erAvailable: initial.erAvailable,
          bedsAvailable: initial.bedsAvailable,
          specialties: initial.specialties,
        }
      : EMPTY_HOSPITAL_FORM,
  )
  const [specialtiesText, setSpecialtiesText] = useState(initial?.specialties.join(', ') ?? '')
  const [saving, setSaving] = useState(false)
  const t = useT()

  async function handleSave() {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast({ title: t('กรุณากรอกชื่อเบอร์โทรศัพท์และที่อยู่โรงพยาบาล'), tone: 'error' })
      return
    }
    setSaving(true)
    try {
      const input: NewHospitalInput = { ...form, specialties: splitList(specialtiesText) }
      if (initial) await updateHospital(initial.id, input)
      else await createHospital(input)
      toast({ title: initial ? t('บันทึกข้อมูลโรงพยาบาลแล้ว') : t('สร้างโรงพยาบาลใหม่แล้ว'), tone: 'success' })
      onSaved()
    } catch {
      toast({ title: t('บันทึกไม่สำเร็จ'), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label={t('ชื่อโรงพยาบาล')} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label={t('เบอร์โทรศัพท์')} required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input
          label={t('ที่อยู่')}
          required
          className="sm:col-span-2"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <Input
          label={t('จำนวนเตียงว่าง')}
          type="number"
          min={0}
          value={form.bedsAvailable}
          onChange={(e) => setForm({ ...form, bedsAvailable: Number(e.target.value) || 0 })}
        />
      </div>
      <Checkbox
        checked={form.erAvailable ?? true}
        onChange={(v) => setForm({ ...form, erAvailable: v })}
        label={t('ห้องฉุกเฉินพร้อมรับผู้ป่วย')}
      />
      <Input
        label={t('ความเชี่ยวชาญเฉพาะทาง (คั่นด้วยจุลภาค)')}
        placeholder={t('ศัลยกรรมประสาท, หัวใจ')}
        value={specialtiesText}
        onChange={(e) => setSpecialtiesText(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" loading={saving} onClick={handleSave}>
          {t('บันทึก')}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          {t('ยกเลิก')}
        </Button>
      </div>
    </Card>
  )
}

/** Which vehicle form (if any) is open, scoped to one branch at a time --
 * 'new' for adding, or the vehicle's own id for editing it. */
interface VehicleFormTarget {
  teamId: string
  vehicleId: string | 'new'
}

function TeamVehicles({
  team,
  vehicleFormTarget,
  setVehicleFormTarget,
  onDeleteVehicle,
  reload,
}: {
  team: RescueTeam
  vehicleFormTarget: VehicleFormTarget | null
  setVehicleFormTarget: (t: VehicleFormTarget | null) => void
  onDeleteVehicle: (vehicle: RescueVehicle) => void
  reload: () => Promise<void>
}) {
  const t = useT()
  async function handleVehicleSaved(input: NewRescueVehicleInput) {
    try {
      if (vehicleFormTarget?.vehicleId && vehicleFormTarget.vehicleId !== 'new') {
        await updateRescueVehicle(vehicleFormTarget.vehicleId, input)
        toast({ title: t('บันทึกข้อมูลรถ/ทีมแล้ว'), tone: 'success' })
      } else {
        await createRescueVehicle(team.id, input)
        toast({ title: t('เพิ่มรถ/ทีมใหม่แล้ว'), tone: 'success' })
      }
      setVehicleFormTarget(null)
      await reload()
    } catch {
      toast({ title: t('บันทึกไม่สำเร็จ'), tone: 'error' })
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
          <Truck className="size-3.5" /> {t('รถ/ทีม ({n})', { n: team.vehicles.length })}
        </p>
        {!(vehicleFormTarget?.teamId === team.id && vehicleFormTarget.vehicleId === 'new') && (
          <Button
            size="sm"
            variant="outline"
            icon={<Plus className="size-3.5" />}
            onClick={() => setVehicleFormTarget({ teamId: team.id, vehicleId: 'new' })}
          >
            {t('เพิ่มรถ/ทีม')}
          </Button>
        )}
      </div>

      {vehicleFormTarget?.teamId === team.id && vehicleFormTarget.vehicleId === 'new' && (
        <VehicleForm initial={null} onCancel={() => setVehicleFormTarget(null)} onSaved={handleVehicleSaved} />
      )}

      {team.vehicles.length === 0 && vehicleFormTarget?.teamId !== team.id && (
        <p className="text-xs text-muted">{t('ยังไม่มีรถ/ทีมในหน่วยนี้')}</p>
      )}

      {team.vehicles.map((vehicle) =>
        vehicleFormTarget?.teamId === team.id && vehicleFormTarget.vehicleId === vehicle.id ? (
          <VehicleForm key={vehicle.id} initial={vehicle} onCancel={() => setVehicleFormTarget(null)} onSaved={handleVehicleSaved} />
        ) : (
          <div key={vehicle.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-bg p-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                {vehicle.unitCode}
                <VehicleLevelBadge level={vehicle.level} />
              </p>
              <p className="text-xs text-muted">
                {t('{vehicle} · {n} คน', { vehicle: vehicle.vehicle, n: vehicle.members })}
                {vehicle.plateNumber && ` · ${vehicle.plateNumber}`}
              </p>
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                icon={<Pencil className="size-3" />}
                onClick={() => setVehicleFormTarget({ teamId: team.id, vehicleId: vehicle.id })}
              >
                {t('แก้ไข')}
              </Button>
              <Button size="sm" variant="danger" icon={<Trash2 className="size-3" />} onClick={() => onDeleteVehicle(vehicle)}>
                {t('ลบ')}
              </Button>
            </div>
          </div>
        ),
      )}
    </div>
  )
}

export default function ManageOrgs() {
  const currentUser = useStore((s) => s.currentUser)
  // Excludes the bulk-imported NDEMS unit directory (id prefix "ndems-",
  // see scripts/import_ndems_org_shells.py) -- thousands of org shells with
  // no user attached yet, meant to be claimed via /register/rescue rather
  // than hand-edited one at a time here. Rendering all of them as cards
  // would also make this screen unusably heavy.
  const rescueTeams = useStore((s) => s.rescueTeams).filter((t) => !t.id.startsWith('ndems-'))
  const hospitals = useStore((s) => s.hospitals)
  const refreshOrgs = useStore((s) => s.refreshOrgs)

  const [teamFormOpen, setTeamFormOpen] = useState<string | 'new' | null>(null)
  const [hospitalFormOpen, setHospitalFormOpen] = useState<string | 'new' | null>(null)
  const [vehicleFormTarget, setVehicleFormTarget] = useState<VehicleFormTarget | null>(null)
  const [deleteTeamTarget, setDeleteTeamTarget] = useState<RescueTeam | null>(null)
  const [deleteVehicleTarget, setDeleteVehicleTarget] = useState<RescueVehicle | null>(null)
  const [deleteHospitalTarget, setDeleteHospitalTarget] = useState<Hospital | null>(null)
  const [deleting, setDeleting] = useState(false)
  const t = useT()

  if (!currentUser?.isAdmin) {
    return (
      <AppShell variant="dashboard" title={t('จัดการหน่วยกู้ชีพ/โรงพยาบาล')}>
        <ErrorState title={t('ไม่มีสิทธิ์เข้าถึงหน้านี้')} description={t('เฉพาะแอดมินเท่านั้นที่จัดการหน่วยกู้ชีพ/โรงพยาบาลได้')} />
      </AppShell>
    )
  }

  async function handleSaved() {
    setTeamFormOpen(null)
    setHospitalFormOpen(null)
    await refreshOrgs()
  }

  async function handleDeleteTeam() {
    if (!deleteTeamTarget) return
    setDeleting(true)
    try {
      await deleteRescueTeam(deleteTeamTarget.id)
      toast({ title: t('ลบหน่วยกู้ชีพแล้ว'), tone: 'success' })
      await refreshOrgs()
    } catch {
      toast({ title: t('ลบไม่สำเร็จ'), tone: 'error' })
    } finally {
      setDeleting(false)
      setDeleteTeamTarget(null)
    }
  }

  async function handleDeleteVehicle() {
    if (!deleteVehicleTarget) return
    setDeleting(true)
    try {
      await deleteRescueVehicle(deleteVehicleTarget.id)
      toast({ title: t('ลบรถ/ทีมแล้ว'), tone: 'success' })
      await refreshOrgs()
    } catch {
      toast({ title: t('ลบไม่สำเร็จ'), tone: 'error' })
    } finally {
      setDeleting(false)
      setDeleteVehicleTarget(null)
    }
  }

  async function handleDeleteHospital() {
    if (!deleteHospitalTarget) return
    setDeleting(true)
    try {
      await deleteHospital(deleteHospitalTarget.id)
      toast({ title: t('ลบโรงพยาบาลแล้ว'), tone: 'success' })
      await refreshOrgs()
    } catch {
      toast({ title: t('ลบไม่สำเร็จ'), tone: 'error' })
    } finally {
      setDeleting(false)
      setDeleteHospitalTarget(null)
    }
  }

  return (
    <AppShell variant="dashboard" title={t('จัดการหน่วยกู้ชีพ/โรงพยาบาล')}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
                <Ambulance className="size-4 text-primary" /> {t('หน่วยกู้ชีพ (สาขา/จังหวัด)')}
              </h2>
              {teamFormOpen === null && (
                <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setTeamFormOpen('new')}>
                  {t('เพิ่มหน่วยกู้ชีพ')}
                </Button>
              )}
            </div>

            {teamFormOpen === 'new' && (
              <RescueTeamForm initial={null} onCancel={() => setTeamFormOpen(null)} onSaved={handleSaved} />
            )}

            {rescueTeams.length === 0 ? (
              <EmptyState title={t('ยังไม่มีหน่วยกู้ชีพในระบบ')} description={t('เพิ่มหน่วยกู้ชีพแรกได้ที่ปุ่มด้านบน')} />
            ) : (
              rescueTeams.map((team) =>
                teamFormOpen === team.id ? (
                  <RescueTeamForm key={team.id} initial={team} onCancel={() => setTeamFormOpen(null)} onSaved={handleSaved} />
                ) : (
                  <Card key={team.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-ink">
                          {team.name} <span className="font-mono text-xs text-muted">{team.id}</span>
                        </p>
                        <p className="text-sm text-muted">{team.phone}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" icon={<Pencil className="size-3.5" />} onClick={() => setTeamFormOpen(team.id)}>
                          {t('แก้ไข')}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={<Trash2 className="size-3.5" />}
                          onClick={() => setDeleteTeamTarget(team)}
                        >
                          {t('ลบ')}
                        </Button>
                      </div>
                    </div>

                    <TeamVehicles
                      team={team}
                      vehicleFormTarget={vehicleFormTarget}
                      setVehicleFormTarget={setVehicleFormTarget}
                      onDeleteVehicle={setDeleteVehicleTarget}
                      reload={refreshOrgs}
                    />
                  </Card>
                ),
              )
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
                <Building2 className="size-4 text-primary" /> {t('โรงพยาบาล')}
              </h2>
              {hospitalFormOpen === null && (
                <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setHospitalFormOpen('new')}>
                  {t('เพิ่มโรงพยาบาล')}
                </Button>
              )}
            </div>

            {hospitalFormOpen === 'new' && (
              <HospitalForm initial={null} onCancel={() => setHospitalFormOpen(null)} onSaved={handleSaved} />
            )}

            {hospitals.length === 0 ? (
              <EmptyState title={t('ยังไม่มีโรงพยาบาลในระบบ')} description={t('เพิ่มโรงพยาบาลแรกได้ที่ปุ่มด้านบน')} />
            ) : (
              hospitals.map((hospital) =>
                hospitalFormOpen === hospital.id ? (
                  <HospitalForm
                    key={hospital.id}
                    initial={hospital}
                    onCancel={() => setHospitalFormOpen(null)}
                    onSaved={handleSaved}
                  />
                ) : (
                  <Card key={hospital.id} className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-ink">
                        {hospital.name} <span className="font-mono text-xs text-muted">{hospital.id}</span>
                      </p>
                      <p className="text-sm text-muted">
                        {t('เตียงว่าง {n} · {phone}', { n: hospital.bedsAvailable, phone: hospital.phone })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<Pencil className="size-3.5" />}
                        onClick={() => setHospitalFormOpen(hospital.id)}
                      >
                        {t('แก้ไข')}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<Trash2 className="size-3.5" />}
                        onClick={() => setDeleteHospitalTarget(hospital)}
                      >
                        {t('ลบ')}
                      </Button>
                    </div>
                  </Card>
                ),
              )
            )}
          </section>
        </div>
      </div>

      <ConfirmationModal
        open={!!deleteTeamTarget}
        title={t('ยืนยันการลบหน่วยกู้ชีพ')}
        message={t(
          'ต้องการลบ "{name}" หรือไม่ รถ/ทีมทั้งหมดในหน่วยนี้จะถูกลบไปด้วย เคสที่มอบหมายไว้ก่อนหน้าจะไม่ถูกลบ แต่จะไม่สามารถมอบหมายเคสใหม่ให้หน่วยนี้ได้อีก',
          { name: deleteTeamTarget?.name ?? '' },
        )}
        confirmLabel={t('ยืนยันลบ')}
        tone="danger"
        confirmLoading={deleting}
        onConfirm={handleDeleteTeam}
        onCancel={() => setDeleteTeamTarget(null)}
      />
      <ConfirmationModal
        open={!!deleteVehicleTarget}
        title={t('ยืนยันการลบรถ/ทีม')}
        message={t('ต้องการลบ "{name}" หรือไม่', { name: deleteVehicleTarget?.unitCode ?? '' })}
        confirmLabel={t('ยืนยันลบ')}
        tone="danger"
        confirmLoading={deleting}
        onConfirm={handleDeleteVehicle}
        onCancel={() => setDeleteVehicleTarget(null)}
      />
      <ConfirmationModal
        open={!!deleteHospitalTarget}
        title={t('ยืนยันการลบโรงพยาบาล')}
        message={t('ต้องการลบ "{name}" หรือไม่ เคสที่ส่งไว้ก่อนหน้าจะไม่ถูกลบ แต่จะไม่สามารถเลือกส่งผู้ป่วยไปที่นี่ได้อีก', {
          name: deleteHospitalTarget?.name ?? '',
        })}
        confirmLabel={t('ยืนยันลบ')}
        tone="danger"
        confirmLoading={deleting}
        onConfirm={handleDeleteHospital}
        onCancel={() => setDeleteHospitalTarget(null)}
      />
    </AppShell>
  )
}
