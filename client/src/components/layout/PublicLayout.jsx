import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

function BrandMark({ className }) {
  return (
    <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground', className)}>
      TG
    </span>
  );
}

// Public website shell: top navigation + footer (sticky per layout rules).
export default function PublicLayout() {
  const { user, loading, company } = useAuth();
  const navigate = useNavigate();

  const dashboardHref = user?.role === 'PLATFORM_ADMIN' ? '/admin' : user?.role === 'RECRUITER' ? (company ? '/recruiter' : '/recruiter/company-setup') : '/dashboard';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="page-container flex h-14 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <BrandMark /> TalentGraph
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex" aria-label="Main">
            <Link to="/jobs" className="hover:text-foreground">Browse Jobs</Link>
            <a href="/#for-companies" className="hover:text-foreground">For Companies</a>
            <a href="/#faq" className="hover:text-foreground">About</a>
          </nav>
          <div className="flex items-center gap-2">
            {loading ? null : user ? (
              <Button size="sm" onClick={() => navigate(dashboardHref)}>
                {user.role === 'RECRUITER' ? 'Recruiter workspace' : user.role === 'PLATFORM_ADMIN' ? 'Admin console' : 'My dashboard'}
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/signin')}>
                  <LogIn /> Sign In
                </Button>
                <Button size="sm" onClick={() => navigate('/signup')}>Get Started</Button>
              </>
            )}
          </div>
        </div>
        <nav className="page-container flex gap-5 overflow-x-auto border-t py-2 text-sm font-medium text-muted-foreground md:hidden" aria-label="Mobile main">
          <Link to="/jobs" className="shrink-0 hover:text-foreground">Browse jobs</Link>
          <a href="/#for-companies" className="shrink-0 hover:text-foreground">For companies</a>
          <a href="/#faq" className="shrink-0 hover:text-foreground">About</a>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-auto border-t bg-card">
        <div className="page-container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <BrandMark /> TalentGraph
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              A recruitment platform with a built-in applicant tracking system — from job posting to offer, in one place.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">For candidates</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/jobs" className="hover:text-foreground">Browse jobs</Link></li>
              <li><Link to="/signup" className="hover:text-foreground">Create a profile</Link></li>
              <li><a href="/#how-it-works" className="hover:text-foreground">How it works</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">For companies</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="/#for-companies" className="hover:text-foreground">Hire talent</a></li>
              <li><a href="/#platform-features" className="hover:text-foreground">Product features</a></li>
              <li><a href="/#faq" className="hover:text-foreground">FAQ</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Contact</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>support@talentgraph.local</li>
              <li><a href="/api/docs" className="hover:text-foreground" target="_blank" rel="noreferrer">API documentation</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t">
          <div className="page-container flex flex-col items-center justify-between gap-2 py-4 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} TalentGraph. All rights reserved.</p>
            <p>Find opportunities. Hire talent.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
