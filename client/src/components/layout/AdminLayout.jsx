import AppShell from './AppShell';
import { LayoutDashboard, Users, Building2, ScrollText } from 'lucide-react';

const nav = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/companies', label: 'Companies', icon: Building2 },
  { path: '/admin/audit', label: 'Activity & Audit', icon: ScrollText },
];

export default function AdminLayout() {
  return <AppShell nav={nav} brand="Platform Admin" brandTo="/admin" dark />;
}
