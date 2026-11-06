import { useState } from 'react';
import { Search, ShieldBan, ShieldCheck } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { api } from '../../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ConfirmDialog } from '../../components/ui/dialog';
import { PageLoader, EmptyState } from '../../components/ui/misc';
import { Pagination } from '../../components/common/Pagination';
import { useToast } from '../../components/ui/toast';
import { formatDate } from '../../lib/utils';

export default function AdminCompanies() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);

  const url = `/api/admin/companies?page=${page}&limit=10${q ? `&q=${encodeURIComponent(q)}` : ''}`;
  const { data, loading, refetch } = useFetch(url);
  const companies = data?.companies || [];

  const applyStatus = async () => {
    try {
      await api.post(`/api/admin/companies/${target.company.id}/${target.action}`);
      toast.success(target.action === 'suspend' ? 'Company suspended — its members lose workspace access' : 'Company reactivated');
      setTarget(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
      setTarget(null);
    }
  };

  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
      <p className="mt-1 text-sm text-muted-foreground">Registered company workspaces.</p>

      <div className="relative mt-5 max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-2 pl-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Search company name…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? <div className="py-10"><PageLoader /></div> : (
        <Card className="mt-6 overflow-x-auto">
          <CardContent className="p-0">
            {companies.length === 0 ? (
              <EmptyState className="border-0" title="No companies match" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">Industry</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">Members</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">Jobs</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Created</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-accent/40">
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.location || '—'}</p>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{c.industry || '—'}</td>
                      <td className="hidden px-4 py-3 sm:table-cell">{c.members}</td>
                      <td className="hidden px-4 py-3 sm:table-cell">{c.jobs}</td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground lg:table-cell">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3"><Badge variant={c.status === 'ACTIVE' ? 'success' : 'danger'}>{c.status}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        {c.status === 'ACTIVE' ? (
                          <Button size="sm" variant="ghost" onClick={() => setTarget({ company: c, action: 'suspend' })}>
                            <ShieldBan className="text-destructive" /> Suspend
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setTarget({ company: c, action: 'reactivate' })}>
                            <ShieldCheck /> Reactivate
                          </Button>
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
        title={target?.action === 'suspend' ? `Suspend ${target?.company.name}?` : `Reactivate ${target?.company.name}?`}
        message={target?.action === 'suspend'
          ? 'All members of this company lose access to its workspace until it is reactivated.'
          : 'Members of this company regain workspace access.'}
        confirmLabel={target?.action === 'suspend' ? 'Suspend' : 'Reactivate'}
        destructive={target?.action === 'suspend'}
      />
    </div>
  );
}
