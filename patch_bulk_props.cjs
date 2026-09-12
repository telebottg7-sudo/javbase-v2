const fs = require('fs');
const file = 'src/components/views/BulkScraperView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'batchIngesting={batchIngesting}\n          onAutoCrawlAndSave={handleAutoCrawlCatalog}',
  'batchIngesting={batchIngesting}\n          crawlProgress={crawlProgress}\n          crawlStatusText={crawlStatusText}\n          onAutoCrawlAndSave={handleAutoCrawlCatalog}'
);

content = content.replace(
  'batchIngesting={batchIngesting}\n          onAutoCrawlAndSave={handleAutoCrawlStudio}',
  'batchIngesting={batchIngesting}\n          crawlProgress={crawlProgress}\n          crawlStatusText={crawlStatusText}\n          onAutoCrawlAndSave={handleAutoCrawlStudio}'
);

fs.writeFileSync(file, content);
