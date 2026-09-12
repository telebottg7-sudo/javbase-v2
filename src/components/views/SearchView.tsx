import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Film,
  Users,
  Building2,
  FileCode,
  Layers,
  Sparkles,
  ExternalLink,
  Clock,
  Calendar,
  Play,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ChevronRight,
  Database,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  UniversalSearchResponse,
  UniversalSearchResultItem,
  SearchEntityType,
  Step8TestReport,
  NavView,
} from "../../types";
import { MediaHarvesterModal } from "../modals/MediaHarvesterModal";
import { DatabasePagination } from "../common/DatabasePagination";

interface SearchViewProps {
  onNavigate?: (view: NavView) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<SearchEntityType >("all");
  const [loading, setLoading] = useState<boolean>(false);
  const [searchResponse, setSearchResponse] = useState<UniversalSearchResponse | null>(null);
  const [page, setPage] = useState<number>(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Deep Harvester Modal
  const [inspectTarget, setInspectTarget] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);


  // Quick suggestion chips
  const quickSuggestions = [
    { label: "SSIS-001", type: "code" },
    { label: "MOIL-008", type: "code" },
    { label: "Hatano Yui", type: "actress" },
    { label: "FALENO", type: "studio" },
    { label: "S1 NO.1 STYLE", type: "studio" },
  ];

  // Perform search
  const performSearch = async (
    q = query,
    type: SearchEntityType = activeTab,
    targetPage = 1
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: q.trim(),
        type,
        page: targetPage.toString(),
        limit: "24",
      });

      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to search`);
      const data: UniversalSearchResponse = await res.json();
      setSearchResponse(data);
      setPage(data.page);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    performSearch("", "all", 1);
  }, []);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle tab change
  const handleTabChange = (tab: SearchEntityType ) => {
    setActiveTab(tab);
    performSearch(query, tab, 1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, activeTab, 1);
  };

  const handleClear = () => {
    setQuery("");
    performSearch("", activeTab, 1);
    searchInputRef.current?.focus();
  };

  const handleSuggestionClick = (text: string) => {
    setQuery(text);
    performSearch(text, activeTab, 1);
  };


  const openHarvesterModal = (target: string) => {
    setInspectTarget(target);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-slate-400 uppercase">
              Universal Discovery Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
            Metadata Search
          </h1>
        </div>

        <div className="flex items-center gap-3">
          
        </div>
      </div>

      {/* Global Search Input & Suggestion Chips */}
      <div className="space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <div className="absolute left-4 text-neutral-400 dark:text-slate-500 pointer-events-none">
            <Search className="w-5 h-5" />
          </div>
          <input
            id="universal-search-input"
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code (e.g. SSIS-001), actress, studio, or title... (Press '/' to focus)"
            className="w-full pl-12 pr-28 py-3.5 bg-white dark:bg-[#101728] border border-neutral-300 dark:border-[#2b3a54] rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm shadow-xs transition-all"
          />
          <div className="absolute right-3 flex items-center gap-2">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-md text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
                title="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              id="universal-search-submit-btn"
              type="submit"
              disabled={loading}
              className="px-3.5 py-1.5 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-medium rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              Search
            </button>
          </div>
        </form>

        {/* Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-neutral-500 dark:text-slate-400">
          <span className="shrink-0 flex items-center gap-1 text-neutral-400 dark:text-slate-500">
            <Zap className="w-3 h-3 text-amber-500" />
            Quick suggestions:
          </span>
          {quickSuggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(item.label)}
              className="px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 font-medium transition-colors shrink-0"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-[#1e293b] overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            id="search-tab-all"
            onClick={() => handleTabChange("all")}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === "all"
                ? "border-neutral-900 text-neutral-900 dark:text-white font-semibold"
                : "border-transparent text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            All Results
            {searchResponse && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 text-[10px] font-mono">
                {searchResponse.countsByType.all}
              </span>
            )}
          </button>

          <button
            id="search-tab-videos"
            onClick={() => handleTabChange("videos")}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === "videos"
                ? "border-neutral-900 text-neutral-900 dark:text-white font-semibold"
                : "border-transparent text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:text-slate-200"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Videos
            {searchResponse && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 text-[10px] font-mono">
                {searchResponse.countsByType.videos}
              </span>
            )}
          </button>

          <button
            id="search-tab-actresses"
            onClick={() => handleTabChange("actresses")}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === "actresses"
                ? "border-neutral-900 text-neutral-900 dark:text-white font-semibold"
                : "border-transparent text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Actresses
            {searchResponse && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 text-[10px] font-mono">
                {searchResponse.countsByType.actresses}
              </span>
            )}
          </button>

          <button
            id="search-tab-studios"
            onClick={() => handleTabChange("studios")}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === "studios"
                ? "border-neutral-900 text-neutral-900 dark:text-white font-semibold"
                : "border-transparent text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:text-slate-200"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Studios
            {searchResponse && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 text-[10px] font-mono">
                {searchResponse.countsByType.studios}
              </span>
            )}
          </button>

          <button
            id="search-tab-codes"
            onClick={() => handleTabChange("codes")}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === "codes"
                ? "border-neutral-900 text-neutral-900 dark:text-white font-semibold"
                : "border-transparent text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:text-slate-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Codes
            {searchResponse && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 text-[10px] font-mono">
                {searchResponse.countsByType.codes}
              </span>
            )}
          </button>
        </div>

        
      </div>

        <div className="space-y-6">
      {/* Direct Match Banner (if query exactly matched a canonical code or entity) */}
          {searchResponse?.directMatch && (
            <div className="p-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-slate-900 border border-neutral-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-neutral-800 dark:bg-slate-200 text-amber-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-400 text-neutral-950 dark:text-white font-bold text-[10px] tracking-wider uppercase">
                      Exact {searchResponse.directMatch.type.toUpperCase()} Match
                    </span>
                    <span className="font-mono text-xs font-bold text-neutral-200 dark:text-slate-600">
                      {searchResponse.directMatch.code || searchResponse.directMatch.title}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 dark:text-slate-500 mt-0.5">
                    {searchResponse.directMatch.subtitle || "Direct canonical index record located"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {searchResponse.directMatch.type === "video" || searchResponse.directMatch.type === "code" ? (
                  <button
                    id="direct-match-inspect-btn"
                    onClick={() =>
                      openHarvesterModal(
                        searchResponse.directMatch?.postUrl ||
                          searchResponse.directMatch?.code ||
                          query
                      )
                    }
                    className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-[#101728] hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-950 dark:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-neutral-900 dark:text-white" />
                    Inspect & Harvest Streams
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (onNavigate) {
                        onNavigate(
                          searchResponse.directMatch?.type === "actress" ? "actress" : "studio"
                        );
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-[#101728] hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-950 dark:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    View Catalog
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results Grid / List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 dark:text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-neutral-800 dark:text-slate-200" />
              <p className="text-sm font-medium">Querying master indices...</p>
            </div>
          ) : searchResponse && searchResponse.results.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#101728] rounded-xl border border-neutral-200 dark:border-[#1e293b] text-neutral-500 dark:text-slate-400 space-y-3">
              <Search className="w-10 h-10 mx-auto text-neutral-300 dark:text-slate-500" />
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                No matching records found
              </h3>
              <p className="text-xs text-neutral-500 dark:text-slate-400 max-w-sm mx-auto">
                No indexed videos, actresses, studios, or codes matched "{query}". Try checking a code in the Bulk Scraper or run the scraper pipeline.
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate("bulk-scraper")}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-900 dark:bg-white text-white dark:text-slate-900 hover:bg-neutral-800 dark:hover:bg-slate-200"
                >
                  Go to Scraper Pipeline
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Top Pagination */}
              {searchResponse && searchResponse.totalPages > 1 && (
                <DatabasePagination
                  idPrefix="search-db-pagination-top"
                  currentPage={searchResponse.page}
                  totalPages={searchResponse.totalPages}
                  totalItems={searchResponse.totalFound}
                  itemsPerPage={24}
                  loading={loading}
                  onPageChange={(targetPage) => performSearch(query, activeTab, targetPage)}
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {searchResponse?.results.map((item, idx) => (
                  <div
                    key={`${item.id || item.type}-${idx}`}
                    className="flex flex-col bg-white dark:bg-[#101728] rounded-xl border border-neutral-200 dark:border-[#1e293b] overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    {/* Visual Preview / Header */}
                    {item.type === "video" ? (
                      <div className="relative aspect-16/10 bg-neutral-900 dark:bg-white overflow-hidden">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-neutral-600 dark:text-slate-400">
                            <Film className="w-8 h-8" />
                          </div>
                        )}
                        {item.code && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-white font-mono text-[11px] font-bold">
                            {item.code}
                          </span>
                        )}
                        {item.duration && (
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-white font-mono text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.duration}
                          </span>
                        )}
                      </div>
                    ) : item.type === "actress" ? (
                      <div className="p-4 bg-rose-50/50 border-b border-rose-100 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-rose-100 border border-rose-200 shrink-0">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-rose-600">
                              <Users className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-semibold uppercase tracking-wider">
                            Actress
                          </span>
                          <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate mt-0.5">
                            {item.title}
                          </h4>
                        </div>
                      </div>
                    ) : item.type === "studio" ? (
                      <div className="p-4 bg-sky-50/50 border-b border-sky-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-semibold uppercase tracking-wider">
                            Studio
                          </span>
                          <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate mt-0.5">
                            {item.title}
                          </h4>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-neutral-100 dark:bg-slate-800 border-b border-neutral-200 dark:border-[#1e293b] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shrink-0">
                          <FileCode className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-slate-700 text-neutral-800 dark:text-slate-200 text-[10px] font-mono font-bold uppercase tracking-wider">
                            Registry Code
                          </span>
                          <h4 className="text-sm font-mono font-bold text-neutral-900 dark:text-white truncate mt-0.5">
                            {item.code || item.title}
                          </h4>
                        </div>
                      </div>
                    )}

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        {item.type === "video" && (
                          <h4 className="text-xs font-semibold text-neutral-900 dark:text-white line-clamp-2 leading-snug">
                            {item.title}
                          </h4>
                        )}

                        {item.subtitle && (
                          <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {item.subtitle}
                          </p>
                        )}

                        {item.releaseDate && (
                          <p className="text-[11px] text-neutral-400 dark:text-slate-500 font-mono mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {item.releaseDate}
                          </p>
                        )}
                      </div>

                      {/* Card Action Button */}
                      <div className="pt-2 border-t border-neutral-100">
                        {item.type === "video" ? (
                          <button
                            id={`inspect-video-btn-${item.code || item.id}`}
                            onClick={() => openHarvesterModal(item.postUrl || item.code || "")}
                            className="w-full py-1.5 px-3 rounded-lg bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Inspect & Harvest Streams
                          </button>
                        ) : item.type === "actress" ? (
                          <button
                            onClick={() => {
                              if (onNavigate) onNavigate("actress");
                            }}
                            className="w-full py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" />
                            View Actress Profile
                          </button>
                        ) : item.type === "studio" ? (
                          <button
                            onClick={() => {
                              if (onNavigate) onNavigate("studio");
                            }}
                            className="w-full py-1.5 px-3 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            View Studio Catalog
                          </button>
                        ) : (
                          <button
                            id={`inspect-code-btn-${item.code}`}
                            onClick={() => openHarvesterModal(item.postUrl || item.code || "")}
                            className="w-full py-1.5 px-3 rounded-lg bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-800 dark:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Inspect Media Sources
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Pagination */}
              {searchResponse && searchResponse.totalPages > 1 && (
                <DatabasePagination
                  idPrefix="search-db-pagination-bottom"
                  currentPage={searchResponse.page}
                  totalPages={searchResponse.totalPages}
                  totalItems={searchResponse.totalFound}
                  itemsPerPage={24}
                  loading={loading}
                  onPageChange={(targetPage) => performSearch(query, activeTab, targetPage)}
                />
              )}
            </div>
          )}
        </div>
      {/* Media Harvester Modal */}
      <MediaHarvesterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        postUrlOrCode={inspectTarget}
        onIngested={() => {
          performSearch(query, activeTab, page);
        }}
      />
    </div>
  );
};
