export type NavView =
  | 'home'
  | 'search'
  | 'bulk-scraper'
  | 'actress'
  | 'studio'
  | 'code'
  | 'videos'
  | 'maintenance'
  | 'system-tests';

export interface NavParams {
  query?: string;
  tab?: "bulk" | "catalog" | "search" | "actresses" | "studios";
}

export interface NavItem {
  id: NavView;
  label: string;
  description: string;
}

export interface VideoRecord {
  code?: string;
  title: string;
  thumbnail: string;
  postUrl: string;
  actress?: string;
  studio?: string;
  description?: string;
  tags?: string[];
  scrapedAt: string;
}

export interface ActressRecord {
  slug: string;
  name: string;
  aliases?: string[];
  thumbnail?: string;
  videosCount: number;
  videos: Array<{
    code?: string;
    title: string;
    postUrl: string;
    addedAt: string;
  }>;
  updatedAt: string;
}

export interface StudioRecord {
  slug: string;
  name: string;
  videosCount: number;
  videos: Array<{
    code?: string;
    title: string;
    postUrl: string;
    addedAt: string;
  }>;
  updatedAt: string;
}

export interface CodeIndexRecord {
  code: string;
  postUrl: string;
  title: string;
  actress?: string;
  studio?: string;
  addedAt: string;
}

export interface BackendStatus {
  status: 'ok' | 'error';
  timestamp: string;
  githubConfigured: boolean;
  repo: {
    owner: string;
    repo: string;
    branch: string;
    root: string;
  };
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
    used: number;
  } | null;
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

export interface IndexFileStatus {
  path: string;
  exists: boolean;
  valid: boolean;
  errors: string[];
  totalCount: number;
  updatedAt?: string;
  sha?: string;
}

export interface DatabaseStatusReport {
  initialized: boolean;
  files: {
    codes: IndexFileStatus;
    actresses: IndexFileStatus;
    studios: IndexFileStatus;
    videos: IndexFileStatus;
  };
  samples: {
    codesIndex: unknown;
    actressesIndex: unknown;
    studiosIndex: unknown;
    videosIndex: unknown;
    actressEntity: unknown;
    studioEntity: unknown;
  };
}

export interface CodeSummary {
  code: string;
  title?: string;
  postUrl?: string;
  actressSlug?: string;
  actressName?: string;
  studioSlug?: string;
  studioName?: string;
  addedAt: string;
}

export interface CodeCategorySummary {
  category: string;
  totalCount: number;
  minNumber: number;
  maxNumber: number;
  numberRangeFormatted: string;
  sampleCodes: string[];
  sampleNumbers: number[];
  topActresses: Array<{ name: string; count: number }>;
  topStudios: Array<{ name: string; count: number }>;
  sampleThumbnails: string[];
  lastAddedAt: string;
}

export interface CategoryNumberItem {
  code: string;
  number: number;
  numberFormatted: string;
  title: string;
  postUrl: string;
  thumbnail?: string;
  actressName?: string;
  actressSlug?: string;
  studioName?: string;
  studioSlug?: string;
  duration?: string;
  releaseDate?: string;
  addedAt: string;
}

export interface CategoryDetailsResult {
  category: string;
  totalCount: number;
  totalFound: number;
  minNumber: number;
  maxNumber: number;
  allNumbers: Array<{ number: number; code: string; title?: string; hasThumbnail?: boolean }>;
  page: number;
  totalPages: number;
  limit: number;
  sort: string;
  items: CategoryNumberItem[];
}

export interface CodeCheckResult {
  rawCode: string;
  normalizedCode: string | null;
  isValidFormat: boolean;
  isDuplicate: boolean;
  entry?: CodeSummary;
}

export interface CodeRegistryStats {
  totalCount: number;
  updatedAt: string;
  cacheAgeMs: number;
  sampleCodes: string[];
}

export interface DeduplicationTestStep {
  name: string;
  status: "passed" | "failed";
  durationMs: number;
  details?: unknown;
}

export interface DeduplicationTestReport {
  success: boolean;
  durationMs: number;
  steps: DeduplicationTestStep[];
}

export interface JavtifulVideoItem {
  code: string;
  rawCode: string;
  title: string;
  actress?: string;
  actressSlug?: string;
  studio?: string;
  studioSlug?: string;
  duration?: string;
  durationSeconds?: number;
  releaseDate?: string;
  coverImage?: string;
  postUrl: string;
  isDuplicate?: boolean;
  duplicateEntry?: CodeSummary;
}

export interface JavtifulActressItem {
  name: string;
  slug: string;
  videoCount?: number;
  url: string;
  thumbnail?: string;
}

export interface JavtifulStudioItem {
  name: string;
  slug: string;
  videoCount?: number;
  url: string;
  thumbnail?: string;
}

export interface JavtifulPagination {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage?: number;
  prevPage?: number;
}

export interface JavtifulScrapeResult {
  source: string;
  page: number;
  totalFound: number;
  uniqueCount: number;
  duplicateCount: number;
  items: JavtifulVideoItem[];
  pagination?: JavtifulPagination;
}

export interface JavtifulTestStep {
  name: string;
  status: "passed" | "failed";
  durationMs: number;
  details?: unknown;
}

export interface JavtifulTestSuiteReport {
  success: boolean;
  durationMs: number;
  steps: JavtifulTestStep[];
  error?: string;
}

export interface IngestionResult {
  success: boolean;
  code: string;
  normalizedCode: string;
  isDuplicate: boolean;
  createdActress?: string;
  updatedActress?: string;
  createdStudio?: string;
  updatedStudio?: string;
  videoAdded: boolean;
  error?: string;
}

export interface BatchIngestionResult {
  success: boolean;
  totalProcessed: number;
  ingestedCount: number;
  duplicateCount: number;
  invalidCount: number;
  actressesTouched: string[];
  studiosTouched: string[];
  results: IngestionResult[];
  durationMs: number;
}

export interface SaveActressResult {
  success: boolean;
  actressSlug: string;
  actressName: string;
  isNewActress: boolean;
  totalVideosSubmitted: number;
  ingestedCount: number;
  duplicateCount: number;
  totalActressVideos: number;
  commitSha?: string;
  commitUrl?: string;
  modifiedFiles?: string[];
  isSingleCommit: boolean;
  error?: string;
}

export interface Step6TestReport {
  success: boolean;
  durationMs: number;
  steps: Array<{
    name: string;
    status: "passed" | "failed";
    durationMs: number;
    details?: unknown;
  }>;
}

export interface VideoCatalogItem {
  code?: string;
  title: string;
  thumbnail: string;
  postUrl: string;
  actressSlug?: string;
  actressName?: string;
  studioSlug?: string;
  studioName?: string;
  duration?: string;
  releaseDate?: string;
  scrapedAt: string;
}

export interface ActressCatalogItem {
  slug: string;
  name: string;
  letter: string;
  path: string;
  thumbnail?: string;
  videoCount: number;
  updatedAt: string;
}

export interface StudioCatalogItem {
  slug: string;
  name: string;
  letter: string;
  path: string;
  thumbnail?: string;
  videoCount: number;
  updatedAt: string;
}

export interface ShardedActressEntity {
  slug: string;
  name: string;
  letter: string;
  aliases?: string[];
  thumbnail?: string;
  bio?: string;
  measurements?: string;
  birthdate?: string;
  videoCount: number;
  videos: Array<{
    code?: string;
    title: string;
    thumbnail?: string;
    postUrl: string;
    studioSlug?: string;
    studioName?: string;
    releaseDate?: string;
    addedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ShardedStudioEntity {
  slug: string;
  name: string;
  letter: string;
  aliases?: string[];
  thumbnail?: string;
  description?: string;
  videoCount: number;
  videos: Array<{
    code?: string;
    title: string;
    thumbnail?: string;
    postUrl: string;
    actressSlug?: string;
    actressName?: string;
    releaseDate?: string;
    addedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Step 8: Media Stream & Harvesting Details
export interface HarvestedMediaStream {
  quality: number | string;
  format: string;
  url: string;
  size?: number;
  label?: string;
}

export interface HarvestedMediaDetails {
  code: string;
  rawCode: string;
  title: string;
  coverImage: string;
  duration: string;
  durationSeconds: number;
  releaseDate: string;
  actressName?: string;
  actressSlug?: string;
  actresses: Array<{ name: string; slug: string }>;
  studioName?: string;
  studioSlug?: string;
  postUrl: string;
  tags: string[];
  playerSources: HarvestedMediaStream[];
  previewVideoUrl?: string;
  inDatabase: boolean;
  databaseEntry?: VideoCatalogItem | CodeSummary;
  harvestedAt: string;
}

// Step 8: Universal Cross-Entity Search
export type SearchEntityType = "all" | "videos" | "actresses" | "studios" | "codes";

export interface UniversalSearchResultItem {
  id: string;
  type: "video" | "actress" | "studio" | "code";
  title: string;
  subtitle?: string;
  slug?: string;
  code?: string;
  thumbnail?: string;
  videoCount?: number;
  duration?: string;
  releaseDate?: string;
  postUrl?: string;
  relevanceScore: number;
  directMatch?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UniversalSearchResponse {
  query: string;
  type: SearchEntityType;
  totalFound: number;
  countsByType: {
    all: number;
    videos: number;
    actresses: number;
    studios: number;
    codes: number;
  };
  page: number;
  totalPages: number;
  limit: number;
  directMatch?: UniversalSearchResultItem | null;
  results: UniversalSearchResultItem[];
}

export interface Step8TestStep {
  name: string;
  status: "passed" | "failed";
  durationMs: number;
  details?: unknown;
}

export interface Step8TestReport {
  success: boolean;
  durationMs: number;
  steps: Step8TestStep[];
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

export interface Step10PerformanceReport {
  success: boolean;
  totalDurationMs: number;
  timestamp: string;
  metrics: StoragePerformanceMetrics;
  steps: Array<{
    name: string;
    status: "passed" | "failed";
    durationMs: number;
    details?: unknown;
  }>;
}

export type MaintenanceIssueType =
  | "malformed_json"
  | "duplicate_code"
  | "orphan_file"
  | "dangling_pointer"
  | "count_mismatch"
  | "schema_violation";

export interface MaintenanceIssue {
  id: string;
  type: MaintenanceIssueType;
  severity: "error" | "warning" | "info";
  path: string;
  message: string;
  details?: unknown;
  autoFixable: boolean;
}

export interface MaintenanceReport {
  healthy: boolean;
  timestamp: string;
  durationMs: number;
  summary: {
    totalFilesChecked: number;
    indexesValid: boolean;
    malformedJsonCount: number;
    duplicateCodesCount: number;
    orphanFilesCount: number;
    danglingPointersCount: number;
    countMismatchesCount: number;
    totalIssues: number;
    autoFixableIssues: number;
  };
  issues: MaintenanceIssue[];
  recommendations: string[];
}

export interface RebuildIndexesResult {
  success: boolean;
  commitSha: string;
  commitUrl: string;
  rebuiltIndexes: {
    codes: number;
    actresses: number;
    studios: number;
    videos: number;
  };
  durationMs: number;
}

export interface RepairResult {
  success: boolean;
  repairedIssuesCount: number;
  commitSha?: string;
  details: string[];
  durationMs: number;
}

export interface Step11TestReport {
  success: boolean;
  totalDurationMs: number;
  timestamp: string;
  steps: Array<{
    name: string;
    status: "passed" | "failed";
    durationMs: number;
    details?: unknown;
  }>;
  finalDiagnosticReport?: MaintenanceReport;
}

export interface UncommittedFileItem {
  path: string;
  operation: "write" | "delete";
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


