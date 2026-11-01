type Task = () => Promise<void>;

// tiny in-memory fifo: at most `concurrency` tasks at once, one task per key.
// jobs live only as long as this process; anything left over is cleaned up at boot
export class JobQueue {
  private concurrency: number;
  private pending: { key: string; task: Task }[] = [];
  private running = new Set<string>();

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  // false if a job with this key is already waiting or running
  add(key: string, task: Task) {
    if (this.has(key)) return false;
    this.pending.push({ key, task });
    this.drain();
    return true;
  }

  // drops a job that hasn't started yet; a running one has to finish on its own
  cancel(key: string) {
    const before = this.pending.length;
    this.pending = this.pending.filter((job) => job.key !== key);
    return this.pending.length < before;
  }

  has(key: string) {
    return this.running.has(key) || this.pending.some((job) => job.key === key);
  }

  get size() {
    return { pending: this.pending.length, running: this.running.size };
  }

  private drain() {
    while (this.running.size < this.concurrency && this.pending.length) {
      const { key, task } = this.pending.shift()!;
      this.running.add(key);

      task()
        .catch((err) => console.error(`job ${key} failed`, err))
        .finally(() => {
          this.running.delete(key);
          this.drain();
        });
    }
  }
}
