const fs = require('fs');
const file = 'src/components/views/BulkScraperView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<StudioDirectoryTab([\s\S]*?)onStudioVideosPageChange/g,
  '<StudioDirectoryTab$1batchIngesting={batchIngesting}\n          onAutoCrawlAndSave={handleAutoCrawlStudio}\n          onStudioVideosPageChange'
);

fs.writeFileSync(file, content);
