import { useCallback, useEffect, useRef, useState } from 'react';
import { getSyncStatus, startSync } from '../lib/sync';
import type { SyncRun, SyncStatus } from '../lib/types';

const POLL_MS = 2000;

const message = (err: unknown) => (err instanceof Error ? err.message : 'something went wrong');

const isActive = (status?: SyncStatus) => status === 'QUEUED' || status === 'RUNNING';

// onDone fires when a sync we watched running finishes, so the page can reload its data.
// onProgress fires as a running sync gets further, since a first sync saves as it goes
export function useSync(onDone?: () => void, onProgress?: () => void) {
  const [sync, setSync] = useState<SyncRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const onDoneRef = useRef(onDone);
  const onProgressRef = useRef(onProgress);
  const lastStatus = useRef<SyncStatus | undefined>(undefined);
  const lastProcessed = useRef(0);

  useEffect(() => {
    onDoneRef.current = onDone;
    onProgressRef.current = onProgress;
  });

  useEffect(() => {
    const was = lastStatus.current;
    lastStatus.current = sync?.status;
    if (isActive(was) && sync?.status === 'DONE') onDoneRef.current?.();
  }, [sync?.status]);

  useEffect(() => {
    const processed = sync?.processed ?? 0;
    const grew = processed > lastProcessed.current;
    lastProcessed.current = processed;
    if (grew && sync?.status === 'RUNNING') onProgressRef.current?.();
  }, [sync?.processed, sync?.status]);

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
