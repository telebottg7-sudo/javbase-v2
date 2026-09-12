import path from "path";
import { runDatabaseMigration } from "./migrate/migrateDatabase";
import { regenerateAllIndexes } from "./indexes/generateIndexes";
import { validateDatabase } from "./validate/validateDatabase";

async function main() {
  const dbRoot = path.resolve(process.cwd(), process.env.DATABASE_ROOT || "database");
  console.log(`[Database Pipeline] Target database root: ${dbRoot}`);

  console.log("\n--- Phase 1: Running Data Migration & Canonical Normalization ---");
  const migrationReport = await runDatabaseMigration(dbRoot);
  console.log("Migration Report:", JSON.stringify(migrationReport, null, 2));

  console.log("\n--- Phase 2: Regenerating All Master & Sharded Indexes ---");
  const indexReport = await regenerateAllIndexes(dbRoot);
  console.log("Index Generation Report:", JSON.stringify(indexReport, null, 2));

  console.log("\n--- Phase 3: Validating Full Database Integrity ---");
  const validationReport = await validateDatabase(dbRoot);
  console.log("Validation Report:", JSON.stringify(validationReport, null, 2));
}

main().catch((err) => {
  console.error("[Database Pipeline] Failed:", err);
  process.exit(1);
});
