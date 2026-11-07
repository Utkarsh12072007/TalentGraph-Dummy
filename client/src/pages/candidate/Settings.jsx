import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input, FormField } from '../../components/ui/form';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/toast';

export default function Settings() {
  const navigate = useNavigate();
  const { user, refresh, logout } = useAuth();
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
      setPwdError({ newPassword: 'New password must be at least 8 characters.' });
      return;
    }
    setPwdBusy(true);
    try {
      await api.post('/api/users/me/password', pwd);
      setPwd({ currentPassword: '', newPassword: '' });
      toast.success('Password changed. Other sessions were signed out.');
      await refresh();
    } catch (err) {
      // Wrong current password vs weak new password — point at the right field.
      const detail = err.details?.[0]?.message || err.message;
      const isCurrent = /current|incorrect|wrong/i.test(detail);
      setPwdError(isCurrent ? { currentPassword: detail } : { newPassword: detail });
    } finally {
      setPwdBusy(false);
    }
  };

  const signOutEverywhere = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page-container max-w-2xl py-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Account name, password and session controls.</p>

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
          <form onSubmit={changePassword} className="space-y-4">
            <FormField label="Current password" required error={pwdError && typeof pwdError === 'object' ? pwdError.currentPassword : undefined}>
              <Input type="password" autoComplete="current-password" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} required />
            </FormField>
            <FormField label="New password" required hint="At least 8 characters." error={pwdError && typeof pwdError === 'object' ? pwdError.newPassword : undefined}>
              <Input type="password" autoComplete="new-password" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} required minLength={8} />
            </FormField>
            <Button type="submit" disabled={pwdBusy}>{pwdBusy ? 'Updating…' : 'Update password'}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>Sessions are JWT cookies with server-side revocation (tokenVersion).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={signOutEverywhere}>Sign out on this device</Button>
        </CardContent>
      </Card>
    </div>
  );
}
