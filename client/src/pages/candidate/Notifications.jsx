import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { api } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { PageLoader, EmptyState } from '../../components/ui/misc';
import { useToast } from '../../components/ui/toast';
import { timeAgo } from '../../lib/utils';
import { cn } from '../../lib/utils';

export default function Notifications() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, refetch } = useFetch(`/api/notifications?page=${page}&limit=20`);
  const notifications = data?.notifications || [];

  const open = async (n) => {
    try {
      if (!n.isRead) {
        await api.post('/api/notifications/read', { ids: [n.id] });
        refetch();
      }
      if (n.link) navigate(n.link);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const markAll = async () => {
    try {
      await api.post('/api/notifications/read', { all: true });
      toast.success('All notifications marked as read');
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="page-container py-10"><PageLoader /></div>;

  return (
    <div className="page-container max-w-3xl py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.unreadCount} unread</p>
        </div>
        {data.unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}><CheckCheck /> Mark all read</Button>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="Application updates and interview invitations will appear here." />
        ) : notifications.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => open(n)}
            className={cn(
              'flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50',
              !n.isRead && 'border-primary/30 bg-secondary/40'
            )}
          >
            <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : 'bg-primary')} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{n.title}</p>
              <p className="text-sm text-muted-foreground">{n.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
            </div>
          </button>
        ))}
      </div>

      {data.meta.totalPages > 1 && (
        <div className="mt-4 flex justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
