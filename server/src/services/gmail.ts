import { env } from '../config/env';
import { GMAIL_API_URL } from '../config/google';
import { HttpError } from '../utils/httpError';
import { RateLimiter } from '../utils/rateLimiter';
import { withRetry } from '../utils/retry';
import { getAccessToken, type AccessToken } from './googleAccount';

export class GmailError extends HttpError {
  gmailStatus: number;
  reason: string;
  retryAfterMs?: number;

  constructor(status: number, reason: string, retryAfterMs?: number) {
    super(status === 401 ? 401 : 502, `gmail request failed (${status}): ${reason}`);
    this.name = 'GmailError';
    this.gmailStatus = status;
    this.reason = reason;
    this.retryAfterMs = retryAfterMs;
  }
}

const RATE_LIMIT_REASONS = ['rateLimitExceeded', 'userRateLimitExceeded'];

function isRetryable(err: unknown) {
  // fetch throws a TypeError on network failures
  if (err instanceof TypeError) return true;
  if (!(err instanceof GmailError)) return false;

  const { gmailStatus, reason } = err;
  return (
    gmailStatus === 429 ||
    gmailStatus >= 500 ||
    (gmailStatus === 403 && RATE_LIMIT_REASONS.includes(reason))
  );
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

interface ErrorInfo {
  '@type'?: string;
  metadata?: { window_start_time?: string };
}

// the quota is a per-minute window, and google says when the current one started.
// waiting for the next window beats guessing with backoff
function quotaResetMs(details: ErrorInfo[] | undefined) {
  const start = Number(
    details?.find((d) => d.metadata?.window_start_time)?.metadata?.window_start_time,
  );
  if (!Number.isFinite(start) || start <= 0) return undefined;

  const wait = (start + 60) * 1000 - Date.now();
  return wait > 0 ? wait + 1000 : undefined;
}

async function readError(res: Response) {
  const body = await res.json().catch(() => ({}));
  const reason: string = body?.error?.errors?.[0]?.reason ?? body?.error?.status ?? res.statusText;
  const header = Number(res.headers.get('retry-after'));
  const fromHeader = Number.isFinite(header) && header > 0 ? header * 1000 : undefined;

  return { reason, retryAfterMs: fromHeader ?? quotaResetMs(body?.error?.details) };
}

// list and get both cost 5 units. stay under 90% of the per-user minute budget,
// spread evenly, so parallel workers never trip the limit in the first place
const UNITS_PER_REQUEST = 5;
const unitsPerSecond = () => (env.GMAIL_UNITS_PER_MINUTE * 0.9) / 60;

export function createGmailClient(userId: string) {
  const quota = new RateLimiter(unitsPerSecond());
  let access: AccessToken | null = null;
  let pending: Promise<AccessToken> | null = null;

  // access tokens last about an hour and a big sync can outlive one.
  // refresh a minute early, and share one refresh between parallel workers
  async function token() {
    if (!access || access.expiresAt - 60_000 < Date.now()) {
      pending ??= getAccessToken(userId).finally(() => {
        pending = null;
      });
      access = await pending;
    }
    return access.token;
  }

  async function request<T>(path: string, params: URLSearchParams): Promise<T> {
    const url = `${GMAIL_API_URL}${path}?${params}`;
    const send = async () => {
      await quota.acquire(UNITS_PER_REQUEST);
      return fetch(url, { headers: { Authorization: `Bearer ${await token()}` } });
    };

    return withRetry(
      async () => {
        let res = await send();

        // token expired early or was rotated: get a fresh one and try once more
        if (res.status === 401) {
          access = null;
          res = await send();
        }

        if (!res.ok) {
          const { reason, retryAfterMs } = await readError(res);
          throw new GmailError(res.status, reason, retryAfterMs);
        }
        return res.json() as Promise<T>;
      },
      {
        // google's quota is a per-minute window, so give it up to a couple of minutes to recover
        retries: 7,
        baseMs: 1000,
        maxMs: 65_000,
        shouldRetry: isRetryable,
        delayFor: (err) => (err instanceof GmailError ? err.retryAfterMs : undefined),
      },
    );
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
        if (err instanceof GmailError && err.gmailStatus === 404) return null;
        throw err;
      }
    },
  };
}

export type GmailClient = ReturnType<typeof createGmailClient>;
