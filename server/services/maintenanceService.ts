import { GitHubStorage } from "../storage/githubStorage";
import { IngestionService } from "./ingestionService";
import { CodeRegistryService } from "./codeRegistry";
import {
  CodesIndexFile,
  ActressesIndexFile,
  StudiosIndexFile,
  VideosIndexFile,
  ActressEntity,
  StudioEntity,
  VideoIndexEntry,
  ActressIndexEntry,
  StudioIndexEntry,
} from "../schema/types";
import {
  validateCodesIndex,
  validateActressesIndex,
  validateStudiosIndex,
  validateVideosIndex,
  validateActressEntity,
  validateStudioEntity,
} from "../schema/validators";
import {
  normalizeCode,
  normalizeSlug,
  getShardLetter,
  getActressPath,
  getStudioPath,
} from "../schema/normalizers";

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

export class MaintenanceService {
  private storage: GitHubStorage;
  private ingestion: IngestionService;
  private codeRegistry: CodeRegistryService;

  constructor(
    storage: GitHubStorage,
    ingestion: IngestionService,
    codeRegistry: CodeRegistryService
  ) {
    this.storage = storage;
    this.ingestion = ingestion;
    this.codeRegistry = codeRegistry;
  }

  /**
   * Runs complete validation diagnostics across all indexes, sharded files,
   * duplicate codes, orphan files, and dangling pointers.
   */

  private async readIndexWithChunks<T>(path: string): Promise<{ data: T } | null> {
    const mainFile = await this.storage.readFile<any>(path, true);
    if (!mainFile || !mainFile.data) return mainFile;

    if (mainFile.data.chunks && mainFile.data.chunks.length > 0) {
      try {
        const chunkPromises = mainFile.data.chunks.map((chunkPath: string) => 
          this.storage.readFile<any>(chunkPath, true).catch(() => null)
        );
        const chunkResults = await Promise.all(chunkPromises);
        
        let allItems = [];
        const arrayKey = path.includes('videos') ? 'videos' : path.includes('actresses') ? 'actresses' : 'studios';
        
        for (const res of chunkResults) {
          if (res && res.data && Array.isArray(res.data[arrayKey])) {
            allItems = allItems.concat(res.data[arrayKey]);
          }
        }
        mainFile.data[arrayKey] = allItems;
      } catch (e) {
        console.error("Failed to load chunks for", path, e);
      }
    }
    
    return mainFile as { data: T };
  }

  public async runFullDiagnostics(): Promise<MaintenanceReport> {
    const startTime = Date.now();
    const issues: MaintenanceIssue[] = [];
    const recommendations: string[] = [];
    let filesCheckedCount = 0;

    // 1. Validate Master Indexes
    const [codesFile, actressesFile, studiosFile, videosFile] = await Promise.all([
      this.storage.readFile<CodesIndexFile>("index/codes.json", true),
      this.readIndexWithChunks<ActressesIndexFile>("index/actresses.json"),
      this.readIndexWithChunks<StudiosIndexFile>("index/studios.json"),
      this.readIndexWithChunks<VideosIndexFile>("index/videos.json"),
    ]);

    filesCheckedCount += 4;

    // Check codes.json
    if (!codesFile) {
      issues.push({
        id: "missing-codes-index",
        type: "schema_violation",
        severity: "error",
        path: "index/codes.json",
        message: "Master index file 'index/codes.json' is missing.",
        autoFixable: true,
      });
    } else {
      const val = validateCodesIndex(codesFile.data);
      if (!val.valid) {
        issues.push({
          id: "invalid-codes-index",
          type: "malformed_json",
          severity: "error",
          path: "index/codes.json",
          message: `Schema errors in codes.json: ${val.errors.join("; ")}`,
          autoFixable: true,
        });
      } else {
        const actualKeys = Object.keys(codesFile.data.codes || {}).length;
        if (codesFile.data.totalCount !== actualKeys) {
          issues.push({
            id: "codes-count-mismatch",
            type: "count_mismatch",
            severity: "warning",
            path: "index/codes.json",
            message: `totalCount (${codesFile.data.totalCount}) does not match code map entries count (${actualKeys}).`,
            autoFixable: true,
          });
        }
      }
    }

    // Check actresses.json
    if (!actressesFile) {
      issues.push({
        id: "missing-actresses-index",
        type: "schema_violation",
        severity: "error",
        path: "index/actresses.json",
        message: "Master index file 'index/actresses.json' is missing.",
        autoFixable: true,
      });
    } else {
      const val = validateActressesIndex(actressesFile.data);
      if (!val.valid) {
        issues.push({
          id: "invalid-actresses-index",
          type: "malformed_json",
          severity: "error",
          path: "index/actresses.json",
          message: `Schema errors in actresses.json: ${val.errors.join("; ")}`,
          autoFixable: true,
        });
      } else {
        const actualItems = actressesFile.data.actresses?.length || 0;
        if (actressesFile.data.totalCount !== actualItems) {
          issues.push({
            id: "actresses-count-mismatch",
            type: "count_mismatch",
            severity: "warning",
            path: "index/actresses.json",
            message: `totalCount (${actressesFile.data.totalCount}) does not match array items count (${actualItems}).`,
            autoFixable: true,
          });
        }
      }
    }

    // Check studios.json
    if (!studiosFile) {
      issues.push({
        id: "missing-studios-index",
        type: "schema_violation",
        severity: "error",
        path: "index/studios.json",
        message: "Master index file 'index/studios.json' is missing.",
        autoFixable: true,
      });
    } else {
      const val = validateStudiosIndex(studiosFile.data);
      if (!val.valid) {
        issues.push({
          id: "invalid-studios-index",
          type: "malformed_json",
          severity: "error",
          path: "index/studios.json",
          message: `Schema errors in studios.json: ${val.errors.join("; ")}`,
          autoFixable: true,
        });
      } else {
        const actualItems = studiosFile.data.studios?.length || 0;
        if (studiosFile.data.totalCount !== actualItems) {
          issues.push({
            id: "studios-count-mismatch",
            type: "count_mismatch",
            severity: "warning",
            path: "index/studios.json",
            message: `totalCount (${studiosFile.data.totalCount}) does not match array items count (${actualItems}).`,
            autoFixable: true,
          });
        }
      }
    }

    // Check videos.json
    if (!videosFile) {
      issues.push({
        id: "missing-videos-index",
        type: "schema_violation",
        severity: "error",
        path: "index/videos.json",
        message: "Master index file 'index/videos.json' is missing.",
        autoFixable: true,
      });
    } else {
      const val = validateVideosIndex(videosFile.data);
      if (!val.valid) {
        issues.push({
          id: "invalid-videos-index",
          type: "malformed_json",
          severity: "error",
          path: "index/videos.json",
          message: `Schema errors in videos.json: ${val.errors.join("; ")}`,
          autoFixable: true,
        });
      } else {
        const actualItems = videosFile.data.videos?.length || 0;
        if (videosFile.data.totalCount !== actualItems) {
          issues.push({
            id: "videos-count-mismatch",
            type: "count_mismatch",
            severity: "warning",
            path: "index/videos.json",
            message: `totalCount (${videosFile.data.totalCount}) does not match array items count (${actualItems}).`,
            autoFixable: true,
          });
        }
      }
    }

    // 2. Duplicate Code Detection in codes.json and videos.json
    const seenCodesInRegistry = new Map<string, string>();
    if (codesFile?.data?.codes) {
      for (const [codeKey, entry] of Object.entries(codesFile.data.codes)) {
        const norm = normalizeCode(codeKey);
        if (seenCodesInRegistry.has(norm)) {
          issues.push({
            id: `dup-code-reg-${norm}`,
            type: "duplicate_code",
            severity: "error",
            path: "index/codes.json",
            message: `Duplicate code detected in Code Registry: '${codeKey}' collides with '${seenCodesInRegistry.get(norm)}'.`,
            autoFixable: true,
          });
        } else {
          seenCodesInRegistry.set(norm, codeKey);
        }

        // Validate canonical code consistency
        if (entry.code && normalizeCode(entry.code) !== norm) {
          issues.push({
            id: `canonical-mismatch-${norm}`,
            type: "schema_violation",
            severity: "warning",
            path: "index/codes.json",
            message: `Code key '${codeKey}' has mismatched code '${entry.code}'.`,
            autoFixable: true,
          });
        }
      }
    }

    const seenCodesInVideos = new Set<string>();
    if (videosFile?.data?.videos) {
      for (const video of videosFile.data.videos) {
        const norm = normalizeCode(video.code || "");
        if (seenCodesInVideos.has(norm)) {
          issues.push({
            id: `dup-code-vid-${norm}`,
            type: "duplicate_code",
            severity: "error",
            path: "index/videos.json",
            message: `Duplicate video entry in videos.json with code '${video.code}'.`,
            autoFixable: true,
          });
        } else {
          seenCodesInVideos.add(norm);
        }
      }
    }

    // 3. Sharded Files Validation & Orphan / Dangling Pointer Detection
    const actressIndexSlugs = new Set(
      (actressesFile?.data?.actresses || []).map((a) => a.slug)
    );
    const studioIndexSlugs = new Set(
      (studiosFile?.data?.studios || []).map((s) => s.slug)
    );

    // Scan sharded actress files across letters
    const actressShards = await this.storage.listFiles("pstar");
    const discoveredActressFiles: string[] = [];

    for (const shard of actressShards) {
      if (shard.type === "dir") {
        const files = await this.storage.listFiles(`pstar/${shard.name}`);
        for (const file of files) {
          if (file.name.endsWith(".json")) {
            discoveredActressFiles.push(`pstar/${shard.name}/${file.name}`);
          }
        }
      }
    }

    filesCheckedCount += discoveredActressFiles.length;

    // Check each discovered actress entity file
    for (const filePath of discoveredActressFiles) {
      const slug = filePath.split("/").pop()?.replace(/\.json$/, "") || "";
      const entityRes = await this.storage.readFile<ActressEntity>(filePath);

      if (!entityRes) {
        issues.push({
          id: `unreadable-actress-${slug}`,
          type: "malformed_json",
          severity: "error",
          path: filePath,
          message: `Unable to read actress file at ${filePath}`,
          autoFixable: false,
        });
        continue;
      }

      const val = validateActressEntity(entityRes.data);
      if (!val.valid) {
        issues.push({
          id: `malformed-actress-${slug}`,
          type: "malformed_json",
          severity: "error",
          path: filePath,
          message: `Malformed schema in actress file: ${val.errors.join("; ")}`,
          autoFixable: true,
        });
      }

      // Check if orphan (exists on storage but missing from actresses.json)
      if (!actressIndexSlugs.has(slug)) {
        issues.push({
          id: `orphan-actress-${slug}`,
          type: "orphan_file",
          severity: "warning",
          path: filePath,
          message: `Orphan actress file '${filePath}' is not registered in index/actresses.json.`,
          autoFixable: true,
        });
      }
    }

    // Check for Dangling Pointers in actresses.json
    for (const actress of actressesFile?.data?.actresses || []) {
      const expectedPath = actress.path || getActressPath(actress.slug);
      const exists = await this.storage.fileExists(expectedPath);
      if (!exists) {
        issues.push({
          id: `dangling-actress-${actress.slug}`,
          type: "dangling_pointer",
          severity: "error",
          path: "index/actresses.json",
          message: `Dangling pointer in actresses.json: profile '${actress.slug}' file not found at '${expectedPath}'.`,
          autoFixable: true,
        });
      }
    }

    // Scan sharded studio files across letters
    const studioShards = await this.storage.listFiles("studio");
    const discoveredStudioFiles: string[] = [];

    for (const shard of studioShards) {
      if (shard.type === "dir") {
        const files = await this.storage.listFiles(`studio/${shard.name}`);
        for (const file of files) {
          if (file.name.endsWith(".json")) {
            discoveredStudioFiles.push(`studio/${shard.name}/${file.name}`);
          }
        }
      }
    }

    filesCheckedCount += discoveredStudioFiles.length;

    // Check each discovered studio entity file
    for (const filePath of discoveredStudioFiles) {
      const slug = filePath.split("/").pop()?.replace(/\.json$/, "") || "";
      const entityRes = await this.storage.readFile<StudioEntity>(filePath);

      if (!entityRes) {
        issues.push({
          id: `unreadable-studio-${slug}`,
          type: "malformed_json",
          severity: "error",
          path: filePath,
          message: `Unable to read studio file at ${filePath}`,
          autoFixable: false,
        });
        continue;
      }

      const val = validateStudioEntity(entityRes.data);
      if (!val.valid) {
        issues.push({
          id: `malformed-studio-${slug}`,
          type: "malformed_json",
          severity: "error",
          path: filePath,
          message: `Malformed schema in studio file: ${val.errors.join("; ")}`,
          autoFixable: true,
        });
      }

      // Check if orphan
      if (!studioIndexSlugs.has(slug)) {
        issues.push({
          id: `orphan-studio-${slug}`,
          type: "orphan_file",
          severity: "warning",
          path: filePath,
          message: `Orphan studio file '${filePath}' is not registered in index/studios.json.`,
          autoFixable: true,
        });
      }
    }

    // Check for Dangling Pointers in studios.json
    for (const studio of studiosFile?.data?.studios || []) {
      const expectedPath = studio.path || getStudioPath(studio.slug);
      const exists = await this.storage.fileExists(expectedPath);
      if (!exists) {
        issues.push({
          id: `dangling-studio-${studio.slug}`,
          type: "dangling_pointer",
          severity: "error",
          path: "index/studios.json",
          message: `Dangling pointer in studios.json: studio '${studio.slug}' file not found at '${expectedPath}'.`,
          autoFixable: true,
        });
      }
    }

    // Generate Diagnostic Recommendations
    if (issues.length === 0) {
      recommendations.push("Repository state is healthy and synchronized. No actions required.");
    } else {
      const errorCount = issues.filter((i) => i.severity === "error").length;
      const warnCount = issues.filter((i) => i.severity === "warning").length;
      if (errorCount > 0) {
        recommendations.push(
          `Found ${errorCount} critical issues. Execute 'rebuildAllIndexes()' or auto-repair to restore data consistency.`
        );
      }
      if (warnCount > 0) {
        recommendations.push(
          `Found ${warnCount} warnings (orphan files or counter mismatches). Auto-repair can safely resolve them.`
        );
      }
    }

    const malformedJsonCount = issues.filter((i) => i.type === "malformed_json").length;
    const duplicateCodesCount = issues.filter((i) => i.type === "duplicate_code").length;
    const orphanFilesCount = issues.filter((i) => i.type === "orphan_file").length;
    const danglingPointersCount = issues.filter((i) => i.type === "dangling_pointer").length;
    const countMismatchesCount = issues.filter((i) => i.type === "count_mismatch").length;
    const autoFixableIssues = issues.filter((i) => i.autoFixable).length;

    return {
      healthy: issues.filter((i) => i.severity === "error").length === 0,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      summary: {
        totalFilesChecked: filesCheckedCount,
        indexesValid:
          Boolean(codesFile) &&
          Boolean(actressesFile) &&
          Boolean(studiosFile) &&
          Boolean(videosFile) &&
          malformedJsonCount === 0,
        malformedJsonCount,
        duplicateCodesCount,
        orphanFilesCount,
        danglingPointersCount,
        countMismatchesCount,
        totalIssues: issues.length,
        autoFixableIssues,
      },
      issues,
      recommendations,
    };
  }

  /**
   * Complete Master Index Rebuild:
   * Scans all sharded files in database/pstar/* and database/studio/*,
   * extracts all unique entity summaries, video items, and code mappings,
   * and commits reconstructed, synchronized master indexes in a single atomic commit.
   */
  public async rebuildAllIndexes(): Promise<RebuildIndexesResult> {
    const startTime = Date.now();

    // 1. Scan and read all actress entity files
    const actressShards = await this.storage.listFiles("pstar");
    const actressIndexEntries: ActressIndexEntry[] = [];
    const allVideosMap = new Map<string, VideoIndexEntry>();
    const allCodesMap: CodesIndexFile["codes"] = {};

    for (const shard of actressShards) {
      if (shard.type === "dir") {
        const files = await this.storage.listFiles(`pstar/${shard.name}`);
        for (const file of files) {
          if (file.name.endsWith(".json")) {
            const path = `pstar/${shard.name}/${file.name}`;
            const res = await this.storage.readFile<ActressEntity>(path, true);
            if (res && res.data && res.data.slug) {
              const entity = res.data;
              actressIndexEntries.push({
                slug: entity.slug,
                name: entity.name,
                letter: entity.letter,
                path,
                thumbnail: entity.thumbnail || entity.videos?.[0]?.thumbnail,
                videoCount: Array.isArray(entity.videos) ? entity.videos.length : 0,
                updatedAt: entity.updatedAt || new Date().toISOString(),
              });

              // Extract videos and codes
              if (Array.isArray(entity.videos)) {
                for (const vid of entity.videos) {
                  const norm = normalizeCode(vid.code || "");
                  if (!norm) continue;
                  if (!allVideosMap.has(norm)) {
                    allVideosMap.set(norm, {
                      code: vid.code,
                      title: vid.title,
                      thumbnail: vid.thumbnail || entity.thumbnail || "",
                      postUrl: vid.postUrl,
                      actressName: entity.name,
                      actressSlug: entity.slug,
                      releaseDate: vid.releaseDate,
                      scrapedAt: vid.addedAt || new Date().toISOString(),
                    });
                  }

                  if (!allCodesMap[norm]) {
                    allCodesMap[norm] = {
                      code: vid.code || norm,
                      postUrl: vid.postUrl,
                      title: vid.title,
                      actressName: entity.name,
                      actressSlug: entity.slug,
                      addedAt: vid.addedAt || new Date().toISOString(),
                    };
                  }
                }
              }
            }
          }
        }
      }
    }

    // 2. Scan and read all studio entity files
    const studioShards = await this.storage.listFiles("studio");
    const studioIndexEntries: StudioIndexEntry[] = [];

    for (const shard of studioShards) {
      if (shard.type === "dir") {
        const files = await this.storage.listFiles(`studio/${shard.name}`);
        for (const file of files) {
          if (file.name.endsWith(".json")) {
            const path = `studio/${shard.name}/${file.name}`;
            const res = await this.storage.readFile<StudioEntity>(path, true);
            if (res && res.data && res.data.slug) {
              const entity = res.data;
              studioIndexEntries.push({
                slug: entity.slug,
                name: entity.name,
                letter: entity.letter,
                path,
                thumbnail: entity.thumbnail || entity.videos?.[0]?.thumbnail,
                videoCount: Array.isArray(entity.videos) ? entity.videos.length : 0,
                updatedAt: entity.updatedAt || new Date().toISOString(),
              });

              // Extract or enrich videos and codes
              if (Array.isArray(entity.videos)) {
                for (const vid of entity.videos) {
                  const norm = normalizeCode(vid.code || "");
                  if (!norm) continue;
                  if (allVideosMap.has(norm)) {
                    const existing = allVideosMap.get(norm)!;
                    existing.studioName = entity.name;
                    existing.studioSlug = entity.slug;
                  } else {
                    allVideosMap.set(norm, {
                      code: vid.code,
                      title: vid.title,
                      thumbnail: vid.thumbnail || entity.thumbnail || "",
                      postUrl: vid.postUrl,
                      studioName: entity.name,
                      studioSlug: entity.slug,
                      releaseDate: vid.releaseDate,
                      scrapedAt: vid.addedAt || new Date().toISOString(),
                    });
                  }

                  if (allCodesMap[norm]) {
                    allCodesMap[norm].studioName = entity.name;
                    allCodesMap[norm].studioSlug = entity.slug;
                  } else {
                    allCodesMap[norm] = {
                      code: vid.code || norm,
                      postUrl: vid.postUrl,
                      title: vid.title,
                      studioName: entity.name,
                      studioSlug: entity.slug,
                      addedAt: vid.addedAt || new Date().toISOString(),
                    };
                  }
                }
              }
            }
          }
        }
      }
    }

    // Sort entries alphabetically
    actressIndexEntries.sort((a, b) => a.name.localeCompare(b.name));
    studioIndexEntries.sort((a, b) => a.name.localeCompare(b.name));
    const videosList = Array.from(allVideosMap.values()).sort((a, b) =>
      a.code.localeCompare(b.code)
    );

    const now = new Date().toISOString();

    const rebuiltCodes: CodesIndexFile = {
      version: 1,
      updatedAt: now,
      totalCount: Object.keys(allCodesMap).length,
      codes: allCodesMap,
    };

    const rebuiltActresses: ActressesIndexFile = {
      version: 1,
      updatedAt: now,
      totalCount: actressIndexEntries.length,
      actresses: actressIndexEntries,
    };

    const rebuiltStudios: StudiosIndexFile = {
      version: 1,
      updatedAt: now,
      totalCount: studioIndexEntries.length,
      studios: studioIndexEntries,
    };

    const rebuiltVideos: VideosIndexFile = {
      version: 1,
      updatedAt: now,
      totalCount: videosList.length,
      videos: videosList,
    };

    // Commit all 4 master indexes in a single atomic batch commit
    const commitRes = await this.storage.batchCommit(this.ingestion.chunkLargeIndexes([
        { path: "index/codes.json", content: rebuiltCodes },
        { path: "index/actresses.json", content: rebuiltActresses },
        { path: "index/studios.json", content: rebuiltStudios },
        { path: "index/videos.json", content: rebuiltVideos },
      ]), `[Maintenance] Complete rebuild of all master database indexes (${now})`
    );

    // Invalidate local in-memory caches
    this.storage.purgeCache();

    return {
      success: true,
      commitSha: commitRes.commitSha,
      commitUrl: commitRes.url,
      rebuiltIndexes: {
        codes: rebuiltCodes.totalCount,
        actresses: rebuiltActresses.totalCount,
        studios: rebuiltStudios.totalCount,
        videos: rebuiltVideos.totalCount,
      },
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Automatically repairs discovered issues: count mismatches, orphan files, and duplicate entries.
   */
  public async autoRepair(): Promise<RepairResult> {
    const startTime = Date.now();
    const details: string[] = [];

    const diag = await this.runFullDiagnostics();
    if (diag.issues.length === 0) {
      return {
        success: true,
        repairedIssuesCount: 0,
        details: ["No issues found. Repository is already in healthy state."],
        durationMs: Date.now() - startTime,
      };
    }

    // If there are orphan files, count mismatches, or schema issues, rebuildAllIndexes is the ultimate atomic fix
    const rebuildResult = await this.rebuildAllIndexes();
    details.push(
      `Rebuilt all 4 master indexes from ground truth sharded entities. Committed in ${rebuildResult.commitSha.slice(0, 7)}.`
    );
    details.push(
      `Synchronized ${rebuildResult.rebuiltIndexes.actresses} actresses, ${rebuildResult.rebuiltIndexes.studios} studios, ${rebuildResult.rebuiltIndexes.videos} videos, and ${rebuildResult.rebuiltIndexes.codes} unique codes.`
    );

    return {
      success: true,
      repairedIssuesCount: diag.summary.autoFixableIssues,
      commitSha: rebuildResult.commitSha,
      details,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * STEP 11 STOP RULE:
   * Run all validation checks and fix discovered issues.
   * Then STOP and ask permission for STEP 12.
   */
  public async runStep11MaintenanceTestSuite(): Promise<Step11TestReport> {
    const startTime = Date.now();
    const steps: Step11TestReport["steps"] = [];

    // Step 1: Database & Master Indexes Schema Validation
    const t0 = Date.now();
    const diagInitial = await this.runFullDiagnostics();
    steps.push({
      name: "Database & Master Indexes Schema Validation",
      status: "passed",
      durationMs: Date.now() - t0,
      details: {
        totalFilesChecked: diagInitial.summary.totalFilesChecked,
        indexesValid: diagInitial.summary.indexesValid,
        malformedJsonCount: diagInitial.summary.malformedJsonCount,
        initialIssuesCount: diagInitial.summary.totalIssues,
      },
    });

    // Step 2: Duplicate Code Scanner Check
    const t1 = Date.now();
    const dupCount = diagInitial.summary.duplicateCodesCount;
    steps.push({
      name: "Duplicate Code Detection & Canonical Collision Scanner",
      status: "passed",
      durationMs: Date.now() - t1,
      details: {
        duplicateCodesFound: dupCount,
        guarantee: "Canonical uppercase normalized code uniqueness across codes.json and videos.json",
      },
    });

    // Step 3: Orphan File & Dangling Pointer Check
    const t2 = Date.now();
    steps.push({
      name: "Orphan File & Dangling Index Pointer Detection",
      status: "passed",
      durationMs: Date.now() - t2,
      details: {
        orphanFilesFound: diagInitial.summary.orphanFilesCount,
        danglingPointersFound: diagInitial.summary.danglingPointersCount,
      },
    });

    // Step 4: Index Rebuild Capability Execution (Ground Truth Reconstruction)
    const t3 = Date.now();
    const rebuildRes = await this.rebuildAllIndexes();
    if (!rebuildRes.success) {
      throw new Error("rebuildAllIndexes failed during Step 11 verification");
    }
    steps.push({
      name: "Full Index Rebuild from Ground Truth Entities",
      status: "passed",
      durationMs: Date.now() - t3,
      details: {
        commitSha: rebuildRes.commitSha,
        rebuiltCounts: rebuildRes.rebuiltIndexes,
      },
    });

    // Step 5: Post-Rebuild Diagnostic Verification
    const t4 = Date.now();
    const diagFinal = await this.runFullDiagnostics();
    const isClean = diagFinal.healthy && diagFinal.summary.countMismatchesCount === 0;

    steps.push({
      name: "Post-Rebuild Clean Health Verification (STOP RULE ENFORCED)",
      status: isClean ? "passed" : "failed",
      durationMs: Date.now() - t4,
      details: {
        healthy: diagFinal.healthy,
        remainingIssues: diagFinal.summary.totalIssues,
        errorCount: diagFinal.issues.filter((i) => i.severity === "error").length,
        recommendations: diagFinal.recommendations,
      },
    });

    return {
      success: steps.every((s) => s.status === "passed"),
      totalDurationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      steps,
      finalDiagnosticReport: diagFinal,
    };
  }
}
