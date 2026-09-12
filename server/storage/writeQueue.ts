import { WriteQueueMetrics } from "./types";

interface QueuedTask<T> {
  task: () => Promise<T>;
  description: string;
  enqueuedAt: number;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

export class WriteQueue {
  private queue: Array<QueuedTask<unknown>> = [];
  private isProcessing = false;

  // Performance telemetry
  private totalProcessed = 0;
  private totalFailed = 0;
  private peakQueueLength = 0;
  private totalWaitTimeMs = 0;

  /**
   * Enqueue a mutating operation to be executed strictly sequentially.
   * Guarantees that at most ONE write runs against GitHub at any moment.
   */
  public enqueue<T>(task: () => Promise<T>, description = "GitHub Write"): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedItem: QueuedTask<T> = {
        task,
        description,
        enqueuedAt: Date.now(),
        resolve: resolve as (val: unknown) => void,
        reject,
      };

      this.queue.push(queuedItem as QueuedTask<unknown>);
      if (this.queue.length > this.peakQueueLength) {
        this.peakQueueLength = this.queue.length;
      }

      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const current = this.queue.shift();

    if (!current) {
      this.isProcessing = false;
      return;
    }

    const waitTime = Date.now() - current.enqueuedAt;
    this.totalWaitTimeMs += waitTime;

    try {
      const result = await current.task();
      this.totalProcessed++;
      current.resolve(result);
    } catch (err) {
      this.totalFailed++;
      current.reject(err);
    } finally {
      this.isProcessing = false;
      // Schedule next item on next tick to avoid recursive call-stack overflow
      setImmediate(() => this.processNext());
    }
  }

  /**
   * Return real-time queue metrics.
   */
  public getMetrics(): WriteQueueMetrics {
    const processed = this.totalProcessed + this.totalFailed;
    return {
      activeWrites: this.isProcessing ? 1 : 0,
      pendingQueueLength: this.queue.length,
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
      peakQueueLength: this.peakQueueLength,
      avgWaitTimeMs: processed > 0 ? Number((this.totalWaitTimeMs / processed).toFixed(2)) : 0,
    };
  }

  /**
   * Clear pending queue (e.g. during emergency resets).
   */
  public clear(): void {
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        item.reject(new Error("WriteQueue cleared: pending operation cancelled."));
      }
    }
    this.isProcessing = false;
  }
}
