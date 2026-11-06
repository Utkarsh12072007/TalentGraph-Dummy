import AppShell from './AppShell';
import {
  LayoutDashboard, Briefcase, FileText, Users, CalendarClock, BarChart3, Building2, Settings,
} from 'lucide-react';

const nav = [
  { path: '/recruiter', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/recruiter/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/recruiter/applications', label: 'Applications', icon: FileText },
  { path: '/recruiter/candidates', label: 'Candidates', icon: Users },
  { path: '/recruiter/interviews', label: 'Interviews', icon: CalendarClock },
  { path: '/recruiter/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/recruiter/company', label: 'Company', icon: Building2 },
  { path: '/recruiter/settings', label: 'Settings', icon: Settings },
];

export default function RecruiterLayout() {
  return <AppShell nav={nav} brand="Recruiter" brandTo="/recruiter" />;
}
