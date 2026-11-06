import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, CalendarClock, History, LogOut, Search, Video, MapPin, ExternalLink, ArrowRight,
} from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { Card, CardContent } from '../../components/ui/card';
import { Badge, StatusBadge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input, Select, FormField } from '../../components/ui/form';
import { Dialog, ConfirmDialog } from '../../components/ui/dialog';
import { PageLoader, EmptyState, ErrorState } from '../../components/ui/misc';
import { useToast } from '../../components/ui/toast';
import { api } from '../../lib/api';
import { APPLICATION_STATUS_LABELS, formatDate, formatDateTime } from '../../lib/utils';

// The five forward stages of the pipeline. The timeline shows where the
// application stands; REJECTED / WITHDRAWN are terminal states rendered
// separately by the StatusBadge + the "next action" line.
const STAGES = [
  { key: 'APPLIED', label: 'Applied' },
  { key: 'IN_REVIEW', label: 'Review' },
  { key: 'SHORTLISTED', label: 'Shortlist' },
  { key: 'INTERVIEW', label: 'Interview' },
  { key: 'OFFERED', label: 'Offer' },
];

// What the candidate should do / expect next, derived from real state.
function nextAction(app) {
  const nextInterview = (app.interviews || [])
    .filter((i) => i.status === 'SCHEDULED')
    .sort((x, y) => new Date(x.scheduledAt) - new Date(y.scheduledAt))[0];

  switch (app.status) {
    case 'APPLIED':
      return 'Your application was submitted — recruiters review new applications first.';
    case 'IN_REVIEW':
      return 'A recruiter is looking at your profile now.';
    case 'SHORTLISTED':
      return 'You made the shortlist — interviews are usually scheduled next.';
    case 'INTERVIEW':
      return nextInterview
        ? `Next: round ${nextInterview.round} interview, ${formatDateTime(nextInterview.scheduledAt)}.`
        : 'You are in the interview stage — the team will confirm a time.';
    case 'OFFERED':
      return 'Congratulations — the company wants to move forward with an offer.';
    case 'REJECTED':
      return 'This application was not successful. Keep going — your next role is out there.';
    case 'WITHDRAWN':
      return 'You withdrew this application. You can always apply to new roles.';
    default:
      return '';
  }
}

// Compact 5-stage stepper. Reached stages fill in; the current one is ringed.
function StatusTimeline({ app }) {
  const currentIndex = STAGES.findIndex((s) => s.key === app.status);
  const historyStatuses = (app.history || []).map((h) => h.newStatus);
  const terminal = app.status === 'REJECTED' || app.status === 'WITHDRAWN';

  // How far the application got before a terminal state, e.g.
  // APPLIED -> IN_REVIEW -> REJECTED means it reached "Review".
  const reachedIndex = terminal
    ? Math.max(...historyStatuses.map((s) => STAGES.findIndex((st) => st.key === s)), 0)
    : currentIndex;

  return (
    <ol className="flex items-center" aria-label={`Application progress: stage ${reachedIndex + 1} of ${STAGES.length}${terminal ? `, ${APPLICATION_STATUS_LABELS[app.status]}` : ''}`}>
      {STAGES.map((stage, idx) => {
        const reached = idx <= reachedIndex;
        const isCurrent = idx === reachedIndex;
        return (
          <li key={stage.key} className="flex flex-1 items-center last:flex-none" aria-current={isCurrent ? 'step' : undefined}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${reached ? 'bg-primary' : 'bg-border'} ${isCurrent ? 'ring-2 ring-primary/30' : ''}`}
                aria-hidden
              />
              <span className={`text-[10px] leading-none ${reached ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {stage.label}
              </span>
            </div>
            {idx < STAGES.length - 1 && (
              <span className={`mx-1.5 mb-3.5 h-px flex-1 ${idx < reachedIndex ? 'bg-primary' : 'bg-border'}`} aria-hidden />
            )}
          </li>
        );
      })}
      {terminal && (
        <li className="ml-2 flex flex-col items-center gap-1">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${app.status === 'REJECTED' ? 'bg-red-400' : 'bg-slate-400'}`} aria-hidden />
          <span className="text-[10px] leading-none text-muted-foreground">{app.status === 'REJECTED' ? 'Ended' : 'Withdrawn'}</span>
        </li>
      )}
    </ol>
  );
}

function InterviewLine({ interview }) {
  const isLink = interview.locationOrLink?.startsWith('http');
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-secondary px-3 py-2 text-sm">
      <CalendarClock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span className="font-medium">Round {interview.round} {interview.type === 'VIDEO' ? 'video call' : interview.type === 'PHONE' ? 'phone call' : 'on-site'}:</span>
      <span>{formatDateTime(interview.scheduledAt)} · {interview.durationMinutes} min</span>
      {interview.locationOrLink && isLink && (
        <a
          href={interview.locationOrLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <Video className="h-3.5 w-3.5" aria-hidden /> Join link <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      )}
      {interview.locationOrLink && !isLink && (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden /> {interview.locationOrLink}
        </span>
      )}
    </p>
  );
}

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

  const withdrawable = (a) => ['APPLIED', 'IN_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED'].includes(a.status);

  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-bold tracking-tight">My Applications</h1>
      <p className="mt-1 text-sm text-muted-foreground">Track every application, its progress and your next step.</p>

      <div className="mt-5 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-12">
        <div className="sm:col-span-7">
          <FormField label="Search" htmlFor="apps-search">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input id="apps-search" className="pl-8" placeholder="Job title or company" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </FormField>
        </div>
        <div className="sm:col-span-5">
          <FormField label="Status" htmlFor="apps-status-filter">
            <Select id="apps-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(APPLICATION_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </FormField>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {loading && <PageLoader label="Loading your applications…" />}
        {error && <ErrorState title="Could not load applications" description={error.message} onRetry={refetch} />}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            icon={FileText}
            title={applications.length === 0 ? 'No applications yet' : 'Nothing matches your filters'}
            description={applications.length === 0 ? 'Find an open role and send your first application.' : undefined}
            action={applications.length === 0 ? <Button onClick={() => (window.location.href = '/discover')}>Discover jobs <ArrowRight /></Button> : undefined}
          />
        )}
        {!loading && !error && filtered.map((a) => {
          const scheduledInterviews = (a.interviews || []).filter((i) => i.status === 'SCHEDULED');
          return (
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

                {/* where this application stands */}
                <div className="mt-4 border-t pt-4">
                  <StatusTimeline app={a} />
                </div>

                {/* what happens next */}
                <p className="mt-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Next: </span>{nextAction(a)}
                </p>

                {/* confirmed interviews, with joining details */}
                {scheduledInterviews.map((i) => <InterviewLine key={i.id} interview={i} />)}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* detail dialog with status history */}
      <Dialog
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active?.job?.title}
        description={active ? `${active.job?.company?.name} · applied ${formatDate(active.appliedAt)}` : ''}
        footer={active && withdrawable(active) ? (
          <Button variant="destructive" onClick={() => setWithdrawTarget(active)}><LogOut /> Withdraw application</Button>
        ) : null}
      >
        {active && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><History className="h-4 w-4" aria-hidden />Status history</p>
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
                      {i.locationOrLink && (
                        i.locationOrLink.startsWith('http') ? (
                          <a href={i.locationOrLink} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 break-all text-primary hover:underline">
                            {i.locationOrLink} <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                        ) : (
                          <p className="mt-1 break-all text-muted-foreground">{i.locationOrLink}</p>
                        )
                      )}
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
        message={`Your application for "${withdrawTarget?.job?.title || 'this application'}" will be marked as withdrawn. This cannot be undone.`}
        confirmLabel="Withdraw"
        destructive
      />
    </div>
  );
}
