import { useState } from 'react'
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
  type NewRescueTeamInput,
  type NewHospitalInput,
} from '@/lib/orgs'
import type { RescueTeam, Hospital } from '@/lib/types'
import { Ambulance, Building2, Plus, Pencil, Trash2 } from 'lucide-react'

const EMPTY_TEAM_FORM: NewRescueTeamInput = { name: '', unitCode: '', phone: '', members: 3, vehicle: '', equipment: [], baseAddress: '' }
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
          unitCode: initial.unitCode,
          phone: initial.phone,
          members: initial.members,
          vehicle: initial.vehicle,
          equipment: initial.equipment,
          baseAddress: initial.base.address,
          baseLat: initial.base.lat,
          baseLng: initial.base.lng,
        }
      : EMPTY_TEAM_FORM,
  )
  const [equipmentText, setEquipmentText] = useState(initial?.equipment.join(', ') ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.name.trim() || !form.unitCode.trim() || !form.phone.trim()) {
      toast({ title: 'กรุณากรอกชื่อหน่วย รหัสหน่วย และเบอร์โทรศัพท์', tone: 'error' })
      return
    }
    setSaving(true)
    try {
      const input: NewRescueTeamInput = { ...form, equipment: splitList(equipmentText) }
      if (initial) await updateRescueTeam(initial.id, input)
      else await createRescueTeam(input)
      toast({ title: initial ? 'บันทึกข้อมูลหน่วยกู้ชีพแล้ว' : 'สร้างหน่วยกู้ชีพใหม่แล้ว', tone: 'success' })
      onSaved()
    } catch {
      toast({ title: 'บันทึกไม่สำเร็จ', tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="ชื่อหน่วยกู้ชีพ" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="รหัสหน่วย" required value={form.unitCode} onChange={(e) => setForm({ ...form, unitCode: e.target.value })} />
        <Input label="เบอร์โทรศัพท์" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input
          label="จำนวนสมาชิก"
          type="number"
          min={1}
          value={form.members}
          onChange={(e) => setForm({ ...form, members: Number(e.target.value) || 1 })}
        />
        <Input label="ยานพาหนะ" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} />
        <Input label="ที่ตั้งหน่วย" value={form.baseAddress} onChange={(e) => setForm({ ...form, baseAddress: e.target.value })} />
      </div>
      <Input
        label="อุปกรณ์เฉพาะทาง (คั่นด้วยจุลภาค)"
        placeholder="เครื่องตัดถ่าง, เฝือกดามคอ"
        value={equipmentText}
        onChange={(e) => setEquipmentText(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" loading={saving} onClick={handleSave}>
          บันทึก
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          ยกเลิก
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

  async function handleSave() {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast({ title: 'กรุณากรอกชื่อ เบอร์โทรศัพท์ และที่อยู่โรงพยาบาล', tone: 'error' })
      return
    }
    setSaving(true)
    try {
      const input: NewHospitalInput = { ...form, specialties: splitList(specialtiesText) }
      if (initial) await updateHospital(initial.id, input)
      else await createHospital(input)
      toast({ title: initial ? 'บันทึกข้อมูลโรงพยาบาลแล้ว' : 'สร้างโรงพยาบาลใหม่แล้ว', tone: 'success' })
      onSaved()
    } catch {
      toast({ title: 'บันทึกไม่สำเร็จ', tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="ชื่อโรงพยาบาล" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="เบอร์โทรศัพท์" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input
          label="ที่อยู่"
          required
          className="sm:col-span-2"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <Input
          label="จำนวนเตียงว่าง"
          type="number"
          min={0}
          value={form.bedsAvailable}
          onChange={(e) => setForm({ ...form, bedsAvailable: Number(e.target.value) || 0 })}
        />
      </div>
      <Checkbox
        checked={form.erAvailable ?? true}
        onChange={(v) => setForm({ ...form, erAvailable: v })}
        label="ห้องฉุกเฉินพร้อมรับผู้ป่วย"
      />
      <Input
        label="ความเชี่ยวชาญเฉพาะทาง (คั่นด้วยจุลภาค)"
        placeholder="ศัลยกรรมประสาท, หัวใจ"
        value={specialtiesText}
        onChange={(e) => setSpecialtiesText(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" loading={saving} onClick={handleSave}>
          บันทึก
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          ยกเลิก
        </Button>
      </div>
    </Card>
  )
}

export default function ManageOrgs() {
  const currentUser = useStore((s) => s.currentUser)
  const rescueTeams = useStore((s) => s.rescueTeams)
  const hospitals = useStore((s) => s.hospitals)
  const refreshOrgs = useStore((s) => s.refreshOrgs)

  const [teamFormOpen, setTeamFormOpen] = useState<string | 'new' | null>(null)
  const [hospitalFormOpen, setHospitalFormOpen] = useState<string | 'new' | null>(null)
  const [deleteTeamTarget, setDeleteTeamTarget] = useState<RescueTeam | null>(null)
  const [deleteHospitalTarget, setDeleteHospitalTarget] = useState<Hospital | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (!currentUser?.isAdmin) {
    return (
      <AppShell variant="dashboard" title="จัดการหน่วยกู้ชีพ/โรงพยาบาล">
        <ErrorState title="ไม่มีสิทธิ์เข้าถึงหน้านี้" description="เฉพาะแอดมินเท่านั้นที่จัดการหน่วยกู้ชีพ/โรงพยาบาลได้" />
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
      toast({ title: 'ลบหน่วยกู้ชีพแล้ว', tone: 'success' })
      await refreshOrgs()
    } catch {
      toast({ title: 'ลบไม่สำเร็จ', tone: 'error' })
    } finally {
      setDeleting(false)
      setDeleteTeamTarget(null)
    }
  }

  async function handleDeleteHospital() {
    if (!deleteHospitalTarget) return
    setDeleting(true)
    try {
      await deleteHospital(deleteHospitalTarget.id)
      toast({ title: 'ลบโรงพยาบาลแล้ว', tone: 'success' })
      await refreshOrgs()
    } catch {
      toast({ title: 'ลบไม่สำเร็จ', tone: 'error' })
    } finally {
      setDeleting(false)
      setDeleteHospitalTarget(null)
    }
  }

  return (
    <AppShell variant="dashboard" title="จัดการหน่วยกู้ชีพ/โรงพยาบาล">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
                <Ambulance className="size-4 text-primary" /> หน่วยกู้ชีพ
              </h2>
              {teamFormOpen === null && (
                <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setTeamFormOpen('new')}>
                  เพิ่มหน่วยกู้ชีพ
                </Button>
              )}
            </div>

            {teamFormOpen === 'new' && (
              <RescueTeamForm initial={null} onCancel={() => setTeamFormOpen(null)} onSaved={handleSaved} />
            )}

            {rescueTeams.length === 0 ? (
              <EmptyState title="ยังไม่มีหน่วยกู้ชีพในระบบ" description="เพิ่มหน่วยกู้ชีพแรกได้ที่ปุ่มด้านบน" />
            ) : (
              rescueTeams.map((team) =>
                teamFormOpen === team.id ? (
                  <RescueTeamForm key={team.id} initial={team} onCancel={() => setTeamFormOpen(null)} onSaved={handleSaved} />
                ) : (
                  <Card key={team.id} className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-navy">
                        {team.name} <span className="font-mono text-xs text-muted">{team.id}</span>
                      </p>
                      <p className="text-sm text-muted">
                        {team.unitCode} · {team.members} คน · {team.phone}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" icon={<Pencil className="size-3.5" />} onClick={() => setTeamFormOpen(team.id)}>
                        แก้ไข
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<Trash2 className="size-3.5" />}
                        onClick={() => setDeleteTeamTarget(team)}
                      >
                        ลบ
                      </Button>
                    </div>
                  </Card>
                ),
              )
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
                <Building2 className="size-4 text-primary" /> โรงพยาบาล
              </h2>
              {hospitalFormOpen === null && (
                <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setHospitalFormOpen('new')}>
                  เพิ่มโรงพยาบาล
                </Button>
              )}
            </div>

            {hospitalFormOpen === 'new' && (
              <HospitalForm initial={null} onCancel={() => setHospitalFormOpen(null)} onSaved={handleSaved} />
            )}

            {hospitals.length === 0 ? (
              <EmptyState title="ยังไม่มีโรงพยาบาลในระบบ" description="เพิ่มโรงพยาบาลแรกได้ที่ปุ่มด้านบน" />
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
                      <p className="font-bold text-navy">
                        {hospital.name} <span className="font-mono text-xs text-muted">{hospital.id}</span>
                      </p>
                      <p className="text-sm text-muted">
                        เตียงว่าง {hospital.bedsAvailable} · {hospital.phone}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<Pencil className="size-3.5" />}
                        onClick={() => setHospitalFormOpen(hospital.id)}
                      >
                        แก้ไข
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<Trash2 className="size-3.5" />}
                        onClick={() => setDeleteHospitalTarget(hospital)}
                      >
                        ลบ
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
        title="ยืนยันการลบหน่วยกู้ชีพ"
        message={`ต้องการลบ "${deleteTeamTarget?.name}" หรือไม่ เคสที่มอบหมายไว้ก่อนหน้าจะไม่ถูกลบ แต่จะไม่สามารถมอบหมายเคสใหม่ให้หน่วยนี้ได้อีก`}
        confirmLabel="ยืนยันลบ"
        tone="danger"
        confirmLoading={deleting}
        onConfirm={handleDeleteTeam}
        onCancel={() => setDeleteTeamTarget(null)}
      />
      <ConfirmationModal
        open={!!deleteHospitalTarget}
        title="ยืนยันการลบโรงพยาบาล"
        message={`ต้องการลบ "${deleteHospitalTarget?.name}" หรือไม่ เคสที่ส่งไว้ก่อนหน้าจะไม่ถูกลบ แต่จะไม่สามารถเลือกส่งผู้ป่วยไปที่นี่ได้อีก`}
        confirmLabel="ยืนยันลบ"
        tone="danger"
        confirmLoading={deleting}
        onConfirm={handleDeleteHospital}
        onCancel={() => setDeleteHospitalTarget(null)}
      />
    </AppShell>
  )
}
