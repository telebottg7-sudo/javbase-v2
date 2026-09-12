const fs = require('fs');
const content = fs.readFileSync('src/components/views/BulkScraperView.tsx', 'utf8');
console.log(content.includes('crawlProgress={crawlProgress}'));
