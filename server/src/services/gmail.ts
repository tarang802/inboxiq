import { GMAIL_API_URL } from '../config/google';
import { HttpError } from '../utils/httpError';
import { getAccessToken, type AccessToken } from './googleAccount';

export class GmailError extends HttpError {
  reason: string;

  constructor(status: number, reason: string) {
    super(status === 401 ? 401 : 502, `gmail request failed (${status}): ${reason}`);
    this.name = 'GmailError';
    this.reason = reason;
  }
}

interface ListResponse {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
}

async function errorReason(res: Response) {
  const body = await res.json().catch(() => ({}));
  return body?.error?.errors?.[0]?.reason ?? body?.error?.status ?? res.statusText;
}

export function createGmailClient(userId: string) {
  let access: AccessToken | null = null;

  async function token() {
    if (!access) access = await getAccessToken(userId);
    return access.token;
  }

  async function request<T>(path: string, params: URLSearchParams): Promise<T> {
    const res = await fetch(`${GMAIL_API_URL}${path}?${params}`, {
      headers: { Authorization: `Bearer ${await token()}` },
    });

    if (!res.ok) throw new GmailError(res.status, await errorReason(res));
    return res.json() as Promise<T>;
  }

  return {
    // the metadata scope doesn't allow the q param, so this pages through everything
    async listMessages(pageToken?: string) {
      const params = new URLSearchParams({ maxResults: '500' });
      if (pageToken) params.set('pageToken', pageToken);

      const data = await request<ListResponse>('/messages', params);
      return { ids: (data.messages ?? []).map((m) => m.id), nextPageToken: data.nextPageToken };
    },
  };
}

export type GmailClient = ReturnType<typeof createGmailClient>;
