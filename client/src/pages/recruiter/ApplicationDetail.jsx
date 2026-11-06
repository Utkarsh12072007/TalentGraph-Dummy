import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Download, Star, StickyNote, CalendarPlus, GraduationCap, Briefcase as BriefcaseIcon,
  FolderGit2, Award, History, Users, MapPin, Mail,
} from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { api, downloadFile } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge, StatusBadge } from '../../components/ui/badge';
import { Input, Textarea, Select, FormField } from '../../components/ui/form';
import { Dialog } from '../../components/ui/dialog';
import { Avatar, PageLoader, EmptyState, Alert, ErrorState } from '../../components/ui/misc';
import { useToast } from '../../components/ui/toast';
import { APPLICATION_STATUS_LABELS, formatDate, formatDateTime, EMPLOYMENT_LABELS, COMPANY_ROLE_LABELS } from '../../lib/utils';
import { useAuth } from '../../lib/auth';

// Server-defined transition map, mirrored here only to render buttons.
const TRANSITIONS = {
  APPLIED: ['IN_REVIEW', 'SHORTLISTED', 'REJECTED'],
  IN_REVIEW: ['SHORTLISTED', 'INTERVIEW', 'REJECTED'],
  SHORTLISTED: ['INTERVIEW', 'OFFERED', 'REJECTED'],
  INTERVIEW: ['OFFERED', 'REJECTED'],
  OFFERED: ['REJECTED'],
  REJECTED: [],
  WITHDRAWN: [],
};

export default function ApplicationDetail() {
  const { applicationId } = useParams();
  const { company, companyRole, user } = useAuth();
  const toast = useToast();

  const { data, loading, error, refetch } = useFetch(`/api/applications/${applicationId}`);
  const application = data?.application;
  const isCompany = data?.viewerIsCompany;

  // Server rules mirrored for the UI: pipeline decisions (status changes) and
  // private notes are ADMIN/RECRUITER actions. Interviewers see the workspace,
  // give interview feedback, and can schedule interview logistics — but the
  // status buttons and note composer are hidden for them.
  const canDecide = isCompany && (companyRole === 'ADMIN' || companyRole === 'RECRUITER');

  const { data: membersData } = useFetch(isCompany ? `/api/companies/${company?.id}/members` : null);
  const members = membersData?.members || [];

  const [note, setNote] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [feedbackFor, setFeedbackFor] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="page-container py-10"><PageLoader /></div>;
  if (error || !application) {
    return (
      <div className="page-container py-10">
        {error && error.status !== 404 ? (
          <ErrorState title="Could not load this application" description={error.message} onRetry={refetch} />
        ) : (
          <EmptyState title="Application not found" description={error?.message} action={<Link to="/recruiter/applications" className="text-primary hover:underline">Back to applications</Link>} />
        )}
      </div>
    );
  }

  const candidate = application.candidateProfile;
  const allowedNext = TRANSITIONS[application.status] || [];

  const changeStatus = async (status) => {
    setBusy(true);
    try {
      await api.patch(`/api/applications/${applicationId}/status`, { status });
      toast.success(`Moved to ${APPLICATION_STATUS_LABELS[status]}`);
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      await api.post(`/api/applications/${applicationId}/notes`, { content: note.trim() });
      setNote('');
      toast.success('Private note added');
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-container py-8">
      <Link to="/recruiter/applications" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All applications
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <Avatar name={candidate.user.fullName} className="h-14 w-14 text-base" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{candidate.user.fullName}</h1>
            <p className="text-sm text-muted-foreground">{candidate.headline || 'No headline'}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {candidate.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{candidate.location}</span>}
              {candidate.yearsExperience != null && <span>{candidate.yearsExperience} yrs experience</span>}
              <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{candidate.user.email}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <StatusBadge status={application.status} label={APPLICATION_STATUS_LABELS[application.status]} />
          <p className="mt-1 text-xs text-muted-foreground">Applied {formatDate(application.appliedAt)} · for <Link className="text-primary hover:underline" to={`/recruiter/jobs/${application.job.id}`}>{application.job.title}</Link></p>
        </div>
      </div>

      {/* pipeline actions */}
      {isCompany && (canDecide || allowedNext.length > 0) && (
        <Card className="mt-5">
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            {canDecide && allowedNext.length > 0 && (
              <>
                <p className="mr-2 text-sm font-medium">Move candidate to:</p>
                {allowedNext.map((s) => (
                  <Button key={s} size="sm" variant={s === 'REJECTED' ? 'destructive' : s === 'OFFERED' ? 'default' : 'outline'} disabled={busy} onClick={() => changeStatus(s)}>
                    {APPLICATION_STATUS_LABELS[s]}
                  </Button>
                ))}
              </>
            )}
            {canDecide && allowedNext.length === 0 && (
              <p className="text-sm text-muted-foreground">
                This application is in a final state — no further pipeline changes are possible.
              </p>
            )}
            {!canDecide && (
              <p className="text-sm text-muted-foreground">
                You are viewing as an interviewer — pipeline decisions are made by recruiters and company admins.
              </p>
            )}
            <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setScheduleOpen(true)} disabled={application.status === 'WITHDRAWN' || application.status === 'REJECTED'}>
              <CalendarPlus /> Schedule interview
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* candidate profile */}
        <div className="space-y-4 lg:col-span-2">
          {candidate.summary && (
            <Card>
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">{candidate.summary}</p></CardContent>
            </Card>
          )}

          {application.coverNote && (
            <Card>
              <CardHeader><CardTitle>Cover note</CardTitle><CardDescription>Written by the candidate for this application</CardDescription></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">“{application.coverNote}”</p></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Resume</CardTitle>
            </CardHeader>
            <CardContent>
              {application.resume ? (
                <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{application.resume.originalName}</p>
                    <p className="text-xs text-muted-foreground">Uploaded {formatDate(application.resume.createdAt)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadFile(`/api/resumes/${application.resume.id}/download`, application.resume.originalName)}>
                    <Download /> Download
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No resume attached to this application.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BriefcaseIcon className="h-4 w-4" />Experience</CardTitle></CardHeader>
              <CardContent>
                {candidate.experiences.length === 0 ? <p className="text-sm text-muted-foreground">No experience listed.</p> : (
                  <ul className="space-y-3">
                    {candidate.experiences.map((x) => (
                      <li key={x.id}>
                        <p className="text-sm font-medium">{x.title}</p>
                        <p className="text-xs text-muted-foreground">{x.company}{x.employmentType ? ` · ${EMPLOYMENT_LABELS[x.employmentType]}` : ''}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(x.startDate)} – {x.endDate ? formatDate(x.endDate) : 'Present'}</p>
                        {x.description && <p className="mt-1 text-xs text-muted-foreground">{x.description}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-4 w-4" />Education</CardTitle></CardHeader>
              <CardContent>
                {candidate.educations.length === 0 ? <p className="text-sm text-muted-foreground">No education listed.</p> : (
                  <ul className="space-y-3">
                    {candidate.educations.map((e) => (
                      <li key={e.id}>
                        <p className="text-sm font-medium">{e.degree}{e.field ? `, ${e.field}` : ''}</p>
                        <p className="text-xs text-muted-foreground">{e.institution}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(e.startDate)} – {e.endDate ? formatDate(e.endDate) : 'Present'}{e.grade ? ` · ${e.grade}` : ''}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-4 w-4" />Skills</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {candidate.skills.length === 0 ? <p className="text-sm text-muted-foreground">No skills listed.</p> : candidate.skills.map((s) => (
                  <Badge key={s.id} variant="outline">{s.skill.name}{s.level ? ` · ${s.level.toLowerCase()}` : ''}</Badge>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FolderGit2 className="h-4 w-4" />Projects</CardTitle></CardHeader>
              <CardContent>
                {candidate.projects.length === 0 ? <p className="text-sm text-muted-foreground">No projects listed.</p> : (
                  <ul className="space-y-2">
                    {candidate.projects.map((p) => (
                      <li key={p.id}>
                        <p className="text-sm font-medium">{p.name}</p>
                        {p.techStack && <p className="text-xs text-muted-foreground">{p.techStack}</p>}
                        {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            {candidate.certifications.length > 0 && (
              <Card className="sm:col-span-2">
                <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-4 w-4" />Certifications</CardTitle></CardHeader>
                <CardContent>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {candidate.certifications.map((c) => (
                      <li key={c.id} className="text-sm">
                        <span className="font-medium">{c.name}</span>
                        <span className="block text-xs text-muted-foreground">{c.issuer} · {formatDate(c.issueDate)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* right rail: notes, interviews, history */}
        <div className="space-y-4">
          {isCompany && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><StickyNote className="h-4 w-4" />Private notes</CardTitle><CardDescription>Only visible to your company</CardDescription></CardHeader>
              <CardContent>
                {canDecide ? (
                  <>
                    <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Strong React portfolio, verify system design depth…" aria-label="New private note" />
                    <Button size="sm" className="mt-2 w-full" onClick={addNote} disabled={busy || !note.trim()}>Add note</Button>
                  </>
                ) : (
                  <p className="mb-3 text-xs text-muted-foreground">Notes are read-only for interviewers — only company admins and recruiters can add them.</p>
                )}
                <ul className="mt-4 space-y-3">
                  {(application.notes || []).map((n) => (
                    <li key={n.id} className="rounded-md bg-muted p-3">
                      <p className="text-sm">{n.content}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{n.author.fullName} · {formatDateTime(n.createdAt)}</p>
                    </li>
                  ))}
                  {(application.notes || []).length === 0 && <p className="text-xs text-muted-foreground">No notes yet.</p>}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" />Interviews</CardTitle></CardHeader>
            <CardContent>
              {(application.interviews || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No interviews scheduled.</p>
              ) : (
                <ul className="space-y-3">
                  {application.interviews.map((i) => (
                    <li key={i.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Round {i.round} · {i.type.replace('_', ' ')}</p>
                        <Badge variant={i.status === 'SCHEDULED' ? 'info' : i.status === 'COMPLETED' ? 'success' : 'neutral'}>{i.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(i.scheduledAt)} ({i.durationMinutes} min)</p>
                      {i.locationOrLink && <p className="mt-0.5 break-all text-xs text-muted-foreground">{i.locationOrLink}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Interviewers: {i.interviewers.map((iv) => iv.user.fullName).join(', ') || 'none assigned'}
                      </p>
                      {isCompany && (
                        <div className="mt-2 space-y-2">
                          {(i.feedbacks || []).map((fb) => (
                            <div key={fb.id} className="rounded bg-secondary/60 p-2 text-xs">
                              <p className="font-medium">{fb.interviewer.fullName}: {fb.rating}/5 · {fb.recommendation.replace('_', ' ')}</p>
                              {fb.strengths && <p className="text-muted-foreground">+ {fb.strengths}</p>}
                              {fb.improvements && <p className="text-muted-foreground">– {fb.improvements}</p>}
                            </div>
                          ))}
                          {i.status === 'SCHEDULED' && (
                            <Button size="sm" variant="outline" onClick={() => setFeedbackFor({ ...i, currentUserId: user.id })}>
                              {i.feedbacks?.some((fb) => fb.interviewer.id === user.id) ? 'Edit my feedback' : 'Record feedback'}
                            </Button>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-4 w-4" />Status history</CardTitle></CardHeader>
            <CardContent>
              <ol>
                {(application.history || []).map((h, idx) => (
                  <li key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {idx < application.history.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-border" aria-hidden />}
                    <span className="mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-primary bg-background" aria-hidden />
                    <div>
                      <p className="text-sm font-medium">{APPLICATION_STATUS_LABELS[h.newStatus]}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.previousStatus ? `from ${APPLICATION_STATUS_LABELS[h.previousStatus]} · ` : ''}
                        {formatDateTime(h.createdAt)}{h.changedBy ? ` · by ${h.changedBy.fullName}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* schedule interview dialog */}
      {scheduleOpen && (
        <ScheduleDialog
          applicationId={applicationId}
          members={members}
          nextRound={(application.interviews?.length || 0) + 1}
          onClose={() => setScheduleOpen(false)}
          onDone={() => { setScheduleOpen(false); refetch(); }}
        />
      )}

      {/* feedback dialog */}
      {feedbackFor && (
        <FeedbackDialog
          interview={feedbackFor}
          onClose={() => setFeedbackFor(null)}
          onDone={() => { setFeedbackFor(null); refetch(); }}
        />
      )}
    </div>
  );
}

/* ---------------- schedule interview ---------------- */
function ScheduleDialog({ applicationId, members, nextRound, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({
    round: String(nextRound),
    scheduledAt: '',
    durationMinutes: '45',
    type: 'VIDEO',
    locationOrLink: '',
    interviewerIds: [],
  });
  const [busy, setBusy] = useState(false);

  const toggleInterviewer = (id) => {
    setForm((f) => ({
      ...f,
      interviewerIds: f.interviewerIds.includes(id)
        ? f.interviewerIds.filter((x) => x !== id)
        : [...f.interviewerIds, id],
    }));
  };

  const submit = async () => {
    if (!form.scheduledAt) {
      toast.error('Pick a date and time');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/interviews', {
        applicationId,
        round: Number(form.round),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        type: form.type,
        locationOrLink: form.locationOrLink.trim() || null,
        interviewerIds: form.interviewerIds,
      });
      toast.success('Interview scheduled — the candidate has been notified');
      onDone();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Schedule interview"
      description="The candidate sees the time, type and link/location in their account."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Scheduling…' : 'Schedule'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Round" required>
            <Input type="number" min="1" max="20" value={form.round} onChange={(e) => setForm({ ...form, round: e.target.value })} />
          </FormField>
          <FormField label="Type" required>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="PHONE">Phone screen</option>
              <option value="VIDEO">Video call</option>
              <option value="ON_SITE">On-site</option>
            </Select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Date & time" required>
            <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          </FormField>
          <FormField label="Duration (minutes)">
            <Input type="number" min="10" max="480" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          </FormField>
        </div>
        <FormField label="Meeting link or location" hint="For video interviews paste the meeting URL.">
          <Input value={form.locationOrLink} onChange={(e) => setForm({ ...form, locationOrLink: e.target.value })} placeholder="https://meet…" />
        </FormField>
        <FormField label="Assign interviewers" hint="Only company members can be assigned.">
          <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border p-2 scroll-slim">
            {members.length === 0 && <p className="p-2 text-sm text-muted-foreground">No other members found.</p>}
            {members.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-sm hover:bg-accent">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                  checked={form.interviewerIds.includes(m.user.id)}
                  onChange={() => toggleInterviewer(m.user.id)}
                />
                <span className="flex-1">{m.user.fullName}</span>
                <span className="text-xs text-muted-foreground">{COMPANY_ROLE_LABELS[m.role]}</span>
              </label>
            ))}
          </div>
        </FormField>
      </div>
    </Dialog>
  );
}

/* ---------------- interview feedback ---------------- */
function FeedbackDialog({ interview, onClose, onDone }) {
  const toast = useToast();
  const existing = interview.feedbacks?.find((fb) => fb.interviewer.id === interview.currentUserId);
  const [form, setForm] = useState({
    rating: existing?.rating || '4',
    recommendation: existing?.recommendation || 'HIRE',
    strengths: existing?.strengths || '',
    improvements: existing?.improvements || '',
    comments: existing?.comments || '',
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/api/interviews/${interview.id}/feedback`, {
        rating: Number(form.rating),
        recommendation: form.recommendation,
        strengths: form.strengths.trim() || null,
        improvements: form.improvements.trim() || null,
        comments: form.comments.trim() || null,
      });
      toast.success('Feedback saved');
      onDone();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Feedback — round ${interview.round}`}
      description="Visible to your company only. Candidates never see interview feedback."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save feedback'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Rating (1–5)" required>
            <Select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} — {['Poor', 'Below expectations', 'Mixed', 'Good', 'Excellent'][n - 1]}</option>)}
            </Select>
          </FormField>
          <FormField label="Recommendation" required>
            <Select value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })}>
              {['STRONG_HIRE', 'HIRE', 'MAYBE', 'NO_HIRE'].map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Strengths"><Textarea rows={2} value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} /></FormField>
        <FormField label="Areas to improve"><Textarea rows={2} value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })} /></FormField>
        <FormField label="Additional comments"><Textarea rows={2} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} /></FormField>
        {interview.status === 'SCHEDULED' && (
          <Alert variant="info">Tip: mark the interview as completed from the Interviews page after it happens.</Alert>
        )}
      </div>
    </Dialog>
  );
}
