import fs from "fs/promises";
import path from "path";

/**
 * Clears all data in the database directory and resets empty indexes.
 */
export async function clearDatabase(targetDir?: string): Promise<{ deletedFilesCount: number }> {
  const dbDir = targetDir || path.join(process.cwd(), "database");
  let deletedFilesCount = 0;

  try {
    const entries = await fs.readdir(dbDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dbDir, entry.name);
      await fs.rm(fullPath, { recursive: true, force: true });
      deletedFilesCount++;
    }
  } catch (err) {
    // Directory might not exist yet
  }

  // Re-create directory structure and empty indexes
  const indexDir = path.join(dbDir, "index");
  const codesIndexDir = path.join(indexDir, "codes");
  const codesDir = path.join(dbDir, "codes");
  const actressesDir = path.join(dbDir, "actresses");
  const studiosDir = path.join(dbDir, "studios");

  await fs.mkdir(codesIndexDir, { recursive: true });
  await fs.mkdir(codesDir, { recursive: true });
  await fs.mkdir(actressesDir, { recursive: true });
  await fs.mkdir(studiosDir, { recursive: true });

  const now = new Date().toISOString();

  await fs.writeFile(
    path.join(indexDir, "latest.json"),
    JSON.stringify({ version: 1, updatedAt: now, totalCount: 0, videos: [] }, null, 2),
    "utf-8"
  );

  await fs.writeFile(
    path.join(indexDir, "actresses.json"),
    JSON.stringify({ version: 1, updatedAt: now, totalCount: 0, actresses: [] }, null, 2),
    "utf-8"
  );

  await fs.writeFile(
    path.join(indexDir, "studios.json"),
    JSON.stringify({ version: 1, updatedAt: now, totalCount: 0, studios: [] }, null, 2),
    "utf-8"
  );

  await fs.writeFile(
    path.join(indexDir, "stats.json"),
    JSON.stringify(
      {
        version: 1,
        updatedAt: now,
        totalVideos: 0,
        totalActresses: 0,
        totalStudios: 0,
        totalCodes: 0,
      },
      null,
      2
    ),
    "utf-8"
  );

  return { deletedFilesCount };
}

// Run directly if invoked as main script
if (process.argv[1] && process.argv[1].includes("clearDatabase")) {
  clearDatabase()
    .then((res) => {
      console.log(`[Clear Database] Cleared database repository successfully. (Removed ${res.deletedFilesCount} top-level entries and reset empty indexes)`);
    })
    .catch((err) => {
      console.error("[Clear Database] Error clearing database:", err);
      process.exit(1);
    });
}
