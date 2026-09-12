import fs from "fs/promises";
import path from "path";
import {
  CanonicalVideoJson,
  getCodeCategory,
  getCodeIndexPath,
  normalizeToCanonicalVideo,
} from "../normalize/videoNormalizer";

export interface IndexGenReport {
  latestVideosCount: number;
  codePrefixIndexesGenerated: number;
  totalActressesIndexed: number;
  totalStudiosIndexed: number;
  totalVideosCount: number;
  stats: {
    totalVideos: number;
    totalActresses: number;
    totalStudios: number;
    totalCodes: number;
  };
  generatedFiles: string[];
}

/**
 * Reads all canonical video JSON files from database/codes/{PREFIX}/{CODE}.json (single source of truth).
 * Fallback scans database/pstar and database/studio if codes directory is absent/empty.
 */
async function loadAllCanonicalVideos(databaseRootDir: string): Promise<CanonicalVideoJson[]> {
  const videos: CanonicalVideoJson[] = [];
  const seenCodes = new Set<string>();

  // 1. Primary Source of Truth: database/codes/{PREFIX}/*.json
  const canonicalCodesDir = path.join(databaseRootDir, "codes");
  try {
    const prefixDirs = await fs.readdir(canonicalCodesDir, { withFileTypes: true });
    for (const prefixDirent of prefixDirs) {
      if (prefixDirent.isDirectory()) {
        const prefixDirPath = path.join(canonicalCodesDir, prefixDirent.name);
        const videoFiles = await fs.readdir(prefixDirPath, { withFileTypes: true });

        for (const fileDirent of videoFiles) {
          if (fileDirent.isFile() && fileDirent.name.endsWith(".json")) {
            const filePath = path.join(prefixDirPath, fileDirent.name);
            try {
              const content = await fs.readFile(filePath, "utf-8");
              if (content.trim()) {
                const parsed = JSON.parse(content);
                const canonical = normalizeToCanonicalVideo(parsed);
                if (canonical && canonical.code && !seenCodes.has(canonical.code)) {
                  seenCodes.add(canonical.code);
                  videos.push(canonical);
                }
              }
            } catch (err: any) {
              console.warn(`[IndexGen] Failed to parse video file ${filePath}:`, err.message);
            }
          }
        }
      }
    }
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      console.warn(`[IndexGen] Failed to read codes directory:`, err.message);
    }
  }

  // 2. Secondary/Fallback Scan: Check database/pstar, database/studio, database/actresses, database/studios for missing individual videos
  const fallbackDirs = ["pstar", "studio", "actresses", "studios"];
  for (const dirName of fallbackDirs) {
    const targetDir = path.join(databaseRootDir, dirName);
    try {
      const subDirs = await fs.readdir(targetDir, { withFileTypes: true });
      for (const subDirent of subDirs) {
        if (subDirent.isDirectory()) {
          const subDirPath = path.join(targetDir, subDirent.name);
          const files = await fs.readdir(subDirPath, { withFileTypes: true });
          for (const fileDirent of files) {
            if (fileDirent.isFile() && fileDirent.name.endsWith(".json")) {
              const filePath = path.join(subDirPath, fileDirent.name);
              try {
                const content = await fs.readFile(filePath, "utf-8");
                if (content.trim()) {
                  const parsed = JSON.parse(content);
                  if (parsed && typeof parsed === "object") {
                    const candidateVideos = Array.isArray(parsed.videos)
                      ? parsed.videos
                      : Array.isArray(parsed.codes)
                      ? parsed.codes
                      : [parsed];

                    for (const raw of candidateVideos) {
                      const canonical = normalizeToCanonicalVideo(raw);
                      if (canonical && canonical.code && !seenCodes.has(canonical.code)) {
                        seenCodes.add(canonical.code);
                        videos.push(canonical);
                      }
                    }
                  }
                }
              } catch {}
            }
          }
        }
      }
    } catch {}
  }

  return videos;
}

/**
 * Regenerates all database indexes directly from the canonical video files (single source of truth).
 * 
 * Generated Index Artifacts:
 * 1. database/index/latest.json - Newest 50-100 videos sorted by addedAt DESC (fallback: updatedAt DESC)
 * 2. database/index/codes/{PREFIX}.json - Lightweight prefix indexes for searching & fast listing
 * 3. database/index/actresses.json - Aggregated actress catalog index
 * 4. database/index/studios.json - Aggregated studio catalog index
 * 5. database/index/stats.json - Real calculated totals
 * 6. database/index/videos.json - Backward-compatible summary index
 */
export async function regenerateAllIndexes(databaseRootDir: string): Promise<IndexGenReport> {
  const indexDir = path.join(databaseRootDir, "index");
  const codeIndexDir = path.join(indexDir, "codes");
  await fs.mkdir(codeIndexDir, { recursive: true });

  const generatedFiles: string[] = [];
  const videos = await loadAllCanonicalVideos(databaseRootDir);
  const now = new Date().toISOString();

  // 1. Sort videos for latest.json: addedAt DESC, fallback updatedAt DESC
  const sortedVideos = [...videos].sort((a, b) => {
    const timeA = new Date(a.addedAt || a.updatedAt || 0).getTime();
    const timeB = new Date(b.addedAt || b.updatedAt || 0).getTime();
    return timeB - timeA;
  });

  // Build latest.json (Latest 100 videos)
  const latest100 = sortedVideos.slice(0, 100).map((v) => ({
    code: v.code,
    title: v.title,
    actress: v.actress,
    studio: v.studio,
    duration: v.duration,
    releaseDate: v.releaseDate,
    thumbnail: v.thumbnail,
    postUrl: v.postUrl,
    addedAt: v.addedAt,
    updatedAt: v.updatedAt,
  }));

  const latestJsonContent = {
    version: 1,
    updatedAt: now,
    totalCount: latest100.length,
    videos: latest100,
  };

  const latestPath = path.join(indexDir, "latest.json");
  await fs.writeFile(latestPath, JSON.stringify(latestJsonContent, null, 2), "utf-8");
  generatedFiles.push("index/latest.json");

  // 2. Generate per-prefix code indexes: index/codes/{PREFIX}.json
  const prefixGroups = new Map<string, CanonicalVideoJson[]>();
  for (const video of videos) {
    const cat = getCodeCategory(video.code) || "OTHER";
    let list = prefixGroups.get(cat);
    if (!list) {
      list = [];
      prefixGroups.set(cat, list);
    }
    list.push(video);
  }

  for (const [prefix, catVideos] of prefixGroups.entries()) {
    // Sort number-wise or latest
    const lightweightEntries = catVideos.map((v) => ({
      code: v.code,
      title: v.title || v.code,
      releaseDate: v.releaseDate || null,
      thumbnail: v.thumbnail || null,
      postUrl: v.postUrl || null,
      ...(v.actress ? { actress: { name: v.actress.name, slug: v.actress.slug } } : {}),
      ...(v.studio ? { studio: { name: v.studio.name, slug: v.studio.slug } } : {}),
      ...(v.addedAt ? { addedAt: v.addedAt } : {}),
    }));

    const prefixIndexContent = {
      prefix,
      version: 1,
      updatedAt: now,
      totalCount: lightweightEntries.length,
      codes: lightweightEntries,
      videos: lightweightEntries,
    };

    const prefixPath = path.join(databaseRootDir, getCodeIndexPath(prefix));
    await fs.mkdir(path.dirname(prefixPath), { recursive: true });
    await fs.writeFile(prefixPath, JSON.stringify(prefixIndexContent, null, 2), "utf-8");
    generatedFiles.push(`index/codes/${prefix}.json`);
  }

  // 3. Aggregate Actresses Index: index/actresses.json
  const actressMap = new Map<string, { name: string; slug: string; thumbnail?: string; videoCount: number; latestVideoDate?: string }>();
  for (const video of videos) {
    if (video.actress && video.actress.name && video.actress.slug) {
      const existing = actressMap.get(video.actress.slug);
      if (existing) {
        existing.videoCount++;
        if (!existing.thumbnail && video.thumbnail) existing.thumbnail = video.thumbnail;
      } else {
        actressMap.set(video.actress.slug, {
          name: video.actress.name,
          slug: video.actress.slug,
          thumbnail: video.thumbnail || undefined,
          videoCount: 1,
          latestVideoDate: video.releaseDate || undefined,
        });
      }
    }
  }

  const actressesList = Array.from(actressMap.values()).sort((a, b) => b.videoCount - a.videoCount || a.name.localeCompare(b.name));
  const actressesIndexContent = {
    version: 1,
    updatedAt: now,
    totalCount: actressesList.length,
    actresses: actressesList,
  };
  const actressesIndexPath = path.join(indexDir, "actresses.json");
  await fs.writeFile(actressesIndexPath, JSON.stringify(actressesIndexContent, null, 2), "utf-8");
  generatedFiles.push("index/actresses.json");

  // 4. Aggregate Studios Index: index/studios.json
  const studioMap = new Map<string, { name: string; slug: string; thumbnail?: string; videoCount: number }>();
  for (const video of videos) {
    if (video.studio && video.studio.name && video.studio.slug) {
      const existing = studioMap.get(video.studio.slug);
      if (existing) {
        existing.videoCount++;
        if (!existing.thumbnail && video.thumbnail) existing.thumbnail = video.thumbnail;
      } else {
        studioMap.set(video.studio.slug, {
          name: video.studio.name,
          slug: video.studio.slug,
          thumbnail: video.thumbnail || undefined,
          videoCount: 1,
        });
      }
    }
  }

  const studiosList = Array.from(studioMap.values()).sort((a, b) => b.videoCount - a.videoCount || a.name.localeCompare(b.name));
  const studiosIndexContent = {
    version: 1,
    updatedAt: now,
    totalCount: studiosList.length,
    studios: studiosList,
  };
  const studiosIndexPath = path.join(indexDir, "studios.json");
  await fs.writeFile(studiosIndexPath, JSON.stringify(studiosIndexContent, null, 2), "utf-8");
  generatedFiles.push("index/studios.json");

  // 5. Generate Stats: index/stats.json
  const statsContent = {
    version: 1,
    updatedAt: now,
    totalVideos: videos.length,
    totalActresses: actressMap.size,
    totalStudios: studioMap.size,
    totalCodes: videos.length,
  };
  const statsPath = path.join(indexDir, "stats.json");
  await fs.writeFile(statsPath, JSON.stringify(statsContent, null, 2), "utf-8");
  generatedFiles.push("index/stats.json");

  // Clean up legacy monolithic index/codes.json if present
  const obsoleteCodesPath = path.join(indexDir, "codes.json");
  try {
    await fs.unlink(obsoleteCodesPath);
  } catch {
    // ignore if file doesn't exist
  }

  return {
    latestVideosCount: latest100.length,
    codePrefixIndexesGenerated: prefixGroups.size,
    totalActressesIndexed: actressMap.size,
    totalStudiosIndexed: studioMap.size,
    totalVideosCount: videos.length,
    stats: statsContent,
    generatedFiles,
  };
}

if (process.argv[1] && (process.argv[1].endsWith("generateIndexes.ts") || process.argv[1].endsWith("generateIndexes.js"))) {
  const root = path.join(process.cwd(), "database");
  regenerateAllIndexes(root)
    .then((res) => {
      console.log("Index generation succeeded:", res);
    })
    .catch((err) => {
      console.error("Index generation failed:", err);
    });
}
