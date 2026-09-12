/**
 * Canonical Database Schemas for Avdb
 * All persistent records are stored as structured JSON in the GitHub repository.
 */

// 1. Index: Codes (database/index/codes.json)
export interface CodeIndexSummary {
  code: string;
  title?: string;
  postUrl?: string;
  actressSlug?: string;
  actressName?: string;
  studioSlug?: string;
  studioName?: string;
  addedAt: string;
  updatedAt?: string;
}

export interface CodesIndexFile {
  version: number;
  updatedAt: string;
  totalCount: number;
  codes: Record<string, CodeIndexSummary>;
}

// 2. Index: Actresses (database/index/actresses.json)
export interface ActressIndexEntry {
  slug: string;
  name: string;
  letter: string;
  path: string;
  thumbnail?: string;
  videoCount: number;
  updatedAt: string;
}

export interface ActressesIndexFile {
  version: number;
  updatedAt: string;
  totalCount: number;
  actresses: ActressIndexEntry[];
  chunks?: string[];
}

// 3. Index: Studios (database/index/studios.json)
export interface StudioIndexEntry {
  slug: string;
  name: string;
  letter: string;
  path: string;
  thumbnail?: string;
  videoCount: number;
  updatedAt: string;
}

export interface StudiosIndexFile {
  version: number;
  updatedAt: string;
  totalCount: number;
  studios: StudioIndexEntry[];
  chunks?: string[];
}

// 4. Index: Videos (database/index/videos.json)
export interface VideoIndexEntry {
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

export interface VideosIndexFile {
  version: number;
  updatedAt: string;
  totalCount: number;
  videos: VideoIndexEntry[];
  chunks?: string[];
}

// 4b. Index: Latest (database/index/latest.json)
export interface LatestIndexEntry {
  code: string;
  title: string;
  thumbnail?: string | null;
  postUrl?: string | null;
  releaseDate?: string | null;
  addedAt?: string;
  updatedAt?: string;
  actress?: { name: string; slug: string } | null;
  studio?: { name: string; slug: string } | null;
}

export interface LatestIndexFile {
  version: number;
  updatedAt: string;
  totalCount: number;
  videos: LatestIndexEntry[];
}

// 4c. Index: Stats (database/index/stats.json)
export interface StatsIndexFile {
  version: number;
  updatedAt: string;
  totalVideos: number;
  totalActresses: number;
  totalStudios: number;
  totalCodes: number;
}

// 5. Entity: Actress (database/pstar/{letter}/{slug}.json)
export interface ActressEntityVideo {
  code?: string;
  title: string;
  thumbnail?: string;
  postUrl: string;
  studioSlug?: string;
  studioName?: string;
  releaseDate?: string;
  addedAt: string;
}

export interface ActressEntity {
  slug: string;
  name: string;
  letter: string;
  aliases?: string[];
  thumbnail?: string;
  bio?: string;
  measurements?: string;
  birthdate?: string;
  videoCount: number;
  videos: ActressEntityVideo[];
  createdAt: string;
  updatedAt: string;
}

// 6. Entity: Studio (database/studio/{letter}/{slug}.json)
export interface StudioEntityVideo {
  code?: string;
  title: string;
  thumbnail?: string;
  postUrl: string;
  actressSlug?: string;
  actressName?: string;
  releaseDate?: string;
  addedAt: string;
}

export interface StudioEntity {
  slug: string;
  name: string;
  letter: string;
  aliases?: string[];
  thumbnail?: string;
  description?: string;
  videoCount: number;
  videos: StudioEntityVideo[];
  createdAt: string;
  updatedAt: string;
}

// 7. Step 8: Media Stream & Harvesting Details
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
  databaseEntry?: VideoIndexEntry | CodeIndexSummary;
  harvestedAt: string;
}

// 8. Step 8: Universal Cross-Entity Search
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

export interface Step8TestReport {
  success: boolean;
  durationMs: number;
  steps: Array<{
    name: string;
    status: "passed" | "failed";
    durationMs: number;
    details?: unknown;
  }>;
}
