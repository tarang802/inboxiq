import { describe, expect, it, vi } from 'vitest';
import { JobQueue } from '../src/utils/jobQueue';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('JobQueue', () => {
  it('never runs more than its concurrency at once', async () => {
    const queue = new JobQueue(2);
    const jobs = [deferred(), deferred(), deferred()];
    const started: number[] = [];

    jobs.forEach((job, i) =>
      queue.add(`user-${i}`, () => {
        started.push(i);
        return job.promise;
      }),
    );

    expect(started).toEqual([0, 1]);
    expect(queue.size).toEqual({ pending: 1, running: 2 });

    jobs[0].resolve();
    await tick();
    expect(started).toEqual([0, 1, 2]);
  });

  it('refuses a second job for the same key', () => {
    const queue = new JobQueue(1);
    const job = deferred();
    expect(queue.add('u1', () => job.promise)).toBe(true);
    expect(queue.add('u1', () => job.promise)).toBe(false);
  });

  it('can cancel a job that has not started', async () => {
    const queue = new JobQueue(1);
    const first = deferred();
    const second = vi.fn().mockResolvedValue(undefined);

    queue.add('u1', () => first.promise);
    queue.add('u2', second);
    expect(queue.cancel('u2')).toBe(true);

    first.resolve();
    await tick();
    expect(second).not.toHaveBeenCalled();
  });

  it('keeps going after a job fails', async () => {
    const queue = new JobQueue(1);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const next = vi.fn().mockResolvedValue(undefined);

    queue.add('bad', () => Promise.reject(new Error('boom')));
    queue.add('good', next);
    await tick();

    expect(next).toHaveBeenCalled();
    spy.mockRestore();
  });
});
