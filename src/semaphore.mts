import { ProtocolError, ValueError } from "./error.mjs";

export class Semaphore {
  private running: number;
  private readonly max: number;
  private readonly queue: Array<() => void>;

  constructor(n: number) {
    if ((this.max = Math.floor(n)) < 1) {
      throw new ValueError(`Concurrency level should be >= 1 (was ${n})`);
    }
    this.running = 0;
    this.queue = [];
  }

  /**
   * Acquire a slot. Returns a Promise that resolves when a slot is available.
   */
  public get(): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  /**
   * Release a slot. If there are pending requests, resolves the oldest.
   */
  public release(): void {
    const resolve = this.queue.shift();

    if (resolve) {
      resolve();
    } else if (this.running > 0) {
      this.running--;
    } else {
      throw new ProtocolError("release() called more times than get()");
    }
  }
}
