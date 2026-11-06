import { CalendarClock, Video, Phone, MapPin } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { PageLoader, EmptyState } from '../../components/ui/misc';
import { formatDateTime } from '../../lib/utils';

const TYPE_ICONS = { VIDEO: Video, PHONE: Phone, ON_SITE: MapPin };

export default function CandidateInterviews() {
  const { data, loading } = useFetch('/api/interviews/mine');
  const interviews = data?.interviews || [];
  const now = Date.now();
  const upcoming = interviews.filter((i) => i.status === 'SCHEDULED' && new Date(i.scheduledAt) >= now);
  const past = interviews.filter((i) => i.status !== 'SCHEDULED' || new Date(i.scheduledAt) < now);

  if (loading) return <div className="page-container py-10"><PageLoader /></div>;

  return (
    <div className="page-container max-w-3xl py-8">
      <h1 className="text-2xl font-bold tracking-tight">Interviews</h1>
      <p className="mt-1 text-sm text-muted-foreground">Interview sessions scheduled for your applications.</p>

      {interviews.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={CalendarClock}
          title="No interviews yet"
          description="When a recruiter schedules an interview for one of your applications, all details appear here."
        />
      ) : (
        <>
          <InterviewList title="Upcoming" items={upcoming} highlight />
          <InterviewList title="Past & cancelled" items={past} className="mt-8" />
        </>
      )}
    </div>
  );
}

function InterviewList({ title, items, highlight, className }) {
  return (
    <section className={className}>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((i) => {
            const Icon = TYPE_ICONS[i.type] || CalendarClock;
            return (
              <li key={i.id}>
                <Card className={highlight ? 'border-primary/30' : ''}>
                  <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{i.application?.job?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {i.application?.job?.company?.name} · Round {i.round} · {i.type.replace('_', ' ')}
                        </p>
                        <p className="mt-1 text-sm">{formatDateTime(i.scheduledAt)} ({i.durationMinutes} min)</p>
                        {i.locationOrLink && (
                          i.locationOrLink.startsWith('http') ? (
                            <a href={i.locationOrLink} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-primary hover:underline">
                              Open meeting link
                            </a>
                          ) : (
                            <p className="mt-1 text-sm text-muted-foreground">{i.locationOrLink}</p>
                          )
                        )}
                      </div>
                    </div>
                    <Badge variant={i.status === 'SCHEDULED' ? 'info' : i.status === 'COMPLETED' ? 'success' : 'neutral'}>{i.status}</Badge>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
