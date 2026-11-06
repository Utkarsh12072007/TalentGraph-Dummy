import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input, Textarea, Select, FormField } from '../../components/ui/form';
import { Button } from '../../components/ui/button';
import { PageLoader, Alert } from '../../components/ui/misc';
import { useToast } from '../../components/ui/toast';

const SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

// Shown to recruiters who are not part of a company yet: create a workspace
// or wait for an existing company's admin to add them by email.
export default function CompanySetup() {
  const { refresh, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', website: '', industry: '', size: '', location: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setFieldErrors((fe) => (fe[k] ? { ...fe, [k]: undefined } : fe));
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    if (!form.name.trim()) {
      setFieldErrors({ name: 'Company name is required.' });
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/companies', { ...form, website: form.website.trim() || undefined });
      toast.success('Company workspace created');
      await refresh();
      navigate('/recruiter');
    } catch (err) {
      // Values stay in the form; validation issues appear beside their fields.
      if (Array.isArray(err.details) && err.details.length > 0) {
        const mapped = {};
        for (const d of err.details) {
          const key = String(d.path || '').split('.')[0];
          if (key && !mapped[key]) mapped[key] = d.message;
        }
        if (Object.keys(mapped).length > 0) setFieldErrors(mapped);
        else setFormError(err.details[0]?.message || err.message);
      } else {
        setFormError(err.message);
      }
      setBusy(false);
    }
  };

  return (
    <div className="page-container flex min-h-[70vh] max-w-xl items-center py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Create your company workspace</CardTitle>
          <CardDescription>
            You will become the company administrator and can invite teammates afterwards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formError && <Alert variant="danger" className="mb-4">{formError}</Alert>}
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField label="Company name" required error={fieldErrors.name}>
              <Input value={form.name} onChange={set('name')} placeholder="e.g. Acme Robotics" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Website" error={fieldErrors.website}><Input type="url" value={form.website} onChange={set('website')} placeholder="https://…" /></FormField>
              <FormField label="Industry" error={fieldErrors.industry}><Input value={form.industry} onChange={set('industry')} placeholder="e.g. Software" /></FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Company size" error={fieldErrors.size}>
                <Select value={form.size} onChange={set('size')}>
                  <option value="">Select…</option>
                  {SIZES.map((s) => <option key={s} value={s}>{s} people</option>)}
                </Select>
              </FormField>
              <FormField label="Location" error={fieldErrors.location}><Input value={form.location} onChange={set('location')} placeholder="City, Country" /></FormField>
            </div>
            <FormField label="About the company" error={fieldErrors.description}>
              <Textarea value={form.description} onChange={set('description')} placeholder="What does your company do?" />
            </FormField>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Creating…' : 'Create workspace'}
            </Button>
          </form>
          <Alert variant="info" className="mt-4">
            Joining an existing company instead? Its admin can add your account ({user?.email}) from Company → Members.
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
