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

export type SenderStatus = 'ACTIVE' | 'KEPT' | 'IGNORED' | 'UNSUBSCRIBED';

export interface Sender {
  id: string;
  email: string;
  name: string | null;
  domain: string;
  messageCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  unsubscribeUrl: string | null;
  unsubscribeMail: string | null;
  oneClick: boolean;
  status: SenderStatus;
  clutterScore: number;
}

export interface SenderPage {
  senders: Sender[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SenderSummary {
  senders: number;
  messages: number;
  unsubscribable: number;
  oneClick: number;
  statuses: Record<SenderStatus, number>;
}
