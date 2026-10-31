import { api } from './api';
import type { Sender, SenderPage, SenderStatus, SenderSummary } from './types';

export type SenderSort = 'clutter' | 'count' | 'recent' | 'name';

export interface SenderParams {
  q?: string;
  status?: SenderStatus;
  unsubscribable?: boolean;
  sort?: SenderSort;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export function listSenders(params: SenderParams, signal?: AbortSignal) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== false) search.set(key, String(value));
  }
  return api<SenderPage>(`/senders?${search}`, { signal });
}

export async function getSenderSummary() {
  const { summary } = await api<{ summary: SenderSummary }>('/senders/summary');
  return summary;
}

export async function updateSenderStatus(
  id: string,
  status: Exclude<SenderStatus, 'UNSUBSCRIBED'>,
) {
  const { sender } = await api<{ sender: Sender }>(`/senders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return sender;
}
