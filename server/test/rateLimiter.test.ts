import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimiter } from '../src/utils/rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('lets a burst through, then paces the rest', async () => {
    const limiter = new RateLimiter(10, 10);
    let done = 0;
    const calls = Array.from({ length: 20 }, () => limiter.acquire().then(() => done++));

    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(10);

    await vi.advanceTimersByTimeAsync(500);
    expect(done).toBe(15);

    await vi.advanceTimersByTimeAsync(500);
    await Promise.all(calls);
    expect(done).toBe(20);
  });

  it('charges by cost', async () => {
    const limiter = new RateLimiter(10, 10);
    let done = 0;
    limiter.acquire(5).then(() => done++);
    limiter.acquire(5).then(() => done++);
    limiter.acquire(5).then(() => done++);

    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(2);

    await vi.advanceTimersByTimeAsync(500);
    expect(done).toBe(3);
  });
});
