import { useCallback, useEffect, useState } from 'react';
import { getSyncStatus, startSync } from '../lib/sync';
import type { SyncRun } from '../lib/types';

const POLL_MS = 2000;

const message = (err: unknown) => (err instanceof Error ? err.message : 'something went wrong');

export function useSync() {
  const [sync, setSync] = useState<SyncRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      setSync(await getSyncStatus());
    } catch (err) {
      setError(message(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = sync?.status === 'QUEUED' || sync?.status === 'RUNNING';

  // poll only while a sync is running
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [active, load]);

  const start = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      setSync(await startSync());
    } catch (err) {
      setError(message(err));
    } finally {
      setStarting(false);
    }
  }, []);

  return { sync, error, active, starting, start };
}
