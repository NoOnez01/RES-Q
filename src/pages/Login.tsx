import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/backgrounds/AnimatedBackground'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { SuccessState, ErrorState } from '@/components/States'
import { GoogleIcon, LineIcon } from '@/components/icons/SocialIcons'
import { useStore } from '@/lib/store'
import { signIn, signOut, signInWithGoogle, signInWithLine } from '@/lib/auth'
import { toast } from '@/lib/toast'
import { useT, registerTranslations } from '@/lib/i18n'
import type { Role } from '@/lib/types'

registerTranslations({
  กรุณากรอกอีเมล: 'Please enter your email',
  กรุณากรอกรหัสผ่าน: 'Please enter your password',
  ไม่พบบัญชีผู้ใช้: 'Account not found',
  เข้าสู่ระบบสำเร็จ: 'Logged in successfully',
  'ยินดีต้อนรับ {name}': 'Welcome, {name}',
  เข้าสู่ระบบไม่สำเร็จ: 'Login failed',
  อีเมลหรือรหัสผ่านไม่ถูกต้อง: 'Incorrect email or password',
  'เข้าสู่ระบบด้วย Google ไม่สำเร็จ': 'Failed to log in with Google',
  'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ': 'Failed to log in with LINE',
  เข้าสู่ระบบ: 'Log in',
  รอการอนุมัติจากศูนย์สั่งการ: 'Awaiting approval from the dispatch center',
  'บัญชีของคุณลงทะเบียนสำเร็จแล้ว แต่ยังไม่ได้รับการอนุมัติให้เข้าใช้งาน กรุณาลองเข้าสู่ระบบอีกครั้งภายหลัง':
    'Your account registered successfully but has not been approved for access yet. Please try logging in again later.',
  กลับหน้าหลัก: 'Back to home',
  บัญชีนี้ไม่ได้รับการอนุมัติ: 'This account was not approved',
  'กรุณาติดต่อศูนย์สั่งการ 1669 หากคิดว่าเป็นข้อผิดพลาด': 'Please contact Dispatch Center 1669 if you believe this is a mistake',
  อีเมล: 'Email',
  รหัสผ่าน: 'Password',
  รหัสผ่านของคุณ: 'Your password',
  หรือ: 'or',
  // Parameterized (not a plain 'เข้าสู่ระบบด้วย Google' key) because Settings.tsx
  // registers that exact same Thai string for a different meaning ("signed in
  // with" a status, vs this button's "log in with" an action) -- colliding on
  // the same flat-dictionary key would make whichever file loads last win.
  'เข้าสู่ระบบด้วย {provider}': 'Log in with {provider}',
  'ยังไม่มีบัญชี? สมัครสมาชิก': "Don't have an account? Sign up",
  เข้าใช้งานแบบไม่ต้องเข้าสู่ระบบ: 'Continue without logging in',
  'หน่วยกู้ชีพ โรงพยาบาล และศูนย์สั่งการต้องได้รับการอนุมัติจากศูนย์สั่งการก่อนเข้าใช้งานได้':
    'Rescue teams, hospitals, and dispatch staff must be approved by the dispatch center before they can log in.',
})

const ROLE_PATH: Record<Role, string> = {
  public: '/',
  dispatch: '/dispatch/dashboard',
  rescue: '/rescue/dashboard',
  hospital: '/hospital/dashboard',
}

export default function Login() {
  const navigate = useNavigate()
  const setUser = useStore((s) => s.setUser)
  const t = useT()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'pending' | 'rejected'>('idle')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [lineLoading, setLineLoading] = useState(false)

  function validate() {
    const next: typeof errors = {}
    if (!email.trim()) next.email = t('กรุณากรอกอีเมล')
    if (!password) next.password = t('กรุณากรอกรหัสผ่าน')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || loading) return
    setLoading(true)
    try {
      const user = await signIn(email.trim(), password)
      if (!user) {
        toast({ title: t('ไม่พบบัญชีผู้ใช้'), tone: 'error' })
        return
      }
      if (user.approvalStatus === 'rejected') {
        setStatus('rejected')
        void signOut()
        return
      }
      if (user.approvalStatus === 'pending') {
        setUser(user)
        setStatus('pending')
        return
      }
      setUser(user)
      toast({ title: t('เข้าสู่ระบบสำเร็จ'), message: t('ยินดีต้อนรับ {name}', { name: user.name }), tone: 'success' })
      navigate(ROLE_PATH[user.role])
    } catch (err) {
      toast({ title: t('เข้าสู่ระบบไม่สำเร็จ'), message: t('อีเมลหรือรหัสผ่านไม่ถูกต้อง'), tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      // Redirects away immediately on success -- setGoogleLoading(false)
      // would only ever run on the failure path.
    } catch {
      toast({ title: t('เข้าสู่ระบบด้วย Google ไม่สำเร็จ'), tone: 'error' })
      setGoogleLoading(false)
    }
  }

  async function handleLineLogin() {
    setLineLoading(true)
    try {
      // Native resolves with the profile immediately (app-to-app login, no
      // redirect to land on); web returns null right away since the page
      // navigates away to LINE and the real completion happens on
      // /auth/line-callback instead.
      const profile = await signInWithLine()
      if (profile) {
        setUser(profile)
        toast({ title: t('เข้าสู่ระบบสำเร็จ'), message: t('ยินดีต้อนรับ {name}', { name: profile.name }), tone: 'success' })
        navigate(ROLE_PATH[profile.role])
      }
    } catch (err) {
      toast({ title: t('เข้าสู่ระบบด้วย LINE ไม่สำเร็จ'), message: err instanceof Error ? err.message : undefined, tone: 'error' })
      setLineLoading(false)
    }
  }

  return (
    <AppShell variant="public" title={t('เข้าสู่ระบบ')}>
      <div className="relative">
        <AnimatedBackground variant="auth" />
        <div className="relative z-10 mx-auto max-w-md px-4 py-10 sm:px-6">
          {status === 'pending' ? (
            <SuccessState
              title={t('รอการอนุมัติจากศูนย์สั่งการ')}
              description={t('บัญชีของคุณลงทะเบียนสำเร็จแล้ว แต่ยังไม่ได้รับการอนุมัติให้เข้าใช้งาน กรุณาลองเข้าสู่ระบบอีกครั้งภายหลัง')}
              action={
                <Button variant="outline" onClick={() => navigate('/')}>
                  {t('กลับหน้าหลัก')}
                </Button>
              }
            />
          ) : status === 'rejected' ? (
            <ErrorState
              title={t('บัญชีนี้ไม่ได้รับการอนุมัติ')}
              description={t('กรุณาติดต่อศูนย์สั่งการ 1669 หากคิดว่าเป็นข้อผิดพลาด')}
              onRetry={() => setStatus('idle')}
            />
          ) : (
            <>
              <Card className="animate-fade-in-up">
                <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                  <Input
                    label={t('อีเมล')}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                    placeholder="you@example.com"
                  />
                  <Input
                    label={t('รหัสผ่าน')}
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                    placeholder={t('รหัสผ่านของคุณ')}
                  />
                  <Button type="submit" fullWidth loading={loading}>
                    {t('เข้าสู่ระบบ')}
                  </Button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted">{t('หรือ')}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="flex flex-col gap-2.5">
                  <Button
                    variant="outline"
                    fullWidth
                    icon={<GoogleIcon />}
                    loading={googleLoading}
                    onClick={handleGoogleLogin}
                  >
                    {t('เข้าสู่ระบบด้วย {provider}', { provider: 'Google' })}
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    icon={<LineIcon />}
                    loading={lineLoading}
                    onClick={handleLineLogin}
                  >
                    {t('เข้าสู่ระบบด้วย {provider}', { provider: 'LINE' })}
                  </Button>
                </div>

                <div className="mt-5 flex flex-col items-center gap-3 border-t border-border pt-5">
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {t('ยังไม่มีบัญชี? สมัครสมาชิก')}
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                    {t('เข้าใช้งานแบบไม่ต้องเข้าสู่ระบบ')}
                  </Button>
                </div>
              </Card>
              <p className="mt-4 text-center text-xs text-muted">
                {t('หน่วยกู้ชีพ โรงพยาบาล และศูนย์สั่งการต้องได้รับการอนุมัติจากศูนย์สั่งการก่อนเข้าใช้งานได้')}
              </p>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
