import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { useStore } from '@/lib/store'
import { useTabVisibility } from '@/lib/useReducedMotion'
import { initSupabaseCaseSync } from '@/lib/supabaseCaseSync'
import { ensureAnonymousSession, onAuthChange } from '@/lib/auth'
import { primeAudio } from '@/lib/alertSound'
import { initNativeNotifications } from '@/lib/nativeNotify'
import { ToastViewport } from '@/components/ToastNotification'
import { NotificationAlertBridge } from '@/components/NotificationAlertBridge'
import { CallRingtoneBridge } from '@/components/CallRingtoneBridge'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { RequireRole } from '@/components/RequireRole'
import { AppUpdateBanner } from '@/components/AppUpdateBanner'
import { LoadingState } from '@/components/States'

import Home from '@/pages/Home'
import HowItWorks from '@/pages/HowItWorks'
import RoleSelection from '@/pages/RoleSelection'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import RegisterPublic from '@/pages/RegisterPublic'
import RegisterRescue from '@/pages/RegisterRescue'
import RegisterDispatch from '@/pages/RegisterDispatch'
import RegisterHospital from '@/pages/RegisterHospital'

import AuthCallback from '@/pages/auth/AuthCallback'
import LineCallback from '@/pages/auth/LineCallback'

import EmergencyPhoto from '@/pages/public/EmergencyPhoto'
import Call1669 from '@/pages/public/Call1669'
import Contact1669 from '@/pages/Contact1669'
import CaseTracking from '@/pages/public/CaseTracking'

import DispatchDashboard from '@/pages/dispatch/Dashboard'
import DispatchPendingApprovals from '@/pages/dispatch/PendingApprovals'
import ManageOrgs from '@/pages/dispatch/ManageOrgs'
import DispatchIncomingCall from '@/pages/dispatch/IncomingCall'
import DispatchCallScreen from '@/pages/dispatch/CallScreen'
import DispatchCaseDetail from '@/pages/dispatch/CaseDetail'
import DispatchEmergencyAssessment from '@/pages/dispatch/EmergencyAssessment'

// Chart-heavy pages pull in recharts (~400kB) -- lazy-loaded so that cost
// is only paid when one of these is actually visited, not on every route.
const DispatchFeedbackStats = lazy(() => import('@/pages/dispatch/FeedbackStats'))
const DispatchUnitSearch = lazy(() => import('@/pages/dispatch/UnitSearch'))
const PersonalStats = lazy(() => import('@/pages/PersonalStats'))

import RescueDashboard from '@/pages/rescue/Dashboard'
import RescueCaseDetail from '@/pages/rescue/CaseDetail'
import RescuePatientRecord from '@/pages/rescue/PatientRecord'
import RescueCallReporter from '@/pages/rescue/CallReporter'

import HospitalDashboard from '@/pages/hospital/Dashboard'
import HospitalCaseDetail from '@/pages/hospital/CaseDetail'
import HospitalSelectionPage from '@/pages/HospitalSelectionPage'

import NavigationPage from '@/pages/Navigation'
import Notifications from '@/pages/Notifications'
import Profile from '@/pages/Profile'
import Settings from '@/pages/Settings'
import CaseHistory from '@/pages/CaseHistory'
import CurrentCases from '@/pages/CurrentCases'
import AllScreens from '@/pages/AllScreens'
import NotFound from '@/pages/NotFound'

export default function App() {
  const seedDemoData = useStore((s) => s.seedDemoData)
  const setUser = useStore((s) => s.setUser)
  const setAuthResolved = useStore((s) => s.setAuthResolved)
  const refreshOrgs = useStore((s) => s.refreshOrgs)
  const navigate = useNavigate()
  useTabVisibility()

  useEffect(() => {
    seedDemoData()
    void initNativeNotifications()
    void refreshOrgs()
  }, [seedDemoData, refreshOrgs])

  // LINE login on native opens the system browser (see signInWithLine in
  // lib/auth.ts) instead of navigating this app's own WebView, so its
  // resq://auth/line-callback redirect can't land on a route the normal way
  // -- Android delivers it here as a deep-link event instead (see the
  // resq:// intent-filter in AndroidManifest.xml). Re-routes it to the exact
  // same /auth/line-callback path+query the web build uses, so
  // LineCallback.tsx's own logic runs unchanged either way.
  useEffect(() => {
    const handle = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      if (!url.startsWith('resq://auth/line-callback')) return
      void Browser.close().catch(() => {})
      const query = url.split('?')[1] ?? ''
      navigate(`/auth/line-callback?${query}`, { replace: true })
    })
    return () => {
      void handle.then((h) => h.remove())
    }
  }, [navigate])

  // Case sync is RLS-scoped per signed-in identity (see supabaseCaseSync.ts),
  // so it can't start until a session exists -- citizens get one
  // transparently via anonymous auth, everyone else via a real login. It
  // has to restart (not just update currentUser) whenever that identity
  // actually changes, so the previously-cached, differently-scoped `cases`
  // map doesn't linger after a login/logout/account switch.
  useEffect(() => {
    let lastUserId: string | null = null
    function syncFor(userId: string | null) {
      if (userId === lastUserId) return
      lastUserId = userId
      initSupabaseCaseSync()
    }

    // RequireRole waits on authResolved before deciding whether to redirect,
    // so a real dispatch/rescue/hospital user refreshing the page isn't
    // bounced to /login during the moment before their session loads. The
    // timeout is a safety net in case neither branch below ever fires (e.g.
    // Supabase misconfigured) -- better a route guard eventually resolves
    // than one that hangs forever on a loading state.
    const timeout = window.setTimeout(() => setAuthResolved(true), 4000)

    void ensureAnonymousSession().then((user) => {
      setAuthResolved(true)
      if (!user) return
      setUser(user)
      syncFor(user.id)
      // The mount-time refreshOrgs() above fires before this session exists,
      // so on a fresh browser (no cached Supabase token) it hits rescue_
      // vehicles/hospitals as the anon role -- which only rescue_teams
      // grants -- and silently falls back to the 3 seed teams for the rest
      // of the session, no retry. Re-running now that a real session
      // exists is what actually lets a first-time visitor see real orgs.
      void refreshOrgs()
    })

    const unsubscribe = onAuthChange((user) => {
      setAuthResolved(true)
      setUser(user)
      syncFor(user?.id ?? null)
      void refreshOrgs()
    })

    return () => {
      window.clearTimeout(timeout)
      unsubscribe()
    }
  }, [setUser, setAuthResolved, refreshOrgs])

  useEffect(() => {
    const unlock = () => primeAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  return (
    <>
      <ToastViewport />
      <NotificationAlertBridge />
      <CallRingtoneBridge />
      <AppUpdateBanner />
      <RouteErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/public" element={<RegisterPublic />} />
        <Route path="/register/rescue" element={<RegisterRescue />} />
        <Route path="/register/dispatch" element={<RegisterDispatch />} />
        <Route path="/register/hospital" element={<RegisterHospital />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/line-callback" element={<LineCallback />} />

        <Route path="/public/emergency-photo" element={<EmergencyPhoto />} />
        <Route path="/public/call-1669" element={<Call1669 />} />
        <Route path="/contact-1669/:caseId" element={<Contact1669 />} />
        <Route path="/public/case/:id" element={<CaseTracking />} />

        <Route path="/dispatch/dashboard" element={<RequireRole role="dispatch"><DispatchDashboard /></RequireRole>} />
        <Route path="/dispatch/pending-approvals" element={<RequireRole role="dispatch"><DispatchPendingApprovals /></RequireRole>} />
        <Route path="/org-approvals" element={<RequireRole role={['rescue', 'hospital']}><DispatchPendingApprovals /></RequireRole>} />
        <Route path="/manage-orgs" element={<RequireRole role="dispatch"><ManageOrgs /></RequireRole>} />
        <Route
          path="/dispatch/feedback-stats"
          element={
            <RequireRole role="dispatch">
              <Suspense fallback={<LoadingState />}>
                <DispatchFeedbackStats />
              </Suspense>
            </RequireRole>
          }
        />
        <Route path="/dispatch/incoming-call" element={<RequireRole role="dispatch"><DispatchIncomingCall /></RequireRole>} />
        <Route path="/dispatch/call/:id" element={<RequireRole role="dispatch"><DispatchCallScreen /></RequireRole>} />
        <Route path="/dispatch/case/:id" element={<RequireRole role="dispatch"><DispatchCaseDetail /></RequireRole>} />
        <Route path="/dispatch/emergency-details/:id" element={<RequireRole role="dispatch"><DispatchEmergencyAssessment /></RequireRole>} />
        <Route
          path="/dispatch/unit-search"
          element={
            <RequireRole role="dispatch">
              <Suspense fallback={<LoadingState />}>
                <DispatchUnitSearch />
              </Suspense>
            </RequireRole>
          }
        />

        <Route path="/rescue/dashboard" element={<RequireRole role="rescue"><RescueDashboard /></RequireRole>} />
        <Route path="/rescue/case/:id" element={<RequireRole role="rescue"><RescueCaseDetail /></RequireRole>} />
        <Route path="/rescue/patient-record/:id" element={<RequireRole role="rescue"><RescuePatientRecord /></RequireRole>} />
        <Route path="/rescue/call-reporter/:id" element={<RequireRole role="rescue"><RescueCallReporter /></RequireRole>} />

        <Route path="/hospital/dashboard" element={<RequireRole role="hospital"><HospitalDashboard /></RequireRole>} />
        <Route path="/hospital/case/:id" element={<RequireRole role="hospital"><HospitalCaseDetail /></RequireRole>} />
        <Route path="/hospital-selection" element={<RequireRole role="rescue"><HospitalSelectionPage /></RequireRole>} />

        <Route path="/navigation/:id" element={<NavigationPage />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/personal-stats"
          element={
            <Suspense fallback={<LoadingState />}>
              <PersonalStats />
            </Suspense>
          }
        />
        <Route path="/settings" element={<Settings />} />
        <Route path="/current-cases" element={<CurrentCases />} />
        <Route path="/case-history" element={<CaseHistory />} />
        <Route path="/all-screens" element={<AllScreens />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      </RouteErrorBoundary>
    </>
  )
}
