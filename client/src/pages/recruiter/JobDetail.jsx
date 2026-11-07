import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, PlayCircle, PauseCircle, Archive, Search } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge, JobStatusBadge } from '../../components/ui/badge';
import { PageLoader, EmptyState } from '../../components/ui/misc';
import { useToast } from '../../components/ui/toast';
import { APPLICATION_STATUS_LABELS, WORK_MODE_LABELS, EMPLOYMENT_LABELS, formatSalary, formatDate, timeAgo } from '../../lib/utils';

// Recruiter job detail: posting preview + status actions + its applications.
export default function RecruiterJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { company, companyRole } = useAuth();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');

  const { data, loading, refetch } = useFetch(`/api/jobs/${jobId}`);
  const job = data?.job;

  const applicationsUrl = useMemo(() => {
    if (!company) return null;
    const params = new URLSearchParams({ jobId, limit: '50' });
    if (statusFilter) params.set('status', statusFilter);
    if (q) params.set('q', q);
    return `/api/applications/company?${params}`;
  }, [company, jobId, statusFilter, q]);
  const { data: appsData } = useFetch(applicationsUrl);
  const applications = appsData?.applications || [];

  const changeStatus = async (next) => {
    try {
      await api.patch(`/api/jobs/company/${company.id}/${jobId}/status`, { status: next });
      toast.success(`Job ${next.toLowerCase()}`);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="page-container py-10"><PageLoader /></div>;
  if (!job) return <div className="page-container py-10"><EmptyState title="Job not found" /></div>;

  const isMine = company && job.company?.id === company.id;

  return (
    <div className="page-container py-8">
      <Link to="/recruiter/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All jobs
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {WORK_MODE_LABELS[job.workMode]} · {EMPLOYMENT_LABELS[job.employmentType]} · {job.location || 'No location'}
            {formatSalary(job.salaryMin, job.salaryMax, job.currency) ? ` · ${formatSalary(job.salaryMin, job.salaryMax, job.currency)}` : ''}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {job.publishedAt ? `Published ${formatDate(job.publishedAt)}` : 'Not published yet'}
            {job.deadline ? ` · deadline ${formatDate(job.deadline)}` : ''}
          </p>
        </div>
        {isMine && companyRole !== 'INTERVIEWER' && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/recruiter/jobs/${jobId}/edit`)} disabled={job.status === 'ARCHIVED'}>
              <Pencil /> Edit
            </Button>
            {job.status === 'DRAFT' && <Button size="sm" onClick={() => changeStatus('PUBLISHED')}><PlayCircle /> Publish</Button>}
            {job.status === 'PUBLISHED' && <Button variant="outline" size="sm" onClick={() => changeStatus('CLOSED')}><PauseCircle /> Close</Button>}
            {job.status === 'CLOSED' && <Button size="sm" onClick={() => changeStatus('PUBLISHED')}><PlayCircle /> Reopen</Button>}
            {job.status !== 'ARCHIVED' && <Button variant="ghost" size="sm" onClick={() => changeStatus('ARCHIVED')}><Archive /> Archive</Button>}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Posting</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <section>
                <p className="mb-1 font-medium">Description</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{job.description}</p>
              </section>
              {job.responsibilities && (
                <section>
                  <p className="mb-1 font-medium">Responsibilities</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{job.responsibilities}</p>
                </section>
              )}
              {job.requirements && (
                <section>
                  <p className="mb-1 font-medium">Requirements</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{job.requirements}</p>
                </section>
              )}
              {job.skills?.length > 0 && (
                <section>
                  <p className="mb-1 font-medium">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((s) => <Badge key={s.name} variant="outline">{s.name}{!s.isRequired && ' (optional)'}</Badge>)}
                  </div>
                </section>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Applications ({applications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-40">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-2 pl-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Search candidates…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
                <select
                  className="flex h-9 rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>
                  {Object.entries(APPLICATION_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              {applications.length === 0 ? (
                <EmptyState title="No applications" description="Candidates who apply to this job will appear here." className="border-0 py-8" />
              ) : (
                <ul className="divide-y">
                  {applications.map((a) => (
                    <li key={a.id}>
                      <Link to={`/recruiter/applications/${a.id}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.candidate.fullName}</p>
                          <p className="truncate text-sm text-muted-foreground">{a.candidate.headline || 'No headline'} · applied {timeAgo(a.appliedAt)}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {a.candidate.skills?.slice(0, 4).map((s) => (
                              <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{s}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusBadge status={a.status} label={APPLICATION_STATUS_LABELS[a.status]} />
                          {a.hasResume && <span className="text-xs text-muted-foreground">resume attached</span>}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
