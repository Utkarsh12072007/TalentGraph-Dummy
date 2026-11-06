import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, LayoutGrid, List, Search } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/badge';
import { PageLoader, EmptyState, Avatar, ErrorState } from '../../components/ui/misc';
import { Pagination } from '../../components/common/Pagination';
import { APPLICATION_STATUS_LABELS, timeAgo, formatDate } from '../../lib/utils';
import { cn } from '../../lib/utils';

const PIPELINE = ['APPLIED', 'IN_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED'];

// Application management: table view + kanban pipeline view.
// Filters (status, job, search) hit the backend; the kanban groups the
// fetched page client-side and uses the same status endpoint as the table.
// The kanban is only shown to company ADMIN / RECRUITER roles — dragging
// changes application statuses, which is exactly what interviewers may not
// do (enforced server-side, mirrored here so no dead controls are shown).
export default function Applications() {
  const { company, companyRole } = useAuth();
  const [params, setParams] = useSearchParams();
  const canDecide = companyRole === 'ADMIN' || companyRole === 'RECRUITER';
  const [view, setView] = useState('table');
  const [dragging, setDragging] = useState(null);

  const status = params.get('status') || '';
  const jobId = params.get('jobId') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);

  const { data: jobsData } = useFetch(company ? '/api/jobs/company/'.concat(company.id, '?limit=100') : null);

  const url = useMemo(() => {
    if (!company) return null;
    const sp = new URLSearchParams({ page: String(page), limit: view === 'kanban' ? '100' : '20' });
    if (status) sp.set('status', status);
    if (jobId) sp.set('jobId', jobId);
    if (q) sp.set('q', q);
    return `/api/applications/company?${sp}`;
  }, [company, status, jobId, q, page, view]);

  const { data, loading, error, refetch } = useFetch(url);
  const applications = data?.applications || [];

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const moveTo = async (applicationId, nextStatus) => {
    try {
      await api.patch(`/api/applications/${applicationId}/status`, { status: nextStatus });
      refetch();
    } catch (err) {
      refetch();
    }
  };

  if (!company) {
    return <div className="page-container py-10"><EmptyState icon={FileText} title="No company workspace" description="Join or create a company first." /></div>;
  }

  return (
    <div className="page-container py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canDecide
              ? 'Review candidates and move them through the pipeline.'
              : 'Review candidates — pipeline decisions are made by recruiters and company admins.'}
          </p>
        </div>
        {canDecide && (
          <div className="flex rounded-md border bg-card p-1" role="tablist" aria-label="View mode">
            <button type="button" role="tab" aria-selected={view === 'table'} onClick={() => setView('table')} className={cn('rounded px-3 py-1.5 text-sm', view === 'table' ? 'bg-secondary font-medium' : 'text-muted-foreground hover:text-foreground')}><List className="mr-1 inline h-4 w-4" />Table</button>
            <button type="button" role="tab" aria-selected={view === 'kanban'} onClick={() => setView('kanban')} className={cn('rounded px-3 py-1.5 text-sm', view === 'kanban' ? 'bg-secondary font-medium' : 'text-muted-foreground hover:text-foreground')}><LayoutGrid className="mr-1 inline h-4 w-4" />Pipeline</button>
          </div>
        )}
      </div>

      {/* filters */}
      <div className="mt-5 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-12">
        <div className="sm:col-span-5">
          <label htmlFor="apps-q" className="sr-only">Search applications</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              id="apps-q"
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-2 pl-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Search name, headline, skills, job…"
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
            />
          </div>
        </div>
        <div className="sm:col-span-4">
          <label htmlFor="apps-job" className="sr-only">Filter by job</label>
          <select
            id="apps-job"
            className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={jobId}
            onChange={(e) => setParam('jobId', e.target.value)}
          >
            <option value="">All jobs</option>
            {(jobsData?.jobs || []).map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="apps-status" className="sr-only">Filter by status</label>
          <select
            id="apps-status"
            className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={status}
            onChange={(e) => setParam('status', e.target.value)}
            disabled={view === 'kanban'}
          >
            <option value="">All statuses</option>
            {Object.entries(APPLICATION_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="py-10"><PageLoader label="Loading applications…" /></div>}

      {!loading && error && (
        <div className="py-10">
          <ErrorState title="Could not load applications" description={error.message} onRetry={refetch} />
        </div>
      )}

      {!loading && !error && view === 'table' && (
        <>
          {applications.length === 0 ? (
            <EmptyState className="mt-6" icon={FileText} title="No applications found" description="Try clearing filters — or publish more jobs to attract candidates." />
          ) : (
            <Card className="mt-6 overflow-x-auto">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <caption className="sr-only">Job applications with candidate, role, status and resume</caption>
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th scope="col" className="px-4 py-3 font-medium">Candidate</th>
                      <th scope="col" className="px-4 py-3 font-medium">Job</th>
                      <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">Skills</th>
                      <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">Applied</th>
                      <th scope="col" className="px-4 py-3 font-medium">Status</th>
                      <th scope="col" className="px-4 py-3 font-medium">Resume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((a) => (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-accent/40">
                        <td className="px-4 py-3">
                          <Link to={`/recruiter/applications/${a.id}`} className="flex items-center gap-2.5">
                            <Avatar name={a.candidate.fullName} />
                            <span className="min-w-0">
                              <span className="block truncate font-medium hover:text-primary hover:underline">{a.candidate.fullName}</span>
                              <span className="block max-w-48 truncate text-xs text-muted-foreground">{a.candidate.headline || '—'}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3"><span className="block max-w-40 truncate">{a.job.title}</span></td>
                        <td className="hidden max-w-48 px-4 py-3 md:table-cell">
                          <span className="line-clamp-2 text-xs text-muted-foreground">{a.candidate.skills?.join(', ') || '—'}</span>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground sm:table-cell">{timeAgo(a.appliedAt)}</td>
                        <td className="px-4 py-3"><StatusBadge status={a.status} label={APPLICATION_STATUS_LABELS[a.status]} /></td>
                        <td className="px-4 py-3">
                          {a.hasResume
                            ? <span className="text-xs text-muted-foreground">attached</span>
                            : <span className="text-xs text-muted-foreground">none</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
          <div className="mt-4"><Pagination meta={data?.meta} onPage={(p) => setParam('page', String(p))} /></div>
        </>
      )}

      {!loading && !error && view === 'kanban' && (
        <div className="mt-6 grid grid-cols-1 gap-3 overflow-x-auto md:grid-cols-5 scroll-slim">
          {PIPELINE.map((col) => {
            const items = applications.filter((a) => a.status === col);
            return (
              <div
                key={col}
                className={cn(
                  'min-h-40 rounded-lg border bg-muted/40 p-2 transition-colors',
                  dragging && dragging.to === col && 'border-primary/50 bg-secondary/50'
                )}
                aria-label={`${APPLICATION_STATUS_LABELS[col]} column, ${items.length} applications`}
                onDragOver={(e) => { e.preventDefault(); if (dragging) setDragging({ ...dragging, to: col }); }}
                onDrop={() => {
                  if (dragging && dragging.application.status !== col) moveTo(dragging.application.id, col);
                  setDragging(null);
                }}
              >
                <p className="px-1 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {APPLICATION_STATUS_LABELS[col]} <span className="ml-1 rounded-full bg-card px-1.5 py-0.5">{items.length}</span>
                </p>
                <div className="space-y-2">
                  {items.map((a) => (
                    <div
                      key={a.id}
                      draggable
                      onDragStart={() => setDragging({ application: a, to: col })}
                      onDragEnd={() => setDragging(null)}
                      className="cursor-grab rounded-md border bg-card p-3 shadow-sm hover:shadow transition-shadow active:cursor-grabbing"
                    >
                      <Link to={`/recruiter/applications/${a.id}`} className="block" aria-label={`${a.candidate.fullName}, ${a.job.title}, status ${APPLICATION_STATUS_LABELS[a.status]}, applied ${formatDate(a.appliedAt)}`}>
                        <p className="truncate text-sm font-medium">{a.candidate.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{a.job.title}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{a.candidate.skills?.slice(0, 3).join(' · ')}</p>
                        <p className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{formatDate(a.appliedAt)}</span>
                          {a.hasResume && <span className="rounded bg-secondary px-1.5 py-0.5">resume</span>}
                        </p>
                      </Link>
                    </div>
                  ))}
                  {items.length === 0 && <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">Drop here</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
