import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, FileText, UserRound, FileUp, CalendarClock, Bell, Settings, LogOut,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { Button } from '../ui/button';
import { Avatar } from '../ui/misc';
import { Dropdown, DropdownItem, DropdownSeparator } from '../ui/dropdown';
import { cn } from '../../lib/utils';
import useUnreadNotifications from './useUnreadNotifications';

// Shared app shell for authenticated areas (candidate / recruiter / admin).
// Sidebar on desktop, scrollable top bar on mobile.
export default function AppShell({ nav, brand, brandTo, dark = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadNotifications();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isBell = (item) => item.path === '/notifications';

  return (
    <div className="flex min-h-screen flex-col">
      {/* mobile top bar */}
      <div className="sticky top-0 z-40 border-b bg-card lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <NavLink to={brandTo} className="flex items-center gap-2 font-semibold">
            <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold', dark ? 'bg-slate-800 text-white' : 'bg-primary text-primary-foreground')}>TG</span>
            {brand}
          </NavLink>
          <UserMenu user={user} onLogout={handleLogout} />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2" aria-label="Primary">
          {nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn('flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
                  isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {isBell(item) && unread > 0 && <span className="rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white">{unread}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex flex-1">
        {/* desktop sidebar */}
        <aside className={cn('sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card lg:flex', dark && 'border-slate-800 bg-slate-900 text-slate-100')}>
          <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
            <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold', dark ? 'bg-white/10 text-white' : 'bg-primary text-primary-foreground')}>TG</span>
            {brand}
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Primary">
            {nav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? dark ? 'bg-slate-800 text-white' : 'bg-secondary text-foreground'
                      : dark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-muted-foreground hover:bg-accent hover:text-foreground')
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isBell(item) && unread > 0 && (
                  <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-white">{unread}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className={cn('border-t p-3', dark && 'border-slate-800')}>
            <UserMenu user={user} onLogout={handleLogout} dark={dark} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function UserMenu({ user, onLogout, dark }) {
  return (
    <Dropdown
      trigger={
        <button type="button" className="flex items-center gap-2 rounded-md p-1 text-sm hover:bg-accent dark:hover:bg-slate-800" aria-label="Account menu">
          <Avatar name={user?.fullName} />
          <span className={cn('hidden max-w-32 truncate md:block', dark && 'text-slate-200')}>{user?.fullName}</span>
        </button>
      }
    >
      <div className="px-3 py-2">
        <p className="truncate text-sm font-medium">{user?.fullName}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>
      <DropdownSeparator />
      <DropdownItem onClick={() => onLogout()}>
        <LogOut className="h-4 w-4" /> Sign out
      </DropdownItem>
    </Dropdown>
  );
}
