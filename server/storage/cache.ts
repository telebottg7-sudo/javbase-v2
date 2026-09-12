import { ReadResult, CacheEntry, CacheMetrics } from "./types";

export class StorageCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTtlMs: number;
  private maxEntries: number;

  // Performance telemetry
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private invalidations = 0;
  private totalLookupTimeMs = 0;
  private totalLookups = 0;

  constructor(defaultTtlMs = 5 * 60 * 1000, maxEntries = 2000) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;

    // Background cleanup every 60 seconds
    setInterval(() => this.pruneExpired(), 60 * 1000).unref();
  }

  private normalizeKey(path: string): string {
    return path.trim().replace(/^\/+/, "").toLowerCase();
  }

  /**
   * Retrieve cached file result if present and unexpired.
   */
  public get<T = unknown>(path: string): ReadResult<T> | null {
    const t0 = performance.now();
    this.totalLookups++;
    const key = this.normalizeKey(path);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      this.totalLookupTimeMs += performance.now() - t0;
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.evictions++;
      this.misses++;
      this.totalLookupTimeMs += performance.now() - t0;
      return null;
    }

    entry.hitCount++;
    this.hits++;
    this.totalLookupTimeMs += performance.now() - t0;

    return {
      data: entry.data as T,
      raw: entry.raw,
      sha: entry.sha,
      path: entry.path,
      fromCache: true,
    };
  }

  /**
   * Store or update a cached file result with TTL.
   */
  public set<T = unknown>(
    path: string,
    result: Omit<ReadResult<T>, "fromCache">,
    customTtlMs?: number
  ): void {
    const key = this.normalizeKey(path);

    // Evict oldest entry if capacity is exceeded
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.evictions++;
      }
    }

    const ttl = customTtlMs ?? this.defaultTtlMs;
    const now = Date.now();

    this.cache.set(key, {
      data: result.data,
      raw: result.raw,
      sha: result.sha,
      path: result.path,
      createdAt: now,
      expiresAt: now + ttl,
      hitCount: 0,
    });
  }

  /**
   * Invalidate a single path immediately.
   */
  public invalidate(path: string): boolean {
    const key = this.normalizeKey(path);
    if (this.cache.delete(key)) {
      this.invalidations++;
      return true;
    }
    return false;
  }

  /**
   * Invalidate all paths starting with a given directory prefix.
   */
  public invalidatePrefix(prefix: string): number {
    const cleanPrefix = this.normalizeKey(prefix);
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key === cleanPrefix || key.startsWith(`${cleanPrefix}/`)) {
        this.cache.delete(key);
        count++;
        this.invalidations++;
      }
    }
    return count;
  }

  /**
   * Wipe the entire cache.
   */
  public clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.invalidations += count;
  }

  /**
   * Prune expired entries.
   */
  public pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        pruned++;
        this.evictions++;
      }
    }
    return pruned;
  }

  /**
   * Return real-time performance telemetry.
   */
  public getMetrics(): CacheMetrics {
    const totalRequests = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      invalidations: this.invalidations,
      totalEntries: this.cache.size,
      hitRatio: totalRequests > 0 ? Number((this.hits / totalRequests).toFixed(4)) : 0,
      avgLatencyMs:
        this.totalLookups > 0
          ? Number((this.totalLookupTimeMs / this.totalLookups).toFixed(3))
          : 0,
    };
  }
}
