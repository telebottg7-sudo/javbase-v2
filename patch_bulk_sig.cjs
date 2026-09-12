const fs = require('fs');
const file = 'server/services/ingestionService.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'options?: { commitMessage?: string }',
  'options?: { commitMessage?: string; onProgress?: (msg: string, pct: number) => void }'
);

content = content.replace(
  '// 6. Assemble files for ONE ATOMIC BATCH COMMIT',
  'options?.onProgress?.("Assembling atomic files...", 0.1);\n    // 6. Assemble files for ONE ATOMIC BATCH COMMIT'
);

content = content.replace(
  'const commitResult = await this.storage.batchCommit(filesToCommit, commitMsg);',
  'options?.onProgress?.("Pushing atomic commit to GitHub...", 0.4);\n    const commitResult = await this.storage.batchCommit(filesToCommit, commitMsg);\n    options?.onProgress?.("Writing to local disk cache...", 0.8);'
);

fs.writeFileSync(file, content);
