import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  BarChart3,
  Settings as SettingsIcon,
  ScrollText,
  CalendarDays,
  History,
  UserCircle,
} from 'lucide-react';

/**
 * Role-aware navigation. `roles` controls which sidebar/bottom-nav entries a
 * user sees; the API enforces the same rules server-side.
 */
export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student'], end: true, mobile: true },
  { to: '/attendance/mark', label: 'Mark Attendance', icon: CalendarCheck, roles: ['admin', 'teacher'], mobile: true },
  { to: '/students', label: 'Students', icon: Users, roles: ['admin', 'teacher'], mobile: true },
  { to: '/teachers', label: 'Teachers', icon: GraduationCap, roles: ['admin'] },
  { to: '/classes', label: 'Classes', icon: School, roles: ['admin', 'teacher'] },
  { to: '/subjects', label: 'Subjects', icon: BookOpen, roles: ['admin', 'teacher'] },
  { to: '/attendance', label: 'Attendance', icon: ClipboardList, roles: ['admin', 'teacher'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'teacher'], mobile: true },
  { to: '/my-attendance', label: 'My Attendance', icon: CalendarDays, roles: ['student'], mobile: true },
  { to: '/history', label: 'History', icon: History, roles: ['student'], mobile: true },
  { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText, roles: ['admin'] },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, roles: ['admin'] },
  { to: '/profile', label: 'Profile', icon: UserCircle, roles: ['admin', 'teacher', 'student'] },
];

export function navFor(role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function mobileNavFor(role) {
  const items = navFor(role).filter((i) => i.mobile);
  // Cap the mobile bar at 5 destinations for comfortable tap targets.
  return items.slice(0, 5);
}
