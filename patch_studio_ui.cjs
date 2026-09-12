const fs = require('fs');
const file = 'src/components/scraper/StudioDirectoryTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const progressUI = `
          {batchIngesting && crawlProgress > 0 && (
            <div className="w-full bg-neutral-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden shadow-inner mt-4">
              <div 
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: \`\${crawlProgress}%\` }}
              ></div>
            </div>
          )}
          {batchIngesting && crawlStatusText && (
            <div className="text-xs text-neutral-500 dark:text-slate-400 font-medium text-center mt-1.5 animate-pulse">
              {crawlStatusText}
            </div>
          )}
`;

content = content.replace(
  '          <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">',
  progressUI + '\n          <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">'
);

fs.writeFileSync(file, content);
