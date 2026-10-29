export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export type SyncStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';

export interface SyncRun {
  id: string;
  status: SyncStatus;
  processed: number;
  total: number | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}
