import { useCallback, useEffect, useRef, useState } from 'react';
import api, { request } from '../lib/api';

/**
 * Minimal data-fetching hook (keeps the app dependency-light).
 * Returns { data, meta, loading, error, reload, setData }.
 *
 *   const { data, loading, error, reload } = useApi('/students', { params }, [deps]);
 */
export function useApi(url, options = {}, deps = []) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!url) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await request(api.get(url, optionsRef.current));
        setData(res.data);
        setMeta(res.meta || null);
        return res.data;
      } catch (err) {
        setError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [url]
  );

  // The caller supplies `deps`; spreading it is intentional for this generic hook,
  // so we opt out of the static dependency check here.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);

  return { data, meta, loading, error, reload: load, setData, setMeta };
}

/** Imperative mutation helper with loading + error state. */
export function useMutation(fn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        return await fn(...args);
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fn]
  );

  return { run, loading, error, reset: () => setError(null) };
}

/** Debounces a value — used by search inputs. */
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
