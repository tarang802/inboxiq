import { useCallback, useEffect, useRef, useState } from 'react';
import { getSyncStatus, startSync } from '../lib/sync';
import type { SyncRun, SyncStatus } from '../lib/types';

const POLL_MS = 2000;

const message = (err: unknown) => (err instanceof Error ? err.message : 'something went wrong');

const isActive = (status?: SyncStatus) => status === 'QUEUED' || status === 'RUNNING';

// onDone fires when a sync we watched running finishes, so the page can reload its data
export function useSync(onDone?: () => void) {
  const [sync, setSync] = useState<SyncRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const onDoneRef = useRef(onDone);
  const lastStatus = useRef<SyncStatus | undefined>(undefined);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const was = lastStatus.current;
    lastStatus.current = sync?.status;
    if (isActive(was) && sync?.status === 'DONE') onDoneRef.current?.();
  }, [sync?.status]);

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

  const active = isActive(sync?.status);

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
