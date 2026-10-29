const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface RetryOptions {
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  shouldRetry?: (err: unknown) => boolean;
  // lets the error pick the wait, e.g. from a Retry-After header
  delayFor?: (err: unknown) => number | undefined;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { retries = 5, baseMs = 500, maxMs = 30_000, shouldRetry = () => true, delayFor } = opts;

  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err)) throw err;

      // full jitter so parallel workers don't all retry at the same moment
      const backoff = Math.random() * Math.min(maxMs, baseMs * 2 ** attempt);
      await sleep(Math.min(maxMs, delayFor?.(err) ?? backoff));
    }
  }
}
