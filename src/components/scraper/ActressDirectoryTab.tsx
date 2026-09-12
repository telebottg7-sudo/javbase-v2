import React from "react";
import {
  User,
  Film,
  ChevronLeft,
  ExternalLink,
  RefreshCw,
  Database,
  CheckCircle2,
  Filter,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import { JavtifulActressItem, JavtifulVideoItem, SaveActressResult } from "../../types";
import { ScraperVideoCard } from "./ScraperVideoCard";
import { ScraperPagination } from "./ScraperPagination";

interface ActressDirectoryTabProps {
  actresses: JavtifulActressItem[];
  actressesLoading: boolean;
  actressesPage: number;
  actressesPagination: {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage?: number;
    prevPage?: number;
  } | null;
  selectedActress: string | null;
  selectedActressName: string | null;
  selectedActressThumbnail: string | null;
  selectedActressVideoCount: number | undefined;
  actressVideos: JavtifulVideoItem[];
  actressVideosPage: number;
  actressVideosLoading: boolean;
  actressVideosPagination: {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage?: number;
    prevPage?: number;
  } | null;
  filterDuplicates?: boolean;
  isSavingActress?: boolean;
  actressSaveReceipt?: SaveActressResult | null;
  ingestingCode: string | null;
  onLoadActresses: (page: number, force?: boolean) => void;
  onSelectActress: (
    slug: string,
    name?: string,
    thumbnail?: string,
    videoCount?: number
  ) => void;
  onBackToDirectory: () => void;
  onActressVideosPageChange: (page: number) => void;
  onToggleFilterDuplicates?: (filter: boolean) => void;
  onSaveActressToDatabase?: (options: { filterDuplicates: boolean }) => void;
  onInspect: (item: JavtifulVideoItem) => void;
  onIngest: (item: JavtifulVideoItem) => void;
  onNavigateToDatabase?: () => void;
}

export const ActressDirectoryTab: React.FC<ActressDirectoryTabProps> = ({
  actresses,
  actressesLoading,
  actressesPage,
  actressesPagination,
  selectedActress,
  selectedActressName,
  selectedActressThumbnail,
  selectedActressVideoCount,
  actressVideos,
  actressVideosPage,
  actressVideosLoading,
  actressVideosPagination,
  filterDuplicates = false,
  isSavingActress = false,
  actressSaveReceipt = null,
  ingestingCode,
  onLoadActresses,
  onSelectActress,
  onBackToDirectory,
  onActressVideosPageChange,
  onToggleFilterDuplicates,
  onSaveActressToDatabase,
  onInspect,
  onIngest,
  onNavigateToDatabase,
}) => {
  // If an actress is selected, render the dedicated Actress Movies View
  if (selectedActress) {
    const totalFound = actressVideos.length;
    const duplicateCount = actressVideos.filter((v) => v.isDuplicate).length;
    const uniqueCount = totalFound - duplicateCount;

    return (
      <div className="space-y-6">
        {/* Navigation & Actress Profile Header */}
        <div className="p-5 bg-white border border-neutral-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              id="btn-back-to-actresses"
              onClick={onBackToDirectory}
              className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>All Actresses</span>
            </button>

            <a
              href={`https://javtiful.com/actress/${selectedActress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5 transition-colors"
            >
              <span>View Source on Javtiful</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-neutral-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0 shadow-xs">
                {selectedActressThumbnail ? (
                  <img
                    src={selectedActressThumbnail}
                    alt={selectedActressName || selectedActress}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    <User className="w-8 h-8 opacity-40" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 leading-snug">
                  {selectedActressName || selectedActress}
                </h3>
                <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
                  <span className="font-mono text-neutral-400">
                    /actress/{selectedActress}
                  </span>
                  {selectedActressVideoCount !== undefined && (
                    <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded-md font-medium text-neutral-700 flex items-center gap-1">
                      <Film className="w-3 h-3 text-neutral-400" />
                      <span>{selectedActressVideoCount} total videos</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick stats on current view */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700">
                {totalFound} on page
              </span>
              <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700">
                {uniqueCount} new
              </span>
              {duplicateCount > 0 && (
                <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-700">
                  {duplicateCount} in DB
                </span>
              )}
            </div>
          </div>

          {/* Database Saving & Duplicate Filtering Control Card */}
          <div className="pt-4 border-t border-neutral-100 bg-neutral-50/60 -mx-5 -mb-5 p-5 rounded-b-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label
                htmlFor="actress-filter-duplicates"
                className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-neutral-700 select-none"
              >
                <input
                  id="actress-filter-duplicates"
                  type="checkbox"
                  checked={filterDuplicates}
                  onChange={(e) =>
                    onToggleFilterDuplicates &&
                    onToggleFilterDuplicates(e.target.checked)
                  }
                  className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 accent-neutral-900"
                />
                <span className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Filter Duplicates</span>
                </span>
              </label>
              <span className="text-[11px] text-neutral-400 hidden sm:inline">
                (Skip movies already in database)
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                id="btn-save-actress-to-db"
                disabled={isSavingActress || actressVideosLoading || actressVideos.length === 0}
                onClick={() =>
                  onSaveActressToDatabase &&
                  onSaveActressToDatabase({ filterDuplicates })
                }
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {isSavingActress ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save Actress & Movies to DB</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Ingestion Receipt Banner */}
        {actressSaveReceipt && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
              <div className="space-y-0.5">
                <p className="font-semibold text-emerald-950">
                  Successfully saved {actressSaveReceipt.actressName} to database!
                </p>
                <p className="text-emerald-700 text-[11px]">
                  Ingested {actressSaveReceipt.ingestedCount} new movies • {actressSaveReceipt.duplicateCount} duplicates filtered • Total in profile: {actressSaveReceipt.totalActressVideos}
                  {actressSaveReceipt.commitSha && ` • Commit: ${actressSaveReceipt.commitSha.slice(0, 7)}`}
                </p>
              </div>
            </div>

            {onNavigateToDatabase && (
              <button
                id="btn-view-actress-in-db"
                onClick={onNavigateToDatabase}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <span>View in Database</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {actressVideosLoading && actressVideos.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white border border-neutral-200 rounded-2xl">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neutral-600" />
            <p className="text-xs text-neutral-500">
              Loading movies for {selectedActressName || selectedActress}...
            </p>
          </div>
        ) : actressVideos.length === 0 ? (
          <div className="p-12 text-center space-y-2 bg-white border border-neutral-200 rounded-2xl">
            <Film className="w-8 h-8 mx-auto text-neutral-400 opacity-40" />
            <p className="text-sm font-semibold text-neutral-700">No movies found</p>
            <p className="text-xs text-neutral-500">
              {filterDuplicates
                ? "All movies on this page are already recorded in the database (duplicates filtered)."
                : "No movies returned from Javtiful for this actress page."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Pagination */}
            <ScraperPagination
              currentPage={actressVideosPage}
              totalPages={actressVideosPagination?.totalPages || 1}
              hasNext={actressVideosPagination?.hasNext ?? false}
              hasPrev={actressVideosPage > 1}
              loading={actressVideosLoading}
              onPageChange={onActressVideosPageChange}
              idPrefix="actress-videos-pagination-top"
            />

            {/* Movies Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {actressVideos.map((item, idx) => (
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
              currentPage={actressVideosPage}
              totalPages={actressVideosPagination?.totalPages || 1}
              hasNext={actressVideosPagination?.hasNext ?? false}
              hasPrev={actressVideosPage > 1}
              loading={actressVideosLoading}
              onPageChange={onActressVideosPageChange}
              idPrefix="actress-videos-pagination-bottom"
            />
          </div>
        )}
      </div>
    );
  }

  // Actresses Directory Grid View
  return (
    <div className="space-y-6">
      <div className="p-5 bg-white border border-neutral-200 rounded-2xl shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-neutral-900">
              Actresses Directory
            </h3>
            <p className="text-xs text-neutral-500">
              Browse actress profiles and click any actress to explore her movie catalog and save to database.
            </p>
          </div>

          <button
            id="btn-refresh-actresses"
            disabled={actressesLoading}
            onClick={() => onLoadActresses(actressesPage, true)}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${actressesLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actressesLoading && actresses.length === 0 ? (
        <div className="p-12 text-center space-y-3 bg-white border border-neutral-200 rounded-2xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neutral-600" />
          <p className="text-xs text-neutral-500">
            Loading actresses directory page {actressesPage}...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <ScraperPagination
            currentPage={actressesPage}
            totalPages={actressesPagination?.totalPages || 316}
            hasNext={actressesPagination?.hasNext ?? true}
            hasPrev={actressesPage > 1}
            loading={actressesLoading}
            onPageChange={(page) => onLoadActresses(page, true)}
            idPrefix="actresses-pagination-top"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {actresses.map((actress, idx) => (
              <div
                key={`${actress.slug || 'actress'}-${idx}`}
                id={`actress-card-${actress.slug}`}
                onClick={() =>
                  onSelectActress(
                    actress.slug,
                    actress.name,
                    actress.thumbnail,
                    actress.videoCount
                  )
                }
                className="p-3 bg-white border border-neutral-200 rounded-xl hover:border-neutral-400 hover:shadow-xs transition-all flex flex-col items-center text-center space-y-2 group cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-neutral-100 overflow-hidden border border-neutral-200 group-hover:scale-105 transition-transform duration-200">
                  {actress.thumbnail ? (
                    <img
                      src={actress.thumbnail}
                      alt={actress.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <User className="w-6 h-6 opacity-40" />
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 w-full">
                  <h4
                    className="text-xs font-semibold text-neutral-900 truncate"
                    title={actress.name}
                  >
                    {actress.name}
                  </h4>
                  {actress.videoCount !== undefined && (
                    <span className="text-[10px] text-neutral-500 font-mono block">
                      {actress.videoCount} videos
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <ScraperPagination
            currentPage={actressesPage}
            totalPages={actressesPagination?.totalPages || 316}
            hasNext={actressesPagination?.hasNext ?? true}
            hasPrev={actressesPage > 1}
            loading={actressesLoading}
            onPageChange={(page) => onLoadActresses(page, true)}
            idPrefix="actresses-pagination-bottom"
          />
        </div>
      )}
    </div>
  );
};
