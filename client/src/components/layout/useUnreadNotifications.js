import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

// Unread notification count for the bell badge. Polls every 30s while
// signed in (in-app notifications; no websocket needed at this stage).
export default function useUnreadNotifications() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;

    const load = async () => {
      try {
        const data = await api.get('/api/notifications?limit=1');
        if (active) setUnread(data.unreadCount || 0);
      } catch {
        /* ignore polling errors */
      }
    };

    load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user]);

  return unread;
}
