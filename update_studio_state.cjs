const fs = require('fs');
const file = 'src/components/scraper/StudioDirectoryTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '}) => {\n  if (selectedStudio) {',
  '}) => {\n  const [studioPagesToCrawl, setStudioPagesToCrawl] = React.useState<number>(1);\n\n  if (selectedStudio) {'
);

fs.writeFileSync(file, content);
