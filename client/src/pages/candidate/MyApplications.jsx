import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CalendarClock, History, LogOut, Search } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { Card, CardContent } from '../../components/ui/card';
import { Badge, StatusBadge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input, Select, FormField } from '../../components/ui/form';
import { Dialog, ConfirmDialog } from '../../components/ui/dialog';
import { PageLoader, EmptyState } from '../../components/ui/misc';
import { useToast } from '../../components/ui/toast';
import { api } from '../../lib/api';
import { APPLICATION_STATUS_LABELS, formatDate, formatDateTime } from '../../lib/utils';

export default function MyApplications() {
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch('/api/applications/mine');
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');
  const [active, setActive] = useState(null); // application shown in the detail dialog
  const [withdrawTarget, setWithdrawTarget] = useState(null);

  const applications = data?.applications || [];
  const filtered = useMemo(() => applications.filter((a) => {
    const matchesStatus = !statusFilter || a.status === statusFilter;
    const haystack = `${a.job?.title} ${a.job?.company?.name}`.toLowerCase();
    return matchesStatus && (!q || haystack.includes(q.toLowerCase()));
  }), [applications, statusFilter, q]);

  const withdraw = async () => {
    try {
      await api.post(`/api/applications/${withdrawTarget.id}/withdraw`);
      toast.success('Application withdrawn');
      setWithdrawTarget(null);
      setActive(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="page-container py-10"><PageLoader /></div>;
  if (error) return <div className="page-container py-10"><EmptyState title="Could not load applications" description={error.message} /></div>;

  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-bold tracking-tight">My Applications</h1>
      <p className="mt-1 text-sm text-muted-foreground">Track every application and its full status history.</p>

      <div className="mt-5 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-12">
        <div className="sm:col-span-7">
          <FormField label="Search">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Job title or company" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </FormField>
        </div>
        <div className="sm:col-span-5">
          <FormField label="Status">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(APPLICATION_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </FormField>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={applications.length === 0 ? 'No applications yet' : 'Nothing matches your filters'}
            description={applications.length === 0 ? 'Find an open role and send your first application.' : undefined}
            action={applications.length === 0 ? <Button onClick={() => (window.location.href = '/discover')}>Discover jobs</Button> : undefined}
          />
        ) : filtered.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{a.job?.title}</p>
                  <p className="text-sm text-muted-foreground">{a.job?.company?.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Applied {formatDate(a.appliedAt)} · Updated {formatDate(a.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.status} label={APPLICATION_STATUS_LABELS[a.status]} />
                  <Button variant="outline" size="sm" onClick={() => setActive(a)}>Details</Button>
                </div>
              </div>
              {a.interviews?.filter((i) => i.status === 'SCHEDULED').map((i) => (
                <p key={i.id} className="mt-3 flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  Interview (round {i.round}): {formatDateTime(i.scheduledAt)} · {i.type.replace('_', ' ')}
                </p>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* detail dialog with status history */}
      <Dialog
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active?.job?.title}
        description={active ? `${active.job?.company?.name} · applied ${formatDate(active.appliedAt)}` : ''}
        footer={active && ['APPLIED', 'IN_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED'].includes(active.status) ? (
          <Button variant="destructive" onClick={() => setWithdrawTarget(active)}><LogOut /> Withdraw application</Button>
        ) : null}
      >
        {active && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><History className="h-4 w-4" />Status history</p>
              <ol className="space-y-0">
                {(active.history || []).map((h, idx) => (
                  <li key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {idx < active.history.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-border" aria-hidden />}
                    <span className="mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-primary bg-background" aria-hidden />
                    <div>
                      <p className="text-sm font-medium">{APPLICATION_STATUS_LABELS[h.newStatus] || h.newStatus}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.previousStatus ? `Moved from ${APPLICATION_STATUS_LABELS[h.previousStatus]} · ` : ''}{formatDateTime(h.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            {active.interviews?.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Interviews</p>
                <ul className="space-y-2">
                  {active.interviews.map((i) => (
                    <li key={i.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">Round {i.round} · {i.type.replace('_', ' ')}</span>
                        <Badge variant={i.status === 'SCHEDULED' ? 'info' : i.status === 'COMPLETED' ? 'success' : 'neutral'}>{i.status}</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">{formatDateTime(i.scheduledAt)} ({i.durationMinutes} min)</p>
                      {i.locationOrLink && <p className="mt-1 break-all text-muted-foreground">{i.locationOrLink}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {active.coverNote && (
              <div>
                <p className="mb-1 text-sm font-medium">Your cover note</p>
                <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{active.coverNote}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Recruiters keep private notes on applications — those are never shared with candidates.
            </p>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(withdrawTarget)}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={withdraw}
        title="Withdraw application?"
        message={`Your application for "${withdrawTarget?.job?.title}" will be marked as withdrawn. This cannot be undone.`}
        confirmLabel="Withdraw"
        destructive
      />
    </div>
  );
}
