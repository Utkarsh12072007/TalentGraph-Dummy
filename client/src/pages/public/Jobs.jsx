import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';
import { Input, Select, Label } from '../../components/ui/form';
import { JobCard } from '../../components/common/JobCard';
import { Pagination } from '../../components/common/Pagination';
import { PageLoader, EmptyState } from '../../components/ui/misc';
import { Button } from '../../components/ui/button';
import { WORK_MODE_LABELS, EMPLOYMENT_LABELS, EXPERIENCE_LABELS } from '../../lib/utils';

// Job discovery — used by anonymous visitors (/jobs) and candidates (/discover).
// Every filter is a real backend query parameter (GET /api/jobs).
export default function Jobs() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const [showFilters, setShowFilters] = useState(false);

  const filters = useMemo(() => ({
    q: params.get('q') || '',
    location: params.get('location') || '',
    workMode: params.get('workMode') || '',
    employmentType: params.get('employmentType') || '',
    experience: params.get('experience') || '',
    salaryMin: params.get('salaryMin') || '',
    sort: params.get('sort') || 'recent',
    page: Number(params.get('page') || 1),
  }), [params]);

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) qs.set(k, v);
    });
    qs.set('limit', '10');
    return `/api/jobs?${qs.toString()}`;
  }, [filters]);

  const { data, loading, error } = useFetch(query);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const isCandidate = user?.role === 'CANDIDATE';

  return (
    <div className="page-container py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isCandidate ? 'Discover Jobs' : 'Browse Jobs'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.meta.total} open role${data.meta.total === 1 ? '' : 's'}` : 'Search open roles'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowFilters((v) => !v)}>
          <SlidersHorizontal /> Filters
        </Button>
      </div>

      {/* search + filter bar */}
      <div className={`mt-5 grid gap-3 rounded-lg border bg-card p-4 ${showFilters ? 'grid-cols-1' : 'hidden lg:grid lg:grid-cols-12'}`}>
        <div className="lg:col-span-4">
          <Label htmlFor="job-q">Search</Label>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              id="job-q"
              className="pl-8"
              placeholder="Job title, skill or company"
              value={filters.q}
              onChange={(e) => setFilter('q', e.target.value)}
            />
          </div>
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="job-location">Location</Label>
          <Input id="job-location" placeholder="City or country" value={filters.location} onChange={(e) => setFilter('location', e.target.value)} />
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="job-workmode">Work mode</Label>
          <Select id="job-workmode" value={filters.workMode} onChange={(e) => setFilter('workMode', e.target.value)}>
            <option value="">Any</option>
            {Object.entries(WORK_MODE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="job-type">Employment</Label>
          <Select id="job-type" value={filters.employmentType} onChange={(e) => setFilter('employmentType', e.target.value)}>
            <option value="">Any</option>
            {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="job-exp">Experience</Label>
          <Select id="job-exp" value={filters.experience} onChange={(e) => setFilter('experience', e.target.value)}>
            <option value="">Any</option>
            {Object.entries(EXPERIENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </div>
        <div className="hidden lg:col-span-3 lg:block">
          <Label htmlFor="job-salary">Min. salary</Label>
          <Input id="job-salary" type="number" min="0" placeholder="e.g. 1000000" value={filters.salaryMin} onChange={(e) => setFilter('salaryMin', e.target.value)} />
        </div>
        <div className="hidden lg:col-span-2 lg:block">
          <Label htmlFor="job-sort">Sort by</Label>
          <Select id="job-sort" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
            <option value="recent">Most recent</option>
            <option value="salary_desc">Salary: high to low</option>
            <option value="salary_asc">Salary: low to high</option>
          </Select>
        </div>
      </div>

      {/* results */}
      <div className="mt-6 space-y-3">
        {loading && <PageLoader label="Searching jobs…" />}
        {error && <EmptyState title="Could not load jobs" description={error.message} />}
        {!loading && !error && data?.jobs?.length === 0 && (
          <EmptyState
            icon={SearchIcon}
            title="No jobs match your filters"
            description="Try removing a filter or searching for a broader keyword."
          />
        )}
        {!loading && !error && data?.jobs?.map((job) => (
          <JobCard key={job.id} job={job} to={`/jobs/${job.id}`} />
        ))}
      </div>

      {!loading && data?.meta && (
        <div className="mt-6">
          <Pagination meta={data.meta} onPage={(page) => setFilter('page', String(page))} />
        </div>
      )}
    </div>
  );
}
