import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input, FormField } from '../../components/ui/form';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/misc';
import { useToast } from '../../components/ui/toast';

export default function RecruiterSettings() {
  const { user, company, companyRole, refresh, logout } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.fullName || '');
  const [nameBusy, setNameBusy] = useState(false);

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' });
  const [pwdError, setPwdError] = useState(null);
  const [pwdBusy, setPwdBusy] = useState(false);

  const saveName = async (e) => {
    e.preventDefault();
    setNameBusy(true);
    try {
      await api.patch('/api/users/me', { fullName: name.trim() });
      await refresh();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setNameBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwdError(null);
    if (pwd.newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters.');
      return;
    }
    setPwdBusy(true);
    try {
      await api.post('/api/users/me/password', pwd);
      setPwd({ currentPassword: '', newPassword: '' });
      toast.success('Password changed. Other sessions were signed out.');
      await refresh();
    } catch (err) {
      setPwdError(err.details?.[0]?.message || err.message);
    } finally {
      setPwdBusy(false);
    }
  };

  return (
    <div className="page-container max-w-2xl py-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Account name, password and session controls.</p>

      {company && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Company</CardTitle>
            <CardDescription>Your workspace membership</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{company.name}</p>
            <p className="text-sm text-muted-foreground">
              You are {companyRole ? companyRole.toLowerCase() : 'a member'} · manage company details under Company
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed in as {user?.email} ({user?.role})</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="space-y-4">
            <FormField label="Full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </FormField>
            <Button type="submit" disabled={nameBusy || name.trim() === user?.fullName}>
              {nameBusy ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Changing your password signs out all other devices.</CardDescription>
        </CardHeader>
        <CardContent>
          {pwdError && <Alert variant="danger" className="mb-4">{pwdError}</Alert>}
          <form onSubmit={changePassword} className="space-y-4">
            <FormField label="Current password" required>
              <Input type="password" autoComplete="current-password" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} required />
            </FormField>
            <FormField label="New password" required hint="At least 8 characters.">
              <Input type="password" autoComplete="new-password" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} required minLength={8} />
            </FormField>
            <Button type="submit" disabled={pwdBusy}>{pwdBusy ? 'Updating…' : 'Update password'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>Sessions are JWT cookies with server-side revocation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={async () => { await logout(); window.location.href = '/'; }}>
            Sign out on this device
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
