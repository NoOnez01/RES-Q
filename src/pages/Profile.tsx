import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, Camera, ChevronRight, Loader2, UserCircle2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/States'
import { useStore } from '@/lib/store'
import { updateProfile } from '@/lib/auth'
import { uploadAvatar } from '@/lib/storageUploads'
import { roleLabel } from '@/lib/nav'
import { toast } from '@/lib/toast'
import { calculateAge } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  ข้อมูลส่วนตัว: 'Profile',
  ยังไม่ได้เข้าสู่ระบบ: 'Not signed in',
  กรุณาเข้าสู่ระบบเพื่อแก้ไขข้อมูลส่วนตัว: 'Please log in to edit your profile',
  กรุณาเลือกไฟล์รูปภาพ: 'Please select an image file',
  'อัปโหลดรูปโปรไฟล์แล้ว กด "บันทึกการเปลี่ยนแปลง" เพื่อยืนยัน': 'Profile photo uploaded — tap "Save changes" to confirm',
  อัปโหลดรูปไม่สำเร็จ: 'Failed to upload photo',
  'กรุณากรอกชื่อ-นามสกุล': 'Please enter your full name',
  บันทึกข้อมูลส่วนตัวแล้ว: 'Profile saved',
  บันทึกไม่สำเร็จ: 'Failed to save',
  เปลี่ยนรูปโปรไฟล์: 'Change profile photo',
  แตะรูปเพื่อเปลี่ยนรูปโปรไฟล์: 'Tap the photo to change it',
  สถิติของฉัน: 'My stats',
  ดูภาพรวมและแนวโน้มเคสที่เกี่ยวข้องกับคุณ: 'View an overview and trends for cases related to you',
  แก้ไขข้อมูลส่วนตัว: 'Edit profile',
  บทบาท: 'Role',
  แอดมิน: 'Admin',
  'ชื่อ-นามสกุล': 'Full name',
  ชื่อเล่น: 'Nickname',
  เบอร์ติดต่อ: 'Contact number',
  วันเกิด: 'Date of birth',
  'อายุ {n} ปี': '{n} years old',
  ข้อมูลทางการแพทย์: 'Medical information',
  ใช้เพื่อประโยชน์ในการช่วยเหลือกรณีฉุกเฉินเท่านั้น: 'Used only to help in an emergency',
  กรุ๊ปเลือด: 'Blood type',
  'ไม่ทราบ / ไม่ระบุ': 'Unknown / not specified',
  โรคประจำตัว: 'Chronic conditions',
  'เช่น เบาหวาน ความดันโลหิตสูง หอบหืด': 'e.g. diabetes, hypertension, asthma',
  'ประวัติแพ้ยา/แพ้อาหาร': 'Drug/food allergy history',
  'เช่น แพ้เพนนิซิลลิน แพ้อาหารทะเล': 'e.g. penicillin allergy, seafood allergy',
  บันทึกการเปลี่ยนแปลง: 'Save changes',
})

const BLOOD_TYPES = ['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function Profile() {
  const navigate = useNavigate()
  const currentUser = useStore((s) => s.currentUser)
  const setUser = useStore((s) => s.setUser)
  const rescueTeams = useStore((s) => s.rescueTeams)
  const hospitals = useStore((s) => s.hospitals)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useT()

  const [name, setName] = useState(currentUser?.name ?? '')
  const [nickname, setNickname] = useState(currentUser?.nickname ?? '')
  const [phone, setPhone] = useState(currentUser?.phone ?? '')
  const [birthdate, setBirthdate] = useState(currentUser?.birthdate ?? '')
  const [bloodType, setBloodType] = useState(currentUser?.bloodType ?? '')
  const [allergies, setAllergies] = useState(currentUser?.allergies ?? '')
  const [chronicConditions, setChronicConditions] = useState(currentUser?.chronicConditions ?? '')
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl ?? '')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!currentUser) {
    return (
      <AppShell variant="dashboard" title={t('ข้อมูลส่วนตัว')}>
        <ErrorState
          title={t('ยังไม่ได้เข้าสู่ระบบ')}
          description={t('กรุณาเข้าสู่ระบบเพื่อแก้ไขข้อมูลส่วนตัว')}
          onRetry={() => navigate('/login')}
          retryLabel={t('เข้าสู่ระบบ')}
        />
      </AppShell>
    )
  }

  const orgName =
    currentUser.role === 'rescue'
      ? rescueTeams.find((team) => team.id === currentUser.rescueTeamId)?.name
      : currentUser.role === 'hospital'
        ? hospitals.find((h) => h.id === currentUser.hospitalId)?.name
        : undefined

  const age = birthdate ? calculateAge(birthdate) : null

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !currentUser) return
    if (!file.type.startsWith('image/')) {
      toast({ title: t('กรุณาเลือกไฟล์รูปภาพ'), tone: 'error' })
      return
    }
    setAvatarUploading(true)
    try {
      const url = await uploadAvatar(currentUser.id, file, file.type === 'image/png' ? 'image/png' : 'image/jpeg')
      setAvatarUrl(url)
      toast({ title: t('อัปโหลดรูปโปรไฟล์แล้ว กด "บันทึกการเปลี่ยนแปลง" เพื่อยืนยัน'), tone: 'success' })
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined
      toast({ title: t('อัปโหลดรูปไม่สำเร็จ'), message, tone: 'error' })
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleSave() {
    if (!currentUser) return
    if (!name.trim()) {
      setError(t('กรุณากรอกชื่อ-นามสกุล'))
      return
    }
    setError('')
    setLoading(true)
    try {
      const patch = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
        nickname: nickname.trim() || undefined,
        birthdate: birthdate || undefined,
        bloodType: bloodType || undefined,
        allergies: allergies.trim() || undefined,
        chronicConditions: chronicConditions.trim() || undefined,
      }
      await updateProfile(currentUser.id, patch)
      setUser({ ...currentUser, ...patch })
      toast({ title: t('บันทึกข้อมูลส่วนตัวแล้ว'), tone: 'success' })
    } catch {
      toast({ title: t('บันทึกไม่สำเร็จ'), tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell variant="dashboard" title={t('ข้อมูลส่วนตัว')}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 mx-auto flex max-w-md flex-col gap-5">
          <Card className="flex flex-col items-center gap-3 animate-fade-in-up">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative size-24 shrink-0 overflow-hidden rounded-full border-4 border-skyblue-pale bg-skyblue-pale"
              aria-label={t('เปลี่ยนรูปโปรไฟล์')}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                <UserCircle2 className="size-full text-primary/40" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-navy/50 opacity-0 transition-opacity group-hover:opacity-100">
                {avatarUploading ? (
                  <Loader2 className="size-6 animate-spin text-white" />
                ) : (
                  <Camera className="size-6 text-white" />
                )}
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <p className="text-xs text-muted">{t('แตะรูปเพื่อเปลี่ยนรูปโปรไฟล์')}</p>
          </Card>

          <Link to="/personal-stats">
            <Card className="flex animate-fade-in-up items-center gap-3 transition-shadow hover:shadow-card-lg">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-skyblue-light text-primary">
                <BarChart3 className="size-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-ink">{t('สถิติของฉัน')}</p>
                <p className="text-xs text-muted">{t('ดูภาพรวมและแนวโน้มเคสที่เกี่ยวข้องกับคุณ')}</p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted" />
            </Card>
          </Link>

          <Card className="space-y-4 animate-fade-in-up">
            <h3 className="flex items-center gap-2 font-bold text-ink">
              <UserCircle2 className="size-4 text-primary" /> {t('แก้ไขข้อมูลส่วนตัว')}
            </h3>

            <div className="rounded-xl bg-skyblue-pale p-3 text-sm">
              <p className="text-muted">{t('บทบาท')}</p>
              <p className="font-semibold text-ink">
                {t(roleLabel(currentUser.role))}
                {orgName && ` · ${orgName}`}
                {currentUser.isAdmin && ` · ${t('แอดมิน')}`}
              </p>
            </div>

            <Input label={t('ชื่อ-นามสกุล')} required value={name} onChange={(e) => setName(e.target.value)} error={error} />
            <Input label={t('ชื่อเล่น')} value={nickname} onChange={(e) => setNickname(e.target.value)} />
            <Input label={t('เบอร์ติดต่อ')} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input
              label={t('วันเกิด')}
              type="date"
              value={birthdate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBirthdate(e.target.value)}
              hint={age !== null ? t('อายุ {n} ปี', { n: age }) : undefined}
            />
          </Card>

          <Card className="space-y-4 animate-fade-in-up">
            <h3 className="font-bold text-ink">{t('ข้อมูลทางการแพทย์')}</h3>
            <p className="text-xs text-muted">{t('ใช้เพื่อประโยชน์ในการช่วยเหลือกรณีฉุกเฉินเท่านั้น')}</p>
            <Select label={t('กรุ๊ปเลือด')} value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
              <option value="">{t('ไม่ทราบ / ไม่ระบุ')}</option>
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </Select>
            <Textarea
              label={t('โรคประจำตัว')}
              placeholder={t('เช่น เบาหวาน ความดันโลหิตสูง หอบหืด')}
              value={chronicConditions}
              onChange={(e) => setChronicConditions(e.target.value)}
            />
            <Textarea
              label={t('ประวัติแพ้ยา/แพ้อาหาร')}
              placeholder={t('เช่น แพ้เพนนิซิลลิน แพ้อาหารทะเล')}
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
            />
          </Card>

          <Button fullWidth loading={loading} onClick={handleSave}>
            {t('บันทึกการเปลี่ยนแปลง')}
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
