import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoadingState, ErrorState } from '@/components/States'
import { useStore } from '@/lib/store'
import { completeLineLogin, consumeLineLoginState, getStoredLineState, linkLineIdentity } from '@/lib/auth'
import { toast } from '@/lib/toast'
import type { LineAuthMode } from '@/lib/auth'
import type { Role } from '@/lib/types'
import { useT, registerTranslations } from '@/lib/i18n'

registerTranslations({
  'เชื่อมต่อ LINE สำเร็จ': 'LINE linked successfully',
  เข้าสู่ระบบสำเร็จ: 'Logged in successfully',
  'ยินดีต้อนรับ {name}': 'Welcome, {name}',
  เข้าสู่ระบบ: 'Log in',
  'เชื่อมต่อ LINE ไม่สำเร็จ': 'Failed to link LINE',
  'ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาลองอีกครั้ง': 'Could not link LINE. Please try again.',
  กลับไปตั้งค่า: 'Back to settings',
  เข้าสู่ระบบไม่สำเร็จ: 'Login failed',
  'ไม่สามารถยืนยันการเข้าสู่ระบบด้วย LINE ได้ กรุณาลองอีกครั้ง': 'Could not confirm login with LINE. Please try again.',
  กลับไปเข้าสู่ระบบ: 'Back to login',
  'กำลังเข้าสู่ระบบ...': 'Logging in...',
})

const ROLE_PATH: Record<Role, string> = {
  public: '/',
  dispatch: '/dispatch/dashboard',
  rescue: '/rescue/dashboard',
  hospital: '/hospital/dashboard',
}

/**
 * LINE redirects here with ?code&state after the user approves the login on
 * LINE's own screen. Unlike Google, there's no Supabase-native handling for
 * this -- the code exchange (needs the LINE channel secret) happens
 * server-side in the line-login-exchange Edge Function; this page just
 * drives that call and then behaves like AuthCallback.tsx from there.
 */
export default function LineCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setUser = useStore((s) => s.setUser)
  const [failed, setFailed] = useState(false)
  const [mode, setMode] = useState<LineAuthMode>('login')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const ranRef = useRef(false)
  const t = useT()

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    async function run() {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const lineError = searchParams.get('error')
      if (lineError || !code || !state) {
        setFailed(true)
        return
      }
      const expectedState = getStoredLineState()
      const consumed = consumeLineLoginState()
      if (!consumed || state !== expectedState) {
        // Doesn't match what we stored right before redirecting to LINE --
        // either a stale/replayed callback or a forged one. Refuse rather
        // than trying to log anyone in.
        setFailed(true)
        return
      }
      setMode(consumed.mode)
      try {
        if (consumed.mode === 'link') {
          // Attaching LINE to the account the user is already signed into
          // from Settings -- no new session to establish, just route back.
          await linkLineIdentity(code, consumed.redirectUri)
          toast({ title: t('เชื่อมต่อ LINE สำเร็จ'), tone: 'success' })
          navigate('/settings', { replace: true })
          return
        }
        const profile = await completeLineLogin(code, consumed.redirectUri)
        if (!profile) {
          setFailed(true)
          return
        }
        setUser(profile)
        toast({ title: t('เข้าสู่ระบบสำเร็จ'), message: t('ยินดีต้อนรับ {name}', { name: profile.name }), tone: 'success' })
        navigate(ROLE_PATH[profile.role], { replace: true })
      } catch (err) {
        if (consumed.mode === 'link') {
          setErrorMessage(err instanceof Error ? err.message : typeof err === 'string' ? err : null)
        }
        setFailed(true)
      }
    }

    void run()
    // `t` intentionally omitted -- this effect consumes the one-time LINE
    // OAuth callback code exactly once; re-running it on every render
    // (which a new `t` closure from useT() would force) risks re-processing
    // an already-consumed code instead of running the login flow once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, navigate, setUser])

  return (
    <AppShell variant="flow" title={t('เข้าสู่ระบบ')}>
      {failed ? (
        mode === 'link' ? (
          <ErrorState
            title={t('เชื่อมต่อ LINE ไม่สำเร็จ')}
            description={errorMessage || t('ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาลองอีกครั้ง')}
            onRetry={() => navigate('/settings')}
            retryLabel={t('กลับไปตั้งค่า')}
          />
        ) : (
          <ErrorState
            title={t('เข้าสู่ระบบไม่สำเร็จ')}
            description={t('ไม่สามารถยืนยันการเข้าสู่ระบบด้วย LINE ได้ กรุณาลองอีกครั้ง')}
            onRetry={() => navigate('/login')}
            retryLabel={t('กลับไปเข้าสู่ระบบ')}
          />
        )
      ) : (
        <LoadingState label={t('กำลังเข้าสู่ระบบ...')} />
      )}
    </AppShell>
  )
}
