const fs = require('fs');
const file = 'src/components/scraper/StudioDirectoryTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  batchIngesting?: boolean;',
  '  batchIngesting?: boolean;\n  crawlProgress?: number;\n  crawlStatusText?: string;'
);

content = content.replace(
  '  batchIngesting = false,\n  onAutoCrawlAndSave,',
  '  batchIngesting = false,\n  crawlProgress = 0,\n  crawlStatusText = "",\n  onAutoCrawlAndSave,'
);

fs.writeFileSync(file, content);
