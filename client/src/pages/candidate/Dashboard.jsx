import { Link } from 'react-router-dom';
import { FileText, Hourglass, Star, CalendarClock, ArrowRight, UserRound } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';
import { StatCard, StatGrid } from '../../components/common/StatCard';
import { JobCard } from '../../components/common/JobCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/badge';
import { Progress, PageLoader, EmptyState, Alert } from '../../components/ui/misc';
import { profileCompletion, formatDateTime, APPLICATION_STATUS_LABELS } from '../../lib/utils';

export default function CandidateDashboard() {
  const { user } = useAuth();
  const { data: profileData, loading: loadingProfile } = useFetch('/api/candidates/me/profile');
  const { data: appsData } = useFetch('/api/applications/mine');
  const { data: interviewsData } = useFetch('/api/interviews/mine');
  const { data: jobsData } = useFetch('/api/jobs?limit=4&sort=recent');

  const profile = profileData?.profile;
  const completion = profileCompletion(profile);
  const applications = appsData?.applications || [];
  const interviews = (interviewsData?.interviews || []).filter((i) => i.status === 'SCHEDULED');
  const upcoming = interviews.filter((i) => new Date(i.scheduledAt) >= new Date());

  const counts = {
    total: applications.length,
    inReview: applications.filter((a) => ['IN_REVIEW', 'SHORTLISTED'].includes(a.status)).length,
    shortlisted: applications.filter((a) => a.status === 'SHORTLISTED').length,
  };

  if (loadingProfile) return <div className="page-container py-10"><PageLoader /></div>;

  return (
    <div className="page-container py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.fullName?.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here is where your job search stands today.</p>
        </div>
        <Button asChild={undefined} onClick={() => (window.location.href = '/discover')}>
          Find jobs <ArrowRight />
        </Button>
      </div>

      <StatGrid className="mt-6">
        <StatCard label="Profile completion" value={`${completion.percent}%`} icon={UserRound} to="/profile"
          hint={completion.percent < 100 ? `Add: ${completion.missing.slice(0, 3).join(', ')}` : 'Your profile is complete'} />
        <StatCard label="Total applications" value={counts.total} icon={FileText} to="/applications" />
        <StatCard label="In review" value={counts.inReview} icon={Hourglass} to="/applications" hint="Being looked at by recruiters" />
        <StatCard label="Shortlisted" value={counts.shortlisted} icon={Star} to="/applications" hint="Advanced to the shortlist" />
      </StatGrid>

      {completion.percent < 100 && (
        <Card className="mt-4">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-sm">
              <p className="font-medium">Complete your profile to stand out</p>
              <span className="tabular-nums text-muted-foreground">{completion.percent}%</span>
            </div>
            <Progress value={completion.percent} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">Missing: {completion.missing.join(', ')}</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Upcoming interviews</CardTitle>
              <CardDescription>Confirmed sessions scheduled by recruiters</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => (window.location.href = '/interviews')}>View all</Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No interviews scheduled" description="When a recruiter invites you to an interview, it appears here with time and details." />
            ) : (
              <ul className="space-y-3">
                {upcoming.slice(0, 4).map((i) => (
                  <li key={i.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{i.application?.job?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {i.application?.job?.company?.name} · Round {i.round} · {i.type.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium">{formatDateTime(i.scheduledAt)}</p>
                      {i.locationOrLink && <a href={i.locationOrLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Join link</a>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application activity</CardTitle>
            <CardDescription>Latest status changes</CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <EmptyState icon={FileText} title="No applications yet" description="Discover open roles and send your first application." />
            ) : (
              <ul className="space-y-3">
                {applications.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.job?.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.job?.company?.name}</p>
                    </div>
                    <StatusBadge status={a.status} label={APPLICATION_STATUS_LABELS[a.status]} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recently published jobs</h2>
          <Link to="/discover" className="text-sm text-primary hover:underline">Browse all</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(jobsData?.jobs || []).map((job) => <JobCard key={job.id} job={job} to={`/jobs/${job.id}`} />)}
        </div>
      </div>
    </div>
  );
}
