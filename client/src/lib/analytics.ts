import { api } from './api';
import type { Analytics } from './types';

export async function getAnalytics() {
  const { analytics } = await api<{ analytics: Analytics }>('/analytics/summary');
  return analytics;
}
