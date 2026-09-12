import React from "react";
import {
  Globe,
  SlidersHorizontal,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
} from "lucide-react";
import { JavtifulScrapeResult, JavtifulVideoItem } from "../../types";
import { ScraperVideoCard } from "./ScraperVideoCard";

interface CommitReceiptData {
  commitSha: string;
  commitUrl?: string;
  modifiedFiles: string[];
  ingestedCount: number;
  duplicateCount: number;
  isSingleCommit: boolean;
}

interface UniversalScraperTabProps {
  bulkUrl: string;
  setBulkUrl: (url: string) => void;
  bulkFilterDuplicates: boolean;
  setBulkFilterDuplicates: (val: boolean) => void;
  bulkEnrichDetails: boolean;
  setBulkEnrichDetails: (val: boolean) => void;
  bulkScraping: boolean;
  bulkScrapeResult: JavtifulScrapeResult | null;
  bulkScrapeError: string | null;
  bulkBatchCommitting: boolean;
  commitReceipt: CommitReceiptData | null;
  ingestingCode: string | null;
  onScrape: (e?: React.FormEvent) => void;
  onCommitAll: () => void;
  onInspect: (item: JavtifulVideoItem) => void;
  onIngest: (item: JavtifulVideoItem) => void;
}

export const UniversalScraperTab: React.FC<UniversalScraperTabProps> = ({
  bulkUrl,
  setBulkUrl,
  bulkFilterDuplicates,
  setBulkFilterDuplicates,
  bulkEnrichDetails,
  setBulkEnrichDetails,
  bulkScraping,
  bulkScrapeResult,
  bulkScrapeError,
  bulkBatchCommitting,
  commitReceipt,
  ingestingCode,
  onScrape,
  onCommitAll,
  onInspect,
  onIngest,
}) => {
  return (
    <div className="space-y-6">
      {/* Search / Target URL Input */}
      <div className="p-5 bg-white border border-neutral-200 rounded-2xl shadow-xs space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-neutral-900">Universal Bulk Scraper</h3>
          <p className="text-xs text-neutral-500">
            Extract videos from any Javtiful page (Main, Actresses, Studios, Tags, Categories, or Search queries) and commit in a single atomic batch transaction.
          </p>
        </div>

        <form onSubmit={onScrape} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Globe className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-bulk-url"
                type="url"
                value={bulkUrl}
                onChange={(e) => setBulkUrl(e.target.value)}
                placeholder="https://javtiful.com/actress/..."
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
              />
            </div>

            <button
              id="btn-execute-bulk-scrape"
              type="submit"
              disabled={bulkScraping || !bulkUrl.trim()}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-all shadow-xs flex items-center gap-2 shrink-0"
            >
              {bulkScraping ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Scraping...</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Scrape Target URL</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap text-xs text-neutral-600 pt-1">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bulkFilterDuplicates}
                  onChange={(e) => setBulkFilterDuplicates(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <span>Hide registry duplicates</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bulkEnrichDetails}
                  onChange={(e) => setBulkEnrichDetails(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <span>Enrich post metadata & streams</span>
              </label>
            </div>

            {/* Quick URL Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-neutral-400">Presets:</span>
              <button
                type="button"
                onClick={() => setBulkUrl("https://javtiful.com/main")}
                className="text-[11px] text-neutral-600 hover:text-neutral-900 underline font-mono"
              >
                /main
              </button>
              <button
                type="button"
                onClick={() => setBulkUrl("https://javtiful.com/actress/yua-mikami")}
                className="text-[11px] text-neutral-600 hover:text-neutral-900 underline font-mono"
              >
                /actress/yua-mikami
              </button>
              <button
                type="button"
                onClick={() => setBulkUrl("https://javtiful.com/studio/s1")}
                className="text-[11px] text-neutral-600 hover:text-neutral-900 underline font-mono"
              >
                /studio/s1
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error state */}
      {bulkScrapeError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5">
          <XCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{bulkScrapeError}</span>
        </div>
      )}

      {/* Atomic Batch Commit Receipt */}
      {commitReceipt && (
        <div
          id="bulk-commit-receipt"
          className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-950">
                  Batch Commit Succeeded
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Successfully ingested{" "}
                  <span className="font-semibold">{commitReceipt.ingestedCount}</span> new videos{" "}
                  ({commitReceipt.duplicateCount} duplicates skipped) in ONE atomic GitHub commit.
                </p>
              </div>
            </div>
            {commitReceipt.commitUrl && (
              <a
                href={commitReceipt.commitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-emerald-900 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors shrink-0"
              >
                <span>View Commit</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-1">
            <div className="p-2.5 bg-white/80 rounded-lg border border-emerald-200/60">
              <span className="text-emerald-700 block text-[10px] uppercase font-sans font-semibold">
                Commit SHA
              </span>
              <span className="text-neutral-900">{commitReceipt.commitSha}</span>
            </div>
            <div className="p-2.5 bg-white/80 rounded-lg border border-emerald-200/60">
              <span className="text-emerald-700 block text-[10px] uppercase font-sans font-semibold">
                Modified Files
              </span>
              <span className="text-neutral-900">{commitReceipt.modifiedFiles.length} file updates</span>
            </div>
          </div>
        </div>
      )}

      {/* Scrape Results Summary & Commit All Button */}
      {bulkScrapeResult && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-neutral-200 rounded-xl flex items-center justify-between gap-4 flex-wrap shadow-xs">
            <div className="flex items-center gap-4 flex-wrap text-xs text-neutral-600">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-neutral-900">
                  {bulkScrapeResult.totalFound}
                </span>
                <span>items found</span>
              </div>
              <div className="h-3 w-px bg-neutral-200" />
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{bulkScrapeResult.uniqueCount} new</span>
              </div>
              <div className="h-3 w-px bg-neutral-200" />
              <div className="flex items-center gap-1.5 text-neutral-500">
                <span>{bulkScrapeResult.duplicateCount} in registry</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-bulk-commit-all"
                disabled={bulkScrapeResult.uniqueCount === 0 || bulkBatchCommitting}
                onClick={onCommitAll}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all shadow-xs flex items-center gap-2"
              >
                {bulkBatchCommitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Committing Batch...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Commit All ({bulkScrapeResult.uniqueCount}) in 1 Transaction</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Video Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bulkScrapeResult.items.map((item, idx) => (
              <ScraperVideoCard
                key={`${item.code || 'item'}-${idx}`}
                item={item}
                onInspect={onInspect}
                onIngest={onIngest}
                isIngesting={ingestingCode === item.code}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
