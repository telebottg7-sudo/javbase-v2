import fs from "fs/promises";
import path from "path";
import {
  CanonicalVideoJson,
  normalizeToCanonicalVideo,
  getCodeFilePath,
  getActressPath,
  getStudioPath,
  normalizeSlug,
  getShardLetter,
} from "../normalize/videoNormalizer";

export interface InvalidFileReport {
  path: string;
  error: string;
}

export interface UnparseableRecordReport {
  sourceFile: string;
  raw: any;
  reason: string;
}

export interface MissingFieldsSummary {
  duration: number;
  releaseDate: number;
  thumbnail: number;
  actress: number;
  studio: number;
  postUrl: number;
}

export interface MissingFieldsDetail {
  code: string;
  missingFields: string[];
}

export interface MigrationReport {
  scannedFiles: number;
  validVideosFound: number;
  duplicateVideosFiltered: number;
  duplicateCodes: Record<string, number>;
  invalidFilesCount: number;
  invalidFiles: InvalidFileReport[];
  unparseableRecordsCount: number;
  unparseableRecords: UnparseableRecordReport[];
  missingFieldsSummary: MissingFieldsSummary;
  missingFieldsDetails: MissingFieldsDetail[];
  uniqueActresses: number;
  uniqueStudios: number;
  codeCategories: number;
  filesWritten: number;
  filesUnchanged: number;
  errors: string[];
}

/**
 * Idempotently writes a JSON object to disk if changed.
 */
async function writeJsonFileIdempotently(fullPath: string, data: any): Promise<"written" | "unchanged"> {
  const newContent = JSON.stringify(data, null, 2);
  try {
    const existing = await fs.readFile(fullPath, "utf-8");
    if (existing === newContent) {
      return "unchanged";
    }
  } catch {}

  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, newContent, "utf-8");
  return "written";
}

/**
 * Recursively scans directory for JSON files.
 */
async function scanDirectoryForJsonFiles(dirPath: string): Promise<string[]> {
  const jsonFiles: string[] = [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await scanDirectoryForJsonFiles(fullPath);
        jsonFiles.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        jsonFiles.push(fullPath);
      }
    }
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      console.warn(`[Migrate] Warning reading directory ${dirPath}:`, err.message);
    }
  }
  return jsonFiles;
}

/**
 * Safe & Idempotent Database Migration Engine:
 * - Scans all existing database JSON files across database/ codes, index, pstar, studio, actresses, studios.
 * - Detects old/legacy schemas, normalizes field names, converts duration strings to numeric seconds.
 * - Strips redundant obsolete duplicate fields while preserving extra useful metadata.
 * - Detects and safely merges duplicate video codes.
 * - Reports invalid JSON syntax files, missing fields breakdown, and unparseable records (never silently discarding).
 * - Writes canonical JSON files idempotently to avoid corrupting or needlessly overwriting identical content.
 */
export async function runDatabaseMigration(databaseRootDir: string): Promise<MigrationReport> {
  const report: MigrationReport = {
    scannedFiles: 0,
    validVideosFound: 0,
    duplicateVideosFiltered: 0,
    duplicateCodes: {},
    invalidFilesCount: 0,
    invalidFiles: [],
    unparseableRecordsCount: 0,
    unparseableRecords: [],
    missingFieldsSummary: {
      duration: 0,
      releaseDate: 0,
      thumbnail: 0,
      actress: 0,
      studio: 0,
      postUrl: 0,
    },
    missingFieldsDetails: [],
    uniqueActresses: 0,
    uniqueStudios: 0,
    codeCategories: 0,
    filesWritten: 0,
    filesUnchanged: 0,
    errors: [],
  };

  const videoMap = new Map<string, CanonicalVideoJson>();
  const actressMap = new Map<string, { name: string; slug: string; thumbnail?: string; videoCodes: Set<string> }>();
  const studioMap = new Map<string, { name: string; slug: string; thumbnail?: string; videoCodes: Set<string> }>();

  // 1. Scan all JSON files in the database root
  const allJsonFiles = await scanDirectoryForJsonFiles(databaseRootDir);
  report.scannedFiles = allJsonFiles.length;

  for (const filePath of allJsonFiles) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      if (!content.trim()) {
        report.invalidFilesCount++;
        report.invalidFiles.push({ path: filePath, error: "Empty file" });
        continue;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (parseErr: any) {
        report.invalidFilesCount++;
        report.invalidFiles.push({ path: filePath, error: `Invalid JSON syntax: ${parseErr.message}` });
        report.errors.push(`Invalid JSON syntax in ${filePath}: ${parseErr.message}`);
        continue;
      }

      // If it's an index or group file containing .videos array or .codes array
      if (parsed && (Array.isArray(parsed.videos) || Array.isArray(parsed.codes))) {
        const items = Array.isArray(parsed.videos) ? parsed.videos : parsed.codes;
        for (const rawVideo of items) {
          processCandidateVideo(rawVideo, filePath, videoMap, report);
        }
      }
      // If it's an entity file with .videos array (e.g. legacy actress/studio entity)
      else if (parsed && Array.isArray(parsed.videos) && (parsed.slug || parsed.name)) {
        for (const rawVideo of parsed.videos) {
          processCandidateVideo(rawVideo, filePath, videoMap, report);
        }
      }
      // If it's a single video file or index entry
      else if (parsed && typeof parsed === "object" && (parsed.code || parsed.videoCode || parsed.id || parsed.video_code)) {
        processCandidateVideo(parsed, filePath, videoMap, report);
      }
    } catch (readErr: any) {
      report.errors.push(`Error reading file ${filePath}: ${readErr.message}`);
    }
  }

  // Update counts
  report.unparseableRecordsCount = report.unparseableRecords.length;

  // 2. Analyze canonical videos, check missing fields, index actresses/studios
  const categorySet = new Set<string>();

  for (const video of videoMap.values()) {
    const missing: string[] = [];

    if (video.duration === null) {
      report.missingFieldsSummary.duration++;
      missing.push("duration");
    }
    if (video.releaseDate === null) {
      report.missingFieldsSummary.releaseDate++;
      missing.push("releaseDate");
    }
    if (video.thumbnail === null) {
      report.missingFieldsSummary.thumbnail++;
      missing.push("thumbnail");
    }
    if (video.actress === null) {
      report.missingFieldsSummary.actress++;
      missing.push("actress");
    }
    if (video.studio === null) {
      report.missingFieldsSummary.studio++;
      missing.push("studio");
    }
    if (video.postUrl === null) {
      report.missingFieldsSummary.postUrl++;
      missing.push("postUrl");
    }

    if (missing.length > 0 && report.missingFieldsDetails.length < 100) {
      report.missingFieldsDetails.push({
        code: video.code,
        missingFields: missing,
      });
    }

    // Prefix category
    const codePrefix = video.code.split("-")[0].toUpperCase();
    categorySet.add(codePrefix);

    // Track actress
    if (video.actress && video.actress.name && video.actress.slug) {
      let act = actressMap.get(video.actress.slug);
      if (!act) {
        act = {
          name: video.actress.name,
          slug: video.actress.slug,
          thumbnail: video.thumbnail || undefined,
          videoCodes: new Set(),
        };
        actressMap.set(video.actress.slug, act);
      }
      act.videoCodes.add(video.code);
    }

    // Track studio
    if (video.studio && video.studio.name && video.studio.slug) {
      let std = studioMap.get(video.studio.slug);
      if (!std) {
        std = {
          name: video.studio.name,
          slug: video.studio.slug,
          thumbnail: video.thumbnail || undefined,
          videoCodes: new Set(),
        };
        studioMap.set(video.studio.slug, std);
      }
      std.videoCodes.add(video.code);
    }
  }

  report.validVideosFound = videoMap.size;
  report.uniqueActresses = actressMap.size;
  report.uniqueStudios = studioMap.size;
  report.codeCategories = categorySet.size;

  // 3. Write canonical video files: database/codes/{CATEGORY}/{CODE}.json
  for (const video of videoMap.values()) {
    const relPath = getCodeFilePath(video.code);
    if (!relPath) continue;

    const fullPath = path.join(databaseRootDir, relPath);
    const result = await writeJsonFileIdempotently(fullPath, video);
    if (result === "written") report.filesWritten++;
    else report.filesUnchanged++;
  }

  // 4. Write canonical actress files: database/actresses/{letter}/{slug}.json
  for (const act of actressMap.values()) {
    const relPath = getActressPath(act.slug);
    const fullPath = path.join(databaseRootDir, relPath);
    const letter = getShardLetter(act.slug);

    const actressEntity = {
      slug: act.slug,
      name: act.name,
      letter,
      thumbnail: act.thumbnail || null,
      videoCount: act.videoCodes.size,
      videoCodes: Array.from(act.videoCodes),
      updatedAt: new Date().toISOString(),
    };

    const result = await writeJsonFileIdempotently(fullPath, actressEntity);
    if (result === "written") report.filesWritten++;
    else report.filesUnchanged++;
  }

  // 5. Write canonical studio files: database/studios/{letter}/{slug}.json
  for (const std of studioMap.values()) {
    const relPath = getStudioPath(std.slug);
    const fullPath = path.join(databaseRootDir, relPath);
    const letter = getShardLetter(std.slug);

    const studioEntity = {
      slug: std.slug,
      name: std.name,
      letter,
      thumbnail: std.thumbnail || null,
      videoCount: std.videoCodes.size,
      videoCodes: Array.from(std.videoCodes),
      updatedAt: new Date().toISOString(),
    };

    const result = await writeJsonFileIdempotently(fullPath, studioEntity);
    if (result === "written") report.filesWritten++;
    else report.filesUnchanged++;
  }

  return report;
}

function processCandidateVideo(
  raw: any,
  sourceFile: string,
  videoMap: Map<string, CanonicalVideoJson>,
  report: MigrationReport
) {
  if (!raw || typeof raw !== "object") {
    report.unparseableRecords.push({
      sourceFile,
      raw,
      reason: "Record is not a valid JSON object",
    });
    return;
  }

  const canonical = normalizeToCanonicalVideo(raw);
  if (!canonical) {
    report.unparseableRecords.push({
      sourceFile,
      raw,
      reason: "Could not normalize or extract a valid video code",
    });
    return;
  }

  const existing = videoMap.get(canonical.code);
  if (existing) {
    report.duplicateVideosFiltered++;
    report.duplicateCodes[canonical.code] = (report.duplicateCodes[canonical.code] || 1) + 1;

    // Merge newer or richer metadata safely
    if (!existing.actress && canonical.actress) existing.actress = canonical.actress;
    if (!existing.studio && canonical.studio) existing.studio = canonical.studio;
    if (existing.duration === null && canonical.duration !== null) existing.duration = canonical.duration;
    if (existing.releaseDate === null && canonical.releaseDate !== null) existing.releaseDate = canonical.releaseDate;
    if (!existing.thumbnail && canonical.thumbnail) existing.thumbnail = canonical.thumbnail;
    if (!existing.postUrl && canonical.postUrl) existing.postUrl = canonical.postUrl;

    if (canonical.title && canonical.title.length > existing.title.length) {
      existing.title = canonical.title;
    }
    if (canonical.description && (!existing.description || canonical.description.length > existing.description.length)) {
      existing.description = canonical.description;
    }

    // Preserve any extra metadata
    for (const [k, v] of Object.entries(canonical)) {
      if (v !== undefined && v !== null && !(k in existing)) {
        existing[k] = v;
      }
    }

    if (canonical.updatedAt > existing.updatedAt) existing.updatedAt = canonical.updatedAt;
  } else {
    videoMap.set(canonical.code, canonical);
  }
}

// Standalone CLI execution
if (process.argv[1] && (process.argv[1].endsWith("migrateDatabase.ts") || process.argv[1].endsWith("migrateDatabase.js"))) {
  const dbRoot = path.resolve(process.cwd(), process.env.DATABASE_ROOT || "database");
  console.log(`[Migration Script] Starting migration on ${dbRoot}...`);
  runDatabaseMigration(dbRoot)
    .then((report) => {
      console.log("\n================ MIGRATION REPORT ================");
      console.log(JSON.stringify(report, null, 2));
      console.log("=================================================");
    })
    .catch((err) => {
      console.error("[Migration Script] Failed:", err);
      process.exit(1);
    });
}

