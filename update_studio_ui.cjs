const fs = require('fs');
const file = 'src/components/scraper/StudioDirectoryTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                id="btn-back-to-studios"
                onClick={onBackToDirectory}
                className="px-3.5 py-2 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-800 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>All Studios</span>
              </button>

              <a
                href={\`https://javtiful.com/studio/\${selectedStudio}\`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <span>View on Javtiful</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-[#1e293b] rounded-xl p-0.5">
                <span className="px-2 text-[11px] text-neutral-500 dark:text-slate-400 font-medium hidden md:inline">Follow:</span>
                <select
                  id="select-studio-pages-to-crawl"
                  value={studioPagesToCrawl}
                  onChange={(e) => setStudioPagesToCrawl(parseInt(e.target.value, 10))}
                  disabled={studioVideosLoading || batchIngesting}
                  className="bg-transparent text-neutral-800 dark:text-slate-200 text-xs font-medium py-1.5 px-2 rounded-lg focus:outline-none cursor-pointer"
                  title="Number of pagination pages to follow during auto crawl"
                >
                  <option value={1}>1 Page</option>
                  <option value={2}>2 Pages</option>
                  <option value={3}>3 Pages</option>
                  <option value={5}>5 Pages</option>
                  <option value={10}>10 Pages</option>
                </select>
              </div>

              <button
                id="btn-auto-crawl-studio"
                disabled={studioVideosLoading || batchIngesting || studioVideos.length === 0}
                onClick={() => {
                  if (onAutoCrawlAndSave) {
                    onAutoCrawlAndSave(studioPagesToCrawl);
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Automatically fetch detailed data and save to database for all releases across selected pages"
              >
                {batchIngesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {studioPagesToCrawl > 1
                        ? \`Crawling \${studioPagesToCrawl} Pages...\`
                        : "Saving to Database..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>
                      Auto Crawl & Save
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
`;

content = content.replace(/<div className="flex items-center justify-between gap-3 flex-wrap">[\s\S]*?<\/a>\n          <\/div>/m, replacement.trim());

fs.writeFileSync(file, content);
