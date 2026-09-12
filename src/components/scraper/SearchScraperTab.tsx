import React, { useState } from "react";
import { Search, RefreshCw, XCircle, ExternalLink, Zap, CheckCircle2, ShieldCheck, Database, GitCommit, Layers, ArrowRight } from "lucide-react";
import { JavtifulScrapeResult, JavtifulVideoItem } from "../../types";
import { ScraperVideoCard } from "./ScraperVideoCard";
import { ScraperPagination } from "./ScraperPagination";

interface SearchScraperTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchPage: number;
  filterDuplicates: boolean;
  setFilterDuplicates: (val: boolean) => void;
  enrichDetails: boolean;
  setEnrichDetails: (val: boolean) => void;
  searchLoading: boolean;
  searchResult: JavtifulScrapeResult | null;
  searchError: string | null;
  ingestingCode: string | null;
  autoSaving?: boolean;
  autoCommitEnabled?: boolean;
  uncommittedCount?: number;
  onSearch: (e?: React.FormEvent) => void;
  onAutoSaveAll?: () => void;
  onAutoSearchAndSave?: (pagesToCrawl?: number) => void;
  onPageChange: (page: number) => void;
  onInspect: (item: JavtifulVideoItem) => void;
  onIngest: (item: JavtifulVideoItem) => void;
}

export const SearchScraperTab: React.FC<SearchScraperTabProps> = ({
  searchQuery,
  setSearchQuery,
  searchPage,
  filterDuplicates,
  setFilterDuplicates,
  enrichDetails,
  setEnrichDetails,
  searchLoading,
  searchResult,
  searchError,
  ingestingCode,
  autoSaving = false,
  autoCommitEnabled = true,
  uncommittedCount = 0,
  onSearch,
  onAutoSaveAll,
  onAutoSearchAndSave,
  onPageChange,
  onInspect,
  onIngest,
}) => {
  const [pagesToFollow, setPagesToFollow] = useState<number>(1);
  const uniqueCount = searchResult?.uniqueCount ?? 0;

  const handleExecuteAutoScrapeAndSave = () => {
    if (onAutoSearchAndSave) {
      onAutoSearchAndSave(pagesToFollow);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input Box */}
      <div className="p-5 bg-white border border-neutral-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <span>Search Javtiful Releases</span>
            </h3>
          </div>

          {/* Auto-Commit Setting Status Badge */}
          <div className="flex items-center gap-2">
            <div
              id="badge-search-autocommit-status"
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 ${
                autoCommitEnabled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
              title={
                autoCommitEnabled
                  ? "Auto-Commit is enabled: Ingestion pushes atomic commit directly to GitHub repository"
                  : `Auto-Commit is disabled: Ingestion stages changes in local DB cache (${uncommittedCount} staged files)`
              }
            >
              <GitCommit className="w-3 h-3" />
              <span>
                Auto-Commit: {autoCommitEnabled ? "ON (GitHub Push)" : "OFF (DB Staged)"}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={onSearch} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-scraper-search-query"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code, actress, or series (e.g. RKI, SSIS)..."
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              <button
                id="btn-execute-scraper-search"
                type="submit"
                disabled={searchLoading || autoSaving || !searchQuery.trim()}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {searchLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </>
                )}
              </button>

              {/* Follow Pagination Selector */}
              <div className="flex items-center bg-neutral-100 border border-neutral-200 rounded-xl p-0.5">
                <span className="px-2 text-[11px] text-neutral-500 font-medium hidden md:inline">Follow:</span>
                <select
                  id="select-search-pages-to-follow"
                  value={pagesToFollow}
                  onChange={(e) => setPagesToFollow(parseInt(e.target.value, 10))}
                  disabled={searchLoading || autoSaving}
                  className="bg-transparent text-neutral-800 text-xs font-medium py-1.5 px-2 rounded-lg focus:outline-none cursor-pointer"
                  title="Number of sequential pagination pages to follow during Auto Crawl & Save"
                >
                  <option value={1}>1 Page</option>
                  <option value={2}>2 Pages</option>
                  <option value={3}>3 Pages</option>
                  <option value={5}>5 Pages</option>
                  <option value={10}>10 Pages</option>
                </select>
              </div>

              {onAutoSearchAndSave && (
                <button
                  id="btn-auto-search-and-save"
                  type="button"
                  onClick={handleExecuteAutoScrapeAndSave}
                  disabled={searchLoading || autoSaving || !searchQuery.trim()}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  title={`Search, follow ${pagesToFollow} pagination page(s), filter duplicates, enrich details, and save all unique videos to database`}
                >
                  {autoSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {pagesToFollow > 1 ? `Crawling ${pagesToFollow} Pages...` : "Auto Saving..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {pagesToFollow > 1
                          ? `Auto Crawl & Save (${pagesToFollow} Pages)`
                          : "Auto Scrape & Save"}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-neutral-600 pt-1 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterDuplicates}
                onChange={(e) => setFilterDuplicates(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span>Filter out registry duplicates</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enrichDetails}
                onChange={(e) => setEnrichDetails(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span>Enrich details & stream links</span>
            </label>
          </div>
        </form>
      </div>

      {/* Error state */}
      {searchError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5">
          <XCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Search Results */}
      {searchResult && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-neutral-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-neutral-600 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Found <strong className="text-neutral-900">{searchResult.totalFound}</strong> results
                for query &ldquo;<strong className="text-neutral-900">{searchQuery}</strong>&rdquo;
                {searchPage > 1 && (
                  <span className="text-neutral-500 font-medium"> (Page {searchPage})</span>
                )}
              </span>
              <span className="text-neutral-300">|</span>
              <span>
                <strong className="text-emerald-700">{uniqueCount}</strong> new /{" "}
                <strong className="text-neutral-700">{searchResult.duplicateCount}</strong> in database
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Primary Auto Ingest & Save Button */}
              {onAutoSaveAll && (
                <button
                  id="btn-auto-save-search-results"
                  onClick={onAutoSaveAll}
                  disabled={autoSaving || searchLoading || uniqueCount === 0}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title={`Automatically filter duplicates, enrich details, and save ${uniqueCount} unique videos on current page to database (${autoCommitEnabled ? "pushes to GitHub" : "stages in DB cache"})`}
                >
                  {autoSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>
                        Auto Save Page ({uniqueCount} New)
                      </span>
                    </>
                  )}
                </button>
              )}

              {/* Multi-page Crawl Next Action if next page exists */}
              {onAutoSearchAndSave && (searchResult.pagination?.hasNext ?? true) && (
                <button
                  id="btn-auto-crawl-next-pages"
                  onClick={() => onAutoSearchAndSave(3)}
                  disabled={autoSaving || searchLoading}
                  className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Follow pagination and crawl next 3 pages automatically"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Crawl Next 3 Pages</span>
                </button>
              )}

              {searchResult.source && (
                <a
                  href={searchResult.source}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                  title="View target search URL on Javtiful"
                >
                  <span>{searchResult.source.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              )}
            </div>
          </div>

          {/* Top Pagination */}
          <ScraperPagination
            currentPage={searchPage}
            totalPages={searchResult.pagination?.totalPages || (searchResult.items.length >= 20 ? searchPage + 1 : searchPage)}
            hasNext={searchResult.pagination?.hasNext ?? (searchResult.items.length >= 20)}
            hasPrev={searchPage > 1}
            loading={searchLoading || autoSaving}
            onPageChange={onPageChange}
            idPrefix="search-pagination-top"
          />

          {searchResult.items.length === 0 ? (
            <div className="p-12 text-center bg-white border border-neutral-200 rounded-2xl text-xs text-neutral-500">
              No videos found matching &ldquo;{searchQuery}&rdquo; on page {searchPage}. Try a different search query or page.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResult.items.map((item, idx) => (
                <ScraperVideoCard
                  key={`${item.code || 'item'}-${idx}`}
                  item={item}
                  onInspect={onInspect}
                  onIngest={onIngest}
                  isIngesting={ingestingCode === item.code || autoSaving}
                />
              ))}
            </div>
          )}

          {/* Bottom Pagination */}
          {searchResult.items.length > 0 && (
            <ScraperPagination
              currentPage={searchPage}
              totalPages={searchResult.pagination?.totalPages || (searchResult.items.length >= 20 ? searchPage + 1 : searchPage)}
              hasNext={searchResult.pagination?.hasNext ?? (searchResult.items.length >= 20)}
              hasPrev={searchPage > 1}
              loading={searchLoading || autoSaving}
              onPageChange={onPageChange}
              idPrefix="search-pagination-bottom"
            />
          )}
        </div>
      )}
    </div>
  );
};
