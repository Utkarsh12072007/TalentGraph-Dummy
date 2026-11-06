import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Clock, CalendarDays, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useFetch, useMutation } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea, Select, FormField } from '../../components/ui/form';
import { Dialog } from '../../components/ui/dialog';
import { CompanyLogo, PageLoader, EmptyState, Alert } from '../../components/ui/misc';
import { useToast } from '../../components/ui/toast';
import { WORK_MODE_LABELS, EMPLOYMENT_LABELS, formatSalary, formatDate } from '../../lib/utils';

// Job details — public page, personalized when signed in.
// The Apply button opens a dialog and calls POST /api/applications.
export default function JobDetail() {
  const { jobId } = useParams();
  const { user, candidateProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { busy, run } = useMutation();

  const [applyOpen, setApplyOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [resumeId, setResumeId] = useState('');

  const { data, loading, error } = useFetch(`/api/jobs/${jobId}`);
  const job = data?.job;

  // Resumes for the apply dialog (only fetched when a candidate opens it).
  const resumesQuery = applyOpen && user?.role === 'CANDIDATE' ? '/api/resumes' : null;
  const { data: resumeData } = useFetch(resumesQuery);
  const resumes = resumeData?.resumes || [];
  const defaultResume = resumes.find((r) => r.isDefault) || resumes[0];

  const isCandidate = user?.role === 'CANDIDATE';
  const canApply = isCandidate && job && job.status === 'PUBLISHED' && !job.expired && !job.hasApplied;

  const apply = async () => {
    try {
      await run(() => api.post('/api/applications', {
        jobId,
        resumeId: resumeId || defaultResume?.id || null,
        coverNote: coverNote.trim() || null,
      }));
      toast.success('Application submitted');
      setApplyOpen(false);
      navigate('/applications');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="page-container py-10"><PageLoader /></div>;
  if (error || !job) {
    return (
      <div className="page-container py-10">
        <EmptyState
          title="Job not available"
          description="This job may have been closed, archived or removed."
          action={<Button variant="outline" asChild={undefined} onClick={() => navigate('/jobs')}>Back to jobs</Button>}
        />
      </div>
    );
  }

  return (
    <div className="page-container max-w-4xl py-8">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All jobs
      </Link>

      <Card className="mt-4">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 gap-4">
              <CompanyLogo name={job.company?.name} src={job.company?.logoUrl} size="lg" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
                <p className="mt-1 text-muted-foreground">{job.company?.name}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{job.location || 'Location unspecified'}</Badge>
                  <Badge variant="outline">{WORK_MODE_LABELS[job.workMode]}</Badge>
                  <Badge variant="outline">{EMPLOYMENT_LABELS[job.employmentType]}</Badge>
                  {formatSalary(job.salaryMin, job.salaryMax, job.currency) && (
                    <Badge variant="secondary">{formatSalary(job.salaryMin, job.salaryMax, job.currency)}</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {isCandidate ? (
                job.hasApplied ? (
                  <Alert variant="success"><CheckCircle2 className="mr-1 inline h-4 w-4" />You already applied</Alert>
                ) : job.expired ? (
                  <Alert variant="warning">Applications closed (deadline passed)</Alert>
                ) : job.status !== 'PUBLISHED' ? (
                  <Alert variant="info">This job is not open for applications</Alert>
                ) : (
                  <Button size="lg" onClick={() => { setResumeId(''); setApplyOpen(true); }}>Apply now</Button>
                )
              ) : (
                <Button size="lg" onClick={() => navigate('/signin', { state: { from: `/jobs/${jobId}` } })}>
                  Sign in to apply
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{job.publishedAt ? `Published ${formatDate(job.publishedAt)}` : 'Not published'}</span>
            {job.deadline && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />Apply by {formatDate(job.deadline)}</span>}
            <span>Experience: {job.experienceMax ? `${job.experienceMin}–${job.experienceMax} years` : `${job.experienceMin}+ years`}</span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>About the role</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{job.description}</p>
            </CardContent>
          </Card>
          {job.responsibilities && (
            <Card>
              <CardHeader><CardTitle>Responsibilities</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{job.responsibilities}</p></CardContent>
            </Card>
          )}
          {job.requirements && (
            <Card>
              <CardHeader><CardTitle>Requirements</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{job.requirements}</p></CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
            <CardContent>
              {job.skills?.length ? (
                <ul className="space-y-2 text-sm">
                  {job.skills.map((s) => (
                    <li key={s.name} className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${s.isRequired ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                      {s.name}
                      <span className="text-xs text-muted-foreground">{s.isRequired ? '· required' : '· nice to have'}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No skills listed</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>About the company</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{job.company?.name}</p>
              {job.company?.industry && <p>{job.company.industry}</p>}
              {job.company?.size && <p>{job.company.size} employees</p>}
              {job.company?.location && <p>{job.company.location}</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* apply dialog */}
      <Dialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title={`Apply for ${job.title}`}
        description={`Your profile and selected resume will be shared with ${job.company?.name}.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setApplyOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={apply} disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Resume" hint={resumes.length === 0 ? 'You have no resume yet — you can still apply, or upload one under Resumes first.' : 'Pick which resume to share. Defaults to your default resume.'}>
            <Select value={resumeId || defaultResume?.id || ''} onChange={(e) => setResumeId(e.target.value)}>
              <option value="">No resume</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.originalName}{r.isDefault ? ' (default)' : ''}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Cover note (optional)">
            <Textarea
              placeholder="Briefly tell the team why you're a great fit…"
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              maxLength={3000}
            />
          </FormField>
          {!candidateProfile?.headline && (
            <Alert variant="warning" title="Profile incomplete">
              Add a headline and summary in My Profile — recruiters filter candidates by them.
            </Alert>
          )}
        </div>
      </Dialog>
    </div>
  );
}
