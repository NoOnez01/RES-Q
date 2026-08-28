import type { Role } from './types'
import {
  LayoutDashboard,
  PhoneIncoming,
  History,
  ListChecks,
  UserCheck,
  Bell,
  Settings,
  Home,
  Ambulance,
  Building2,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: typeof Home
}

/** `isOrgLead` adds an approvals link for rescue/hospital -- someone
 * designated to approve new registrations for their own org (see
 * supabase-org-lead-system.sql), reusing the same page dispatch/admin use. */
export function navItemsForRole(role: Role | null, isOrgLead = false): NavItem[] {
  switch (role) {
    case 'dispatch':
      return [
        { label: 'แดชบอร์ด', path: '/dispatch/dashboard', icon: LayoutDashboard },
        { label: 'สายเรียกเข้า', path: '/dispatch/incoming-call', icon: PhoneIncoming },
        { label: 'เคสปัจจุบัน', path: '/current-cases', icon: ListChecks },
        { label: 'ประวัติเคส', path: '/case-history', icon: History },
        { label: 'การแจ้งเตือน', path: '/notifications', icon: Bell },
        { label: 'ตั้งค่า', path: '/settings', icon: Settings },
      ]
    case 'rescue':
      return [
        { label: 'แดชบอร์ด', path: '/rescue/dashboard', icon: Ambulance },
        { label: 'เคสปัจจุบัน', path: '/current-cases', icon: ListChecks },
        { label: 'ประวัติเคส', path: '/case-history', icon: History },
        ...(isOrgLead ? [{ label: 'อนุมัติสมาชิกหน่วยงาน', path: '/org-approvals', icon: UserCheck }] : []),
        { label: 'การแจ้งเตือน', path: '/notifications', icon: Bell },
        { label: 'ตั้งค่า', path: '/settings', icon: Settings },
      ]
    case 'hospital':
      return [
        { label: 'แดชบอร์ด', path: '/hospital/dashboard', icon: Building2 },
        { label: 'เคสปัจจุบัน', path: '/current-cases', icon: ListChecks },
        { label: 'ประวัติเคส', path: '/case-history', icon: History },
        ...(isOrgLead ? [{ label: 'อนุมัติสมาชิกหน่วยงาน', path: '/org-approvals', icon: UserCheck }] : []),
        { label: 'การแจ้งเตือน', path: '/notifications', icon: Bell },
        { label: 'ตั้งค่า', path: '/settings', icon: Settings },
      ]
    default:
      return [
        { label: 'หน้าหลัก', path: '/', icon: Home },
        { label: 'เคสปัจจุบัน', path: '/current-cases', icon: ListChecks },
        { label: 'ประวัติเคส', path: '/case-history', icon: History },
        { label: 'การแจ้งเตือน', path: '/notifications', icon: Bell },
        { label: 'ตั้งค่า', path: '/settings', icon: Settings },
      ]
  }
}

export function roleLabel(role: Role | null): string {
  switch (role) {
    case 'dispatch':
      return 'ศูนย์สั่งการ 1669'
    case 'rescue':
      return 'หน่วยกู้ชีพ'
    case 'hospital':
      return 'โรงพยาบาล'
    default:
      return 'ประชาชน'
  }
}
