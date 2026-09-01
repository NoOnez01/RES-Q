import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoadingState, ErrorState } from '@/components/States'
import { useStore } from '@/lib/store'
import { completeLineLogin, linkLineIdentity, lineRedirectUri, parseLineState } from '@/lib/auth'
import { isNativeApp } from '@/lib/nativeNotify'
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
      const parsed = parseLineState(state)
      if (!parsed) {
        setFailed(true)
        return
      }
      setMode(parsed.mode)

      // A native-initiated login always redirects to the production web
      // URL (see lineRedirectUri in lib/auth.ts), since LINE's plain OAuth
      // flow only accepts a pre-registered https:// callback. If this page
      // is running as that web page (not inside the native app itself),
      // completing the exchange here would establish the session under
      // this page's own origin instead of the app's -- so hand the code off
      // to the app over its resq:// deep link and let it finish there.
      if (parsed.native && !isNativeApp()) {
        window.location.href = `resq://auth/line-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
        return
      }

      try {
        if (parsed.mode === 'link') {
          // Attaching LINE to the account the user is already signed into
          // from Settings -- no new session to establish, just route back.
          await linkLineIdentity(code, lineRedirectUri())
          toast({ title: 'เชื่อมต่อ LINE สำเร็จ', tone: 'success' })
          navigate('/settings', { replace: true })
          return
        }
        const profile = await completeLineLogin(code, lineRedirectUri())
        if (!profile) {
          setFailed(true)
          return
        }
        setUser(profile)
        toast({ title: 'เข้าสู่ระบบสำเร็จ', message: `ยินดีต้อนรับ ${profile.name}`, tone: 'success' })
        navigate(ROLE_PATH[profile.role], { replace: true })
      } catch (err) {
        if (parsed.mode === 'link') {
          setErrorMessage(err instanceof Error ? err.message : typeof err === 'string' ? err : null)
        }
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
