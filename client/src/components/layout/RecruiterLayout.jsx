import AppShell from './AppShell';
import { useAuth } from '../../lib/auth';
import {
  LayoutDashboard, Briefcase, FileText, CalendarClock, BarChart3, Building2, Settings,
} from 'lucide-react';

// Sidebar entries mirror the SERVER's company-role rules, so a member never
// sees a section their account cannot use:
//   - Analytics  -> business metrics for ADMIN / RECRUITER only
//   - Company    -> profile + member management, ADMIN only
// Interviewers keep Jobs / Applications / Interviews (read + interview
// feedback); those pages hide the mutation buttons their role cannot use.
// (The old "Candidates" entry pointed at a route that does not exist — every
// nav item must lead somewhere real — candidate profiles are reached from
// Applications instead.)
const ALL_ROLES = ['ADMIN', 'RECRUITER', 'INTERVIEWER'];
const nav = [
  { path: '/recruiter', label: 'Overview', icon: LayoutDashboard, end: true, roles: ALL_ROLES },
  { path: '/recruiter/jobs', label: 'Jobs', icon: Briefcase, roles: ALL_ROLES },
  { path: '/recruiter/applications', label: 'Applications', icon: FileText, roles: ALL_ROLES },
  { path: '/recruiter/interviews', label: 'Interviews', icon: CalendarClock, roles: ALL_ROLES },
  { path: '/recruiter/analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN', 'RECRUITER'] },
  { path: '/recruiter/company', label: 'Company', icon: Building2, roles: ['ADMIN'] },
  { path: '/recruiter/settings', label: 'Settings', icon: Settings, roles: ALL_ROLES },
];

export default function RecruiterLayout() {
  const { companyRole } = useAuth();
  const items = nav.filter((item) => item.roles.includes(companyRole));
  return <AppShell nav={items} brand="Recruiter" brandTo="/recruiter" />;
}
