import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Plus, MoreVertical, Eye, Pencil, Archive, Trash2, PlayCircle, PauseCircle } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge, JobStatusBadge } from '../../components/ui/badge';
import { Input, Select, FormField } from '../../components/ui/form';
import { Dropdown, DropdownItem, DropdownSeparator } from '../../components/ui/dropdown';
import { ConfirmDialog } from '../../components/ui/dialog';
import { PageLoader, EmptyState, ErrorState } from '../../components/ui/misc';
import { Tabs } from '../../components/ui/tabs';
import { useToast } from '../../components/ui/toast';
import { Pagination } from '../../components/common/Pagination';
import { WORK_MODE_LABELS, formatDate } from '../../lib/utils';

const TABS = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function RecruiterJobs() {
  const { company, companyRole } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const url = useMemo(() => {
    if (!company) return null;
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    return `/api/jobs/company/${company.id}?${params}`;
  }, [company, status, q, page]);

  const { data, loading, error, refetch } = useFetch(url);
  const jobs = data?.jobs || [];

  const changeStatus = async (job, next) => {
    try {
      await api.patch(`/api/jobs/company/${company.id}/${job.id}/status`, { status: next });
      toast.success(`Job ${next.toLowerCase()}`);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/api/jobs/company/${company.id}/${deleteTarget.id}`);
      toast.success('Draft deleted');
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
      setDeleteTarget(null);
    }
  };

  if (!company) {
    return (
      <div className="page-container py-10">
        <EmptyState icon={Briefcase} title="No company workspace" description="Create a company workspace first." action={<Button onClick={() => (window.location.href = '/recruiter/company-setup')}>Create workspace</Button>} />
      </div>
    );
  }

  return (
    <div className="page-container py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data ? `${data.meta.total} job posting${data.meta.total === 1 ? '' : 's'}` : ''}</p>
        </div>
        {companyRole !== 'INTERVIEWER' && (
          <Button onClick={() => (window.location.href = '/recruiter/jobs/new')}><Plus /> New job</Button>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-12">
        <div className="sm:col-span-7">
          <Input aria-label="Search jobs by title" placeholder="Search by title…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <div className="sm:col-span-5">
          <Select aria-label="Filter jobs by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            {TABS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {loading && <PageLoader label="Loading jobs…" />}
        {!loading && error && <ErrorState title="Could not load jobs" description={error.message} onRetry={refetch} />}
        {!loading && !error && jobs.length === 0 && (
          <EmptyState
            icon={Briefcase}
            title={q || status ? 'Nothing matches' : 'No jobs yet'}
            description={q || status ? 'Try a different search or status.' : 'Create your first job posting — start from a draft or publish right away.'}
            action={companyRole !== 'INTERVIEWER' && !(q || status) ? <Button onClick={() => (window.location.href = '/recruiter/jobs/new')}><Plus /> New job</Button> : undefined}
          />
        )}
        {!loading && !error && jobs.map((job) => (
          <Card key={job.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/recruiter/jobs/${job.id}`} className="truncate font-semibold hover:text-primary hover:underline">{job.title}</Link>
                  <JobStatusBadge status={job.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {WORK_MODE_LABELS[job.workMode]} · {job.employmentType.replace('_', ' ').toLowerCase()} · {job.location || 'Remote'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {job.applicationCount} application{job.applicationCount === 1 ? '' : 's'}
                  {job.publishedAt ? ` · published ${formatDate(job.publishedAt)}` : ' · not published'}
                  {job.deadline ? ` · deadline ${formatDate(job.deadline)}` : ''}
                </p>
              </div>
              {companyRole !== 'INTERVIEWER' && (
                <Dropdown
                  trigger={<Button variant="outline" size="icon" aria-label="Job actions"><MoreVertical /></Button>}
                >
                  <DropdownItem onClick={() => (window.location.href = `/recruiter/jobs/${job.id}`)}>
                    <Eye /> View & applications
                  </DropdownItem>
                  {job.status !== 'ARCHIVED' && (
                    <DropdownItem onClick={() => (window.location.href = `/recruiter/jobs/${job.id}/edit`)}>
                      <Pencil /> Edit
                    </DropdownItem>
                  )}
                  <DropdownSeparator />
                  {job.status === 'DRAFT' && <DropdownItem onClick={() => changeStatus(job, 'PUBLISHED')}><PlayCircle /> Publish</DropdownItem>}
                  {job.status === 'PUBLISHED' && <DropdownItem onClick={() => changeStatus(job, 'CLOSED')}><PauseCircle /> Close</DropdownItem>}
                  {job.status === 'CLOSED' && <DropdownItem onClick={() => changeStatus(job, 'PUBLISHED')}><PlayCircle /> Reopen</DropdownItem>}
                  {['PUBLISHED', 'CLOSED', 'DRAFT'].includes(job.status) && (
                    <DropdownItem onClick={() => changeStatus(job, 'ARCHIVED')}><Archive /> Archive</DropdownItem>
                  )}
                  {job.status === 'DRAFT' && job.applicationCount === 0 && (
                    <>
                      <DropdownSeparator />
                      <DropdownItem destructive onClick={() => setDeleteTarget(job)}><Trash2 /> Delete draft</DropdownItem>
                    </>
                  )}
                </Dropdown>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Pagination meta={data?.meta} onPage={setPage} />
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="Delete draft job?"
        message={`"${deleteTarget?.title}" has no applications and will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
