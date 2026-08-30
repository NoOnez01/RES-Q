import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoadingState, ErrorState } from '@/components/States'
import { useStore } from '@/lib/store'
import { completeLineLogin, consumeLineLoginState, getStoredLineState, linkLineIdentity } from '@/lib/auth'
import { toast } from '@/lib/toast'
import type { LineAuthMode } from '@/lib/auth'
import type { Role } from '@/lib/types'

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
          toast({ title: 'เชื่อมต่อ LINE สำเร็จ', tone: 'success' })
          navigate('/settings', { replace: true })
          return
        }
        const profile = await completeLineLogin(code, consumed.redirectUri)
        if (!profile) {
          setFailed(true)
          return
        }
        setUser(profile)
        toast({ title: 'เข้าสู่ระบบสำเร็จ', message: `ยินดีต้อนรับ ${profile.name}`, tone: 'success' })
        navigate(ROLE_PATH[profile.role], { replace: true })
      } catch (err) {
        if (consumed.mode === 'link') setErrorMessage(err instanceof Error ? err.message : null)
        setFailed(true)
      }
    }

    void run()
  }, [searchParams, navigate, setUser])

  return (
    <AppShell variant="flow" title="เข้าสู่ระบบ">
      {failed ? (
        mode === 'link' ? (
          <ErrorState
            title="เชื่อมต่อ LINE ไม่สำเร็จ"
            description={errorMessage || 'ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาลองอีกครั้ง'}
            onRetry={() => navigate('/settings')}
            retryLabel="กลับไปตั้งค่า"
          />
        ) : (
          <ErrorState
            title="เข้าสู่ระบบไม่สำเร็จ"
            description="ไม่สามารถยืนยันการเข้าสู่ระบบด้วย LINE ได้ กรุณาลองอีกครั้ง"
            onRetry={() => navigate('/login')}
            retryLabel="กลับไปเข้าสู่ระบบ"
          />
        )
      ) : (
        <LoadingState label="กำลังเข้าสู่ระบบ..." />
      )}
    </AppShell>
  )
}
