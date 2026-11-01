const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// token bucket: refills `ratePerSec` tokens a second, holds at most `burst`.
// callers wait their turn in order, so parallel workers share one pace
export class RateLimiter {
  private ratePerSec: number;
  private burst: number;
  private tokens: number;
  private last = Date.now();
  private queue: Promise<void> = Promise.resolve();

  constructor(ratePerSec: number, burst = ratePerSec) {
    this.ratePerSec = ratePerSec;
    this.burst = burst;
    this.tokens = burst;
  }

  acquire(cost = 1): Promise<void> {
    const turn = this.queue.then(async () => {
      this.refill();
      if (this.tokens < cost) {
        await sleep(((cost - this.tokens) / this.ratePerSec) * 1000);
        this.refill();
      }
      this.tokens -= cost;
    });

    this.queue = turn;
    return turn;
  }

  private refill() {
    const now = Date.now();
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.ratePerSec);
    this.last = now;
  }
}
