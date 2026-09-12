import React, { useState } from "react";
import {
  Globe,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Play,
  Zap,
  GitCommit,
  Layers,
} from "lucide-react";
import { JavtifulScrapeResult, JavtifulVideoItem } from "../../types";
import { ScraperVideoCard } from "./ScraperVideoCard";
import { ScraperPagination } from "./ScraperPagination";

interface CatalogScraperTabProps {
  catalogPage: number;
  filterDuplicates: boolean;
  setFilterDuplicates: (val: boolean) => void;
  enrichDetails: boolean;
  setEnrichDetails: (val: boolean) => void;
  catalogLoading: boolean;
  catalogResult: JavtifulScrapeResult | null;
  catalogError: string | null;
  batchIngesting: boolean;
  ingestingCode: string | null;
  autoCommitEnabled?: boolean;
  uncommittedCount?: number;
  onPageChange: (page: number) => void;
  onIngestAll: () => void;
  onAutoCrawlAndSave?: (pagesToCrawl: number) => void;
  onInspect: (item: JavtifulVideoItem) => void;
  onIngest: (item: JavtifulVideoItem) => void;
}

export const CatalogScraperTab: React.FC<CatalogScraperTabProps> = ({
  catalogPage,
  filterDuplicates,
  setFilterDuplicates,
  enrichDetails,
  setEnrichDetails,
  catalogLoading,
  catalogResult,
  catalogError,
  batchIngesting,
  ingestingCode,
  autoCommitEnabled = true,
  uncommittedCount = 0,
  onPageChange,
  onIngestAll,
  onAutoCrawlAndSave,
  onInspect,
  onIngest,
}) => {
  const [catalogPagesToCrawl, setCatalogPagesToCrawl] = useState<number>(1);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="p-5 bg-white border border-neutral-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Live Javtiful Catalog Scraper
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto-Commit Status */}
            <div
              id="badge-catalog-autocommit-status"
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
                Auto-Commit: {autoCommitEnabled ? "ON" : "OFF"}
              </span>
            </div>

            <button
              id="btn-refresh-catalog"
              disabled={catalogLoading || batchIngesting}
              onClick={() => onPageChange(catalogPage)}
              className="px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${catalogLoading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>

            {/* Follow Pagination Selector */}
            <div className="flex items-center bg-neutral-100 border border-neutral-200 rounded-xl p-0.5">
              <span className="px-2 text-[11px] text-neutral-500 font-medium hidden md:inline">Follow:</span>
              <select
                id="select-catalog-pages-to-crawl"
                value={catalogPagesToCrawl}
                onChange={(e) => setCatalogPagesToCrawl(parseInt(e.target.value, 10))}
                disabled={catalogLoading || batchIngesting}
                className="bg-transparent text-neutral-800 text-xs font-medium py-1.5 px-2 rounded-lg focus:outline-none cursor-pointer"
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
              id="btn-ingest-all-catalog"
              disabled={
                catalogLoading ||
                batchIngesting ||
                !catalogResult ||
                (catalogPagesToCrawl === 1 && catalogResult.uniqueCount === 0)
              }
              onClick={() => {
                if (catalogPagesToCrawl > 1 && onAutoCrawlAndSave) {
                  onAutoCrawlAndSave(catalogPagesToCrawl);
                } else {
                  onIngestAll();
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Automatically filter duplicates, enrich details, and save to database following auto-commit setting"
            >
              {batchIngesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {catalogPagesToCrawl > 1
                      ? `Crawling ${catalogPagesToCrawl} Pages...`
                      : "Saving to Database..."}
                  </span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {catalogPagesToCrawl > 1
                      ? `Auto Crawl & Save (${catalogPagesToCrawl} Pages)`
                      : `Auto Save (${catalogResult ? catalogResult.uniqueCount : 0} New)`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center gap-4 text-xs text-neutral-600 pt-1 border-t border-neutral-100 flex-wrap">
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
            <span>Auto-enrich metadata</span>
          </label>
        </div>
      </div>

      {/* Error state */}
      {catalogError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5">
          <XCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{catalogError}</span>
        </div>
      )}

      {/* Loading state */}
      {catalogLoading && !catalogResult && (
        <div className="p-12 text-center space-y-3 bg-white border border-neutral-200 rounded-2xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neutral-600" />
          <p className="text-xs text-neutral-500">
            Fetching catalog page {catalogPage} from Javtiful...
          </p>
        </div>
      )}

      {/* Catalog Results Grid */}
      {catalogResult && (
        <div className="space-y-4">
          <ScraperPagination
            currentPage={catalogPage}
            totalPages={catalogResult.pagination?.totalPages || 500}
            hasNext={catalogResult.pagination?.hasNext ?? true}
            hasPrev={catalogPage > 1}
            loading={catalogLoading}
            onPageChange={onPageChange}
            idPrefix="catalog-pagination-top"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogResult.items.map((item, idx) => (
              <ScraperVideoCard
                key={`${item.code || 'item'}-${idx}`}
                item={item}
                onInspect={onInspect}
                onIngest={onIngest}
                isIngesting={ingestingCode === item.code}
              />
            ))}
          </div>

          <ScraperPagination
            currentPage={catalogPage}
            totalPages={catalogResult.pagination?.totalPages || 500}
            hasNext={catalogResult.pagination?.hasNext ?? true}
            hasPrev={catalogPage > 1}
            loading={catalogLoading}
            onPageChange={onPageChange}
            idPrefix="catalog-pagination-bottom"
          />
        </div>
      )}
    </div>
  );
};
