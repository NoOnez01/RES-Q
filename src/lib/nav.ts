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
  Coins,
  BarChart3,
  Search,
} from 'lucide-react'
import { registerTranslations } from './i18n'

registerTranslations({
  ภาพรวม: 'Overview',
  สายเรียกเข้า: 'Incoming calls',
  เหตุปัจจุบัน: 'Current cases',
  ประวัติเหตุ: 'Case history',
  อนุมัติสมาชิกหน่วยงาน: 'Approve org members',
  การแจ้งเตือน: 'Notifications',
  ตั้งค่า: 'Settings',
  หน้าหลัก: 'Home',
  'ศูนย์สั่งการ 1669': 'Dispatch Center 1669',
  หน่วยกู้ชีพ: 'Rescue team',
  โรงพยาบาล: 'Hospital',
  ประชาชน: 'Public',
  เหรียญ: 'Coins',
  บัญชีรออนุมัติ: 'Pending accounts',
  ประเมินหน่วยกู้ชีพ: 'Rate rescue teams',
  'ค้นหาหน่วย (NDEMS)': 'Search units (NDEMS)',
  เครื่องมือ: 'Tools',
})

export interface NavItem {
  label: string
  path: string
  icon: typeof Home
  /** A tool rather than a place: listed under "เครื่องมือ" in the side
   * menu, and left out of the phone's bottom bar, which has no room. */
  tool?: boolean
}

/** `isOrgLead` adds an approvals link for rescue/hospital -- someone
 * designated to approve new registrations for their own org (see
 * supabase-org-lead-system.sql), reusing the same page dispatch/admin use. */
export function navItemsForRole(role: Role | null, isOrgLead = false): NavItem[] {
  switch (role) {
    case 'dispatch':
      return [
        { label: 'ภาพรวม', path: '/dispatch/dashboard', icon: LayoutDashboard },
        { label: 'สายเรียกเข้า', path: '/dispatch/incoming-call', icon: PhoneIncoming },
        { label: 'เหตุปัจจุบัน', path: '/current-cases', icon: ListChecks },
        { label: 'ประวัติเหตุ', path: '/case-history', icon: History },
        { label: 'การแจ้งเตือน', path: '/notifications', icon: Bell },
        { label: 'ตั้งค่า', path: '/settings', icon: Settings },
        { label: 'บัญชีรออนุมัติ', path: '/dispatch/pending-approvals', icon: UserCheck, tool: true },
        { label: 'ประเมินหน่วยกู้ชีพ', path: '/dispatch/feedback-stats', icon: BarChart3, tool: true },
        { label: 'ค้นหาหน่วย (NDEMS)', path: '/dispatch/unit-search', icon: Search, tool: true },
      ]
    case 'rescue':
      return [
        { label: 'ภาพรวม', path: '/rescue/dashboard', icon: Ambulance },
        { label: 'เหตุปัจจุบัน', path: '/current-cases', icon: ListChecks },
        { label: 'ประวัติเหตุ', path: '/case-history', icon: History },
        ...(isOrgLead ? [{ label: 'อนุมัติสมาชิกหน่วยงาน', path: '/org-approvals', icon: UserCheck }] : []),
        { label: 'การแจ้งเตือน', path: '/notifications', icon: Bell },
        { label: 'ตั้งค่า', path: '/settings', icon: Settings },
      ]
    case 'hospital':
      return [
        { label: 'ภาพรวม', path: '/hospital/dashboard', icon: Building2 },
        { label: 'เหตุปัจจุบัน', path: '/current-cases', icon: ListChecks },
        { label: 'ประวัติเหตุ', path: '/case-history', icon: History },
        ...(isOrgLead ? [{ label: 'อนุมัติสมาชิกหน่วยงาน', path: '/org-approvals', icon: UserCheck }] : []),
        { label: 'การแจ้งเตือน', path: '/notifications', icon: Bell },
        { label: 'ตั้งค่า', path: '/settings', icon: Settings },
      ]
    default:
      return [
        { label: 'หน้าหลัก', path: '/', icon: Home },
        { label: 'เหตุปัจจุบัน', path: '/current-cases', icon: ListChecks },
        { label: 'ประวัติเหตุ', path: '/case-history', icon: History },
        { label: 'เหรียญ', path: '/coins', icon: Coins },
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
