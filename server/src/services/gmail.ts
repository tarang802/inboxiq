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

interface RawMessage {
  id: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: { headers?: { name: string; value: string }[] };
}

// the only headers we ever ask for. bodies are never fetched
export const METADATA_HEADERS = ['From', 'Date', 'List-Unsubscribe', 'List-Unsubscribe-Post'];

export interface MessageMeta {
  id: string;
  labelIds: string[];
  internalDate: number;
  // lowercased header names
  headers: Record<string, string>;
}

function toMeta(msg: RawMessage): MessageMeta {
  const headers: Record<string, string> = {};
  for (const { name, value } of msg.payload?.headers ?? []) {
    const key = name.toLowerCase();
    if (!(key in headers)) headers[key] = value;
  }

  return {
    id: msg.id,
    labelIds: msg.labelIds ?? [],
    internalDate: Number(msg.internalDate ?? 0),
    headers,
  };
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

    // returns null if the message was deleted after it was listed
    async getMessage(id: string): Promise<MessageMeta | null> {
      const params = new URLSearchParams({ format: 'metadata' });
      for (const header of METADATA_HEADERS) params.append('metadataHeaders', header);

      try {
        return toMeta(await request<RawMessage>(`/messages/${encodeURIComponent(id)}`, params));
      } catch (err) {
        if (err instanceof GmailError && err.reason === 'notFound') return null;
        throw err;
      }
    },
  };
}

export type GmailClient = ReturnType<typeof createGmailClient>;
