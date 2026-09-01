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
import type { Role } from '@/lib/types'

const ROLE_PATH: Record<Role, string> = {
  public: '/',
  dispatch: '/dispatch/dashboard',
  rescue: '/rescue/dashboard',
  hospital: '/hospital/dashboard',
}

export default function Login() {
  const navigate = useNavigate()
  const setUser = useStore((s) => s.setUser)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'pending' | 'rejected'>('idle')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [lineLoading, setLineLoading] = useState(false)

  function validate() {
    const next: typeof errors = {}
    if (!email.trim()) next.email = 'กรุณากรอกอีเมล'
    if (!password) next.password = 'กรุณากรอกรหัสผ่าน'
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
        toast({ title: 'ไม่พบบัญชีผู้ใช้', tone: 'error' })
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
      toast({ title: 'เข้าสู่ระบบสำเร็จ', message: `ยินดีต้อนรับ ${user.name}`, tone: 'success' })
      navigate(ROLE_PATH[user.role])
    } catch (err) {
      toast({ title: 'เข้าสู่ระบบไม่สำเร็จ', message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', tone: 'error' })
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
      toast({ title: 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ', tone: 'error' })
      setGoogleLoading(false)
    }
  }

  async function handleLineLogin() {
    setLineLoading(true)
    try {
      await signInWithLine()
    } catch {
      toast({ title: 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ', message: 'ยังไม่ได้ตั้งค่า LINE Login', tone: 'error' })
      setLineLoading(false)
    }
  }

  return (
    <AppShell variant="public" title="เข้าสู่ระบบ">
      <div className="relative">
        <AnimatedBackground variant="auth" />
        <div className="relative z-10 mx-auto max-w-md px-4 py-10 sm:px-6">
          {status === 'pending' ? (
            <SuccessState
              title="รอการอนุมัติจากศูนย์สั่งการ"
              description="บัญชีของคุณลงทะเบียนสำเร็จแล้ว แต่ยังไม่ได้รับการอนุมัติให้เข้าใช้งาน กรุณาลองเข้าสู่ระบบอีกครั้งภายหลัง"
              action={
                <Button variant="outline" onClick={() => navigate('/')}>
                  กลับหน้าหลัก
                </Button>
              }
            />
          ) : status === 'rejected' ? (
            <ErrorState
              title="บัญชีนี้ไม่ได้รับการอนุมัติ"
              description="กรุณาติดต่อศูนย์สั่งการ 1669 หากคิดว่าเป็นข้อผิดพลาด"
              onRetry={() => setStatus('idle')}
            />
          ) : (
            <>
              <Card className="animate-fade-in-up">
                <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                  <Input
                    label="อีเมล"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                    placeholder="you@example.com"
                  />
                  <Input
                    label="รหัสผ่าน"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                    placeholder="รหัสผ่านของคุณ"
                  />
                  <Button type="submit" fullWidth loading={loading}>
                    เข้าสู่ระบบ
                  </Button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted">หรือ</span>
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
                    เข้าสู่ระบบด้วย Google
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    icon={<LineIcon />}
                    loading={lineLoading}
                    onClick={handleLineLogin}
                  >
                    เข้าสู่ระบบด้วย LINE
                  </Button>
                </div>

                <div className="mt-5 flex flex-col items-center gap-3 border-t border-border pt-5">
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    ยังไม่มีบัญชี? สมัครสมาชิก
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                    เข้าใช้งานแบบไม่ต้องเข้าสู่ระบบ
                  </Button>
                </div>
              </Card>
              <p className="mt-4 text-center text-xs text-muted">
                หน่วยกู้ชีพ โรงพยาบาล และศูนย์สั่งการต้องได้รับการอนุมัติจากศูนย์สั่งการก่อนเข้าใช้งานได้
              </p>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
