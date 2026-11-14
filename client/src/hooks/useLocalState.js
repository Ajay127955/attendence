import { useCallback, useEffect, useState } from 'react';

/**
 * Persists UI state to localStorage — used for table page size, filters and
 * the last selected class so the app feels continuous between visits.
 */
export function useLocalState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or unavailable — non critical */
    }
  }, [key, value]);

  const reset = useCallback(() => setValue(initial), [initial]);
  return [value, setValue, reset];
}
