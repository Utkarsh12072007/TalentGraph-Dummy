import { useState } from 'react';
import { useFetch } from '../../lib/hooks';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input, Select } from '../../components/ui/form';
import { PageLoader, EmptyState } from '../../components/ui/misc';
import { Pagination } from '../../components/common/Pagination';
import { formatDateTime } from '../../lib/utils';

const ENTITY_TYPES = ['', 'User', 'Company', 'CompanyMember', 'Job', 'Application', 'Interview', 'InterviewFeedback', 'System'];

export default function AdminAuditLogs() {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);

  const url = `/api/admin/audit-logs?page=${page}&limit=15${action ? `&action=${encodeURIComponent(action)}` : ''}${entityType ? `&entityType=${entityType}` : ''}`;
  const { data, loading } = useFetch(url);
  const logs = data?.logs || [];

  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-bold tracking-tight">Activity & audit log</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Security-relevant actions are recorded with actor, entity and metadata.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Input placeholder="Filter by action (e.g. SUSPEND, PUBLISH)" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
        <Select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} aria-label="Filter by entity type">
          {ENTITY_TYPES.map((t) => <option key={t || 'all'} value={t}>{t || 'All entity types'}</option>)}
        </Select>
      </div>

      {loading ? <div className="py-10"><PageLoader /></div> : (
        logs.length === 0 ? (
          <EmptyState className="mt-6" title="No audit entries match" description="Try clearing the filters." />
        ) : (
          <Card className="mt-6 overflow-x-auto">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Entity</th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">Details</th>
                    <th className="px-4 py-3 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b last:border-0 hover:bg-accent/40">
                      <td className="px-4 py-3"><Badge variant="outline">{l.action}</Badge></td>
                      <td className="px-4 py-3">{l.actorName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.entityType}</td>
                      <td className="hidden max-w-72 truncate px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                        {l.metadata ? JSON.stringify(l.metadata) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )
      )}

      <div className="mt-4"><Pagination meta={data?.meta} onPage={setPage} /></div>
    </div>
  );
}
