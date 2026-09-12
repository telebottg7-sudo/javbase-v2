const fs = require('fs');
const file = 'src/components/scraper/StudioDirectoryTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  ingestingCode,\n  onLoadStudios,',
  '  ingestingCode,\n  batchIngesting = false,\n  onAutoCrawlAndSave,\n  onLoadStudios,'
);

fs.writeFileSync(file, content);
