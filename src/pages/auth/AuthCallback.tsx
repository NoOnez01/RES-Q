import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoadingState, ErrorState } from '@/components/States'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { ensureSocialProfile } from '@/lib/auth'
import { toast } from '@/lib/toast'
import type { Role } from '@/lib/types'

const ROLE_PATH: Record<Role, string> = {
  public: '/',
  dispatch: '/dispatch/dashboard',
  rescue: '/rescue/dashboard',
  hospital: '/hospital/dashboard',
}

/**
 * Lands here once Google confirms the login and Supabase's own
 * /auth/v1/callback redirects back -- supabase-js already picks the
 * session tokens up from the URL automatically (detectSessionInUrl
 * defaults to true), so this page just waits for that, makes sure a
 * profiles row exists (a first-time Google sign-in has none yet, see
 * ensureSocialProfile), and routes on to wherever that role belongs.
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const setUser = useStore((s) => s.setUser)
  const [failed, setFailed] = useState(false)
  const settledRef = useRef(false)

  useEffect(() => {
    if (!supabase) {
      setFailed(true)
      return
    }

    async function finish(userId: string, meta: Record<string, unknown>) {
      if (settledRef.current) return
      settledRef.current = true
      try {
        const name = (meta.full_name as string) || (meta.name as string) || undefined
        const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || undefined
        const profile = await ensureSocialProfile(userId, { name, avatarUrl })
        if (!profile) {
          setFailed(true)
          return
        }
        setUser(profile)
        toast({ title: 'เข้าสู่ระบบสำเร็จ', message: `ยินดีต้อนรับ ${profile.name}`, tone: 'success' })
        navigate(ROLE_PATH[profile.role], { replace: true })
      } catch {
        setFailed(true)
      }
    }

    // Already-detected-by-the-time-we-check case (most common -- supabase-js
    // processes the URL synchronously enough during client init).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        void finish(data.session.user.id, data.session.user.user_metadata ?? {})
      }
    })

    // Fallback: the SIGNED_IN event, for whenever detection finishes a beat
    // after this component has already mounted.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void finish(session.user.id, session.user.user_metadata ?? {})
    })

    const timeout = window.setTimeout(() => {
      if (!settledRef.current) setFailed(true)
    }, 12000)

    return () => {
      sub.subscription.unsubscribe()
      window.clearTimeout(timeout)
    }
  }, [navigate, setUser])

  return (
    <AppShell variant="flow" title="เข้าสู่ระบบ">
      {failed ? (
        <ErrorState
          title="เข้าสู่ระบบไม่สำเร็จ"
          description="ไม่สามารถยืนยันการเข้าสู่ระบบด้วย Google ได้ กรุณาลองอีกครั้ง"
          onRetry={() => navigate('/login')}
          retryLabel="กลับไปเข้าสู่ระบบ"
        />
      ) : (
        <LoadingState label="กำลังเข้าสู่ระบบ..." />
      )}
    </AppShell>
  )
}
