import { api } from './api';
import type { SyncRun } from './types';

export async function getSyncStatus() {
  const { sync } = await api<{ sync: SyncRun | null }>('/sync/status');
  return sync;
}

export async function startSync() {
  const { sync } = await api<{ sync: SyncRun }>('/sync', { method: 'POST' });
  return sync;
}
