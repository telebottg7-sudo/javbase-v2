const fs = require('fs');
const file = 'server/services/ingestionService.ts';
let content = fs.readFileSync(file, 'utf8');

// Find the private async saveLocalDiskFiles up to the /** Loads or returns cached master videos index.
const start = content.indexOf('private async saveLocalDiskFiles');
const end = content.indexOf('  /**', start);

const original = content.slice(start, end);

const fixed = `private async saveLocalDiskFiles(files: Array<{ path: string; content: string | object }>): Promise<void> {
    const dbDir = path.join(process.cwd(), "database");
    
    // Batch file writes to avoid OS "too many open files" limits while remaining extremely fast
    const batchSize = 50;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (f) => {
          try {
            const fullPath = path.join(dbDir, f.path);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            const str = typeof f.content === "string" ? f.content : JSON.stringify(f.content, null, 2);
            await fs.writeFile(fullPath, str, "utf-8");
          } catch (err) {
            console.warn(\`[Local Sync] Error writing local file \${f.path}:\`, err);
          }
        })
      );
    }
  }

`;

content = content.replace(original, fixed);
fs.writeFileSync(file, content);
