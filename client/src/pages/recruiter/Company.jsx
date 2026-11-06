import { useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useFetch } from '../../lib/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input, Textarea, Select, FormField } from '../../components/ui/form';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Avatar } from '../../components/ui/misc';
import { Tabs } from '../../components/ui/tabs';
import { Dialog, ConfirmDialog } from '../../components/ui/dialog';
import { PageLoader } from '../../components/ui/misc';
import { useToast } from '../../components/ui/toast';
import { formatDate, COMPANY_ROLE_LABELS } from '../../lib/utils';
import { Trash2, UserPlus } from 'lucide-react';

const SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

// Company management: profile (ADMIN editable) + members (ADMIN only).
export default function RecruiterCompany() {
  const { user, company, companyRole, refresh } = useAuth();
  const toast = useToast();
  const logoInput = useRef(null);
  const [tab, setTab] = useState('profile');

  const { data: membersData, loading: loadingMembers, refetch: refetchMembers } = useFetch(
    company && companyRole === 'ADMIN' ? `/api/companies/${company.id}/members` : null
  );
  const [form, setForm] = useState(null); // lazy init from company
  const [busy, setBusy] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', role: 'RECRUITER' });
  const [addError, setAddError] = useState(null);
  const [roleTarget, setRoleTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  if (!company) {
    return <div className="page-container py-10"><PageLoader /></div>;
  }

  const profile = form || {
    name: company.name || '', website: company.website || '', industry: company.industry || '',
    size: company.size || '', location: company.location || '', description: company.description || '',
  };
  const set = (k) => (e) => {
    setForm((f) => ({ ...(f || profile), [k]: e.target.value }));
    setProfileErrors((fe) => (fe[k] ? { ...fe, [k]: undefined } : fe));
  };

  const saveProfile = async () => {
    setBusy(true);
    setProfileErrors({});
    try {
      await api.patch(`/api/companies/${company.id}`, {
        name: profile.name.trim(),
        website: profile.website.trim() || '',
        industry: profile.industry.trim() || '',
        size: profile.size || undefined,
        location: profile.location.trim() || '',
        description: profile.description.trim() || '',
      });
      await refresh();
      toast.success('Company profile updated');
    } catch (err) {
      if (Array.isArray(err.details) && err.details.length > 0) {
        const mapped = {};
        for (const d of err.details) {
          const key = String(d.path || '').split('.')[0];
          if (key && !mapped[key]) mapped[key] = d.message;
        }
        setProfileErrors(mapped);
      } else {
        toast.error(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('logo', file);
      await api.uploadPatch(`/api/companies/${company.id}`, fd);
      await refresh();
      toast.success('Logo updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      if (logoInput.current) logoInput.current.value = '';
    }
  };

  const isAdmin = companyRole === 'ADMIN';
  const members = membersData?.members || [];

  const addMember = async () => {
    setAddError(null);
    try {
      await api.post(`/api/companies/${company.id}/members`, addForm);
      toast.success(`${addForm.email} added to your company`);
      setAddOpen(false);
      setAddForm({ email: '', role: 'RECRUITER' });
      refetchMembers();
    } catch (err) {
      // e.g. "user not found / already in a company" — show it beside the email.
      setAddError(err.details?.[0]?.message || err.message);
    }
  };

  const changeRole = async () => {
    try {
      await api.patch(`/api/companies/${company.id}/members/${roleTarget.id}`, { role: roleTarget.role });
      toast.success('Role updated');
      setRoleTarget(null);
      refetchMembers();
    } catch (err) {
      toast.error(err.message);
      setRoleTarget(null);
    }
  };

  const removeMember = async () => {
    try {
      await api.delete(`/api/companies/${company.id}/members/${removeTarget.id}`);
      toast.success('Member removed');
      setRemoveTarget(null);
      refetchMembers();
    } catch (err) {
      toast.error(err.message);
      setRemoveTarget(null);
    }
  };

  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Company workspace · your role: {COMPANY_ROLE_LABELS[companyRole]}
      </p>

      <Tabs
        className="mt-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'profile', label: 'Company profile' },
          { value: 'members', label: 'Members', count: isAdmin ? undefined : undefined },
        ]}
      />

      {tab === 'profile' && (
        <Card className="mt-6 max-w-2xl">
          <CardHeader>
            <CardTitle>Company profile</CardTitle>
            <CardDescription>{isAdmin ? 'Shown on your public job postings.' : 'Only company admins can edit the profile.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-card text-lg font-bold text-primary">
                {company.logoUrl ? <img src={company.logoUrl} alt="Company logo" className="h-full w-full object-cover" /> : company.name.slice(0, 2).toUpperCase()}
              </span>
              {isAdmin && (
                <div>
                  <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => uploadLogo(e.target.files?.[0])} />
                  <Button variant="outline" size="sm" onClick={() => logoInput.current?.click()}>Upload logo</Button>
                  <p className="mt-1 text-xs text-muted-foreground">PNG, JPG or WebP · max 2 MB</p>
                </div>
              )}
            </div>
            <FormField label="Company name" required error={profileErrors.name}><Input value={profile.name} onChange={set('name')} disabled={!isAdmin} /></FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Website" error={profileErrors.website}><Input type="url" value={profile.website} onChange={set('website')} disabled={!isAdmin} placeholder="https://…" /></FormField>
              <FormField label="Industry" error={profileErrors.industry}><Input value={profile.industry} onChange={set('industry')} disabled={!isAdmin} /></FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Company size" error={profileErrors.size}>
                <Select value={profile.size} onChange={set('size')} disabled={!isAdmin}>
                  <option value="">Select…</option>
                  {SIZES.map((s) => <option key={s} value={s}>{s} people</option>)}
                </Select>
              </FormField>
              <FormField label="Location" error={profileErrors.location}><Input value={profile.location} onChange={set('location')} disabled={!isAdmin} /></FormField>
            </div>
            <FormField label="About the company" error={profileErrors.description}><Textarea value={profile.description} onChange={set('description')} disabled={!isAdmin} rows={4} /></FormField>
            {isAdmin && <Button onClick={saveProfile} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>}
          </CardContent>
        </Card>
      )}

      {tab === 'members' && (
        <Card className="mt-6 max-w-3xl">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                {isAdmin
                  ? 'Add registered recruiter accounts by email and assign their roles.'
                  : 'Only company admins can manage members.'}
              </CardDescription>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => setAddOpen(true)}><UserPlus /> Add member</Button>
            )}
          </CardHeader>
          <CardContent>
            {!isAdmin ? (
              <p className="text-sm text-muted-foreground">You need the company Admin role to view members.</p>
            ) : loadingMembers ? (
              <PageLoader />
            ) : (
              <ul className="divide-y">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={m.user.fullName} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{m.user.fullName} {m.user.id === user.id && <span className="text-xs text-muted-foreground">(you)</span>}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.user.email} · joined {formatDate(m.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={m.role === 'ADMIN' ? 'default' : 'secondary'}>{COMPANY_ROLE_LABELS[m.role]}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => setRoleTarget({ ...m })} disabled={m.user.id === user.id}>Change role</Button>
                      <Button variant="ghost" size="icon" aria-label="Remove member" onClick={() => setRemoveTarget(m)} disabled={m.user.id === user.id}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* add member dialog */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a member"
        description="The user must already be registered on TalentGraph as a recruiter and must not belong to another company."
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addMember}>Add member</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Email of registered user" required error={addError}>
            <Input
              type="email"
              value={addForm.email}
              onChange={(e) => {
                setAddForm({ ...addForm, email: e.target.value });
                if (addError) setAddError(null);
              }}
              placeholder="colleague@example.com"
            />
          </FormField>
          <FormField label="Role">
            <Select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}>
              <option value="RECRUITER">Recruiter — manages jobs and applications</option>
              <option value="INTERVIEWER">Interviewer — participates in interviews and feedback</option>
              <option value="ADMIN">Admin — full company management</option>
            </Select>
          </FormField>
        </div>
      </Dialog>

      {/* change role dialog */}
      <Dialog
        open={Boolean(roleTarget)}
        onClose={() => setRoleTarget(null)}
        title={`Change role — ${roleTarget?.user?.fullName}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setRoleTarget(null)}>Cancel</Button>
            <Button onClick={changeRole}>Save role</Button>
          </>
        }
      >
        <FormField label="Role">
          <Select value={roleTarget?.role || 'RECRUITER'} onChange={(e) => setRoleTarget({ ...roleTarget, role: e.target.value })}>
            <option value="RECRUITER">Recruiter</option>
            <option value="INTERVIEWER">Interviewer</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </FormField>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={removeMember}
        title="Remove member?"
        message={`${removeTarget?.user?.fullName} will lose access to your company's jobs, applications and interviews.`}
        confirmLabel="Remove"
        destructive
      />
    </div>
  );
}
