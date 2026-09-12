const fs = require('fs');
const file = 'src/components/scraper/StudioDirectoryTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  onLoadStudios: (page: number, force?: boolean) => void;',
  `  onLoadStudios: (page: number, force?: boolean) => void;
  batchIngesting?: boolean;
  onAutoCrawlAndSave?: (pagesToCrawl: number) => void;`
);

content = content.replace(
  '  ingestingCode,',
  `  ingestingCode,
  batchIngesting = false,
  onAutoCrawlAndSave,`
);

fs.writeFileSync(file, content);
