import { useFetch } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';
import { StatCard, StatGrid } from '../../components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui/misc';
import { BarChart, HBarList, DonutChart } from '../../components/common/Charts';
import { APPLICATION_STATUS_LABELS } from '../../lib/utils';

const STATUS_COLORS = {
  APPLIED: 'stroke-slate-300', IN_REVIEW: 'stroke-sky-400', SHORTLISTED: 'stroke-violet-400',
  INTERVIEW: 'stroke-amber-400', OFFERED: 'stroke-emerald-500', REJECTED: 'stroke-red-400', WITHDRAWN: 'stroke-slate-400',
};

export default function Analytics() {
  const { company } = useAuth();
  const { data, loading, error, refetch } = useFetch(company ? '/api/analytics/company' : null);
  const a = data?.analytics;

  if (loading) return <div className="page-container py-10"><PageLoader label="Crunching your hiring numbers…" /></div>;
  if (error) {
    return (
      <div className="page-container py-10">
        <ErrorState
          title="Could not load analytics"
          description={error.message}
          onRetry={refetch}
        />
      </div>
    );
  }
  if (!a) {
    return (
      <div className="page-container py-10">
        <EmptyState title="No analytics yet" description="Once applications arrive, your hiring metrics appear here." />
      </div>
    );
  }

  const daily = (a.daily || []).map((d) => ({
    label: new Date(d.day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    count: d.count,
  }));

  return (
    <div className="page-container py-8">
      <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every number below is computed from your company's real records.</p>

      <StatGrid className="mt-6" cols={4}>
        <StatCard label="Total applications" value={a.totals.totalApplications} />
        <StatCard label="In pipeline" value={a.totals.inReview} hint="In review + shortlisted" />
        <StatCard label="Offers" value={a.totals.offered} />
        <StatCard label="Last 30 days" value={a.totals.applicationsLast30} hint="New applications" />
      </StatGrid>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Applications by status</CardTitle>
            <CardDescription>Current pipeline distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              segments={(a.byStatus || []).map((s) => ({
                label: APPLICATION_STATUS_LABELS[s.status] || s.status,
                value: s.count,
                colorClass: STATUS_COLORS[s.status] || 'stroke-slate-300',
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Applications — last 14 days</CardTitle>
            <CardDescription>Daily volume across all jobs</CardDescription>
          </CardHeader>
          <CardContent>
            {daily.length === 0
              ? <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">No applications in this period yet</p>
              : <BarChart data={daily} />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top jobs by applications</CardTitle>
            <CardDescription>Where candidates are applying</CardDescription>
          </CardHeader>
          <CardContent>
            <HBarList data={(a.topJobs || []).map((j) => ({ label: j.title, count: j.count }))} />
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Interviews scheduled to date: {a.totals.interviewsScheduled} · Jobs: {a.totals.activeJobs} active of {a.totals.totalJobs} · Rejected: {a.totals.rejected}
      </p>
    </div>
  );
}
