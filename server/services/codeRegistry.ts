import fs from "fs/promises";
import { GitHubStorage } from "../storage/githubStorage";
import {
  CodesIndexFile,
  CodeIndexSummary,
  VideosIndexFile,
} from "../schema/types";
import {
  normalizeCode,
  getCodeCategory,
  getCodeFilePath,
  getCodeIndexPath,
  extractCodeNumber,
  normalizeSlug,
  createInitialCodesIndex,
} from "../schema/normalizers";
import { validateCodesIndex } from "../schema/validators";

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
  updatedAt?: string;
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
  entry?: CodeIndexSummary;
}

export interface RegisterCodeItem {
  code: string;
  title?: string;
  postUrl?: string;
  thumbnail?: string;
  releaseDate?: string;
  actressSlug?: string;
  actressName?: string;
  studioSlug?: string;
  studioName?: string;
}

export interface RegisterCodesResult {
  success: boolean;
  registered: string[];
  duplicates: string[];
  invalid: string[];
  totalCount: number;
  commitSha?: string;
}

export class CodeRegistryService {
  private storage: GitHubStorage;
  private prefixCache = new Map<string, { data: any; sha: string | null; fetchedAt: number }>();
  private cachedIndex: CodesIndexFile | null = null;
  private cachedSha: string | null = null;
  private lastFetchedAt = 0;
  private readonly cacheTtlMs = 60 * 1000; // 1 minute cache TTL

  constructor(storage: GitHubStorage) {
    this.storage = storage;
  }

  /**
   * Loads a single prefix index file (e.g. index/codes/ADN.json).
   */
  async loadPrefixIndex(prefix: string, forceRefresh = false): Promise<{ data: any; sha: string | null }> {
    const cleanPrefix = (prefix || "").toUpperCase().trim();
    if (!cleanPrefix) {
      return {
        data: { prefix: "", version: 1, updatedAt: new Date().toISOString(), totalCount: 0, videos: [] },
        sha: null,
      };
    }

    const now = Date.now();
    const cached = this.prefixCache.get(cleanPrefix);
    if (!forceRefresh && cached && now - cached.fetchedAt < this.cacheTtlMs) {
      return { data: cached.data, sha: cached.sha };
    }

    const indexPath = getCodeIndexPath(cleanPrefix);
    const file = await this.storage.readFile<any>(indexPath);

    if (!file) {
      const emptyData = {
        prefix: cleanPrefix,
        version: 1,
        updatedAt: new Date().toISOString(),
        totalCount: 0,
        codes: [],
        videos: [],
      };
      this.prefixCache.set(cleanPrefix, { data: emptyData, sha: null, fetchedAt: now });
      return { data: emptyData, sha: null };
    }

    const data = file.data || {};
    const items = Array.isArray(data.codes)
      ? data.codes
      : Array.isArray(data.videos)
      ? data.videos
      : [];
    data.codes = items;
    data.videos = items;
    data.totalCount = items.length;

    this.prefixCache.set(cleanPrefix, { data, sha: file.sha, fetchedAt: now });
    return { data, sha: file.sha };
  }

  /**
   * Ensures the index is loaded in memory for fast O(1) checks.
   * Aggregates split prefix index files into memory without requiring a monolithic codes.json file on disk.
   */
  async getOrLoadIndex(forceRefresh = false): Promise<{ index: CodesIndexFile; sha: string | null }> {
    const now = Date.now();
    if (!forceRefresh && this.cachedIndex && now - this.lastFetchedAt < this.cacheTtlMs) {
      return { index: this.cachedIndex, sha: this.cachedSha };
    }

    if (forceRefresh) {
      this.prefixCache.clear();
    }

    let prefixFiles: string[] = [];
    try {
      const files = await this.storage.listFiles("index/codes");
      prefixFiles = files
        .filter((f) => f.name.endsWith(".json"))
        .map((f) => f.name.replace(/\.json$/i, "").toUpperCase());
    } catch {
      try {
        const localFiles = await fs.readdir("database/index/codes");
        prefixFiles = localFiles
          .filter((f) => f.endsWith(".json"))
          .map((f) => f.replace(/\.json$/i, "").toUpperCase());
      } catch {
        prefixFiles = [];
      }
    }

    const codesMap: Record<string, CodeIndexSummary> = {};
    let totalCount = 0;

    for (const prefix of prefixFiles) {
      const { data } = await this.loadPrefixIndex(prefix, forceRefresh);
      if (data && Array.isArray(data.videos)) {
        for (const v of data.videos) {
          const norm = normalizeCode(v.code || "");
          if (norm) {
            codesMap[norm] = {
              code: norm,
              title: v.title || norm,
              postUrl: v.postUrl || "",
              actressSlug: v.actress?.slug || v.actressSlug,
              actressName: v.actress?.name || v.actressName,
              studioSlug: v.studio?.slug || v.studioSlug,
              studioName: v.studio?.name || v.studioName,
              addedAt: v.addedAt || new Date().toISOString(),
            };
            totalCount++;
          }
        }
      }
    }

    const aggregatedIndex: CodesIndexFile = {
      version: 1,
      updatedAt: new Date().toISOString(),
      totalCount,
      codes: codesMap,
    };

    this.cachedIndex = aggregatedIndex;
    this.cachedSha = null;
    this.lastFetchedAt = now;

    return { index: aggregatedIndex, sha: null };
  }

  /**
   * Fast O(1) check for a single video code.
   */

  /**
   * Returns all available code categories by aggregating them from the in-memory index.
   */
  async getCategories(): Promise<string[]> {
    const summaries = await this.getCategorySummaries();
    return summaries.map(s => s.category).sort();
  }

  /**
   * Returns rich summaries for all code categories in the database.
   */

  private async readVideosIndex(): Promise<VideosIndexFile | null> {
    const mainFile = await this.storage.readFile<any>("index/videos.json");
    if (!mainFile || !mainFile.data) return null;

    if (mainFile.data.chunks && mainFile.data.chunks.length > 0) {
      try {
        const chunkPromises = mainFile.data.chunks.map((chunkPath: string) => 
          this.storage.readFile<any>(chunkPath).catch(() => null)
        );
        const chunkResults = await Promise.all(chunkPromises);
        
        let allItems: any[] = [];
        for (const res of chunkResults) {
          if (res && res.data && Array.isArray(res.data.videos)) {
            allItems = allItems.concat(res.data.videos);
          }
        }
        mainFile.data.videos = allItems;
      } catch (e) {
        console.error("Failed to load chunks for videos", e);
      }
    }
    
    return mainFile.data as VideosIndexFile;
  }


  /**
   * Rebuilds the category summaries and saves it to index/codes-summary.json in GitHub
   */
  async rebuildCategorySummaries(): Promise<void> {
    try {
      const summaries = await this.getCategorySummaries();
      const content = {
        version: 1,
        updatedAt: new Date().toISOString(),
        totalCategories: summaries.length,
        categories: summaries
      };
      await this.storage.writeFile("index/codes-summary.json", content, "Rebuild codes-summary.json");
      console.log("[CodeRegistry] Rebuilt codes-summary.json in GitHub storage.");
    } catch (e) {
      console.error("[CodeRegistry] Failed to rebuild codes-summary.json:", e);
    }
  }

  async getCategorySummaries(): Promise<CodeCategorySummary[]> {
    const { index } = await this.getOrLoadIndex();
    
    // Load videos index for thumbnails map
    const videosMap: Record<string, { thumbnail?: string; duration?: string; releaseDate?: string }> = {};
    try {
      const videosData = await this.readVideosIndex();
      const videosFile = videosData ? { data: videosData } : null;
      if (videosFile && Array.isArray(videosFile.data?.videos)) {
        for (const v of videosFile.data.videos) {
          if (v.code) {
            const norm = normalizeCode(v.code);
            if (norm) {
              videosMap[norm] = {
                thumbnail: v.thumbnail,
                duration: v.duration,
                releaseDate: v.releaseDate,
              };
            }
          }
        }
      }
    } catch {
      // ignore
    }

    const categoriesMap: Record<
      string,
      {
        category: string;
        codes: CodeIndexSummary[];
        numbers: number[];
        actresses: Record<string, number>;
        studios: Record<string, number>;
        thumbnails: string[];
        lastAddedAt: string;
      }
    > = {};

    for (const entry of Object.values(index.codes)) {
      const cat = getCodeCategory(entry.code);
      if (!cat) continue;

      if (!categoriesMap[cat]) {
        categoriesMap[cat] = {
          category: cat,
          codes: [],
          numbers: [],
          actresses: {},
          studios: {},
          thumbnails: [],
          lastAddedAt: entry.addedAt || new Date().toISOString(),
        };
      }

      const catObj = categoriesMap[cat];
      catObj.codes.push(entry);

      const numInfo = extractCodeNumber(entry.code);
      if (numInfo.numberVal > 0) {
        catObj.numbers.push(numInfo.numberVal);
      }

      if (entry.actressName) {
        catObj.actresses[entry.actressName] = (catObj.actresses[entry.actressName] || 0) + 1;
      }
      if (entry.studioName) {
        catObj.studios[entry.studioName] = (catObj.studios[entry.studioName] || 0) + 1;
      }

      const vInfo = videosMap[entry.code];
      if (vInfo?.thumbnail && catObj.thumbnails.length < 4 && !catObj.thumbnails.includes(vInfo.thumbnail)) {
        catObj.thumbnails.push(vInfo.thumbnail);
      }

      if (entry.addedAt && (!catObj.lastAddedAt || entry.addedAt > catObj.lastAddedAt)) {
        catObj.lastAddedAt = entry.addedAt;
      }
    }

    const summaries: CodeCategorySummary[] = Object.values(categoriesMap).map((c) => {
      const sortedNums = Array.from(new Set(c.numbers)).sort((a, b) => a - b);
      const minNumber = sortedNums.length > 0 ? sortedNums[0] : 0;
      const maxNumber = sortedNums.length > 0 ? sortedNums[sortedNums.length - 1] : 0;

      // Top actresses
      const topActresses = Object.entries(c.actresses)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // Top studios
      const topStudios = Object.entries(c.studios)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // Sample codes sorted by number
      const sortedCodes = [...c.codes].sort((a, b) => {
        const numA = extractCodeNumber(a.code).numberVal;
        const numB = extractCodeNumber(b.code).numberVal;
        return numA - numB;
      });

      const sampleCodes = sortedCodes.slice(0, 6).map((x) => x.code);
      const sampleNumbers = sortedNums.slice(0, 12);

      let numberRangeFormatted = `${c.codes.length} videos`;
      if (minNumber > 0 && maxNumber > 0) {
        numberRangeFormatted = `#${String(minNumber).padStart(3, "0")} - #${String(maxNumber).padStart(3, "0")}`;
      }

      return {
        category: c.category,
        totalCount: c.codes.length,
        minNumber,
        maxNumber,
        numberRangeFormatted,
        sampleCodes,
        sampleNumbers,
        topActresses,
        topStudios,
        sampleThumbnails: c.thumbnails,
        lastAddedAt: c.lastAddedAt,
      };
    });

    // Sort by count descending
    return summaries.sort((a, b) => b.totalCount - a.totalCount || a.category.localeCompare(b.category));
  }

  /**
   * Retrieves full number-wise listing and details for a specific code category.
   */
  async getCategoryDetails(
    categoryParam: string,
    options: {
      page?: number;
      limit?: number;
      sort?: string; // "number_asc" | "number_desc" | "latest" | "title"
      q?: string;
      minNum?: number;
      maxNum?: number;
      exactNum?: number;
    } = {}
  ): Promise<CategoryDetailsResult> {
    const targetCat = (categoryParam || "").toUpperCase().trim();
    const { data: prefixData } = await this.loadPrefixIndex(targetCat);

    // Load videos index for enrichment
    const videosMap: Record<string, { thumbnail?: string; duration?: string; releaseDate?: string }> = {};
    try {
      const videosData = await this.readVideosIndex();
      const videosFile = videosData ? { data: videosData } : null;
      if (videosFile && Array.isArray(videosFile.data?.videos)) {
        for (const v of videosFile.data.videos) {
          if (v.code) {
            const norm = normalizeCode(v.code);
            if (norm) {
              videosMap[norm] = {
                thumbnail: v.thumbnail,
                duration: v.duration,
                releaseDate: v.releaseDate,
              };
            }
          }
        }
      }
    } catch {
      // ignore
    }

    const items = Array.isArray(prefixData?.codes)
      ? prefixData.codes
      : Array.isArray(prefixData?.videos)
      ? prefixData.videos
      : [];

    const matchingEntries: CategoryNumberItem[] = [];

    if (items.length > 0) {
      for (const entry of items) {
        const norm = normalizeCode(entry.code || "");
        if (!norm) continue;
        const numInfo = extractCodeNumber(norm);
        const vInfo = videosMap[norm];

        matchingEntries.push({
          code: norm,
          number: numInfo.numberVal,
          numberFormatted: numInfo.numberFormatted,
          title: entry.title || norm,
          postUrl: entry.postUrl || "",
          thumbnail: entry.thumbnail || vInfo?.thumbnail,
          actressName: entry.actress?.name || entry.actressName,
          actressSlug: entry.actress?.slug || entry.actressSlug,
          studioName: entry.studio?.name || entry.studioName,
          studioSlug: entry.studio?.slug || entry.studioSlug,
          duration: vInfo?.duration,
          releaseDate: entry.releaseDate || vInfo?.releaseDate,
          addedAt: entry.addedAt || new Date().toISOString(),
        });
      }

    }

    const totalCount = matchingEntries.length;
    const sortedAllNumbers = [...matchingEntries]
      .sort((a, b) => a.number - b.number || a.code.localeCompare(b.code))
      .map((item) => ({
        number: item.number,
        code: item.code,
        title: item.title,
        hasThumbnail: Boolean(item.thumbnail),
      }));

    const minNumber = sortedAllNumbers.length > 0 ? sortedAllNumbers[0].number : 0;
    const maxNumber = sortedAllNumbers.length > 0 ? sortedAllNumbers[sortedAllNumbers.length - 1].number : 0;

    // Filter
    let filtered = matchingEntries;
    if (options.q && options.q.trim()) {
      const qLower = options.q.toLowerCase().trim();
      filtered = filtered.filter(
        (i) =>
          i.code.toLowerCase().includes(qLower) ||
          i.title.toLowerCase().includes(qLower) ||
          (i.actressName && i.actressName.toLowerCase().includes(qLower)) ||
          (i.studioName && i.studioName.toLowerCase().includes(qLower)) ||
          String(i.number).includes(qLower)
      );
    }
    if (typeof options.exactNum === "number" && !isNaN(options.exactNum)) {
      filtered = filtered.filter((i) => i.number === options.exactNum);
    }
    if (typeof options.minNum === "number" && !isNaN(options.minNum)) {
      filtered = filtered.filter((i) => i.number >= options.minNum!);
    }
    if (typeof options.maxNum === "number" && !isNaN(options.maxNum)) {
      filtered = filtered.filter((i) => i.number <= options.maxNum!);
    }

    // Sort
    const sortMode = options.sort || "number_asc";
    if (sortMode === "number_desc") {
      filtered.sort((a, b) => b.number - a.number || b.code.localeCompare(a.code));
    } else if (sortMode === "latest") {
      filtered.sort((a, b) => {
        const timeA = new Date(a.addedAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.addedAt || b.updatedAt || 0).getTime();
        return timeB - timeA;
      });
    } else if (sortMode === "title") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // number_asc
      filtered.sort((a, b) => a.number - b.number || a.code.localeCompare(b.code));
    }

    const totalFound = filtered.length;
    const limit = Math.max(1, Math.min(200, options.limit || 50));
    const totalPages = Math.ceil(totalFound / limit) || 1;
    const page = Math.max(1, Math.min(totalPages, options.page || 1));
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      category: targetCat,
      totalCount,
      totalFound,
      minNumber,
      maxNumber,
      allNumbers: sortedAllNumbers,
      page,
      totalPages,
      limit,
      sort: sortMode,
      items: paginated,
    };
  }

  /**
   * Retrieves an individual code file directly from GitHub.
   */
  async getCodeFile(code: string): Promise<any | null> {
    const path = getCodeFilePath(code);
    if (!path) return null;
    try {
      const result = await this.storage.readFile(path);
      return result.data;
    } catch (err: any) {
      if (err.message && err.message.includes("404")) {
        return null;
      }
      throw err;
    }
  }

  async checkCode(rawCode: string): Promise<CodeCheckResult> {
    const normalized = normalizeCode(rawCode);
    if (!normalized) {
      return {
        rawCode,
        normalizedCode: null,
        isValidFormat: false,
        isDuplicate: false,
      };
    }

    const cat = getCodeCategory(normalized);
    let entry: any = undefined;
    if (cat) {
      const { data: prefixIndex } = await this.loadPrefixIndex(cat);
      const itemsList = Array.isArray(prefixIndex.codes) ? prefixIndex.codes : (Array.isArray(prefixIndex.videos) ? prefixIndex.videos : []);
      entry = itemsList.find((v: any) => normalizeCode(v.code) === normalized);
    }

    return {
      rawCode,
      normalizedCode: normalized,
      isValidFormat: true,
      isDuplicate: Boolean(entry),
      entry,
    };
  }

  /**
   * Batch checks a list of candidate codes in O(1) per item against the in-memory cache.
   */
  async checkBatch(rawCodes: string[]): Promise<CodeCheckResult[]> {
    const results: CodeCheckResult[] = [];
    
    // Group codes by category to load prefix files efficiently
    const byCategory = new Map<string, string[]>();
    for (const raw of rawCodes) {
      const normalized = normalizeCode(raw);
      if (!normalized) continue;
      const cat = getCodeCategory(normalized);
      if (cat) {
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(normalized);
      }
    }
    
    const prefixEntries = new Map<string, any>();
    for (const cat of byCategory.keys()) {
      const { data: prefixIndex } = await this.loadPrefixIndex(cat);
      const itemsList = Array.isArray(prefixIndex.codes) ? prefixIndex.codes : (Array.isArray(prefixIndex.videos) ? prefixIndex.videos : []);
      for (const item of itemsList) {
        const norm = normalizeCode(item.code);
        if (norm) prefixEntries.set(norm, item);
      }
    }

    return rawCodes.map((raw) => {
      const normalized = normalizeCode(raw);
      if (!normalized) {
        return {
          rawCode: raw,
          normalizedCode: null,
          isValidFormat: false,
          isDuplicate: false,
        };
      }
      const entry = prefixEntries.get(normalized);
      return {
        rawCode: raw,
        normalizedCode: normalized,
        isValidFormat: true,
        isDuplicate: Boolean(entry),
        entry,
      };
    });
  }

  /**
   * Atomically registers new codes into the split index/codes/{PREFIX}.json files on GitHub.
   * Pulls the latest SHA first for the specific prefix file to prevent race conditions.
   */
  async registerCodes(items: RegisterCodeItem[]): Promise<RegisterCodesResult> {
    const registered: string[] = [];
    const duplicates: string[] = [];
    const invalid: string[] = [];
    const now = new Date().toISOString();

    const itemsByPrefix = new Map<string, RegisterCodeItem[]>();
    for (const item of items) {
      const normalized = normalizeCode(item.code);
      if (!normalized) {
        invalid.push(item.code);
        continue;
      }
      const cat = getCodeCategory(normalized);
      if (!cat) {
        invalid.push(item.code);
        continue;
      }
      if (!itemsByPrefix.has(cat)) {
        itemsByPrefix.set(cat, []);
      }
      itemsByPrefix.get(cat)!.push({ ...item, code: normalized });
    }

    let lastCommitSha: string | undefined;

    for (const [prefix, prefixItems] of itemsByPrefix.entries()) {
      const { data: prefixIndex, sha: currentSha } = await this.loadPrefixIndex(prefix, true);
      const itemsList = Array.isArray(prefixIndex.codes)
        ? [...prefixIndex.codes]
        : Array.isArray(prefixIndex.videos)
        ? [...prefixIndex.videos]
        : [];
      const existingCodes = new Set(itemsList.map((v: any) => normalizeCode(v.code)));

      let modified = false;

      for (const item of prefixItems) {
        if (existingCodes.has(item.code)) {
          duplicates.push(item.code);
          continue;
        }

        const newEntry = {
          code: item.code,
          title: item.title || item.code,
          releaseDate: item.releaseDate || null,
          thumbnail: item.thumbnail || null,
          postUrl: item.postUrl || "",
          ...(item.actressName ? { actress: { name: item.actressName, slug: item.actressSlug || normalizeSlug(item.actressName) } } : {}),
          ...(item.studioName ? { studio: { name: item.studioName, slug: item.studioSlug || normalizeSlug(item.studioName) } } : {}),
          addedAt: now,
        };

        itemsList.push(newEntry);
        existingCodes.add(item.code);
        registered.push(item.code);
        modified = true;
      }

      if (modified) {
        const updatedPrefixFile = {
          prefix,
          version: 1,
          updatedAt: now,
          totalCount: itemsList.length,
          codes: itemsList,
          videos: itemsList,
        };

        const indexPath = getCodeIndexPath(prefix);
        const writeResult = await this.storage.writeFile(
          indexPath,
          updatedPrefixFile,
          `[Code Registry] Register ${registered.length} code(s) under ${prefix}`,
          currentSha || undefined
        );

        lastCommitSha = writeResult.sha;
        this.prefixCache.set(prefix, { data: updatedPrefixFile, sha: writeResult.sha, fetchedAt: Date.now() });
      }
    }

    // Invalidate aggregated cache
    this.cachedIndex = null;
    this.lastFetchedAt = 0;
    
    // Trigger background rebuild of category summaries
    if (registered.length > 0) {
      this.rebuildCategorySummaries().catch(e => console.error("Background summary rebuild failed:", e));
    }

    const stats = await this.getStats();

    return {
      success: true,
      registered,
      duplicates,
      invalid,
      totalCount: stats.totalCount,
      commitSha: lastCommitSha,
    };
  }

  /**
   * Safely unregisters/removes a code from its split prefix index file.
   */
  async unregisterCode(code: string): Promise<boolean> {
    const normalized = normalizeCode(code);
    if (!normalized) return false;

    const cat = getCodeCategory(normalized);
    if (!cat) return false;

    const { data: prefixIndex, sha: currentSha } = await this.loadPrefixIndex(cat, true);
    const videosList = Array.isArray(prefixIndex.videos) ? prefixIndex.videos : [];
    const filteredVideos = videosList.filter((v: any) => normalizeCode(v.code) !== normalized);

    if (filteredVideos.length === videosList.length) {
      return false;
    }

    const updatedPrefixFile = {
      prefix: cat,
      version: 1,
      updatedAt: new Date().toISOString(),
      totalCount: filteredVideos.length,
      videos: filteredVideos,
    };

    const indexPath = getCodeIndexPath(cat);
    const writeResult = await this.storage.writeFile(
      indexPath,
      updatedPrefixFile,
      `[Code Registry] Unregister code: ${normalized}`,
      currentSha || undefined
    );

    this.prefixCache.set(cat, { data: updatedPrefixFile, sha: writeResult.sha, fetchedAt: Date.now() });
    this.cachedIndex = null;
    this.lastFetchedAt = 0;

    return true;
  }

  /**
   * Retrieves summary statistics for the codes registry.
   */
  async getStats(): Promise<{
    totalCount: number;
    updatedAt: string;
    cacheAgeMs: number;
    sampleCodes: string[];
  }> {
    const summaries = await this.getCategorySummaries();
    const totalCount = summaries.reduce((acc, sum) => acc + sum.totalCount, 0);
    const sampleCodes = summaries.slice(0, 5).flatMap(s => s.sampleCodes).slice(0, 10);
    
    return {
      totalCount,
      updatedAt: new Date().toISOString(),
      cacheAgeMs: 0,
      sampleCodes,
    };
  }

  /**
   * Automated verification test runner for Step 4 stop rule.
   */
  async runDeduplicationTest(): Promise<{
    success: boolean;
    durationMs: number;
    steps: Array<{ name: string; status: "passed" | "failed"; durationMs: number; details?: unknown }>;
  }> {
    const start = Date.now();
    const steps: Array<{ name: string; status: "passed" | "failed"; durationMs: number; details?: unknown }> = [];
    const testCode = `TEST-${Math.floor(10000 + Math.random() * 89999)}`;

    try {
      // Step 1: Check non-existent code
      const step1Start = Date.now();
      const check1 = await this.checkCode(testCode);
      if (check1.isDuplicate) {
        throw new Error(`Test code ${testCode} unexpectedly reported as duplicate`);
      }
      steps.push({
        name: "Check Non-Existent Code (Negative Check)",
        status: "passed",
        durationMs: Date.now() - step1Start,
        details: check1,
      });

      // Step 2: Register test code
      const step2Start = Date.now();
      const regResult = await this.registerCodes([
        {
          code: testCode,
          title: "Automated Deduplication Verification Item",
          postUrl: "https://example.com/test-dedup",
          actressName: "Test Actress",
          studioName: "Test Studio",
        },
      ]);
      if (!regResult.registered.includes(testCode)) {
        throw new Error(`Failed to register test code ${testCode}`);
      }
      steps.push({
        name: "Register Unique Code (Atomic Write)",
        status: "passed",
        durationMs: Date.now() - step2Start,
        details: { registered: regResult.registered, commitSha: regResult.commitSha },
      });

      // Step 3: Check registered code immediately (O(1) Positive Check)
      const step3Start = Date.now();
      const check2 = await this.checkCode(testCode);
      if (!check2.isDuplicate || !check2.entry) {
        throw new Error(`Registered code ${testCode} was not found in duplicate index check`);
      }
      steps.push({
        name: "Positive O(1) Deduplication Check",
        status: "passed",
        durationMs: Date.now() - step3Start,
        details: check2,
      });

      // Step 4: Attempt duplicate re-registration
      const step4Start = Date.now();
      const reRegResult = await this.registerCodes([
        {
          code: testCode,
          title: "Attempt Duplicate Registration",
        },
      ]);
      if (reRegResult.registered.length > 0 || !reRegResult.duplicates.includes(testCode)) {
        throw new Error(`Duplicate re-registration was not correctly prevented: ${JSON.stringify(reRegResult)}`);
      }
      steps.push({
        name: "Prevent Duplicate Re-Registration (Guard Validation)",
        status: "passed",
        durationMs: Date.now() - step4Start,
        details: reRegResult,
      });

      // Step 5: Clean rollback of test code
      const step5Start = Date.now();
      const unregSuccess = await this.unregisterCode(testCode);
      steps.push({
        name: "Rollback & Cleanup Test Code",
        status: unregSuccess ? "passed" : "failed",
        durationMs: Date.now() - step5Start,
        details: { unregisterSuccess: unregSuccess },
      });

      return {
        success: steps.every((s) => s.status === "passed"),
        durationMs: Date.now() - start,
        steps,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      steps.push({
        name: "Test Failure",
        status: "failed",
        durationMs: Date.now() - start,
        details: { error: msg },
      });
      return {
        success: false,
        durationMs: Date.now() - start,
        steps,
      };
    }
  }
}
