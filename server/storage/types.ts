export interface StorageConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  databaseRoot: string;
  requestTimeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  cacheTtlMs?: number;
}

export interface ReadResult<T = unknown> {
  data: T;
  raw: string;
  sha: string;
  path: string;
  fromCache?: boolean;
}

export interface WriteResult {
  path: string;
  sha: string;
  commitSha?: string;
}

export interface BatchFileOperation {
  path: string;
  content: string | object;
}

export interface BatchCommitResult {
  commitSha: string;
  treeSha: string;
  filesCommitted: number;
  url: string;
}

export interface GitHubFileItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

export interface CacheEntry<T = unknown> {
  data: T;
  raw: string;
  sha: string;
  path: string;
  expiresAt: number;
  createdAt: number;
  hitCount: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  invalidations: number;
  totalEntries: number;
  hitRatio: number;
  avgLatencyMs: number;
}

export interface WriteQueueMetrics {
  activeWrites: number;
  pendingQueueLength: number;
  totalProcessed: number;
  totalFailed: number;
  peakQueueLength: number;
  avgWaitTimeMs: number;
}

export interface StoragePerformanceMetrics {
  cache: CacheMetrics;
  writeQueue: WriteQueueMetrics;
  retries: {
    totalAttempts: number;
    successfulRecoveries: number;
    unrecoverableErrors: number;
  };
}

export interface SelfTestStep {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  message?: string;
  durationMs: number;
  details?: unknown;
}

export interface SelfTestReport {
  success: boolean;
  totalDurationMs: number;
  timestamp: string;
  repo: string;
  branch: string;
  steps: SelfTestStep[];
}

export interface PerformanceTestReport {
  success: boolean;
  totalDurationMs: number;
  timestamp: string;
  metrics: StoragePerformanceMetrics;
  steps: Array<{
    name: string;
    status: 'passed' | 'failed';
    durationMs: number;
    details?: unknown;
  }>;
}

export interface UncommittedFileItem {
  path: string;
  operation: 'write' | 'delete';
  timestamp: string;
  sizeBytes?: number;
  message?: string;
}

export interface AutoCommitStatus {
  autoCommitEnabled: boolean;
  uncommittedCount: number;
  uncommittedFiles: UncommittedFileItem[];
  lastModifiedAt?: string;
}
