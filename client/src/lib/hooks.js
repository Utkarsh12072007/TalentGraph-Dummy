import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

// Small data-fetching hook with loading / error / manual refetch.
// Every page uses this so loading and error states are consistent.
export function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await api.get(url);
      if (requestId === requestIdRef.current) setData(result);
    } catch (err) {
      if (requestId === requestIdRef.current) setError(err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    // Invalidate the previous request as soon as the URL changes or the
    // component unmounts. Its response must not overwrite newer page data.
    load();
    return () => {
      requestIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      setError(null);
    }
  }, [url]);

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
