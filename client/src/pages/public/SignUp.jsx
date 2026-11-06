import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input, FormField } from '../../components/ui/form';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/misc';
import { cn } from '../../lib/utils';

export default function SignUp() {
  const { register, homeFor } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [role, setRole] = useState(params.get('role') === 'recruiter' ? 'RECRUITER' : 'CANDIDATE');
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    companyName: '', companyIndustry: '',
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = {
        role,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      };
      if (role === 'RECRUITER' && form.companyName.trim()) {
        payload.companyName = form.companyName.trim();
        payload.companyIndustry = form.companyIndustry.trim() || undefined;
      }
      const user = await register(payload);
      navigate(homeFor(user), { replace: true });
    } catch (err) {
      const firstDetail = err.details?.[0]?.message;
      setError(firstDetail || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-container flex min-h-[70vh] max-w-lg items-center py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>Join as a job seeker or set up your company's hiring workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* role switch */}
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1" role="tablist" aria-label="Account type">
            {[
              { value: 'CANDIDATE', label: "I'm looking for a job" },
              { value: 'RECRUITER', label: "I'm hiring" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={role === option.value}
                onClick={() => setRole(option.value)}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  role === option.value ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField label="Full name" required>
              <Input value={form.fullName} onChange={set('fullName')} required minLength={2} />
            </FormField>
            <FormField label="Email" required>
              <Input type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
            </FormField>
            <FormField label="Password" required hint="At least 8 characters.">
              <Input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={8} />
            </FormField>

            {role === 'RECRUITER' && (
              <>
                <FormField label="Company name" hint="Creates your company workspace — you become its administrator. You can also join an existing company later.">
                  <Input value={form.companyName} onChange={set('companyName')} placeholder="e.g. Acme Robotics" />
                </FormField>
                <FormField label="Industry (optional)">
                  <Input value={form.companyIndustry} onChange={set('companyIndustry')} placeholder="e.g. Software, Healthcare" />
                </FormField>
              </>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Creating account…' : role === 'RECRUITER' ? 'Create company workspace' : 'Create candidate account'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/signin" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
