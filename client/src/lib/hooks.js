import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

// Small data-fetching hook with loading / error / manual refetch.
// Every page uses this so loading and error states are consistent.
export function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState(null);
  const activeRef = useRef(true);

  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.get(url);
      if (activeRef.current) setData(result);
    } catch (err) {
      if (activeRef.current) setError(err);
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    activeRef.current = true;
    load();
    return () => {
      activeRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  return { data, loading, error, refetch: load, setData };
}

// Simpler mutation helper: run(fn) returns the result, tracks busy state.
export function useMutation() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn) => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, run };
}
