import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useTabVisibility } from '@/lib/useReducedMotion'
import { initSupabaseCaseSync } from '@/lib/supabaseCaseSync'
import { primeAudio } from '@/lib/alertSound'
import { initNativeNotifications } from '@/lib/nativeNotify'
import { ToastViewport } from '@/components/ToastNotification'
import { NotificationAlertBridge } from '@/components/NotificationAlertBridge'
import { CallRingtoneBridge } from '@/components/CallRingtoneBridge'

import Home from '@/pages/Home'
import HowItWorks from '@/pages/HowItWorks'
import RoleSelection from '@/pages/RoleSelection'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import RegisterPublic from '@/pages/RegisterPublic'
import RegisterRescue from '@/pages/RegisterRescue'
import RegisterDispatch from '@/pages/RegisterDispatch'
import RegisterHospital from '@/pages/RegisterHospital'

import EmergencyPhoto from '@/pages/public/EmergencyPhoto'
import Call1669 from '@/pages/public/Call1669'
import CaseTracking from '@/pages/public/CaseTracking'

import DispatchDashboard from '@/pages/dispatch/Dashboard'
import DispatchIncomingCall from '@/pages/dispatch/IncomingCall'
import DispatchCallScreen from '@/pages/dispatch/CallScreen'
import DispatchCaseDetail from '@/pages/dispatch/CaseDetail'
import DispatchEmergencyAssessment from '@/pages/dispatch/EmergencyAssessment'

import RescueDashboard from '@/pages/rescue/Dashboard'
import RescueCaseDetail from '@/pages/rescue/CaseDetail'
import RescuePatientRecord from '@/pages/rescue/PatientRecord'

import HospitalDashboard from '@/pages/hospital/Dashboard'
import HospitalCaseDetail from '@/pages/hospital/CaseDetail'
import HospitalSelectionPage from '@/pages/HospitalSelectionPage'

import NavigationPage from '@/pages/Navigation'
import Notifications from '@/pages/Notifications'
import Settings from '@/pages/Settings'
import CaseHistory from '@/pages/CaseHistory'
import AllScreens from '@/pages/AllScreens'
import NotFound from '@/pages/NotFound'

export default function App() {
  const seedDemoData = useStore((s) => s.seedDemoData)
  useTabVisibility()

  useEffect(() => {
    seedDemoData()
    initSupabaseCaseSync()
    void initNativeNotifications()
  }, [seedDemoData])

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

        <Route path="/public/emergency-photo" element={<EmergencyPhoto />} />
        <Route path="/public/call-1669" element={<Call1669 />} />
        <Route path="/public/case/:id" element={<CaseTracking />} />

        <Route path="/dispatch/dashboard" element={<DispatchDashboard />} />
        <Route path="/dispatch/incoming-call" element={<DispatchIncomingCall />} />
        <Route path="/dispatch/call/:id" element={<DispatchCallScreen />} />
        <Route path="/dispatch/case/:id" element={<DispatchCaseDetail />} />
        <Route path="/dispatch/emergency-details/:id" element={<DispatchEmergencyAssessment />} />

        <Route path="/rescue/dashboard" element={<RescueDashboard />} />
        <Route path="/rescue/case/:id" element={<RescueCaseDetail />} />
        <Route path="/rescue/patient-record/:id" element={<RescuePatientRecord />} />

        <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
        <Route path="/hospital/case/:id" element={<HospitalCaseDetail />} />
        <Route path="/hospital-selection" element={<HospitalSelectionPage />} />

        <Route path="/navigation/:id" element={<NavigationPage />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/case-history" element={<CaseHistory />} />
        <Route path="/all-screens" element={<AllScreens />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
