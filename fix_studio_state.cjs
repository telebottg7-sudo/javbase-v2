const fs = require('fs');
const file = 'src/components/scraper/StudioDirectoryTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  // If a studio is selected',
  '  const [studioPagesToCrawl, setStudioPagesToCrawl] = React.useState<number>(1);\n\n  // If a studio is selected'
);
fs.writeFileSync(file, content);
