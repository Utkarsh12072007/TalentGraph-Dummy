import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, UserRound } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input, Textarea, Select, FormField } from '../../components/ui/form';
import { Dialog, ConfirmDialog } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Tabs } from '../../components/ui/tabs';
import { PageLoader, EmptyState } from '../../components/ui/misc';
import { useToast } from '../../components/ui/toast';
import { EMPLOYMENT_LABELS, formatDate } from '../../lib/utils';

// toISO(date or '') -> 'YYYY-MM-DD' for <input type="date">
const iso = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');

export default function CandidateProfile() {
  const toast = useToast();
  const { data, loading, refetch } = useFetch('/api/candidates/me/profile');
  const profile = data?.profile;
  const [tab, setTab] = useState('basic');

  // dialog state: { mode: 'add'|'edit', section, item, busy }
  const [editor, setEditor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  if (loading) return <div className="page-container py-10"><PageLoader /></div>;

  const refresh = () => refetch();

  const save = async (section, payload, id) => {
    try {
      setEditor((e) => ({ ...e, busy: true, error: null }));
      if (section === 'basic') {
        await api.patch('/api/candidates/me/profile', payload);
      } else if (id) {
        await api.patch(`/api/candidates/me/profile/${section}/${id}`, payload);
      } else {
        await api.post(`/api/candidates/me/profile/${section}`, payload);
      }
      toast.success(id ? 'Updated' : 'Added');
      setEditor(null);
      refresh();
    } catch (err) {
      // Keep the dialog open with every value intact and surface the reason.
      setEditor((e) => ({ ...e, busy: false, error: err.details?.[0]?.message || err.message }));
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/api/candidates/me/profile/${deleteTarget.section}/${deleteTarget.item.id}`);
      toast.success('Removed');
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page-container py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everything recruiters see when you apply for a job.</p>
        </div>
      </div>

      <Tabs
        className="mt-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'basic', label: 'Basic information' },
          { value: 'education', label: 'Education', count: profile.educations.length },
          { value: 'experience', label: 'Experience', count: profile.experiences.length },
          { value: 'skills', label: 'Skills', count: profile.skills.length },
          { value: 'projects', label: 'Projects', count: profile.projects.length },
          { value: 'certifications', label: 'Certifications', count: profile.certifications.length },
        ]}
      />

      <div className="mt-6 max-w-3xl">
        {tab === 'basic' && <BasicCard profile={profile} onEdit={() => setEditor({ section: 'basic', mode: 'edit', item: profile })} />}
        {tab === 'education' && (
          <SectionList
            title="Education"
            addLabel="Add education"
            items={profile.educations}
            emptyText="Add where you studied — degrees, fields and grades."
            onAdd={() => setEditor({ section: 'educations', mode: 'add' })}
            onEdit={(item) => setEditor({ section: 'educations', mode: 'edit', item })}
            onDelete={(item) => setDeleteTarget({ section: 'educations', item })}
            render={(e) => (
              <>
                <p className="font-medium">{e.degree}{e.field ? `, ${e.field}` : ''}</p>
                <p className="text-sm text-muted-foreground">{e.institution}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(e.startDate)} – {e.endDate ? formatDate(e.endDate) : 'Present'}
                  {e.grade ? ` · ${e.grade}` : ''}
                </p>
                {e.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{e.description}</p>}
              </>
            )}
          />
        )}
        {tab === 'experience' && (
          <SectionList
            title="Work experience"
            addLabel="Add experience"
            items={profile.experiences}
            emptyText="Internships, part-time work, freelance — everything counts."
            onAdd={() => setEditor({ section: 'experiences', mode: 'add' })}
            onEdit={(item) => setEditor({ section: 'experiences', mode: 'edit', item })}
            onDelete={(item) => setDeleteTarget({ section: 'experiences', item })}
            render={(x) => (
              <>
                <p className="font-medium">{x.title}</p>
                <p className="text-sm text-muted-foreground">{x.company}{x.employmentType ? ` · ${EMPLOYMENT_LABELS[x.employmentType]}` : ''}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(x.startDate)} – {x.endDate ? formatDate(x.endDate) : 'Present'}
                </p>
                {x.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{x.description}</p>}
              </>
            )}
          />
        )}
        {tab === 'skills' && (
          <SectionList
            title="Skills"
            addLabel="Add skill"
            items={profile.skills}
            emptyText="List your strongest technical and soft skills."
            onAdd={() => setEditor({ section: 'skills', mode: 'add' })}
            onDelete={(s) => setDeleteTarget({ section: 'skills', item: s })}
            render={(s) => (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{s.skill.name}</p>
                  {s.level && <p className="text-xs text-muted-foreground">{s.level.toLowerCase()}</p>}
                </div>
              </div>
            )}
          />
        )}
        {tab === 'projects' && (
          <SectionList
            title="Projects"
            addLabel="Add project"
            items={profile.projects}
            emptyText="Show personal, academic or open-source projects."
            onAdd={() => setEditor({ section: 'projects', mode: 'add' })}
            onEdit={(item) => setEditor({ section: 'projects', mode: 'edit', item })}
            onDelete={(item) => setDeleteTarget({ section: 'projects', item })}
            render={(p) => (
              <>
                <p className="font-medium">{p.name}</p>
                {p.techStack && <p className="text-xs text-muted-foreground">{p.techStack}</p>}
                {p.description && <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>}
                {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-primary hover:underline">{p.link}</a>}
              </>
            )}
          />
        )}
        {tab === 'certifications' && (
          <SectionList
            title="Certifications"
            addLabel="Add certification"
            items={profile.certifications}
            emptyText="Add courses, licenses and certifications."
            onAdd={() => setEditor({ section: 'certifications', mode: 'add' })}
            onEdit={(item) => setEditor({ section: 'certifications', mode: 'edit', item })}
            onDelete={(item) => setDeleteTarget({ section: 'certifications', item })}
            render={(c) => (
              <>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground">{c.issuer} · {formatDate(c.issueDate)}{c.expiryDate ? ` – ${formatDate(c.expiryDate)}` : ''}</p>
                {c.link && <a href={c.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-primary hover:underline">View credential</a>}
              </>
            )}
          />
        )}
      </div>

      {/* ---------- add / edit dialog ---------- */}
      <EditorDialog editor={editor} onClose={() => setEditor(null)} onSave={save} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="Remove this record?"
        message="This information will be permanently deleted from your profile."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

/* ---------------- basic info ---------------- */
function BasicCard({ profile, onEdit }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Basic information</CardTitle>
          <CardDescription>Headline, summary, location and years of experience.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit}><Pencil /> Edit</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary"><UserRound className="h-6 w-6 text-primary" /></span>
          <div>
            <p className="font-semibold">{profile.headline || <span className="text-muted-foreground">No headline yet</span>}</p>
            <p className="text-sm text-muted-foreground">{profile.location || 'Add your location'}{profile.yearsExperience !== null && profile.yearsExperience !== undefined ? ` · ${profile.yearsExperience} yrs experience` : ''}</p>
          </div>
        </div>
        <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {profile.summary || 'Add a short professional summary so recruiters immediately understand your strengths.'}
        </p>
      </CardContent>
    </Card>
  );
}

function BasicForm({ profile, onSave }) {
  const [form, setForm] = useState({
    headline: profile.headline || '',
    summary: profile.summary || '',
    location: profile.location || '',
    phone: profile.phone || '',
    yearsExperience: profile.yearsExperience ?? '',
  });
  return (
    <div className="space-y-4">
      <FormField label="Professional headline" hint="One line under your name, e.g. “Full-stack developer (React / Node.js)”">
        <Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} maxLength={120} />
      </FormField>
      <FormField label="Summary">
        <Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} maxLength={4000} rows={5} placeholder="A short paragraph about your experience and what you're looking for." />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Location">
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City, Country" />
        </FormField>
        <FormField label="Years of experience">
          <Input type="number" min="0" max="50" value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })} />
        </FormField>
      </div>
      <FormField label="Phone (optional)">
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </FormField>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent('close-editor'))}>Cancel</Button>
        <Button onClick={() => onSave({
          headline: form.headline.trim() || null,
          summary: form.summary.trim() || null,
          location: form.location.trim() || null,
          phone: form.phone.trim() || null,
          yearsExperience: form.yearsExperience === '' ? null : Number(form.yearsExperience),
        })}>Save</Button>
      </div>
    </div>
  );
}

/* ---------------- generic section list ---------------- */
function SectionList({ title, items, render, onAdd, onEdit, onDelete, addLabel, emptyText, editable = true }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        <Button size="sm" onClick={onAdd}><Plus /> {addLabel}</Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={UserRound} title={`No ${title.toLowerCase()} yet`} description={emptyText} className="border-0 py-8" />
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="group flex items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">{render(item)}</div>
                <div className="flex shrink-0 gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                  {editable && onEdit && (
                    <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => onEdit(item)}><Pencil /></Button>
                  )}
                  <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => onDelete(item)}><Trash2 className="text-destructive" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- editor dialog (per section) ---------------- */
function EditorDialog({ editor, onClose, onSave }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);

  // Depend on the pieces that identify an editing session (section/mode/item)
  // — NOT the whole editor object. The parent toggles busy/error on the same
  // object after a failed save; re-running this effect then would wipe every
  // value the user typed. This way the form survives failed saves.
  const section = editor?.section;
  const mode = editor?.mode;
  const item = editor?.item;

  useEffect(() => {
    if (!section) return;
    setError(null);
    const i = item || {};
    setForm({
      institution: i.institution || '', degree: i.degree || '', field: i.field || '',
      startDate: iso(i.startDate), endDate: iso(i.endDate), grade: i.grade || '', description: i.description || '',
      company: i.company || '', title: i.title || '', employmentType: i.employmentType || '',
      location: i.location || '', experienceDescription: i.description || '',
      name: i.name || i.skill?.name || '', level: i.level || '', techStack: i.techStack || '',
      link: i.link || '', issuer: i.issuer || '', issueDate: iso(i.issueDate), expiryDate: iso(i.expiryDate), credentialId: i.credentialId || '',
      headline: i.headline || '', summary: i.summary || '', phone: i.phone || '',
      yearsExperience: i.yearsExperience ?? '',
    });
    const handler = () => onClose();
    window.addEventListener('close-editor', handler);
    return () => window.removeEventListener('close-editor', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, mode, item]);

  if (!editor) return null;
  const f = (k) => ({ value: form[k] ?? '', onChange: (e) => setForm((cur) => ({ ...cur, [k]: e.target.value })) });

  const submit = () => {
    let payload = {};
    let id = editor.mode === 'edit' ? editor.item?.id : null;
    switch (editor.section) {
      case 'basic':
        return onSave('basic', {
          headline: form.headline.trim() || null,
          summary: form.summary.trim() || null,
          location: form.location.trim() || null,
          phone: form.phone.trim() || null,
          yearsExperience: form.yearsExperience === '' ? null : Number(form.yearsExperience),
        });
      case 'educations':
        payload = { institution: form.institution, degree: form.degree, field: form.field || null, startDate: form.startDate, endDate: form.endDate || null, grade: form.grade || null, description: form.description || null };
        if (!form.institution || !form.degree || !form.startDate) return setError('Institution, degree and start date are required.');
        break;
      case 'experiences':
        payload = { company: form.company, title: form.title, employmentType: form.employmentType || null, location: form.location || null, startDate: form.startDate, endDate: form.endDate || null, description: form.experienceDescription || null };
        if (!form.company || !form.title || !form.startDate) return setError('Company, title and start date are required.');
        break;
      case 'skills':
        payload = { name: form.name, level: form.level || null };
        if (!form.name.trim()) return setError('Skill name is required.');
        break;
      case 'projects':
        payload = { name: form.name, description: form.description || null, link: form.link || null, techStack: form.techStack || null, startDate: form.startDate || null, endDate: form.endDate || null };
        if (!form.name.trim()) return setError('Project name is required.');
        break;
      case 'certifications':
        payload = { name: form.name, issuer: form.issuer, issueDate: form.issueDate, expiryDate: form.expiryDate || null, credentialId: form.credentialId || null, link: form.link || null };
        if (!form.name.trim() || !form.issuer.trim() || !form.issueDate) return setError('Name, issuer and issue date are required.');
        break;
      default:
        return;
    }
    onSave(editor.section, payload, id);
  };

  const sectionTitles = {
    basic: 'Basic information', educations: 'Education', experiences: 'Work experience',
    skills: 'Skill', projects: 'Project', certifications: 'Certification',
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`${editor.mode === 'edit' ? 'Edit' : 'Add'} ${sectionTitles[editor.section]}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={editor.busy}>Cancel</Button>
          <Button onClick={submit} disabled={editor.busy}>{editor.busy ? 'Saving…' : 'Save'}</Button>
        </>
      }
    >
      {(error || editor.error) && (
        <p role="alert" className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-800">{error || editor.error}</p>
      )}
      <div className="space-y-4">
        {editor.section === 'basic' && (
          <>
            <FormField label="Professional headline"><Input {...f('headline')} maxLength={120} placeholder="e.g. Full-stack developer (React / Node.js)" /></FormField>
            <FormField label="Summary"><Textarea {...f('summary')} rows={5} /></FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Location"><Input {...f('location')} placeholder="City, Country" /></FormField>
              <FormField label="Years of experience"><Input type="number" min="0" max="50" {...f('yearsExperience')} /></FormField>
            </div>
            <FormField label="Phone"><Input {...f('phone')} /></FormField>
          </>
        )}
        {editor.section === 'educations' && (
          <>
            <FormField label="Institution" required><Input {...f('institution')} /></FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Degree" required><Input {...f('degree')} placeholder="B.Tech, B.Sc…" /></FormField>
              <FormField label="Field of study"><Input {...f('field')} placeholder="Computer Science" /></FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Start date" required><Input type="date" {...f('startDate')} /></FormField>
              <FormField label="End date (or expected)"><Input type="date" {...f('endDate')} /></FormField>
            </div>
            <FormField label="Grade / GPA"><Input {...f('grade')} /></FormField>
            <FormField label="Description"><Textarea {...f('description')} /></FormField>
          </>
        )}
        {editor.section === 'experiences' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Company" required><Input {...f('company')} /></FormField>
              <FormField label="Job title" required><Input {...f('title')} /></FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Employment type">
                <Select {...f('employmentType')}>
                  <option value="">Select…</option>
                  {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </FormField>
              <FormField label="Location"><Input {...f('location')} /></FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Start date" required><Input type="date" {...f('startDate')} /></FormField>
              <FormField label="End date" hint="Leave empty if this is your current role."><Input type="date" {...f('endDate')} /></FormField>
            </div>
            <FormField label="What did you do?"><Textarea {...f('experienceDescription')} /></FormField>
          </>
        )}
        {editor.section === 'skills' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Skill" required><Input {...f('name')} placeholder="e.g. React, SQL, Communication" /></FormField>
            <FormField label="Level">
              <Select {...f('level')}>
                <option value="">Unspecified</option>
                {['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].map((l) => <option key={l} value={l}>{l[0] + l.slice(1).toLowerCase()}</option>)}
              </Select>
            </FormField>
          </div>
        )}
        {editor.section === 'projects' && (
          <>
            <FormField label="Project name" required><Input {...f('name')} /></FormField>
            <FormField label="Tech stack"><Input {...f('techStack')} placeholder="React, Node.js, PostgreSQL" /></FormField>
            <FormField label="Description"><Textarea {...f('description')} /></FormField>
            <FormField label="Link"><Input type="url" {...f('link')} placeholder="https://github.com/…" /></FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Start date"><Input type="date" {...f('startDate')} /></FormField>
              <FormField label="End date"><Input type="date" {...f('endDate')} /></FormField>
            </div>
          </>
        )}
        {editor.section === 'certifications' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Name" required><Input {...f('name')} /></FormField>
              <FormField label="Issuer" required><Input {...f('issuer')} /></FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Issue date" required><Input type="date" {...f('issueDate')} /></FormField>
              <FormField label="Expiry date"><Input type="date" {...f('expiryDate')} /></FormField>
            </div>
            <FormField label="Credential ID"><Input {...f('credentialId')} /></FormField>
            <FormField label="Link"><Input type="url" {...f('link')} /></FormField>
          </>
        )}
      </div>
    </Dialog>
  );
}
