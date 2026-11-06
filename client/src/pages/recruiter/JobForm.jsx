import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFetch } from '../../lib/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input, Textarea, Select, FormField, Checkbox } from '../../components/ui/form';
import { Button } from '../../components/ui/button';
import { PageLoader, Alert } from '../../components/ui/misc';
import { useToast } from '../../components/ui/toast';

const WORK_MODES = [['ON_SITE', 'On-site'], ['REMOTE', 'Remote'], ['HYBRID', 'Hybrid']];
const EMPLOYMENT_TYPES = [['FULL_TIME', 'Full-time'], ['PART_TIME', 'Part-time'], ['CONTRACT', 'Contract'], ['INTERNSHIP', 'Internship']];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

const EMPTY = {
  title: '', description: '', responsibilities: '', requirements: '',
  location: '', workMode: 'ON_SITE', employmentType: 'FULL_TIME',
  experienceMin: '0', experienceMax: '', salaryMin: '', salaryMax: '', currency: 'INR',
  deadline: '', skills: [],
};

// Create / edit job form. Save as DRAFT or PUBLISH directly (create),
// or update an existing job (edit).
export default function JobForm({ edit = false }) {
  const { jobId } = useParams();
  const { company, companyRole } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [skillDraft, setSkillDraft] = useState('');
  const [skillRequired, setSkillRequired] = useState(true);
  const [loading, setLoading] = useState(edit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Load existing job in edit mode.
  const { data } = useFetch(edit && jobId ? `/api/jobs/${jobId}` : null);
  useEffect(() => {
    const job = data?.job;
    if (!job) return;
    setForm({
      title: job.title, description: job.description || '',
      responsibilities: job.responsibilities || '', requirements: job.requirements || '',
      location: job.location || '', workMode: job.workMode, employmentType: job.employmentType,
      experienceMin: String(job.experienceMin ?? '0'), experienceMax: job.experienceMax ?? '',
      salaryMin: job.salaryMin ?? '', salaryMax: job.salaryMax ?? '', currency: job.currency || 'INR',
      deadline: job.deadline ? new Date(job.deadline).toISOString().slice(0, 10) : '',
      skills: job.skills || [],
    });
    setLoading(false);
  }, [data]);

  if (!company) {
    return <div className="page-container py-10"><Alert variant="warning" title="Create a company workspace first." /></div>;
  }
  if (companyRole === 'INTERVIEWER') {
    return <div className="page-container py-10"><Alert variant="danger" title="Interviewers cannot manage jobs." /></div>;
  }
  if (loading) return <div className="page-container py-10"><PageLoader /></div>;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addSkill = () => {
    const name = skillDraft.trim();
    if (!name) return;
    if (form.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Skill already added');
      return;
    }
    setForm((f) => ({ ...f, skills: [...f.skills, { name, isRequired: skillRequired }] }));
    setSkillDraft('');
  };

  const submit = async (status) => {
    setError(null);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      responsibilities: form.responsibilities.trim() || undefined,
      requirements: form.requirements.trim() || undefined,
      location: form.location.trim() || undefined,
      workMode: form.workMode,
      employmentType: form.employmentType,
      experienceMin: Number(form.experienceMin || 0),
      experienceMax: form.experienceMax === '' ? null : Number(form.experienceMax),
      salaryMin: form.salaryMin === '' ? null : Number(form.salaryMin),
      salaryMax: form.salaryMax === '' ? null : Number(form.salaryMax),
      currency: form.currency,
      deadline: form.deadline ? new Date(`${form.deadline}T23:59:59`).toISOString() : null,
      skills: form.skills,
    };
    if (!payload.title || payload.description.length < 30) {
      setError('Title is required and description must be at least 30 characters.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setBusy(true);
    try {
      if (edit) {
        await api.patch(`/api/jobs/company/${company.id}/${jobId}`, payload);
        toast.success('Job updated');
        navigate(`/recruiter/jobs/${jobId}`);
      } else {
        const result = await api.post(`/api/jobs/company/${company.id}`, { ...payload, status });
        toast.success(status === 'PUBLISHED' ? 'Job published' : 'Draft saved');
        navigate(`/recruiter/jobs/${result.job.id}`);
      }
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
      setBusy(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="page-container max-w-3xl py-8">
      <h1 className="text-2xl font-bold tracking-tight">{edit ? 'Edit job' : 'New job posting'}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Publish immediately or keep it as a draft until it's ready.</p>

      {error && <Alert variant="danger" className="mt-4">{error}</Alert>}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Job details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Job title" required>
            <Input value={form.title} onChange={set('title')} placeholder="e.g. Senior Backend Engineer" maxLength={150} />
          </FormField>
          <FormField label="Description" required hint={`${form.description.length} characters (minimum 30). This is what candidates read first.`}>
            <Textarea value={form.description} onChange={set('description')} rows={6} maxLength={20000} placeholder="Describe the role, the team and why someone should join…" />
          </FormField>
          <FormField label="Responsibilities (one per line)">
            <Textarea value={form.responsibilities} onChange={set('responsibilities')} rows={4} placeholder={'- Build REST APIs\n- Review code'} />
          </FormField>
          <FormField label="Requirements (one per line)">
            <Textarea value={form.requirements} onChange={set('requirements')} rows={4} placeholder={'- 3+ years Node.js\n- Strong SQL'} />
          </FormField>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle>Employment details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Location"><Input value={form.location} onChange={set('location')} placeholder="City, Country or 'Remote'" /></FormField>
            <FormField label="Work mode" required>
              <Select value={form.workMode} onChange={set('workMode')}>
                {WORK_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Employment type" required>
              <Select value={form.employmentType} onChange={set('employmentType')}>
                {EMPLOYMENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </FormField>
            <FormField label="Application deadline" hint="Optional — jobs stop accepting applications after this date.">
              <Input type="date" value={form.deadline} onChange={set('deadline')} min={new Date().toISOString().slice(0, 10)} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Min. experience (years)"><Input type="number" min="0" max="40" value={form.experienceMin} onChange={set('experienceMin')} /></FormField>
            <FormField label="Max. experience"><Input type="number" min="0" max="50" value={form.experienceMax} onChange={set('experienceMax')} placeholder="Optional" /></FormField>
            <FormField label="Currency">
              <Select value={form.currency} onChange={set('currency')}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Salary minimum"><Input type="number" min="0" value={form.salaryMin} onChange={set('salaryMin')} placeholder="Optional" /></FormField>
            <FormField label="Salary maximum"><Input type="number" min="0" value={form.salaryMax} onChange={set('salaryMax')} placeholder="Optional" /></FormField>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Skills</CardTitle>
          <CardDescription>Used in candidate search and shown on the job page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <FormField label="Skill" className="flex-1 min-w-40">
              <Input
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                placeholder="e.g. React"
              />
            </FormField>
            <Checkbox checked={skillRequired} onChange={(e) => setSkillRequired(e.target.checked)} label="Required" className="pb-2" />
            <Button variant="secondary" className="mb-0.5" onClick={addSkill}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.skills.length === 0 && <p className="text-sm text-muted-foreground">No skills added yet.</p>}
            {form.skills.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-sm">
                {s.name}
                <span className="text-xs text-muted-foreground">{s.isRequired ? '· required' : '· optional'}</span>
                <button type="button" aria-label={`Remove ${s.name}`} onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((x) => x.name !== s.name) }))}>
                  <X className="h-3.5 w-3.5 hover:text-destructive" />
                </button>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 mt-6 flex flex-wrap justify-end gap-2 border-t bg-background/95 py-4 backdrop-blur">
        <Button variant="ghost" onClick={() => navigate(-1)} disabled={busy}>Cancel</Button>
        {!edit && <Button variant="outline" onClick={() => submit('DRAFT')} disabled={busy}>{busy ? 'Saving…' : 'Save as draft'}</Button>}
        <Button onClick={() => (edit ? submit() : submit('PUBLISHED'))} disabled={busy}>
          {busy ? 'Saving…' : edit ? 'Save changes' : 'Publish job'}
        </Button>
      </div>
    </div>
  );
}
