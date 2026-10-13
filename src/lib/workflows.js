import { useEffect, useRef, useState } from 'react';
import { apiFetch } from './api';

const DONE = ['completed', 'failed', 'cancelled'];

/** Calls the API and returns `data`, throwing the server's message on failure. */
export async function apiJson(path, options) {
  const response = await apiFetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success) {
    throw new Error(body.message || `Request failed (${response.status}).`);
  }
  return body.data;
}

/**
 * Polls a background workflow until it finishes.
 * @param {string|null} path   e.g. `/api/ai/proposal-workflows/<id>`; null = idle
 * @param {(data) => object} select  extracts the run from the response (default: data itself)
 */
export function usePolling(path, { intervalMs = 1500, isDone = (data) => DONE.includes(data?.status) } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const isDoneRef = useRef(isDone);
  isDoneRef.current = isDone;

  useEffect(() => {
    if (!path) {
      setData(null);
      setError('');
      return undefined;
    }

    let cancelled = false;
    let timer;
    let failures = 0;

    const tick = async () => {
      try {
        const next = await apiJson(path);
        if (cancelled) return;
        failures = 0;
        setData(next);
        setError('');
        if (!isDoneRef.current(next)) timer = setTimeout(tick, intervalMs);
      } catch (pollError) {
        if (cancelled) return;
        failures += 1;
        // Keep trying through brief network blips; give up after a few failures
        if (failures >= 4) setError(pollError.message);
        else timer = setTimeout(tick, intervalMs * 2);
      }
    };

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [path, intervalMs]);

  return { data, error, isDone: data ? isDone(data) : false };
}
