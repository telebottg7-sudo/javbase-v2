import React, { useState, useEffect } from "react";
import {
  Film,
  Search,
  FolderTree,
  ExternalLink,
  Calendar,
  Clock,
  Users,
  Building2,
  RefreshCw,
  Layers,
  X,
  Copy,
  Check,
  FileCode,
  Download,
} from "lucide-react";
import { VideoCatalogItem, NavView } from "../../types";
import { MediaHarvesterModal } from "../modals/MediaHarvesterModal";
import { DatabasePagination } from "../common/DatabasePagination";
import { fetchWithRetry } from "../../utils/fetchWithRetry";

interface VideosViewProps {
  onNavigate?: (view: NavView) => void;
}

export const VideosView: React.FC<VideosViewProps> = ({ onNavigate }) => {
  const [videos, setVideos] = useState<VideoCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actressFilter, setActressFilter] = useState("");
  const [studioFilter, setStudioFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalFound, setTotalFound] = useState(0);

  // Selected Video Modal
  const [selectedVideo, setSelectedVideo] = useState<VideoCatalogItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [harvesterTarget, setHarvesterTarget] = useState<string | null>(null);

  const fetchVideos = async (
    targetPage = 1,
    query = searchQuery,
    actress = actressFilter,
    studio = studioFilter
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: "24",
      });
      if (query.trim()) params.append("q", query.trim());
      if (actress.trim()) params.append("actress", actress.trim());
      if (studio.trim()) params.append("studio", studio.trim());

      const res = await fetchWithRetry(`/api/videos?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVideos(data.videos || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
      setTotalFound(data.totalFound || 0);
      setPage(data.page || 1);
    } catch (err) {
      console.error("Failed to load videos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(1, searchQuery, actressFilter, studioFilter);
  }, [actressFilter, studioFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVideos(1, searchQuery, actressFilter, studioFilter);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActressFilter("");
    setStudioFilter("");
    fetchVideos(1, "", "", "");
  };

  const copyJson = () => {
    if (!selectedVideo) return;
    navigator.clipboard.writeText(JSON.stringify(selectedVideo, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">Master Video Catalog</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchVideos(page, searchQuery, actressFilter, studioFilter)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 dark:border-[#2b3a54] hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] text-xs font-medium text-neutral-700 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            {onNavigate && (
              <button
                onClick={() => onNavigate("bulk-scraper")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-slate-900 hover:bg-neutral-800 dark:bg-slate-200 text-xs font-medium transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Ingest via Scraper</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Active Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-neutral-100">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by video code, title, actress, studio..."
              className="w-full pl-9 pr-20 py-2 rounded-lg border border-neutral-300 dark:border-[#2b3a54] text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white dark:bg-[#101728]"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-2.5 py-1 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 text-xs rounded font-medium transition-colors"
            >
              Filter
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-slate-400 whitespace-nowrap self-start sm:self-auto">
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <FolderTree className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-500" />
              <span>Total in Database: {totalCount}</span>
            </span>
            {(searchQuery || actressFilter || studioFilter) && (
              <button
                onClick={clearFilters}
                className="text-xs text-neutral-700 dark:text-slate-300 underline font-medium hover:text-neutral-900 dark:text-white"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Badges */}
        {(actressFilter || studioFilter) && (
          <div className="pt-2 flex items-center gap-2 text-xs">
            <span className="text-neutral-500 dark:text-slate-400">Filtered by:</span>
            {actressFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-200 text-xs font-medium">
                <Users className="w-3 h-3 text-neutral-500 dark:text-slate-400" />
                Actress: {actressFilter}
                <button onClick={() => setActressFilter("")} className="hover:text-neutral-900 dark:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {studioFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-200 text-xs font-medium">
                <Building2 className="w-3 h-3 text-neutral-500 dark:text-slate-400" />
                Studio: {studioFilter}
                <button onClick={() => setStudioFilter("")} className="hover:text-neutral-900 dark:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Video Grid */}
      {loading ? (
        <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl p-12 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-neutral-400 dark:text-slate-500 mx-auto" />
          <p className="text-xs text-neutral-500 dark:text-slate-400">Loading master video index...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-400 dark:text-slate-500 mx-auto flex items-center justify-center">
            <Film className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">No Videos In Database</h3>
            <p className="text-xs text-neutral-500 dark:text-slate-400 max-w-md mx-auto">
              {searchQuery || actressFilter || studioFilter
                ? "No videos match your filter criteria."
                : "The video database is currently empty. Use the Javtiful scraper to browse and ingest videos into the database with automatic deduplication."}
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("bulk-scraper")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-slate-900 hover:bg-neutral-800 dark:bg-slate-200 text-xs font-medium transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Go to Javtiful Scraper</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Pagination */}
          <DatabasePagination
            idPrefix="videos-db-pagination-top"
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalFound}
            itemsPerPage={24}
            loading={loading}
            onPageChange={(targetPage) => fetchVideos(targetPage, searchQuery, actressFilter, studioFilter)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((vid, idx) => (
              <div
                key={`${vid.code || 'video'}-${idx}`}
                onClick={() => setSelectedVideo(vid)}
                className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] hover:border-neutral-400 dark:hover:border-slate-600 dark:border-slate-600 rounded-xl overflow-hidden shadow-xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-16/10 bg-neutral-100 dark:bg-slate-800 overflow-hidden">
                  {vid.thumbnail ? (
                    <img
                      src={vid.thumbnail}
                      alt={vid.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400 dark:text-slate-500">
                      <Film className="w-8 h-8" />
                    </div>
                  )}

                  {/* Top Code Badge */}
                  {vid.code && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-900/90 dark:bg-white/10 backdrop-blur-xs text-white text-[11px] font-mono font-semibold shadow-xs">
                        {vid.code}
                      </span>
                    </div>
                  )}

                  {/* Duration Badge */}
                  {vid.duration && (
                    <div className="absolute bottom-2 right-2">
                      <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {vid.duration}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <h3 className="text-xs font-semibold text-neutral-900 dark:text-white line-clamp-2 leading-tight group-hover:text-neutral-700 dark:text-slate-300">
                    {vid.title}
                  </h3>

                  <div className="space-y-1.5 text-[11px] text-neutral-600 dark:text-slate-400">
                    {vid.actressName && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setActressFilter(vid.actressSlug || vid.actressName || "");
                        }}
                        className="flex items-center gap-1 text-neutral-700 dark:text-slate-300 hover:text-neutral-900 dark:text-white truncate cursor-pointer"
                      >
                        <Users className="w-3 h-3 text-neutral-400 dark:text-slate-500 shrink-0" />
                        <span className="font-medium truncate hover:underline">{vid.actressName}</span>
                      </div>
                    )}
                    {vid.studioName && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setStudioFilter(vid.studioSlug || vid.studioName || "");
                        }}
                        className="flex items-center gap-1 text-neutral-700 dark:text-slate-300 hover:text-neutral-900 dark:text-white truncate cursor-pointer"
                      >
                        <Building2 className="w-3 h-3 text-neutral-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate hover:underline">{vid.studioName}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {vid.releaseDate || "Unknown"}
                    </span>
                    <span className="text-neutral-700 dark:text-slate-300 font-medium group-hover:underline">
                      Details &rarr;
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Pagination */}
          <DatabasePagination
            idPrefix="videos-db-pagination-bottom"
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalFound}
            itemsPerPage={24}
            loading={loading}
            onPageChange={(targetPage) => fetchVideos(targetPage, searchQuery, actressFilter, studioFilter)}
          />
        </div>
      )}

      {/* Video Detail Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 dark:bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#101728] rounded-2xl border border-neutral-200 dark:border-[#1e293b] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-[#1e293b] flex items-center justify-between gap-4 bg-neutral-50 dark:bg-[#0b101a] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {selectedVideo.code && (
                  <span className="px-2.5 py-1 rounded-md bg-neutral-900 dark:bg-white text-white dark:text-slate-900 font-mono text-xs font-semibold">
                    {selectedVideo.code}
                  </span>
                )}
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                  {selectedVideo.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-1.5 rounded-lg text-neutral-400 dark:text-slate-500 hover:text-neutral-700 dark:text-slate-300 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Cover Image */}
              {selectedVideo.thumbnail && (
                <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-[#1e293b] bg-neutral-100 dark:bg-slate-800 max-h-72 flex items-center justify-center">
                  <img
                    src={selectedVideo.thumbnail}
                    alt={selectedVideo.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain max-h-72"
                  />
                </div>
              )}

              {/* Video Attributes Table */}
              <div className="rounded-xl border border-neutral-200 dark:border-[#1e293b] overflow-hidden divide-y divide-neutral-100 text-xs">
                <div className="p-3 bg-neutral-50 dark:bg-[#0b101a] flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-slate-400 font-medium">Canonical Code</span>
                  <span className="font-mono font-semibold text-neutral-900 dark:text-white">{selectedVideo.code}</span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-slate-400 font-medium">Actress</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {selectedVideo.actressName ? `${selectedVideo.actressName} (${selectedVideo.actressSlug})` : "None"}
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-[#0b101a] flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-slate-400 font-medium">Studio / Maker</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {selectedVideo.studioName ? `${selectedVideo.studioName} (${selectedVideo.studioSlug})` : "None"}
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-slate-400 font-medium">Release Date</span>
                  <span className="font-mono text-neutral-900 dark:text-white">{selectedVideo.releaseDate || "N/A"}</span>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-[#0b101a] flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-slate-400 font-medium">Duration</span>
                  <span className="font-mono text-neutral-900 dark:text-white">{selectedVideo.duration || "N/A"}</span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-slate-400 font-medium">Post / Stream URL</span>
                  <a
                    href={selectedVideo.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-900 dark:text-white font-medium hover:underline inline-flex items-center gap-1"
                  >
                    <span className="truncate max-w-xs">{selectedVideo.postUrl}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>

              {/* Raw JSON viewer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-neutral-500 dark:text-slate-400 flex items-center gap-1">
                    <FileCode className="w-3 h-3" />
                    <span>Raw Master Index Entry (database/index/videos.json)</span>
                  </span>
                  <button
                    onClick={copyJson}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded border border-neutral-300 dark:border-[#2b3a54] hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] text-neutral-700 dark:text-slate-300 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="p-3 bg-neutral-900 dark:bg-white text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto max-h-40">
                  <pre>{JSON.stringify(selectedVideo, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-[#1e293b] bg-neutral-50 dark:bg-[#0b101a] flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2">
                <a
                  href={selectedVideo.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-[#2b3a54] bg-white dark:bg-[#101728] hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] text-neutral-700 dark:text-slate-300 font-medium"
                >
                  <span>Open Source Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  id="modal-harvest-media-btn"
                  onClick={() => {
                    const target = selectedVideo.postUrl || selectedVideo.code || "";
                    setSelectedVideo(null);
                    setHarvesterTarget(target);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:bg-slate-200 text-white font-medium shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Harvest Streams & Media</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="px-4 py-1.5 rounded-lg border border-neutral-300 dark:border-[#2b3a54] bg-white dark:bg-[#101728] text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Harvester Modal */}
      <MediaHarvesterModal
        isOpen={!!harvesterTarget}
        onClose={() => setHarvesterTarget(null)}
        postUrlOrCode={harvesterTarget}
        onIngested={() => {
          fetchVideos(page, searchQuery, actressFilter, studioFilter);
        }}
      />
    </div>
  );
};
