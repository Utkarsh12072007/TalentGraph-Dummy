import { MapPin, Briefcase, Clock } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { CompanyLogo } from '../ui/misc';
import { WORK_MODE_LABELS, EMPLOYMENT_LABELS, formatSalary, timeAgo, EXPERIENCE_LABELS } from '../../lib/utils';

// Job card used by public discovery AND candidate "recently discovered".
export function JobCard({ job, to, action }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const Wrapper = to ? 'a' : 'div';

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <CompanyLogo name={job.company?.name} src={job.company?.logoUrl} />
          <div className="min-w-0 flex-1">
            <Wrapper href={to} className="block">
              <h3 className="truncate font-semibold hover:text-primary hover:underline">{job.title}</h3>
            </Wrapper>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {job.company?.name}
              {job.location ? ` · ${job.location}` : ''}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{WORK_MODE_LABELS[job.workMode]}</Badge>
              <Badge variant="outline">{EMPLOYMENT_LABELS[job.employmentType]}</Badge>
              {(job.experienceMin > 0 || job.experienceMax) && (
                <Badge variant="outline" className="text-muted-foreground">
                  {job.experienceMax ? `${job.experienceMin}–${job.experienceMax} yrs` : `${job.experienceMin}+ yrs`}
                </Badge>
              )}
              {salary && <Badge variant="secondary">{salary}</Badge>}
            </div>
          </div>
          {action}
        </div>
        {job.skills?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
            {job.skills.slice(0, 6).map((s) => (
              <span key={s.name} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {s.name}
              </span>
            ))}
          </div>
        )}
        <p className="mt-2.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {job.publishedAt ? `Published ${timeAgo(job.publishedAt)}` : `Created ${timeAgo(job.createdAt)}`}
          {job.deadline && <span className="ml-2">· Apply by {new Date(job.deadline).toLocaleDateString()}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

export function ExperienceLabel({ level }) {
  return EXPERIENCE_LABELS[level] || level;
}

export function JobMetaIcons({ job }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
      <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{EMPLOYMENT_LABELS[job.employmentType]}</span>
    </div>
  );
}
