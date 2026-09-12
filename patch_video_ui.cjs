const fs = require('fs');
const file = 'src/components/modals/MediaHarvesterModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const mainVideoReplace = `                      {activeStreamUrl && (
                        <div className="rounded-lg overflow-hidden bg-black aspect-16/9 border border-neutral-200 dark:border-[#1e293b] relative group">
                          <video
                            ref={mainVideoRef}
                            src={activeStreamUrl}
                            controls
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain"
                          />
                          <button
                            onClick={() => toggleFullscreen(mainVideoRef)}
                            className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs font-medium backdrop-blur-sm border border-white/10"
                          >
                            <Maximize className="w-3.5 h-3.5" />
                            <span>Fullscreen</span>
                          </button>
                        </div>
                      )}`;

content = content.replace(
  /                      \{activeStreamUrl && \([\s\S]*?<\/div>\n                      \)\}/m,
  mainVideoReplace
);

const previewVideoReplace = `                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-neutral-700 dark:text-slate-300" />
                      Embedded Video Clip Preview
                    </h4>
                    <div className="rounded-lg overflow-hidden bg-black aspect-16/9 border border-neutral-200 dark:border-[#1e293b] relative group">
                      <video
                        ref={previewVideoRef}
                        src={data.previewVideoUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                      <button
                        onClick={() => toggleFullscreen(previewVideoRef)}
                        className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs font-medium backdrop-blur-sm border border-white/10"
                      >
                        <Maximize className="w-3.5 h-3.5" />
                        <span>Fullscreen</span>
                      </button>
                    </div>
                  </div>`;

content = content.replace(
  /                  <div>\n                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-slate-400 mb-2 flex items-center gap-1\.5">[\s\S]*?<\/div>\n                  <\/div>/m,
  previewVideoReplace
);

fs.writeFileSync(file, content);
