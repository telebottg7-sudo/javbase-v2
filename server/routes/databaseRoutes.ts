import { Router, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { githubStorage } from "../storage";
import { codeRegistryService, ingestionService } from "../services";
import { checkDatabaseIndexes, initializeDatabaseIndexes, normalizeCode, normalizeSlug, extractCodeNumber } from "../schema";
import { LatestIndexFile, LatestIndexEntry, StatsIndexFile } from "../schema/types";

const router = Router();

/**
 * Synchronizes all split prefix index files (e.g. database/index/codes/SSIS.json)
 * using ALL videos from ingestionService / codeRegistry without any 100-item caps.
 */
export async function syncPrefixIndexFiles(): Promise<Record<string, number>> {
  const videosIdx = await ingestionService.getVideosIndex(true).catch(() => ({ totalCount: 0, videos: [] }));
  const { index } = await codeRegistryService.getOrLoadIndex(true);
  
  // Combine all items by normalized code
  const itemsMap = new Map<string, any>();
  
  if (videosIdx.videos && Array.isArray(videosIdx.videos)) {
    for (const v of videosIdx.videos) {
      if (v.code) {
        const norm = normalizeCode(v.code) || v.code;
        itemsMap.set(norm, {
          code: norm,
          title: v.title || norm,
          releaseDate: v.releaseDate || (v as any).release_date || null,
          thumbnail: v.thumbnail || null,
          postUrl: v.postUrl || (v as any).post_url || "",
          actress: v.actressSlug && v.actressName ? { name: v.actressName, slug: v.actressSlug } : null,
          studio: v.studioSlug && v.studioName ? { name: v.studioName, slug: v.studioSlug } : null,
        });
      }
    }
  }

  if (index?.codes) {
    for (const c of Object.values(index.codes)) {
      if (c.code) {
        const norm = normalizeCode(c.code) || c.code;
        if (!itemsMap.has(norm)) {
          itemsMap.set(norm, {
            code: norm,
            title: c.title || norm,
            releaseDate: (c as any).releaseDate || null,
            thumbnail: (c as any).thumbnail || null,
            postUrl: c.postUrl || "",
            actress: c.actressName ? { name: c.actressName, slug: c.actressSlug || normalizeSlug(c.actressName) } : null,
            studio: c.studioName ? { name: c.studioName, slug: c.studioSlug || normalizeSlug(c.studioName) } : null,
          });
        }
      }
    }
  }

  const groups: Record<string, any[]> = {};
  for (const item of itemsMap.values()) {
    const parts = item.code.split("-");
    const prefix = parts.length > 1 ? parts[0].toUpperCase() : "OTHER";
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(item);
  }

  const dir = path.join(process.cwd(), "database", "index");
  const codesDir = path.join(dir, "codes");
  await fs.mkdir(codesDir, { recursive: true });

  const resultCounts: Record<string, number> = {};

  for (const [prefix, list] of Object.entries(groups)) {
    const sortedList = [...list].sort((a, b) => {
      const numA = extractCodeNumber(a.code).numberVal;
      const numB = extractCodeNumber(b.code).numberVal;
      return numA - numB;
    });

    const prefixData = {
      prefix,
      version: 1,
      updatedAt: new Date().toISOString(),
      totalCount: sortedList.length,
      codes: sortedList,
      videos: sortedList,
    };

    resultCounts[prefix] = sortedList.length;

    await fs.writeFile(
      path.join(codesDir, `${prefix}.json`),
      JSON.stringify(prefixData, null, 2),
      "utf-8"
    );

    try {
      await githubStorage.writeFile(
        `index/codes/${prefix}.json`,
        prefixData,
        `[Index] Synchronize index/codes/${prefix}.json (${sortedList.length} items)`
      );
    } catch (err) {
      console.warn(`[Index Sync] Could not write index/codes/${prefix}.json to GitHub:`, err);
    }
  }

  return resultCounts;
}

/**
 * Helper to fetch or compute database/index/stats.json from actual database
 */
export async function getDatabaseStatsIndex(): Promise<StatsIndexFile> {
  const statsPath = "index/stats.json";

  const [codesStats, videosIdx, actressesIdx, studiosIdx] = await Promise.all([
    codeRegistryService.getStats().catch(() => ({ totalCount: 0 })),
    ingestionService.getVideosIndex().catch(() => ({ totalCount: 0 })),
    ingestionService.getActressesIndex().catch(() => ({ totalCount: 0 })),
    ingestionService.getStudiosIndex().catch(() => ({ totalCount: 0 })),
  ]);

  const totalCodes = codesStats.totalCount || videosIdx.totalCount || 0;
  const totalVideos = videosIdx.totalCount || totalCodes || 0;
  const totalActresses = actressesIdx.totalCount || 0;
  const totalStudios = studiosIdx.totalCount || 0;

  const statsIndex: StatsIndexFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    totalVideos,
    totalActresses,
    totalStudios,
    totalCodes,
  };

  // Write to githubStorage & local disk asynchronously
  try {
    await githubStorage.writeFile(statsPath, statsIndex, "[Index] Synchronize index/stats.json");
  } catch {}

  try {
    const dir = path.join(process.cwd(), "database", "index");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "stats.json"), JSON.stringify(statsIndex, null, 2), "utf-8");
  } catch {}

  return statsIndex;
}

// Stats index endpoint
router.get(["/database/stats", "/stats"], async (_req: Request, res: Response) => {
  try {
    const stats = await getDatabaseStatsIndex();
    res.json(stats);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

/**
 * Helper to fetch or compile database/index/latest.json
 */
export async function getLatestVideosIndex(): Promise<LatestIndexFile> {
  const latestPath = "index/latest.json";
  const videosIdx = await ingestionService.getVideosIndex().catch(() => ({ totalCount: 0, videos: [] }));
  
  // 1. Try reading from storage if non-empty or if total count is truly zero
  const file = await githubStorage.readFile<LatestIndexFile>(latestPath);
  if (file?.data?.videos && Array.isArray(file.data.videos)) {
    if (file.data.videos.length > 0 || videosIdx.videos.length === 0) {
      return file.data;
    }
  }

  // 2. Try reading local file
  const localPath = path.join(process.cwd(), "database", "index", "latest.json");
  try {
    const raw = await fs.readFile(localPath, "utf-8");
    const parsed: LatestIndexFile = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.videos) && (parsed.videos.length > 0 || videosIdx.videos.length === 0)) {
      return parsed;
    }
  } catch {}

  // 3. Compile from ingestionService videos index or codeRegistry
  let compiledVideos: LatestIndexEntry[] = [];

  if (videosIdx.videos && videosIdx.videos.length > 0) {
    compiledVideos = videosIdx.videos.slice(0, 100).map((v) => ({
      code: v.code,
      title: v.title,
      thumbnail: v.thumbnail || null,
      postUrl: v.postUrl,
      releaseDate: v.releaseDate || null,
      addedAt: v.scrapedAt || new Date().toISOString(),
      actress: v.actressSlug && v.actressName ? { name: v.actressName, slug: v.actressSlug } : null,
      studio: v.studioSlug && v.studioName ? { name: v.studioName, slug: v.studioSlug } : null,
    }));
  } else {
    const { index } = await codeRegistryService.getOrLoadIndex(true);
    const codeEntries = Object.values(index.codes);

    if (codeEntries.length > 0) {
      // Sort by addedAt DESC (fallback to updatedAt DESC)
      const sorted = [...codeEntries].sort((a, b) => {
        const timeA = new Date(a.addedAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.addedAt || b.updatedAt || 0).getTime();
        return timeB - timeA;
      });

      compiledVideos = sorted.slice(0, 100).map((c) => ({
        code: c.code,
        title: c.title || c.code,
        thumbnail: null,
        postUrl: c.postUrl || `https://example.com/posts/${c.code.toLowerCase()}`,
        releaseDate: new Date().toISOString().split("T")[0],
        addedAt: c.addedAt || new Date().toISOString(),
        actress: c.actressName ? { name: c.actressName, slug: c.actressSlug || c.actressName.toLowerCase().replace(/[^a-z0-9]+/g, "-") } : null,
        studio: c.studioName ? { name: c.studioName, slug: c.studioSlug || c.studioName.toLowerCase().replace(/[^a-z0-9]+/g, "-") } : null,
      }));
    }
  }

  // 4. Return empty array if database is empty
  // (Demo data removed per request)

  const latestIndex: LatestIndexFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    totalCount: compiledVideos.length,
    videos: compiledVideos,
  };

  // Write to storage & local disk asynchronously
  try {
    await githubStorage.writeFile(latestPath, latestIndex, "[Index] Synchronize index/latest.json");
  } catch {}

  try {
    const dir = path.join(process.cwd(), "database", "index");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "latest.json"), JSON.stringify(latestIndex, null, 2), "utf-8");

    // Asynchronously synchronize all prefix index files without capping
    syncPrefixIndexFiles().catch((err) => {
      console.warn("[Index Sync] Error running syncPrefixIndexFiles:", err);
    });
  } catch {}

  return latestIndex;
}

// Latest videos index endpoint
router.get(["/database/latest", "/latest", "/videos/latest"], async (_req: Request, res: Response) => {
  try {
    const latest = await getLatestVideosIndex();
    res.json(latest);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Schema verification status
router.get("/database/schema-status", async (_req: Request, res: Response) => {
  try {
    const report = await checkDatabaseIndexes(githubStorage);
    res.json(report);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

// Schema initialization in GitHub repo
router.post("/database/init", async (_req: Request, res: Response) => {
  try {
    const result = await initializeDatabaseIndexes(githubStorage);
    res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: errorMsg });
  }
});

export default router;
