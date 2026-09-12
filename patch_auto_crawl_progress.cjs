const fs = require('fs');
const file = 'server/routes/scraperRoutes.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /batchResult = await ingestionService\.bulkIngestTransaction\(allItemsToIngest, \{\n        commitMessage: commitMsg,\n      \}\);/g,
  `batchResult = await ingestionService.bulkIngestTransaction(allItemsToIngest, {
        commitMessage: commitMsg,
        onProgress: (status, progress) => {
          if (typeof sendEvent === 'function') {
            sendEvent("progress", {
              status: status,
              progress: 0.9 + (progress * 0.1)
            });
          }
        }
      });`
);

fs.writeFileSync(file, content);
