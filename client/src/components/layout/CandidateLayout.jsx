import AppShell from './AppShell';
import {
  LayoutDashboard, Search, FileText, UserRound, FileUp, CalendarClock, Bell, Settings,
} from 'lucide-react';

const nav = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/discover', label: 'Discover Jobs', icon: Search },
  { path: '/applications', label: 'My Applications', icon: FileText },
  { path: '/profile', label: 'My Profile', icon: UserRound },
  { path: '/resumes', label: 'Resumes', icon: FileUp },
  { path: '/interviews', label: 'Interviews', icon: CalendarClock },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function CandidateLayout() {
  return <AppShell nav={nav} brand="Candidate" brandTo="/dashboard" />;
}
