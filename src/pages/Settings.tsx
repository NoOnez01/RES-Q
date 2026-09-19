import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  UserCircle2,
  ShieldCheck,
  Trash2,
  LogOut,
  Radio,
  Ambulance,
  Building2,
  ShieldAlert,
  UserCheck,
  Wrench,
  KeyRound,
  Mail,
  Sun,
  Moon,
  MonitorSmartphone,
  Languages,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { GoogleIcon, LineIcon } from '@/components/icons/SocialIcons'
import { useStore } from '@/lib/store'
import { roleLabel } from '@/lib/nav'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'
import { clearAllSupabaseCases } from '@/lib/supabaseCaseSync'
import { supabase } from '@/lib/supabase'
import { fetchProfile, signInWithLine, unlinkLineIdentity } from '@/lib/auth'
import { isNativeApp } from '@/lib/nativeNotify'

registerTranslations({
  ตั้งค่า: 'Settings',
  ข้อมูลผู้ใช้งาน: 'Account',
  ยังไม่ได้เข้าสู่ระบบ: 'Not signed in',
  ออกจากระบบ: 'Log out',
  หน้าตาและภาษา: 'Appearance & language',
  บัญชีและความปลอดภัย: 'Account & security',
  'เข้าสู่ระบบด้วย Google': 'Signed in with Google',
  'เข้าสู่ระบบด้วย LINE': 'Signed in with LINE',
  เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน: 'Signed in with email & password',
  บัญชีที่เชื่อมต่อ: 'Linked accounts',
  'เชื่อมหลายวิธีเข้าสู่ระบบไว้ในบัญชีเดียวกัน เพื่อเข้าสู่ระบบด้วยวิธีไหนก็ได้ และรับการแจ้งเตือนผ่าน LINE':
    'Link multiple sign-in methods to the same account so you can log in any way, and get notifications via LINE.',
  เชื่อมต่อแล้ว: 'Linked',
  เชื่อมต่อ: 'Link',
  ยกเลิกการเชื่อมต่อ: 'Unlink',
  เปลี่ยนรหัสผ่าน: 'Change password',
  ตั้งอีเมลและรหัสผ่าน: 'Set email & password',
  'ตั้งอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบได้แม้ไม่มี Google หรือ LINE': 'Set an email and password so you can log in even without Google or LINE.',
  อีเมล: 'Email',
  รหัสผ่านใหม่: 'New password',
  'อย่างน้อย 6 ตัวอักษร': 'At least 6 characters',
  ยืนยันรหัสผ่านใหม่: 'Confirm new password',
  บันทึกรหัสผ่านใหม่: 'Save new password',
  บันทึก: 'Save',
  มุมมองผู้ดูแลระบบ: 'Admin view',
  'เข้าดูแดชบอร์ดของแต่ละหน่วยงานแบบไม่จำกัดขอบเขต (เห็นทุกหน่วยกู้ชีพ/ทุกโรงพยาบาล)':
    "View any organization's dashboard without restriction (every rescue team / every hospital).",
  ศูนย์สั่งการ: 'Dispatch center',
  'หน่วยกู้ชีพ (ทุกหน่วย)': 'Rescue teams (all)',
  'โรงพยาบาล (ทุกแห่ง)': 'Hospitals (all)',
  'บัญชีรออนุมัติ / จัดการสิทธิ์': 'Pending accounts / permissions',
  'จัดการหน่วยกู้ชีพ/โรงพยาบาล': 'Manage rescue teams / hospitals',
  ข้อควรทราบ: 'Notices',
  ระบบนี้เป็นต้นแบบสำหรับการสาธิตและการวิจัย: 'This system is a prototype for demonstration and research.',
  ข้อมูลในระบบเป็นข้อมูลจำลองและไม่ใช่ข้อมูลผู้ป่วยจริง: 'Data in the system is simulated, not real patient data.',
  ระบบไม่ทดแทนการประเมินทางการแพทย์: 'This system does not replace professional medical assessment.',
  ล้างข้อมูลตัวอย่าง: 'Clear sample data',
  'ลบเคสทั้งหมด (รวมข้อมูลที่ซิงค์ไว้ทุกอุปกรณ์) และข้อมูลผู้ใช้ในเบราว์เซอร์นี้':
    "Deletes all cases (including data synced across every device) and this browser's local user data.",
  ล้างข้อมูลตัวอย่างทั้งหมด: 'Clear all sample data',
  ล้างข้อมูลทั้งหมด: 'Clear all data',
  'การดำเนินการนี้จะลบเคสทั้งหมดทั้งในเบราว์เซอร์นี้และในฐานข้อมูลที่ซิงค์ไว้ (ทุกอุปกรณ์) รวมถึงข้อมูลผู้ใช้ในเบราว์เซอร์นี้ ไม่สามารถย้อนกลับได้':
    "This deletes all cases both in this browser and in the synced database (every device), plus this browser's user data. This cannot be undone.",
  เปลี่ยนรหัสผ่านแล้ว: 'Password changed',
  บันทึกอีเมลแล้ว: 'Email saved',
  กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยัน: 'Please check your email to confirm',
  'เชื่อมต่อ Google ไม่สำเร็จ': 'Failed to link Google',
  'เชื่อมต่อ LINE สำเร็จ': 'LINE linked successfully',
  'เชื่อมต่อ LINE ไม่สำเร็จ': 'Failed to link LINE',
  'ยกเลิกการเชื่อมต่อ LINE แล้ว': 'LINE unlinked',
  ยกเลิกการเชื่อมต่อไม่สำเร็จ: 'Failed to unlink',
  ล้างข้อมูลทั้งหมดแล้ว: 'All data cleared',
  ออกจากระบบแล้ว: 'Logged out',
  กรุณากรอกอีเมลให้ถูกต้อง: 'Please enter a valid email',
  'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร': 'Password must be at least 6 characters',
  รหัสผ่านทั้งสองช่องไม่ตรงกัน: 'Passwords do not match',
  โหมดการแสดงผล: 'Appearance',
  สว่าง: 'Light',
  มืด: 'Dark',
  ตามอุปกรณ์: 'System',
  ภาษา: 'Language',
})

const NOTICES = [
  'ระบบนี้เป็นต้นแบบสำหรับการสาธิตและการวิจัย',
  'ข้อมูลในระบบเป็นข้อมูลจำลองและไม่ใช่ข้อมูลผู้ป่วยจริง',
  'ระบบไม่ทดแทนการประเมินทางการแพทย์',
]

const ADMIN_VIEWS = [
  { path: '/dispatch/dashboard', role: 'dispatch' as const, label: 'ศูนย์สั่งการ', icon: Radio },
  { path: '/rescue/dashboard', role: 'rescue' as const, label: 'หน่วยกู้ชีพ (ทุกหน่วย)', icon: Ambulance },
  { path: '/hospital/dashboard', role: 'hospital' as const, label: 'โรงพยาบาล (ทุกแห่ง)', icon: Building2 },
]

export default function Settings() {
  const currentUser = useStore((s) => s.currentUser)
  const logout = useStore((s) => s.logout)
  const resetAll = useStore((s) => s.resetAll)
  const setViewingRole = useStore((s) => s.setViewingRole)
  const setUser = useStore((s) => s.setUser)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const language = useStore((s) => s.language)
  const setLanguage = useStore((s) => s.setLanguage)
  const navigate = useNavigate()
  const t = useT()

  function enterAdminView(view: (typeof ADMIN_VIEWS)[number]) {
    // Also swaps the sidebar/menu to match (see AppShell's effectiveRole) --
    // otherwise the admin would land on e.g. the rescue dashboard but still
    // see their own dispatch menu, unable to reach rescue-only routes.
    setViewingRole(view.role)
    navigate(view.path)
  }

  const [resetOpen, setResetOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  // Which method this account actually authenticates with -- a LINE login
  // is, under the hood, a magic-link-verified email (see completeLineLogin
  // in lib/auth.ts), so app_metadata.provider alone reads 'email' for it
  // too; the 'line' marker we stamped into user_metadata at creation is
  // what actually tells the two apart.
  const [authEmail, setAuthEmail] = useState<string | null>(null)
  const [authProvider, setAuthProvider] = useState<'email' | 'google' | 'line' | null>(null)
  const [linkedProviders, setLinkedProviders] = useState<Set<string>>(new Set())
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [unlinkLineLoading, setUnlinkLineLoading] = useState(false)

  useEffect(() => {
    if (!supabase || !currentUser || currentUser.isAnonymous) return
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (!u) return
      setAuthEmail(u.email ?? null)
      setAuthProvider(u.user_metadata?.provider === 'line' ? 'line' : u.app_metadata?.provider === 'google' ? 'google' : 'email')
      setLinkedProviders(new Set((u.identities ?? []).map((i) => i.provider)))
    })
  }, [currentUser])

  // A synthetic LINE-login email (line-<sub>@line.resq.internal) isn't a
  // real inbox -- treat it the same as "no real email yet" so the form
  // below asks for one instead of pretending there's already a usable
  // email/password login method.
  const hasRealEmail = authProvider === 'email' && !!authEmail && !authEmail.endsWith('@line.resq.internal')
  const googleLinked = linkedProviders.has('google')
  const lineLinked = !!currentUser?.lineUserId

  async function handleSaveEmailPassword() {
    setPasswordError('')
    if (!hasRealEmail && !/^\S+@\S+\.\S+$/.test(newEmail)) {
      setPasswordError(t('กรุณากรอกอีเมลให้ถูกต้อง'))
      return
    }
    if (newPassword.length < 6) {
      setPasswordError(t('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('รหัสผ่านทั้งสองช่องไม่ตรงกัน'))
      return
    }
    if (!supabase) return
    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser(
      hasRealEmail ? { password: newPassword } : { email: newEmail, password: newPassword },
    )
    setPasswordLoading(false)
    if (error) {
      setPasswordError(error.message)
      return
    }
    setNewEmail('')
    setNewPassword('')
    setConfirmPassword('')
    toast({
      title: hasRealEmail ? t('เปลี่ยนรหัสผ่านแล้ว') : t('บันทึกอีเมลแล้ว'),
      message: hasRealEmail ? undefined : t('กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยัน'),
      tone: 'success',
    })
  }

  function handleLinkGoogle() {
    if (!supabase) return
    sessionStorage.setItem('resq-google-link-mode', '1')
    void supabase.auth
      .linkIdentity({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth/callback` },
      })
      .then(({ error }) => {
        if (error) toast({ title: t('เชื่อมต่อ Google ไม่สำเร็จ'), message: error.message, tone: 'error' })
      })
  }

  async function handleLinkLine() {
    try {
      await signInWithLine('link')
      // Native completes the link synchronously (app-to-app login, no
      // redirect to land on) -- refresh the profile to pick up the new
      // line_user_id and confirm success here. Web instead navigates away
      // to LINE and shows its own toast once /auth/line-callback finishes.
      if (isNativeApp() && currentUser) {
        const refreshed = await fetchProfile(currentUser.id, false)
        if (refreshed) setUser(refreshed)
        toast({ title: t('เชื่อมต่อ LINE สำเร็จ'), tone: 'success' })
      }
    } catch (err) {
      toast({ title: t('เชื่อมต่อ LINE ไม่สำเร็จ'), message: err instanceof Error ? err.message : undefined, tone: 'error' })
    }
  }

  async function handleUnlinkLine() {
    if (!currentUser) return
    setUnlinkLineLoading(true)
    try {
      await unlinkLineIdentity(currentUser.id)
      const refreshed = await fetchProfile(currentUser.id, false)
      if (refreshed) setUser(refreshed)
      toast({ title: t('ยกเลิกการเชื่อมต่อ LINE แล้ว'), tone: 'info' })
    } catch (err) {
      toast({ title: t('ยกเลิกการเชื่อมต่อไม่สำเร็จ'), message: err instanceof Error ? err.message : undefined, tone: 'error' })
    } finally {
      setUnlinkLineLoading(false)
    }
  }

  async function handleReset() {
    setResetLoading(true)
    resetAll()
    // Cases sync to Supabase, so clearing only local state means a reload
    // (or another tab/device) would just pull all of it right back. Under
    // the scoped RLS policies this only actually deletes anything for a
    // dispatch/admin account -- other roles are correctly limited to their
    // own cases.
    await clearAllSupabaseCases()
    setResetLoading(false)
    setResetOpen(false)
    toast({ title: t('ล้างข้อมูลทั้งหมดแล้ว'), tone: 'success' })
    navigate('/')
  }

  function handleLogout() {
    logout()
    toast({ title: t('ออกจากระบบแล้ว'), tone: 'info' })
    navigate('/')
  }

  const THEME_OPTIONS = [
    { value: 'light' as const, label: t('สว่าง'), icon: Sun },
    { value: 'dark' as const, label: t('มืด'), icon: Moon },
    { value: 'system' as const, label: t('ตามอุปกรณ์'), icon: MonitorSmartphone },
  ]

  return (
    <AppShell variant="dashboard" title={t('ตั้งค่า')}>
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 flex flex-col gap-5">
        <Card className="space-y-4 animate-fade-in-up">
          <h3 className="flex items-center gap-2 font-bold text-ink">
            <UserCircle2 className="size-4 text-primary" /> {t('ข้อมูลผู้ใช้งาน')}
          </h3>
          <div className="rounded-xl bg-skyblue-pale p-4">
            <p className="font-semibold text-ink">{currentUser?.name ?? t('ยังไม่ได้เข้าสู่ระบบ')}</p>
            <p className="text-sm text-muted">{t(roleLabel(currentUser?.role ?? null))}</p>
          </div>

          {currentUser && !currentUser.isAnonymous && (
            <Button variant="outline" size="sm" icon={<LogOut className="size-4" />} onClick={handleLogout}>
              {t('ออกจากระบบ')}
            </Button>
          )}
        </Card>

        <Card className="space-y-4 animate-fade-in-up" style={{ animationDelay: '15ms', animationFillMode: 'backwards' }}>
          <h3 className="flex items-center gap-2 font-bold text-ink">
            <Sun className="size-4 text-primary" /> {t('หน้าตาและภาษา')}
          </h3>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('โหมดการแสดงผล')}</p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  aria-pressed={theme === opt.value}
                  className={
                    theme === opt.value
                      ? 'flex flex-col items-center gap-1.5 rounded-xl border-2 border-primary bg-skyblue-light px-2 py-3 text-primary transition-all'
                      : 'flex flex-col items-center gap-1.5 rounded-xl border-2 border-border bg-surface px-2 py-3 text-muted transition-all hover:border-primary/40'
                  }
                >
                  <opt.icon className="size-5" />
                  <span className="text-xs font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <Languages className="size-3.5" /> {t('ภาษา')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLanguage('th')}
                aria-pressed={language === 'th'}
                className={
                  language === 'th'
                    ? 'rounded-xl border-2 border-primary bg-skyblue-light px-3 py-2.5 text-sm font-semibold text-primary transition-all'
                    : 'rounded-xl border-2 border-border bg-surface px-3 py-2.5 text-sm font-semibold text-muted transition-all hover:border-primary/40'
                }
              >
                ไทย
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                aria-pressed={language === 'en'}
                className={
                  language === 'en'
                    ? 'rounded-xl border-2 border-primary bg-skyblue-light px-3 py-2.5 text-sm font-semibold text-primary transition-all'
                    : 'rounded-xl border-2 border-border bg-surface px-3 py-2.5 text-sm font-semibold text-muted transition-all hover:border-primary/40'
                }
              >
                English
              </button>
            </div>
          </div>
        </Card>

        {currentUser && !currentUser.isAnonymous && (
          <Card className="space-y-4 animate-fade-in-up" style={{ animationDelay: '30ms', animationFillMode: 'backwards' }}>
            <h3 className="flex items-center gap-2 font-bold text-ink">
              <ShieldCheck className="size-4 text-primary" /> {t('บัญชีและความปลอดภัย')}
            </h3>

            <div className="flex items-center gap-3">
              {authProvider === 'google' ? (
                <GoogleIcon className="size-6 shrink-0" />
              ) : authProvider === 'line' ? (
                <LineIcon className="size-6 shrink-0 rounded-lg" />
              ) : (
                <Mail className="size-6 shrink-0 text-primary" />
              )}
              <div>
                <p className="text-sm font-semibold text-ink">
                  {authProvider === 'google'
                    ? t('เข้าสู่ระบบด้วย Google')
                    : authProvider === 'line'
                      ? t('เข้าสู่ระบบด้วย LINE')
                      : t('เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน')}
                </p>
                {hasRealEmail && authEmail && <p className="text-xs text-muted">{authEmail}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="text-sm font-semibold text-ink">{t('บัญชีที่เชื่อมต่อ')}</p>
              <p className="text-xs text-muted">
                {t('เชื่อมหลายวิธีเข้าสู่ระบบไว้ในบัญชีเดียวกัน เพื่อเข้าสู่ระบบด้วยวิธีไหนก็ได้ และรับการแจ้งเตือนผ่าน LINE')}
              </p>
              <div className="flex flex-col divide-y divide-border">
                <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <GoogleIcon className="size-5 shrink-0" />
                    <span className="text-sm text-ink">Google</span>
                  </div>
                  {googleLinked ? (
                    <span className="text-xs font-medium text-success">{t('เชื่อมต่อแล้ว')}</span>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleLinkGoogle}>
                      {t('เชื่อมต่อ')}
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <LineIcon className="size-5 shrink-0 rounded-md" />
                    <span className="text-sm text-ink">LINE</span>
                  </div>
                  {lineLinked ? (
                    <Button variant="outline" size="sm" loading={unlinkLineLoading} onClick={handleUnlinkLine}>
                      {t('ยกเลิกการเชื่อมต่อ')}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleLinkLine}>
                      {t('เชื่อมต่อ')}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <KeyRound className="size-4 text-primary" /> {hasRealEmail ? t('เปลี่ยนรหัสผ่าน') : t('ตั้งอีเมลและรหัสผ่าน')}
              </p>
              {!hasRealEmail && (
                <p className="text-xs text-muted">{t('ตั้งอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบได้แม้ไม่มี Google หรือ LINE')}</p>
              )}
              {!hasRealEmail && (
                <Input
                  label={t('อีเมล')}
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              )}
              <Input
                label={t('รหัสผ่านใหม่')}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('อย่างน้อย 6 ตัวอักษร')}
              />
              <Input
                label={t('ยืนยันรหัสผ่านใหม่')}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={passwordError}
              />
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                loading={passwordLoading}
                disabled={!newPassword || !confirmPassword || (!hasRealEmail && !newEmail)}
                onClick={handleSaveEmailPassword}
              >
                {hasRealEmail ? t('บันทึกรหัสผ่านใหม่') : t('บันทึก')}
              </Button>
            </div>
          </Card>
        )}

        {currentUser?.isAdmin && (
          <Card className="space-y-3 animate-fade-in-up border-primary/30 bg-skyblue-pale">
            <h3 className="flex items-center gap-2 font-bold text-ink">
              <ShieldAlert className="size-4 text-primary" /> {t('มุมมองผู้ดูแลระบบ')}
            </h3>
            <p className="text-sm text-muted">{t('เข้าดูแดชบอร์ดของแต่ละหน่วยงานแบบไม่จำกัดขอบเขต (เห็นทุกหน่วยกู้ชีพ/ทุกโรงพยาบาล)')}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {ADMIN_VIEWS.map((v) => (
                <Button
                  key={v.path}
                  variant="outline"
                  size="sm"
                  fullWidth
                  icon={<v.icon className="size-4" />}
                  onClick={() => enterAdminView(v)}
                >
                  {t(v.label)}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link to="/dispatch/pending-approvals">
                <Button variant="outline" size="sm" fullWidth icon={<UserCheck className="size-4" />}>
                  {t('บัญชีรออนุมัติ / จัดการสิทธิ์')}
                </Button>
              </Link>
              <Link to="/manage-orgs">
                <Button variant="outline" size="sm" fullWidth icon={<Wrench className="size-4" />}>
                  {t('จัดการหน่วยกู้ชีพ/โรงพยาบาล')}
                </Button>
              </Link>
            </div>
          </Card>
        )}

        <Card className="space-y-3 animate-fade-in-up" style={{ animationDelay: '60ms', animationFillMode: 'backwards' }}>
          <h3 className="flex items-center gap-2 font-bold text-ink">
            <ShieldCheck className="size-4 text-primary" /> {t('ข้อควรทราบ')}
          </h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
            {NOTICES.map((notice) => (
              <li key={notice}>{t(notice)}</li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col items-start gap-3 border-emergency/30 bg-emergency/5 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up" style={{ animationDelay: '120ms', animationFillMode: 'backwards' }}>
          <div>
            <p className="font-bold text-ink">{t('ล้างข้อมูลตัวอย่าง')}</p>
            <p className="text-sm text-muted">{t('ลบเคสทั้งหมด (รวมข้อมูลที่ซิงค์ไว้ทุกอุปกรณ์) และข้อมูลผู้ใช้ในเบราว์เซอร์นี้')}</p>
          </div>
          <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setResetOpen(true)}>
            {t('ล้างข้อมูลตัวอย่างทั้งหมด')}
          </Button>
        </Card>
        </div>
      </div>

      <ConfirmationModal
        open={resetOpen}
        tone="danger"
        title={t('ล้างข้อมูลทั้งหมด')}
        message={t(
          'การดำเนินการนี้จะลบเคสทั้งหมดทั้งในเบราว์เซอร์นี้และในฐานข้อมูลที่ซิงค์ไว้ (ทุกอุปกรณ์) รวมถึงข้อมูลผู้ใช้ในเบราว์เซอร์นี้ ไม่สามารถย้อนกลับได้',
        )}
        confirmLabel={t('ล้างข้อมูลทั้งหมด')}
        confirmLoading={resetLoading}
        onConfirm={handleReset}
        onCancel={() => setResetOpen(false)}
      />
    </AppShell>
  )
}
