import { Link } from 'react-router-dom';
import { Briefcase, FileText, Hourglass, CalendarClock, ArrowRight, Building2 } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';
import { StatCard, StatGrid } from '../../components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/badge';
import { PageLoader, EmptyState, Alert } from '../../components/ui/misc';
import { formatDateTime, timeAgo, APPLICATION_STATUS_LABELS } from '../../lib/utils';

export default function RecruiterOverview() {
  const { company, companyRole } = useAuth();
  const { data: jobsData } = useFetch(company ? `/api/jobs/company/${company.id}` : null);
  const { data: appsData } = useFetch('/api/applications/company?limit=6');
  const { data: interviewsData } = useFetch('/api/interviews/company?when=upcoming&limit=5');

  const jobs = jobsData?.jobs || [];
  const applications = appsData?.applications || [];
  const interviews = interviewsData?.interviews || [];

  const counts = {
    activeJobs: jobs.filter((j) => j.status === 'PUBLISHED').length,
    totalApplications: jobs.reduce((sum, j) => sum + j.applicationCount, 0),
    toReview: applications.filter((a) => a.status === 'APPLIED').length,
  };

  return (
    <div className="page-container py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{company?.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your hiring workspace overview · you are {companyRole?.toLowerCase()}</p>
        </div>
        <Button onClick={() => (window.location.href = '/recruiter/jobs/new')}>
          Post a job <ArrowRight />
        </Button>
      </div>

      <StatGrid className="mt-6">
        <StatCard label="Active jobs" value={counts.activeJobs} icon={Briefcase} to="/recruiter/jobs" hint={`${jobs.length} total`} />
        <StatCard label="Total applications" value={counts.totalApplications} icon={FileText} to="/recruiter/applications" />
        <StatCard label="New to review" value={counts.toReview} icon={Hourglass} to="/recruiter/applications" hint="Applications with status Applied" />
        <StatCard label="Upcoming interviews" value={interviews.length} icon={CalendarClock} to="/recruiter/interviews" />
      </StatGrid>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent applications</CardTitle>
              <CardDescription>Latest candidates across all your jobs</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild={undefined} onClick={() => (window.location.href = '/recruiter/applications')}>View all</Button>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <EmptyState icon={FileText} title="No applications yet" description="Publish a job and applications will land here." />
            ) : (
              <ul className="divide-y">
                {applications.map((a) => (
                  <li key={a.id}>
                    <Link to={`/recruiter/applications/${a.id}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{a.candidate.fullName}</p>
                        <p className="truncate text-sm text-muted-foreground">{a.job.title} · {timeAgo(a.appliedAt)}</p>
                      </div>
                      <StatusBadge status={a.status} label={APPLICATION_STATUS_LABELS[a.status]} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Your jobs</CardTitle>
              <CardDescription>Published roles and their pipeline sizes</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => (window.location.href = '/recruiter/jobs')}>Manage</Button>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <EmptyState icon={Briefcase} title="No jobs yet" description="Create your first job posting to start receiving applications." />
            ) : (
              <ul className="divide-y">
                {jobs.slice(0, 6).map((j) => (
                  <li key={j.id}>
                    <Link to={`/recruiter/jobs/${j.id}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{j.title}</p>
                        <p className="text-sm text-muted-foreground">{j.applicationCount} application{j.applicationCount === 1 ? '' : 's'}</p>
                      </div>
                      <StatusBadge status={j.status === 'PUBLISHED' ? 'OFFERED' : j.status === 'DRAFT' ? 'APPLIED' : 'REJECTED'} label={j.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {!company && (
        <Alert variant="warning" className="mt-6" title="No company workspace">
          You need a company workspace to post jobs. <Link to="/recruiter/company-setup" className="underline">Create one now</Link>.
        </Alert>
      )}
      {company && (
        <Card className="mt-6">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-primary"><Building2 className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{company.name}</p>
              <p className="text-sm text-muted-foreground">
                {interviews.length > 0
                  ? `Next interview: ${formatDateTime(interviews[interviews.length - 1].scheduledAt)}`
                  : 'No interviews scheduled yet'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = '/recruiter/company')}>Company settings</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
