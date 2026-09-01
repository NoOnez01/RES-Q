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
import { clearAllSupabaseCases } from '@/lib/supabaseCaseSync'
import { supabase } from '@/lib/supabase'
import { fetchProfile, signInWithLine, unlinkLineIdentity } from '@/lib/auth'

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
  const navigate = useNavigate()

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
      setPasswordError('กรุณากรอกอีเมลให้ถูกต้อง')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
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
      title: hasRealEmail ? 'เปลี่ยนรหัสผ่านแล้ว' : 'บันทึกอีเมลแล้ว',
      message: hasRealEmail ? undefined : 'กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยัน',
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
        if (error) toast({ title: 'เชื่อมต่อ Google ไม่สำเร็จ', message: error.message, tone: 'error' })
      })
  }

  async function handleLinkLine() {
    try {
      await signInWithLine('link')
    } catch (err) {
      toast({ title: 'เชื่อมต่อ LINE ไม่สำเร็จ', message: err instanceof Error ? err.message : undefined, tone: 'error' })
    }
  }

  async function handleUnlinkLine() {
    if (!currentUser) return
    setUnlinkLineLoading(true)
    try {
      await unlinkLineIdentity(currentUser.id)
      const refreshed = await fetchProfile(currentUser.id, false)
      if (refreshed) setUser(refreshed)
      toast({ title: 'ยกเลิกการเชื่อมต่อ LINE แล้ว', tone: 'info' })
    } catch (err) {
      toast({ title: 'ยกเลิกการเชื่อมต่อไม่สำเร็จ', message: err instanceof Error ? err.message : undefined, tone: 'error' })
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
    toast({ title: 'ล้างข้อมูลทั้งหมดแล้ว', tone: 'success' })
    navigate('/')
  }

  function handleLogout() {
    logout()
    toast({ title: 'ออกจากระบบแล้ว', tone: 'info' })
    navigate('/')
  }

  return (
    <AppShell variant="dashboard" title="ตั้งค่า">
      <div className="relative">
        <AnimatedBackground variant="dashboard" />
        <div className="relative z-10 flex flex-col gap-5">
        <Card className="space-y-4 animate-fade-in-up">
          <h3 className="flex items-center gap-2 font-bold text-navy">
            <UserCircle2 className="size-4 text-primary" /> ข้อมูลผู้ใช้งาน
          </h3>
          <div className="rounded-xl bg-skyblue-pale p-4">
            <p className="font-semibold text-navy">{currentUser?.name ?? 'ยังไม่ได้เข้าสู่ระบบ'}</p>
            <p className="text-sm text-muted">{roleLabel(currentUser?.role ?? null)}</p>
          </div>

          {currentUser && !currentUser.isAnonymous && (
            <Button variant="outline" size="sm" icon={<LogOut className="size-4" />} onClick={handleLogout}>
              ออกจากระบบ
            </Button>
          )}
        </Card>

        {currentUser && !currentUser.isAnonymous && (
          <Card className="space-y-4 animate-fade-in-up" style={{ animationDelay: '30ms', animationFillMode: 'backwards' }}>
            <h3 className="flex items-center gap-2 font-bold text-navy">
              <ShieldCheck className="size-4 text-primary" /> บัญชีและความปลอดภัย
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
                <p className="text-sm font-semibold text-navy">
                  {authProvider === 'google'
                    ? 'เข้าสู่ระบบด้วย Google'
                    : authProvider === 'line'
                      ? 'เข้าสู่ระบบด้วย LINE'
                      : 'เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน'}
                </p>
                {hasRealEmail && authEmail && <p className="text-xs text-muted">{authEmail}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="text-sm font-semibold text-navy">บัญชีที่เชื่อมต่อ</p>
              <p className="text-xs text-muted">
                เชื่อมหลายวิธีเข้าสู่ระบบไว้ในบัญชีเดียวกัน เพื่อเข้าสู่ระบบด้วยวิธีไหนก็ได้ และรับการแจ้งเตือนผ่าน LINE
              </p>
              <div className="flex flex-col divide-y divide-border">
                <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <GoogleIcon className="size-5 shrink-0" />
                    <span className="text-sm text-navy">Google</span>
                  </div>
                  {googleLinked ? (
                    <span className="text-xs font-medium text-success">เชื่อมต่อแล้ว</span>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleLinkGoogle}>
                      เชื่อมต่อ
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <LineIcon className="size-5 shrink-0 rounded-md" />
                    <span className="text-sm text-navy">LINE</span>
                  </div>
                  {lineLinked ? (
                    <Button variant="outline" size="sm" loading={unlinkLineLoading} onClick={handleUnlinkLine}>
                      ยกเลิกการเชื่อมต่อ
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleLinkLine}>
                      เชื่อมต่อ
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
                <KeyRound className="size-4 text-primary" /> {hasRealEmail ? 'เปลี่ยนรหัสผ่าน' : 'ตั้งอีเมลและรหัสผ่าน'}
              </p>
              {!hasRealEmail && (
                <p className="text-xs text-muted">ตั้งอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบได้แม้ไม่มี Google หรือ LINE</p>
              )}
              {!hasRealEmail && (
                <Input
                  label="อีเมล"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              )}
              <Input
                label="รหัสผ่านใหม่"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
              />
              <Input
                label="ยืนยันรหัสผ่านใหม่"
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
                {hasRealEmail ? 'บันทึกรหัสผ่านใหม่' : 'บันทึก'}
              </Button>
            </div>
          </Card>
        )}

        {currentUser?.isAdmin && (
          <Card className="space-y-3 animate-fade-in-up border-primary/30 bg-skyblue-pale">
            <h3 className="flex items-center gap-2 font-bold text-navy">
              <ShieldAlert className="size-4 text-primary" /> มุมมองผู้ดูแลระบบ
            </h3>
            <p className="text-sm text-muted">เข้าดูแดชบอร์ดของแต่ละหน่วยงานแบบไม่จำกัดขอบเขต (เห็นทุกหน่วยกู้ชีพ/ทุกโรงพยาบาล)</p>
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
                  {v.label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link to="/dispatch/pending-approvals">
                <Button variant="outline" size="sm" fullWidth icon={<UserCheck className="size-4" />}>
                  บัญชีรออนุมัติ / จัดการสิทธิ์
                </Button>
              </Link>
              <Link to="/manage-orgs">
                <Button variant="outline" size="sm" fullWidth icon={<Wrench className="size-4" />}>
                  จัดการหน่วยกู้ชีพ/โรงพยาบาล
                </Button>
              </Link>
            </div>
          </Card>
        )}

        <Card className="space-y-3 animate-fade-in-up" style={{ animationDelay: '60ms', animationFillMode: 'backwards' }}>
          <h3 className="flex items-center gap-2 font-bold text-navy">
            <ShieldCheck className="size-4 text-primary" /> ข้อควรทราบ
          </h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
            {NOTICES.map((notice) => (
              <li key={notice}>{notice}</li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col items-start gap-3 border-emergency/30 bg-emergency/5 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up" style={{ animationDelay: '120ms', animationFillMode: 'backwards' }}>
          <div>
            <p className="font-bold text-navy">ล้างข้อมูลตัวอย่าง</p>
            <p className="text-sm text-muted">ลบเคสทั้งหมด (รวมข้อมูลที่ซิงค์ไว้ทุกอุปกรณ์) และข้อมูลผู้ใช้ในเบราว์เซอร์นี้</p>
          </div>
          <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setResetOpen(true)}>
            ล้างข้อมูลตัวอย่างทั้งหมด
          </Button>
        </Card>
        </div>
      </div>

      <ConfirmationModal
        open={resetOpen}
        tone="danger"
        title="ล้างข้อมูลทั้งหมด"
        message="การดำเนินการนี้จะลบเคสทั้งหมดทั้งในเบราว์เซอร์นี้และในฐานข้อมูลที่ซิงค์ไว้ (ทุกอุปกรณ์) รวมถึงข้อมูลผู้ใช้ในเบราว์เซอร์นี้ ไม่สามารถย้อนกลับได้"
        confirmLabel="ล้างข้อมูลทั้งหมด"
        confirmLoading={resetLoading}
        onConfirm={handleReset}
        onCancel={() => setResetOpen(false)}
      />
    </AppShell>
  )
}
