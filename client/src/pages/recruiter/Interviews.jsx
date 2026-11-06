import { useState } from 'react';
import { CalendarPlus, CalendarClock, CheckCircle2, XCircle, MessageSquareText } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select } from '../../components/ui/form';
import { PageLoader, EmptyState, ErrorState } from '../../components/ui/misc';
import { useToast } from '../../components/ui/toast';
import { formatDateTime } from '../../lib/utils';

// Company interview schedule with complete/cancel actions and quick feedback.
export default function RecruiterInterviews() {
  const { user } = useAuth();
  const toast = useToast();
  const [when, setWhen] = useState('upcoming');
  const { data, loading, error, refetch } = useFetch(`/api/interviews/company?when=${when}`);
  const interviews = data?.interviews || [];

  const act = async (interview, action) => {
    try {
      await api.post(`/api/interviews/${interview.id}/${action}`);
      toast.success(action === 'cancel' ? 'Interview cancelled — candidate notified' : 'Interview marked as completed');
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page-container py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">All interviews scheduled by your company.</p>
        </div>
        <Select value={when} onChange={(e) => setWhen(e.target.value)} className="w-40" aria-label="Filter interviews">
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
          <option value="all">All</option>
        </Select>
      </div>

      {loading && <div className="py-10"><PageLoader label="Loading interviews…" /></div>}

      {!loading && error && (
        <div className="py-10">
          <ErrorState title="Could not load interviews" description={error.message} onRetry={refetch} />
        </div>
      )}

      {!loading && !error && interviews.length === 0 && (
        <EmptyState
          className="mt-6"
          icon={CalendarClock}
          title="No interviews here"
          description="Schedule interviews from an application's detail page."
        />
      )}

      {!loading && !error && interviews.length > 0 && (
        <div className="mt-6 space-y-3">
          {interviews.map((i) => (
            <Card key={i.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{i.application?.candidateProfile?.user?.fullName}</p>
                    <Badge variant={i.status === 'SCHEDULED' ? 'info' : i.status === 'COMPLETED' ? 'success' : 'neutral'}>{i.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {i.application?.job?.title} · Round {i.round} · {i.type.replace('_', ' ')}
                  </p>
                  <p className="mt-1 text-sm">{formatDateTime(i.scheduledAt)} ({i.durationMinutes} min)</p>
                  {i.locationOrLink && (
                    i.locationOrLink.startsWith('http')
                      ? <a href={i.locationOrLink} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Meeting link</a>
                      : <p className="text-sm text-muted-foreground">{i.locationOrLink}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Interviewers: {i.interviewers.map((iv) => iv.user.fullName).join(', ') || 'none'}
                  </p>
                  {i.feedbacks?.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Feedback: {i.feedbacks.map((fb) => `${fb.interviewer.fullName} (${fb.rating}/5, ${fb.recommendation.replace('_', ' ')})`).join(' · ')}
                    </p>
                  )}
                </div>
                {i.status === 'SCHEDULED' && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => act(i, 'complete')}><CheckCircle2 /> Complete</Button>
                    <Button size="sm" variant="ghost" onClick={() => act(i, 'cancel')}><XCircle /> Cancel</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
