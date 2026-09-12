import React from "react";
import {
  Building,
  Film,
  ChevronLeft,
  ExternalLink,
  RefreshCw,
  Play,
  Zap,
  Layers,
  Database,
} from "lucide-react";
import { JavtifulStudioItem, JavtifulVideoItem } from "../../types";
import { ScraperVideoCard } from "./ScraperVideoCard";
import { ScraperPagination } from "./ScraperPagination";

interface StudioDirectoryTabProps {
  studios: JavtifulStudioItem[];
  studiosLoading: boolean;
  studiosPage: number;
  studiosPagination: {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage?: number;
    prevPage?: number;
  } | null;
  selectedStudio: string | null;
  selectedStudioName: string | null;
  studioVideos: JavtifulVideoItem[];
  studioVideosPage: number;
  studioVideosLoading: boolean;
  studioVideosPagination: {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage?: number;
    prevPage?: number;
  } | null;
  ingestingCode: string | null;
  onLoadStudios: (page: number, force?: boolean) => void;
  batchIngesting?: boolean;
  onAutoCrawlAndSave?: (pagesToCrawl: number) => void;
  onSelectStudio: (slug: string, name?: string) => void;
  onBackToDirectory: () => void;
  onStudioVideosPageChange: (page: number) => void;
  onInspect: (item: JavtifulVideoItem) => void;
  onIngest: (item: JavtifulVideoItem) => void;
}

export const StudioDirectoryTab: React.FC<StudioDirectoryTabProps> = ({
  studios,
  studiosLoading,
  studiosPage,
  studiosPagination,
  selectedStudio,
  selectedStudioName,
  studioVideos,
  studioVideosPage,
  studioVideosLoading,
  studioVideosPagination,
  ingestingCode,
  batchIngesting = false,
  onAutoCrawlAndSave,
  onLoadStudios,
  onSelectStudio,
  onBackToDirectory,
  onStudioVideosPageChange,
  onInspect,
  onIngest,
}) => {
  const [studioPagesToCrawl, setStudioPagesToCrawl] = React.useState<number>(1);

  // If a studio is selected, render the dedicated Studio Movies View
  if (selectedStudio) {
    return (
      <div className="space-y-6">
        {/* Navigation & Studio Header */}
        <div className="p-5 bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-2xl shadow-xs space-y-4">
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
                href={`https://javtiful.com/studio/${selectedStudio}`}
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
                        ? `Crawling ${studioPagesToCrawl} Pages...`
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

          <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-[#1e293b] flex items-center justify-center text-neutral-700 dark:text-slate-300 shrink-0 shadow-xs">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white leading-snug">
                {selectedStudioName || selectedStudio}
              </h3>
              <p className="text-xs font-mono text-neutral-400 dark:text-slate-500">
                /studio/{selectedStudio}
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {studioVideosLoading && studioVideos.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-2xl">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neutral-600 dark:text-slate-400" />
            <p className="text-xs text-neutral-500 dark:text-slate-400">
              Loading releases for {selectedStudioName || selectedStudio}...
            </p>
          </div>
        ) : studioVideos.length === 0 ? (
          <div className="p-12 text-center space-y-2 bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-2xl">
            <Film className="w-8 h-8 mx-auto text-neutral-400 dark:text-slate-500 opacity-40" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-slate-300">No releases found</p>
            <p className="text-xs text-neutral-500 dark:text-slate-400">
              No releases found for this studio page.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Pagination */}
            <ScraperPagination
              currentPage={studioVideosPage}
              totalPages={studioVideosPagination?.totalPages || 1}
              hasNext={studioVideosPagination?.hasNext ?? false}
              hasPrev={studioVideosPage > 1}
              loading={studioVideosLoading}
              onPageChange={onStudioVideosPageChange}
              idPrefix="studio-videos-pagination-top"
            />

            {/* Video Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {studioVideos.map((item, idx) => (
                <ScraperVideoCard
                  key={`${item.code || 'item'}-${idx}`}
                  item={item}
                  onInspect={onInspect}
                  onIngest={onIngest}
                  isIngesting={ingestingCode === item.code}
                />
              ))}
            </div>

            {/* Bottom Pagination */}
            <ScraperPagination
              currentPage={studioVideosPage}
              totalPages={studioVideosPagination?.totalPages || 1}
              hasNext={studioVideosPagination?.hasNext ?? false}
              hasPrev={studioVideosPage > 1}
              loading={studioVideosLoading}
              onPageChange={onStudioVideosPageChange}
              idPrefix="studio-videos-pagination-bottom"
            />
          </div>
        )}
      </div>
    );
  }

  // Studios Directory Grid View
  return (
    <div className="space-y-6">
      <div className="p-5 bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-2xl shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Studios & Channels Directory
            </h3>
            <p className="text-xs text-neutral-500 dark:text-slate-400">
              Explore releases organized by production house and studio channel.
            </p>
          </div>

          <button
            id="btn-refresh-studios"
            disabled={studiosLoading}
            onClick={() => onLoadStudios(studiosPage, true)}
            className="px-3 py-1.5 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${studiosLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {studiosLoading && studios.length === 0 ? (
        <div className="p-12 text-center space-y-3 bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-2xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neutral-600 dark:text-slate-400" />
          <p className="text-xs text-neutral-500 dark:text-slate-400">
            Loading studios directory page {studiosPage}...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <ScraperPagination
            currentPage={studiosPage}
            totalPages={studiosPagination?.totalPages || 1}
            hasNext={studiosPagination?.hasNext ?? false}
            hasPrev={studiosPage > 1}
            loading={studiosLoading}
            onPageChange={(page) => onLoadStudios(page, true)}
            idPrefix="studios-pagination-top"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {studios.map((studio, idx) => (
              <div
                key={`${studio.slug || 'studio'}-${idx}`}
                id={`studio-card-${studio.slug}`}
                onClick={() => onSelectStudio(studio.slug, studio.name)}
                className="p-4 bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl hover:border-neutral-400 dark:hover:border-slate-600 dark:border-slate-600 hover:shadow-xs transition-all flex flex-col items-center text-center space-y-2 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-slate-800 flex items-center justify-center text-neutral-600 dark:text-slate-400 group-hover:scale-105 transition-transform duration-200 border border-neutral-200 dark:border-[#1e293b]">
                  <Building className="w-6 h-6" />
                </div>
                <div className="space-y-0.5 w-full">
                  <h4
                    className="text-xs font-semibold text-neutral-900 dark:text-white truncate"
                    title={studio.name}
                  >
                    {studio.name}
                  </h4>
                  {studio.videoCount !== undefined && (
                    <span className="text-[10px] text-neutral-500 dark:text-slate-400 font-mono block">
                      {studio.videoCount} releases
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <ScraperPagination
            currentPage={studiosPage}
            totalPages={studiosPagination?.totalPages || 1}
            hasNext={studiosPagination?.hasNext ?? false}
            hasPrev={studiosPage > 1}
            loading={studiosLoading}
            onPageChange={(page) => onLoadStudios(page, true)}
            idPrefix="studios-pagination-bottom"
          />
        </div>
      )}
    </div>
  );
};
