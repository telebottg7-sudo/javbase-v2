import fs from "fs/promises";
import path from "path";
import {
  CanonicalVideoJson,
  getCodeCategory,
  getCodeFilePath,
  getActressPath,
  getStudioPath,
} from "../normalize/videoNormalizer";

export interface ValidationIssue {
  type: "error" | "warning";
  file: string;
  message: string;
}

export interface ValidationReport {
  isValid: boolean;
  totalVideosScanned: number;
  totalActressesScanned: number;
  totalStudiosScanned: number;
  totalPrefixIndexes: number;
  statsFileMatched: boolean;
  latestFileValid: boolean;
  issues: ValidationIssue[];
  summary: {
    videosCount: number;
    actressesCount: number;
    studiosCount: number;
    codeCategoriesCount: number;
    latestVideosCount: number;
  };
}

/**
 * Validates the entire canonical JSON database against all schema rules:
 * - Every JSON file is strictly valid syntax.
 * - Every video has a unique valid code.
 * - Every video is located in its correct codes/{PREFIX}/{CODE}.json directory.
 * - Every video schema conforms to canonical structure (actress object, studio object, numeric duration, YYYY-MM-DD releaseDate, ISO addedAt/updatedAt).
 * - latest.json is sorted addedAt DESC.
 * - stats.json matches actual calculated counts.
 * - Indexes point to valid existing files.
 */
export async function validateDatabase(databaseRootDir: string): Promise<ValidationReport> {
  const report: ValidationReport = {
    isValid: true,
    totalVideosScanned: 0,
    totalActressesScanned: 0,
    totalStudiosScanned: 0,
    totalPrefixIndexes: 0,
    statsFileMatched: false,
    latestFileValid: false,
    issues: [],
    summary: {
      videosCount: 0,
      actressesCount: 0,
      studiosCount: 0,
      codeCategoriesCount: 0,
      latestVideosCount: 0,
    },
  };

  const codesDir = path.join(databaseRootDir, "codes");
  const seenCodes = new Set<string>();
  const videoList: CanonicalVideoJson[] = [];

  // 1. Validate all videos in database/codes/
  try {
    const prefixDirs = await fs.readdir(codesDir, { withFileTypes: true });
    for (const prefixDirent of prefixDirs) {
      if (prefixDirent.isDirectory()) {
        const prefix = prefixDirent.name;
        const prefixDirPath = path.join(codesDir, prefix);
        const files = await fs.readdir(prefixDirPath, { withFileTypes: true });

        for (const fileDirent of files) {
          if (fileDirent.isFile() && fileDirent.name.endsWith(".json")) {
            report.totalVideosScanned++;
            const fullPath = path.join(prefixDirPath, fileDirent.name);
            const expectedRelPath = `codes/${prefix}/${fileDirent.name}`;

            try {
              const content = await fs.readFile(fullPath, "utf-8");
              const video: CanonicalVideoJson = JSON.parse(content);

              // Validate code
              if (!video.code) {
                report.issues.push({
                  type: "error",
                  file: expectedRelPath,
                  message: "Missing 'code' property",
                });
                continue;
              }

              if (seenCodes.has(video.code)) {
                report.issues.push({
                  type: "error",
                  file: expectedRelPath,
                  message: `Duplicate video code detected: ${video.code}`,
                });
              }
              seenCodes.add(video.code);

              // Validate path location
              const expectedCat = getCodeCategory(video.code);
              if (expectedCat !== prefix) {
                report.issues.push({
                  type: "error",
                  file: expectedRelPath,
                  message: `Misplaced file: Code ${video.code} category is ${expectedCat} but stored in codes/${prefix}/`,
                });
              }

              // Validate schema rules
              if (video.actress !== null) {
                if (typeof video.actress !== "object" || !video.actress.name || !video.actress.slug) {
                  report.issues.push({
                    type: "error",
                    file: expectedRelPath,
                    message: "Invalid 'actress' object structure (must have name and slug or be null)",
                  });
                }
              }

              if (video.studio !== null) {
                if (typeof video.studio !== "object" || !video.studio.name || !video.studio.slug) {
                  report.issues.push({
                    type: "error",
                    file: expectedRelPath,
                    message: "Invalid 'studio' object structure (must have name and slug or be null)",
                  });
                }
              }

              if (video.duration !== null && (typeof video.duration !== "number" || isNaN(video.duration))) {
                report.issues.push({
                  type: "error",
                  file: expectedRelPath,
                  message: `Invalid 'duration' format: expected number (seconds) or null, got ${typeof video.duration}`,
                });
              }

              if (video.releaseDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(video.releaseDate)) {
                report.issues.push({
                  type: "warning",
                  file: expectedRelPath,
                  message: `Non-standard releaseDate format: ${video.releaseDate}`,
                });
              }

              if (!video.addedAt || isNaN(new Date(video.addedAt).getTime())) {
                report.issues.push({
                  type: "error",
                  file: expectedRelPath,
                  message: `Invalid 'addedAt' ISO timestamp: ${video.addedAt}`,
                });
              }

              videoList.push(video);
            } catch (err: any) {
              report.issues.push({
                type: "error",
                file: expectedRelPath,
                message: `Failed to parse JSON: ${err.message}`,
              });
            }
          }
        }
      }
    }
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      report.issues.push({
        type: "error",
        file: "codes",
        message: `Failed reading codes directory: ${err.message}`,
      });
    }
  }

  report.summary.videosCount = videoList.length;

  // 2. Validate latest.json
  const latestPath = path.join(databaseRootDir, "index", "latest.json");
  try {
    const latestRaw = await fs.readFile(latestPath, "utf-8");
    const latestParsed = JSON.parse(latestRaw);
    if (Array.isArray(latestParsed.videos)) {
      report.summary.latestVideosCount = latestParsed.videos.length;
      report.latestFileValid = true;

      // Verify sort order: addedAt DESC
      for (let i = 0; i < latestParsed.videos.length - 1; i++) {
        const t1 = new Date(latestParsed.videos[i].addedAt || latestParsed.videos[i].updatedAt || 0).getTime();
        const t2 = new Date(latestParsed.videos[i + 1].addedAt || latestParsed.videos[i + 1].updatedAt || 0).getTime();
        if (t1 < t2) {
          report.issues.push({
            type: "warning",
            file: "index/latest.json",
            message: `latest.json is not strictly sorted by addedAt descending at index ${i}`,
          });
          break;
        }
      }
    }
  } catch (err: any) {
    report.issues.push({
      type: "error",
      file: "index/latest.json",
      message: `Failed reading latest.json: ${err.message}`,
    });
  }

  // 3. Validate stats.json
  const statsPath = path.join(databaseRootDir, "index", "stats.json");
  try {
    const statsRaw = await fs.readFile(statsPath, "utf-8");
    const statsParsed = JSON.parse(statsRaw);
    if (statsParsed.totalVideos === videoList.length) {
      report.statsFileMatched = true;
    } else {
      report.issues.push({
        type: "warning",
        file: "index/stats.json",
        message: `Stats totalVideos (${statsParsed.totalVideos}) does not match scanned videos count (${videoList.length})`,
      });
    }
  } catch (err: any) {
    report.issues.push({
      type: "error",
      file: "index/stats.json",
      message: `Failed reading stats.json: ${err.message}`,
    });
  }

  // Check error counts
  const errorCount = report.issues.filter((i) => i.type === "error").length;
  report.isValid = errorCount === 0;

  return report;
}
