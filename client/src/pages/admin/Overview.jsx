import { Users, Building2, Briefcase, FileText } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { StatCard, StatGrid } from '../../components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { PageLoader } from '../../components/ui/misc';

export default function AdminOverview() {
  const { data, loading } = useFetch('/api/admin/overview');
  if (loading || !data) return <div className="page-container py-10"><PageLoader /></div>;

  const t = data.totals;

  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-bold tracking-tight">Platform overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">Live statistics from the TalentGraph database.</p>

      <StatGrid className="mt-6" cols={4}>
        <StatCard label="Registered users" value={t.totalUsers} icon={Users} hint={`${t.totalCandidates} candidates · ${t.totalRecruiters} recruiters`} to="/admin/users" />
        <StatCard label="Companies" value={t.totalCompanies} icon={Building2} hint={`${t.activeCompanies} active`} to="/admin/companies" />
        <StatCard label="Jobs" value={t.totalJobs} icon={Briefcase} hint={`${t.publishedJobs} published`} />
        <StatCard label="Applications" value={t.totalApplications} icon={FileText} />
      </StatGrid>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent registrations</CardTitle>
            <CardDescription>Latest accounts created on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {data.recentUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{u.role.replace('_', ' ')}</Badge>
                    <Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'}>{u.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent platform activity</CardTitle>
            <CardDescription>Newest audit log entries</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {data.recentAudit.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.actorName} · {a.entityType}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
              {data.recentAudit.length === 0 && <p className="py-4 text-sm text-muted-foreground">No activity recorded yet.</p>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
