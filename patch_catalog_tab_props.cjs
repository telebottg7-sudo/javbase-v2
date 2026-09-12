const fs = require('fs');
const file = 'src/components/scraper/CatalogScraperTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  ingestingCode: string | null;\n  autoCommitEnabled?: boolean;',
  '  ingestingCode: string | null;\n  autoCommitEnabled?: boolean;\n  crawlProgress?: number;\n  crawlStatusText?: string;'
);

content = content.replace(
  '  ingestingCode,\n  autoCommitEnabled = true,',
  '  ingestingCode,\n  autoCommitEnabled = true,\n  crawlProgress = 0,\n  crawlStatusText = "",'
);

fs.writeFileSync(file, content);
