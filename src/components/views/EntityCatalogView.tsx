import React, { useState, useEffect } from "react";
import {
  Users,
  Building2,
  Search,
  FolderTree,
  Film,
  ExternalLink,
  Calendar,
  Copy,
  Check,
  X,
  RefreshCw,
  Layers,
  FileCode,
  Download,
  LucideIcon,
} from "lucide-react";
import {
  ActressCatalogItem,
  StudioCatalogItem,
  ShardedActressEntity,
  ShardedStudioEntity,
  NavView,
} from "../../types";
import { fetchWithRetry } from "../../utils/fetchWithRetry";
import { MediaHarvesterModal } from "../modals/MediaHarvesterModal";
import { DatabasePagination } from "../common/DatabasePagination";

export type EntityType = "actress" | "studio";

interface EntityCatalogViewProps {
  entityType: EntityType;
  onNavigate?: (view: NavView) => void;
}

const ALPHABET = ["all", ..."abcdefghijklmnopqrstuvwxyz".split(""), "#"];

type GenericCatalogItem = ActressCatalogItem | StudioCatalogItem;
type GenericShardedEntity = (ShardedActressEntity | ShardedStudioEntity) & {
  videos: Array<{
    code?: string;
    title: string;
    thumbnail?: string;
    postUrl: string;
    studioSlug?: string;
    studioName?: string;
    actressSlug?: string;
    actressName?: string;
    releaseDate?: string;
    addedAt: string;
  }>;
};

export const EntityCatalogView: React.FC<EntityCatalogViewProps> = ({
  entityType,
  onNavigate,
}) => {
  const isActress = entityType === "actress";

  // Entity config
  const config = {
    title: isActress ? "Actress Catalog & Sharding" : "Studio Catalog & Sharding",
    singularTitle: isActress ? "Actress" : "Studio",
    pluralTitle: isActress ? "Actresses" : "Studios",
    storagePath: isActress
      ? "database/pstar/{letter}/{slug}.json"
      : "database/studio/{letter}/{slug}.json",
    apiBase: isActress ? "/api/actresses" : "/api/studios",
    icon: isActress ? Users : Building2,
    relatedIcon: isActress ? Building2 : Users,
    relatedLabel: isActress ? "Studio" : "Actress",
    accentColor: isActress ? "text-rose-600 bg-rose-50" : "text-sky-600 bg-sky-50",
  };

  const Icon: LucideIcon = config.icon;
  const RelatedIcon: LucideIcon = config.relatedIcon;

  // Catalog State
  const [entities, setEntities] = useState<GenericCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLetter, setSelectedLetter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Selected Detail Modal State
  const [selectedItem, setSelectedItem] = useState<GenericCatalogItem | null>(null);
  const [entityDetails, setEntityDetails] = useState<GenericShardedEntity | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [detailTab, setDetailTab] = useState<"videos" | "json">("videos");
  const [copied, setCopied] = useState<boolean>(false);

  // Deep Harvester Modal
  const [harvestTarget, setHarvestTarget] = useState<string | null>(null);

  const fetchEntities = async (
    targetPage = 1,
    letter = selectedLetter,
    query = searchQuery
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: "36",
      });
      if (letter !== "all") params.append("letter", letter);
      if (query.trim()) params.append("q", query.trim());

      const res = await fetchWithRetry(`${config.apiBase}?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = isActress ? data.actresses : data.studios;
      setEntities(list || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
      setPage(data.page || 1);
    } catch (err) {
      console.error(`Failed to load ${config.pluralTitle}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities(1, selectedLetter, searchQuery);
  }, [selectedLetter, entityType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEntities(1, selectedLetter, searchQuery);
  };

  const handleOpenDetail = async (item: GenericCatalogItem) => {
    setSelectedItem(item);
    setLoadingDetails(true);
    setDetailTab("videos");
    try {
      const res = await fetch(`${config.apiBase}/${encodeURIComponent(item.slug)}`);
      if (res.ok) {
        const data = await res.json();
        setEntityDetails(data);
      } else {
        setEntityDetails(null);
      }
    } catch (err) {
      console.error(`Failed to fetch ${config.singularTitle} details:`, err);
      setEntityDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const copyJson = () => {
    if (!entityDetails) return;
    navigator.clipboard.writeText(JSON.stringify(entityDetails, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Search & Actions Control Bar */}
      <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b]/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400 dark:text-slate-500" />
            <input
              id={`${entityType}-search-input`}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${config.pluralTitle.toLowerCase()} by name or slug...`}
              className="w-full pl-9 pr-20 py-2 rounded-xl border border-neutral-300 dark:border-[#2b3a54] text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white dark:bg-[#101728]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  fetchEntities(1, selectedLetter, "");
                }}
                className="absolute right-14 top-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              id={`${entityType}-search-submit-btn`}
              type="submit"
              className="absolute right-1.5 top-1.5 px-2.5 py-1 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 text-xs rounded-lg font-medium transition-colors"
            >
              Filter
            </button>
          </form>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-slate-400 bg-neutral-100 dark:bg-slate-800 px-3 py-2 rounded-xl font-mono">
              <FolderTree className="w-3.5 h-3.5 text-neutral-500 dark:text-slate-400" />
              <span>
                Total: {totalCount} {totalCount === 1 ? config.singularTitle : config.pluralTitle}
              </span>
            </div>

            <button
              id={`${entityType}-refresh-btn`}
              onClick={() => fetchEntities(page, selectedLetter, searchQuery)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-300 dark:border-[#2b3a54] hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] text-xs font-medium text-neutral-700 dark:text-slate-300 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {onNavigate && (
              <button
                onClick={() => onNavigate("bulk-scraper")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-slate-900 hover:bg-neutral-800 dark:hover:bg-slate-200 text-xs font-medium transition-colors shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Ingest</span>
              </button>
            )}
          </div>
        </div>

        {/* Alphabet Navigation Chips */}
        <div className="pt-2 border-t border-neutral-100">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-mono">
            {ALPHABET.map((char) => {
              const isActive = selectedLetter === char;
              return (
                <button
                  key={char}
                  id={`${entityType}-letter-${char}`}
                  onClick={() => {
                    setSelectedLetter(char);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md uppercase transition-colors shrink-0 text-[11px] font-medium ${
                    isActive
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-xs"
                      : "bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700"
                  }`}
                >
                  {char}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      {loading ? (
        <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl p-16 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-neutral-400 dark:text-slate-500 mx-auto" />
          <p className="text-xs text-neutral-500 dark:text-slate-400">Loading {config.pluralTitle.toLowerCase()} from GitHub index...</p>
        </div>
      ) : entities.length === 0 ? (
        <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl p-16 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-400 dark:text-slate-500 mx-auto flex items-center justify-center">
            <Icon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              No {config.pluralTitle} Found
            </h3>
            <p className="text-xs text-neutral-500 dark:text-slate-400 max-w-md mx-auto">
              {searchQuery || selectedLetter !== "all"
                ? `No records match letter '${selectedLetter.toUpperCase()}' or query '${searchQuery}'.`
                : `The database contains no ${config.pluralTitle.toLowerCase()} yet. Ingest video batches from the Bulk Scraper to automatically sharded profiles.`}
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("bulk-scraper")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-slate-900 hover:bg-neutral-800 dark:hover:bg-slate-200 text-xs font-medium transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Go to Bulk Scraper</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Pagination */}
          <DatabasePagination
            idPrefix={`${entityType}-db-pagination-top`}
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={36}
            loading={loading}
            onPageChange={(targetPage) => fetchEntities(targetPage, selectedLetter, searchQuery)}
          />

          {/* 2 columns on mobile, 3 columns on other displays */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-5 lg:gap-6">
            {entities.map((item, idx) => (
              <div
                key={`${item.slug}-${idx}`}
                id={`${entityType}-card-${item.slug}`}
                onClick={() => handleOpenDetail(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenDetail(item);
                  }
                }}
                className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b]/90 hover:border-neutral-400 dark:hover:border-slate-600 dark:border-slate-600 rounded-2xl p-4 sm:p-6 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col items-center text-center justify-between active:scale-[0.98] select-none"
              >
                <div className="flex flex-col items-center w-full">
                  {/* Extra Large Profile Photo */}
                  <div className={`w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 lg:w-48 lg:h-48 aspect-square ${isActress ? "rounded-full" : "rounded-2xl"} bg-neutral-100 dark:bg-slate-800 border-2 border-neutral-200 dark:border-[#1e293b]/90 group-hover:border-neutral-400 dark:hover:border-slate-600 dark:border-slate-600 group-hover:scale-[1.03] transition-all overflow-hidden flex items-center justify-center shrink-0 shadow-xs`}>
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon className="w-12 h-12 sm:w-16 sm:h-16 text-neutral-400 dark:text-slate-500" />
                    )}
                  </div>

                  {/* Full Name (No truncation, wrapped within box) */}
                  <h3 className="mt-3.5 sm:mt-4 text-xs sm:text-sm md:text-base font-bold text-neutral-900 dark:text-white group-hover:text-neutral-950 dark:text-white w-full px-1 text-center leading-snug break-words">
                    {item.name}
                  </h3>

                  {/* Total Video Number */}
                  <div className="mt-2 flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-slate-800 group-hover:bg-neutral-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-slate-900 text-neutral-700 dark:text-slate-300 text-[11px] sm:text-xs font-mono font-medium transition-colors">
                      <Film className="w-3 h-3 text-neutral-500 dark:text-slate-400 group-hover:text-white dark:group-hover:text-slate-900 transition-colors" />
                      <span>
                        {item.videoCount} {item.videoCount === 1 ? "video" : "videos"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Pagination */}
          <DatabasePagination
            idPrefix={`${entityType}-db-pagination-bottom`}
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={36}
            loading={loading}
            onPageChange={(targetPage) => fetchEntities(targetPage, selectedLetter, searchQuery)}
          />
        </div>
      )}

      {/* Sharded Entity Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 dark:bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#101728] rounded-2xl border border-neutral-200 dark:border-[#1e293b] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-[#1e293b] flex items-center justify-between gap-4 bg-neutral-50 dark:bg-[#0b101a] shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${isActress ? "rounded-full" : "rounded-2xl"} bg-neutral-200 dark:bg-slate-700 border-2 border-neutral-300 dark:border-[#2b3a54] shrink-0 overflow-hidden flex items-center justify-center shadow-xs`}>
                  {selectedItem.thumbnail ? (
                    <img
                      src={selectedItem.thumbnail}
                      alt={selectedItem.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon className="w-7 h-7 text-neutral-500 dark:text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white truncate">
                      {selectedItem.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-neutral-200 dark:bg-slate-700 text-neutral-700 dark:text-slate-300">
                      {selectedItem.path}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                    Slug: {selectedItem.slug} • {selectedItem.videoCount} total {selectedItem.videoCount === 1 ? "video" : "videos"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedItem(null);
                  setEntityDetails(null);
                }}
                className="p-1.5 rounded-lg text-neutral-400 dark:text-slate-500 hover:text-neutral-700 dark:text-slate-300 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="px-5 pt-3 border-b border-neutral-200 dark:border-[#1e293b] bg-white dark:bg-[#101728] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium">
                <button
                  onClick={() => setDetailTab("videos")}
                  className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                    detailTab === "videos"
                      ? "border-neutral-900 text-neutral-900 dark:text-white font-semibold"
                      : "border-transparent text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:text-slate-200"
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>
                    Cataloged Videos ({entityDetails?.videos?.length || selectedItem.videoCount})
                  </span>
                </button>
                <button
                  onClick={() => setDetailTab("json")}
                  className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                    detailTab === "json"
                      ? "border-neutral-900 text-neutral-900 dark:text-white font-semibold"
                      : "border-transparent text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:text-slate-200"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Sharded JSON Profile</span>
                </button>
              </div>

              {detailTab === "json" && (
                <button
                  onClick={copyJson}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-neutral-300 dark:border-[#2b3a54] hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] text-neutral-700 dark:text-slate-300 transition-colors mb-1.5"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy JSON"}</span>
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {loadingDetails ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-neutral-400 dark:text-slate-500 mx-auto" />
                  <p className="text-xs text-neutral-500 dark:text-slate-400">
                    Fetching sharded profile from <code className="font-mono">{selectedItem.path}</code>...
                  </p>
                </div>
              ) : detailTab === "videos" ? (
                !entityDetails || entityDetails.videos.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <p className="text-xs text-neutral-500 dark:text-slate-400">
                      No videos cataloged under this {config.singularTitle.toLowerCase()} yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {entityDetails.videos.map((vid, idx) => {
                      const relatedName = isActress ? vid.studioName : vid.actressName;
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-neutral-200 dark:border-[#1e293b] bg-white dark:bg-[#101728] hover:border-neutral-300 dark:hover:border-[#2b3a54] dark:border-[#2b3a54] shadow-xs flex flex-col justify-between transition-colors gap-2"
                        >
                          <div className="flex gap-3">
                            {vid.thumbnail ? (
                              <div className="w-20 h-16 rounded-lg bg-neutral-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-neutral-200 dark:border-[#1e293b]">
                                <img
                                  src={vid.thumbnail}
                                  alt={vid.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : null}
                            <div className="min-w-0 flex-1 space-y-1">
                              {vid.code && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-neutral-900 dark:bg-white text-white dark:text-slate-900 font-mono text-[10px] font-semibold">
                                  {vid.code}
                                </span>
                              )}
                              <h4 className="text-xs font-semibold text-neutral-900 dark:text-white line-clamp-2 leading-tight">
                                {vid.title}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-neutral-500 dark:text-slate-400">
                                {relatedName && (
                                  <span className="flex items-center gap-0.5 truncate">
                                    <RelatedIcon className="w-2.5 h-2.5 text-neutral-400 dark:text-slate-500" />
                                    {relatedName}
                                  </span>
                                )}
                                {vid.releaseDate && (
                                  <span className="flex items-center gap-0.5">
                                    <Calendar className="w-2.5 h-2.5 text-neutral-400 dark:text-slate-500" />
                                    {vid.releaseDate}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                            <button
                              onClick={() => {
                                setHarvestTarget(vid.postUrl || vid.code || "");
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-neutral-800 dark:text-slate-200 font-medium hover:text-neutral-950 dark:text-white transition-colors"
                            >
                              <Download className="w-3 h-3 text-neutral-600 dark:text-slate-400" />
                              <span>Inspect Streams</span>
                            </button>
                            {vid.postUrl && (
                              <a
                                href={vid.postUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:text-slate-200 transition-colors"
                              >
                                <span>Watch Post</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-neutral-900 dark:bg-white text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto max-h-96">
                    <pre>{JSON.stringify(entityDetails, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-[#1e293b] bg-neutral-50 dark:bg-[#0b101a] flex items-center justify-between text-xs text-neutral-500 dark:text-slate-400">
              <span className="font-mono text-[11px]">
                Updated: {entityDetails?.updatedAt || selectedItem.updatedAt}
              </span>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setEntityDetails(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-slate-900 hover:bg-neutral-800 dark:hover:bg-slate-200 text-xs font-medium transition-colors shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Harvester Modal */}
      <MediaHarvesterModal
        isOpen={!!harvestTarget}
        onClose={() => setHarvestTarget(null)}
        postUrlOrCode={harvestTarget}
        onIngested={() => {
          if (selectedItem) {
            handleOpenDetail(selectedItem);
          }
          fetchEntities(page, selectedLetter, searchQuery);
        }}
      />
    </div>
  );
};
