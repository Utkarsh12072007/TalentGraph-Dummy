import { useState } from 'react';
import { ShieldBan, ShieldCheck, Search } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { api } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ConfirmDialog } from '../../components/ui/dialog';
import { PageLoader, EmptyState, Avatar } from '../../components/ui/misc';
import { Pagination } from '../../components/common/Pagination';
import { useToast } from '../../components/ui/toast';
import { formatDate } from '../../lib/utils';

export default function AdminUsers() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null); // { user, action }

  const url = `/api/admin/users?page=${page}&limit=10${q ? `&q=${encodeURIComponent(q)}` : ''}${role ? `&role=${role}` : ''}`;
  const { data, loading, refetch } = useFetch(url);
  const users = data?.users || [];

  const applyStatus = async () => {
    try {
      await api.post(`/api/admin/users/${target.user.id}/${target.action}`);
      toast.success(target.action === 'suspend' ? 'User suspended — active sessions revoked' : 'User reactivated');
      setTarget(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
      setTarget(null);
    }
  };

  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">All registered accounts. Platform admins cannot be suspended.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-12">
        <div className="relative sm:col-span-7">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-2 pl-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Search name or email…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
        <div className="sm:col-span-5">
          <select
            className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            <option value="CANDIDATE">Candidates</option>
            <option value="RECRUITER">Recruiters</option>
            <option value="PLATFORM_ADMIN">Platform admins</option>
          </select>
        </div>
      </div>

      {loading ? <div className="py-10"><PageLoader /></div> : (
        <Card className="mt-6 overflow-x-auto">
          <CardContent className="p-0">
            {users.length === 0 ? (
              <EmptyState className="border-0" title="No users match" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">User</th>
                    <th scope="col" className="px-4 py-3 font-medium">Role</th>
                    <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">Company</th>
                    <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">Joined</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-accent/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.fullName} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{u.fullName}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant="outline">{u.role.replace('_', ' ')}</Badge></td>
                      <td className="hidden px-4 py-3 md:table-cell"><span className="text-muted-foreground">{u.companyName || '—'}</span></td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground sm:table-cell">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3"><Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'}>{u.status}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        {u.role !== 'PLATFORM_ADMIN' && (
                          u.status === 'ACTIVE' ? (
                            <Button size="sm" variant="ghost" onClick={() => setTarget({ user: u, action: 'suspend' })}>
                              <ShieldBan className="text-destructive" /> Suspend
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setTarget({ user: u, action: 'reactivate' })}>
                              <ShieldCheck /> Reactivate
                            </Button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-4"><Pagination meta={data?.meta} onPage={setPage} /></div>

      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        onConfirm={applyStatus}
        title={target?.action === 'suspend' ? `Suspend ${target?.user.fullName}?` : `Reactivate ${target?.user.fullName}?`}
        message={target?.action === 'suspend'
          ? 'The user will be signed out immediately and cannot sign in until reactivated.'
          : 'The user will be able to sign in again.'}
        confirmLabel={target?.action === 'suspend' ? 'Suspend' : 'Reactivate'}
        destructive={target?.action === 'suspend'}
      />
    </div>
  );
}
