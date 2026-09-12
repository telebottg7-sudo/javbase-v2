import React, { useState, useEffect } from "react";
import {
  Globe,
  Search,
  RefreshCw,
  Layers,
  User,
  Building,
} from "lucide-react";
import {
  JavtifulVideoItem,
  JavtifulScrapeResult,
  JavtifulActressItem,
  JavtifulStudioItem,
  NavView,
  NavParams,
  SaveActressResult,
} from "../../types";
import {
  IngestionBanner,
  type IngestionBannerData,
  PostInspectorModal,
  UniversalScraperTab,
  CatalogScraperTab,
  SearchScraperTab,
  ActressDirectoryTab,
  StudioDirectoryTab,
} from "../scraper";

interface BulkScraperViewProps {
  onNavigate?: (view: NavView, params?: NavParams) => void;
  initialParams?: NavParams | null;
}

export const BulkScraperView: React.FC<BulkScraperViewProps> = ({ onNavigate, initialParams }) => {
  const [activeTab, setActiveTab] = useState<
    "bulk" | "catalog" | "search" | "actresses" | "studios"
  >("bulk");

  // Universal Bulk Scraper State
  const [bulkUrl, setBulkUrl] = useState<string>("");
  const [bulkEnrichDetails, setBulkEnrichDetails] = useState<boolean>(false);
  const [bulkFilterDuplicates, setBulkFilterDuplicates] = useState<boolean>(false);
  const [bulkScraping, setBulkScraping] = useState<boolean>(false);
  const [bulkScrapeResult, setBulkScrapeResult] = useState<JavtifulScrapeResult | null>(null);
  const [bulkScrapeError, setBulkScrapeError] = useState<string | null>(null);
  const [bulkBatchCommitting, setBulkBatchCommitting] = useState<boolean>(false);
  const [commitReceipt, setCommitReceipt] = useState<{
    commitSha: string;
    commitUrl?: string;
    modifiedFiles: string[];
    ingestedCount: number;
    duplicateCount: number;
    isSingleCommit: boolean;
  } | null>(null);

  // Catalog Scraper State
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const [filterDuplicates, setFilterDuplicates] = useState<boolean>(false);
  const [enrichDetails, setEnrichDetails] = useState<boolean>(false);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const [catalogResult, setCatalogResult] = useState<JavtifulScrapeResult | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchPage, setSearchPage] = useState<number>(1);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<JavtifulScrapeResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Inspector Modal State
  const [selectedVideo, setSelectedVideo] = useState<JavtifulVideoItem | null>(null);
  const [inspectLoading, setInspectLoading] = useState<boolean>(false);

  // Actresses State
  const [actresses, setActresses] = useState<JavtifulActressItem[]>([]);
  const [actressesLoading, setActressesLoading] = useState<boolean>(false);
  const [actressesPage, setActressesPage] = useState<number>(1);
  const [actressesPagination, setActressesPagination] = useState<{
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage?: number;
    prevPage?: number;
  } | null>(null);
  const [selectedActress, setSelectedActress] = useState<string | null>(null);
  const [selectedActressName, setSelectedActressName] = useState<string | null>(null);
  const [selectedActressThumbnail, setSelectedActressThumbnail] = useState<string | null>(null);
  const [selectedActressVideoCount, setSelectedActressVideoCount] = useState<number | undefined>(undefined);
  const [actressVideos, setActressVideos] = useState<JavtifulVideoItem[]>([]);
  const [actressVideosPage, setActressVideosPage] = useState<number>(1);
  const [actressVideosLoading, setActressVideosLoading] = useState<boolean>(false);
  const [actressVideosPagination, setActressVideosPagination] = useState<{
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage?: number;
    prevPage?: number;
  } | null>(null);
  const [actressFilterDuplicates, setActressFilterDuplicates] = useState<boolean>(false);
  const [isSavingActress, setIsSavingActress] = useState<boolean>(false);
  const [actressSaveReceipt, setActressSaveReceipt] = useState<SaveActressResult | null>(null);

  // Studios State
  const [studios, setStudios] = useState<JavtifulStudioItem[]>([]);
  const [studiosLoading, setStudiosLoading] = useState<boolean>(false);
  const [studiosPage, setStudiosPage] = useState<number>(1);
  const [studiosPagination, setStudiosPagination] = useState<{
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage?: number;
    prevPage?: number;
  } | null>(null);
  const [selectedStudio, setSelectedStudio] = useState<string | null>(null);
  const [selectedStudioName, setSelectedStudioName] = useState<string | null>(null);
  const [studioVideos, setStudioVideos] = useState<JavtifulVideoItem[]>([]);
  const [studioVideosPage, setStudioVideosPage] = useState<number>(1);
  const [studioVideosLoading, setStudioVideosLoading] = useState<boolean>(false);
  const [studioVideosPagination, setStudioVideosPagination] = useState<{
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage?: number;
    prevPage?: number;
  } | null>(null);

  // Ingestion & Registration State
  const [registeringCode, setRegisteringCode] = useState<string | null>(null);
  const [ingestingCode, setIngestingCode] = useState<string | null>(null);
  const [batchIngesting, setBatchIngesting] = useState<boolean>(false);
  const [autoSaving, setAutoSaving] = useState<boolean>(false);
  const [autoCommitEnabled, setAutoCommitEnabled] = useState<boolean>(true);
  const [uncommittedCount, setUncommittedCount] = useState<number>(0);
  const [ingestionBanner, setIngestionBanner] = useState<IngestionBannerData | null>(null);

  // Initial load: fetch page 1 of catalog and auto-commit status
  useEffect(() => {
    fetchCatalog(1);
    fetchAutoCommitStatus();
  }, []);

  const executeSearch = async (queryToSearch: string, targetPage = 1) => {
    if (!queryToSearch.trim()) return;

    setSearchQuery(queryToSearch);
    setSearchLoading(true);
    setSearchError(null);
    setSearchPage(targetPage);
    try {
      const res = await fetch(
        `/api/scrapers/javtiful/search?q=${encodeURIComponent(
          queryToSearch.trim()
        )}&page=${targetPage}&filterDuplicates=${filterDuplicates}&enrichDetails=${enrichDetails}`
      );
      if (!res.ok) {
        throw new Error(`Search failed: HTTP ${res.status}`);
      }
      const data: JavtifulScrapeResult = await res.json();
      setSearchResult(data);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : String(err));
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (initialParams?.query) {
      const q = initialParams.query.trim();
      if (initialParams.tab === "bulk" || q.startsWith("http")) {
        setActiveTab("bulk");
        setBulkUrl(q);
      } else {
        setActiveTab("search");
        setSearchQuery(q);
        executeSearch(q, 1);
      }
    }
  }, [initialParams]);

  const fetchAutoCommitStatus = async () => {
    try {
      const res = await fetch("/api/system/auto-commit");
      if (res.ok) {
        const data = await res.json();
        setAutoCommitEnabled(Boolean(data.autoCommitEnabled));
        setUncommittedCount(typeof data.uncommittedCount === "number" ? data.uncommittedCount : 0);
      }
    } catch (err) {
      console.warn("Failed to query auto-commit status:", err);
    }
  };

  const fetchCatalog = async (page: number) => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const res = await fetch(
        `/api/scrapers/javtiful/catalog?page=${page}&filterDuplicates=${filterDuplicates}&enrichDetails=${enrichDetails}`
      );
      if (!res.ok) {
        throw new Error(`Failed to load catalog: HTTP ${res.status}`);
      }
      const data: JavtifulScrapeResult = await res.json();
      setCatalogResult(data);
      setCatalogPage(page);
    } catch (err: unknown) {
      setCatalogError(err instanceof Error ? err.message : String(err));
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent, targetPage = 1) => {
    if (e) e.preventDefault();
    await executeSearch(searchQuery, targetPage);
  };

  const handleSearchPageChange = (page: number) => {
    handleSearch(undefined, page);
  };

  const inspectPostDetails = async (video: JavtifulVideoItem) => {
    setSelectedVideo(video);
    setInspectLoading(true);
    try {
      const res = await fetch(
        `/api/scrapers/javtiful/post?url=${encodeURIComponent(video.postUrl)}`
      );
      if (res.ok) {
        const enriched: JavtifulVideoItem = await res.json();
        setSelectedVideo(enriched);
      }
    } catch (err) {
      console.error("Failed to fetch full post details:", err);
    } finally {
      setInspectLoading(false);
    }
  };

  const loadActresses = async (page = 1, force = false) => {
    if (!force && actresses.length > 0 && actressesPage === page) return;
    setActressesLoading(true);
    try {
      const res = await fetch(`/api/scrapers/javtiful/actresses?page=${page}`);
      const data = await res.json();
      setActresses(data.actresses || []);
      setActressesPage(page);
      if (data.pagination) {
        setActressesPagination(data.pagination);
      } else {
        setActressesPagination({
          currentPage: page,
          totalPages: data.totalPages || 316,
          hasNext: true,
          hasPrev: page > 1,
        });
      }
    } catch (err) {
      console.error("Failed to load actresses:", err);
    } finally {
      setActressesLoading(false);
    }
  };

  const loadStudios = async (page = 1, force = false) => {
    if (!force && studios.length > 0 && studiosPage === page) return;
    setStudiosLoading(true);
    try {
      const res = await fetch(`/api/scrapers/javtiful/studios?page=${page}`);
      const data = await res.json();
      setStudios(data.studios || []);
      setStudiosPage(page);
      if (data.pagination) {
        setStudiosPagination(data.pagination);
      } else {
        setStudiosPagination({
          currentPage: page,
          totalPages: data.totalPages || 1,
          hasNext: true,
          hasPrev: page > 1,
        });
      }
    } catch (err) {
      console.error("Failed to load studios:", err);
    } finally {
      setStudiosLoading(false);
    }
  };

  const viewActressVideos = async (
    slug: string,
    name?: string,
    thumbnail?: string,
    videoCount?: number,
    page = 1,
    filterDup = actressFilterDuplicates
  ) => {
    setSelectedActress(slug);
    if (name) setSelectedActressName(name);
    if (thumbnail) setSelectedActressThumbnail(thumbnail);
    if (videoCount !== undefined) setSelectedActressVideoCount(videoCount);
    setActressVideosPage(page);
    setActressVideosLoading(true);
    try {
      const res = await fetch(
        `/api/scrapers/javtiful/actress-videos?slug=${encodeURIComponent(
          slug
        )}&page=${page}&filterDuplicates=${filterDup}`
      );
      const data = await res.json();
      setActressVideos(data.items || []);
      if (data.pagination) {
        setActressVideosPagination(data.pagination);
      } else {
        setActressVideosPagination({
          currentPage: page,
          totalPages: 1,
          hasNext: false,
          hasPrev: page > 1,
        });
      }
    } catch (err) {
      console.error("Failed to fetch actress videos:", err);
    } finally {
      setActressVideosLoading(false);
    }
  };

  const handleToggleActressFilterDuplicates = (filter: boolean) => {
    setActressFilterDuplicates(filter);
    if (selectedActress) {
      viewActressVideos(
        selectedActress,
        selectedActressName || undefined,
        selectedActressThumbnail || undefined,
        selectedActressVideoCount,
        actressVideosPage,
        filter
      );
    }
  };

  const handleSaveActressToDatabase = async (options: { filterDuplicates: boolean }) => {
    if (!selectedActress) return;
    setIsSavingActress(true);
    setActressSaveReceipt(null);
    setIngestionBanner(null);

    try {
      const res = await fetch("/api/ingestion/save-actress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: selectedActress,
          name: selectedActressName || selectedActress,
          thumbnail: selectedActressThumbnail,
          videoCount: selectedActressVideoCount,
          videos: actressVideos.map((v) => ({
            code: v.code,
            title: v.title,
            postUrl: v.postUrl,
            thumbnail: v.coverImage || v.thumbnail,
            coverImage: v.coverImage,
            actress: selectedActressName || selectedActress,
            actressSlug: selectedActress,
            studio: v.studio,
            studioSlug: v.studioSlug,
            duration: v.duration,
            releaseDate: v.releaseDate,
          })),
          filterDuplicates: options.filterDuplicates,
          commitMessage: `[Actress Ingestion] Ingested ${selectedActressName || selectedActress} and movie catalog (filtered duplicates: ${options.filterDuplicates})`,
        }),
      });

      const data: SaveActressResult = await res.json();
      if (data.success) {
        setActressSaveReceipt(data);
        // Mark items in current view as duplicate
        setActressVideos((prev) =>
          prev.map((v) => ({
            ...v,
            isDuplicate: true,
          }))
        );
        setIngestionBanner({
          type: "success",
          message: `Successfully saved ${data.actressName} and ${data.ingestedCount} videos (${data.duplicateCount} duplicates filtered) to database!`,
          sha: data.commitSha,
          url: data.commitUrl,
        });
      } else {
        setIngestionBanner({
          type: "error",
          message: data.error || "Failed to save actress to database",
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setIngestionBanner({
        type: "error",
        message: `Save failed: ${errorMsg}`,
      });
    } finally {
      setIsSavingActress(false);
    }
  };

  const viewStudioVideos = async (slug: string, name?: string, page = 1) => {
    setSelectedStudio(slug);
    if (name) setSelectedStudioName(name);
    setStudioVideosPage(page);
    setStudioVideosLoading(true);
    try {
      const res = await fetch(
        `/api/scrapers/javtiful/studio-videos?slug=${encodeURIComponent(
          slug
        )}&page=${page}`
      );
      const data = await res.json();
      setStudioVideos(data.items || []);
      if (data.pagination) {
        setStudioVideosPagination(data.pagination);
      } else {
        setStudioVideosPagination({
          currentPage: page,
          totalPages: 1,
          hasNext: false,
          hasPrev: page > 1,
        });
      }
    } catch (err) {
      console.error("Failed to fetch studio videos:", err);
    } finally {
      setStudioVideosLoading(false);
    }
  };

  const registerItemInRegistry = async (item: JavtifulVideoItem) => {
    if (!item.code) return;
    setRegisteringCode(item.code);
    try {
      const res = await fetch("/api/codes/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              code: item.code,
              title: item.title,
              postUrl: item.postUrl,
              actressName: item.actress,
              studioName: item.studio,
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.registeredCount > 0 || data.duplicatesCount > 0) {
        item.isDuplicate = true;
        if (selectedVideo && selectedVideo.code === item.code) {
          setSelectedVideo({ ...selectedVideo, isDuplicate: true });
        }
        setIngestionBanner({
          type: "success",
          message: `Registered ${item.code} in Code Registry`,
        });
      }
    } catch (err) {
      console.error("Failed to register code:", err);
    } finally {
      setRegisteringCode(null);
    }
  };

  const ingestVideo = async (item: JavtifulVideoItem) => {
    if (!item.code) return;
    setIngestingCode(item.code);
    setIngestionBanner(null);
    try {
      const res = await fetch("/api/ingestion/ingest-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: item.code,
          title: item.title,
          actressName: item.actress,
          studioName: item.studio,
          duration: item.duration,
          releaseDate: item.releaseDate,
          thumbnail: item.coverImage,
          postUrl: item.postUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIngestionBanner({
          type: "success",
          message: `Ingested ${item.code} into sharded database`,
          details: `Commit ${data.commitSha?.slice(0, 7)} — updated ${
            data.modifiedFiles?.length || 0
          } index and sharded files.`,
        });
        item.isDuplicate = true;
        if (selectedVideo && selectedVideo.code === item.code) {
          setSelectedVideo({ ...selectedVideo, isDuplicate: true });
        }
      } else {
        setIngestionBanner({
          type: "error",
          message: `Ingestion failed: ${data.error || "Unknown error"}`,
        });
      }
    } catch (err: unknown) {
      setIngestionBanner({
        type: "error",
        message: `Ingestion error: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIngestingCode(null);
    }
  };

  const handleAutoSaveSearch = async () => {
    if (!searchResult?.items || searchResult.items.length === 0) return;
    setAutoSaving(true);
    setIngestionBanner(null);

    try {
      const res = await fetch("/api/scrapers/javtiful/auto-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: searchResult.items,
          enrichDetails: true,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setIngestionBanner({
          type: "success",
          message:
            data.message ||
            `Auto Save Completed: ${data.ingestedCount} videos saved to database (${data.duplicateCount} duplicates filtered).`,
          details: data.autoCommitEnabled
            ? `GitHub Atomic Commit: ${data.commitSha ? data.commitSha.slice(0, 7) : "pushed"} (${data.modifiedFiles?.length || 0} files updated)`
            : `Database Staged: Staged in memory (${data.uncommittedCount || 0} total files pending commit — Auto-Commit is OFF)`,
        });

        // Update local state: mark all items as duplicate
        searchResult.items.forEach((it) => {
          it.isDuplicate = true;
        });
        searchResult.duplicateCount += data.ingestedCount;
        searchResult.uniqueCount = Math.max(
          0,
          searchResult.uniqueCount - data.ingestedCount
        );
        setSearchResult({ ...searchResult });

        if (typeof data.autoCommitEnabled === "boolean") {
          setAutoCommitEnabled(data.autoCommitEnabled);
        }
        if (typeof data.uncommittedCount === "number") {
          setUncommittedCount(data.uncommittedCount);
        }
      } else {
        setIngestionBanner({
          type: "error",
          message: `Auto-save failed: ${data.error || "Unknown error"}`,
        });
      }
    } catch (err: unknown) {
      setIngestionBanner({
        type: "error",
        message: `Auto-save error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    } finally {
      setAutoSaving(false);
      fetchAutoCommitStatus();
    }
  };

  const handleAutoSearchAndSave = async (pagesToCrawl = 1) => {
    if (!searchQuery.trim()) return;
    setAutoSaving(true);
    setSearchLoading(true);
    setSearchError(null);
    setIngestionBanner(null);

    try {
      if (pagesToCrawl > 1) {
        const res = await fetch("/api/scrapers/javtiful/auto-crawl-and-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "search",
            q: searchQuery.trim(),
            startPage: searchPage,
            pagesToCrawl,
            enrichDetails: true,
          }),
        });
        const data = await res.json();
        if (data.success) {
          if (data.scrapeResult) {
            setSearchResult(data.scrapeResult);
          }
          if (data.lastCrawledPage) {
            setSearchPage(data.lastCrawledPage);
          }
          setIngestionBanner({
            type: "success",
            message:
              data.message ||
              `Auto Crawled & Saved ${data.ingestedCount} videos across ${data.pagesCrawled} pages (${data.duplicateCount} duplicates filtered)`,
            details: data.autoCommitEnabled
              ? `GitHub Atomic Commit: ${data.commitSha ? data.commitSha.slice(0, 7) : "pushed"}`
              : `Database Staged: Staged in memory (${data.uncommittedCount || 0} pending files — Auto-Commit is OFF)`,
          });
          if (typeof data.autoCommitEnabled === "boolean") {
            setAutoCommitEnabled(data.autoCommitEnabled);
          }
          if (typeof data.uncommittedCount === "number") {
            setUncommittedCount(data.uncommittedCount);
          }
        } else {
          setSearchError(data.error || "Auto crawl & save failed");
        }
      } else {
        const res = await fetch("/api/scrapers/javtiful/auto-search-and-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: searchQuery.trim(),
            page: searchPage,
            enrichDetails: true,
          }),
        });
        const data = await res.json();

        if (data.success) {
          if (data.scrapeResult) {
            setSearchResult(data.scrapeResult);
          }
          setIngestionBanner({
            type: "success",
            message:
              data.message ||
              `Auto Search & Save: Saved ${data.ingestedCount} videos (${data.duplicateCount} duplicates filtered)`,
            details: data.autoCommitEnabled
              ? `GitHub Atomic Commit: ${data.commitSha ? data.commitSha.slice(0, 7) : "pushed"}`
              : `Database Staged: Staged in memory (${data.uncommittedCount || 0} pending files — Auto-Commit is OFF)`,
          });
          if (typeof data.autoCommitEnabled === "boolean") {
            setAutoCommitEnabled(data.autoCommitEnabled);
          }
          if (typeof data.uncommittedCount === "number") {
            setUncommittedCount(data.uncommittedCount);
          }
        } else {
          setSearchError(data.error || "Auto search & save failed");
        }
      }
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : String(err));
    } finally {
      setAutoSaving(false);
      setSearchLoading(false);
      fetchAutoCommitStatus();
    }
  };


  const handleAutoCrawlStudio = async (pagesToCrawl = 3) => {
    if (!selectedStudio) return;
    setBatchIngesting(true);
    setStudioVideosLoading(true);
    setIngestionBanner(null);

    try {
      const res = await fetch("/api/scrapers/javtiful/auto-crawl-and-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "studio",
          slug: selectedStudio,
          startPage: studioVideosPage,
          pagesToCrawl,
          enrichDetails: true,
        }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.scrapeResult) {
          setStudioVideos(data.scrapeResult.items || []);
          if (data.scrapeResult.pagination) {
            setStudioVideosPagination(data.scrapeResult.pagination);
          }
        }
        if (data.lastCrawledPage) {
          setStudioVideosPage(data.lastCrawledPage);
        }
        setIngestionBanner({
          type: "success",
          message:
            data.message ||
            `Studio Multi-Page Crawl: Saved ${data.ingestedCount} videos across ${data.pagesCrawled} pages (${data.duplicateCount} duplicates filtered)`,
          details: data.autoCommitEnabled
            ? `GitHub Atomic Commit: ${data.commitSha ? data.commitSha.slice(0, 7) : "pushed"}`
            : `Database Staged: Staged in memory (${data.uncommittedCount || 0} pending files — Auto-Commit is OFF)`,
        });
        if (typeof data.autoCommitEnabled === "boolean") {
          setAutoCommitEnabled(data.autoCommitEnabled);
        }
        if (typeof data.uncommittedCount === "number") {
          setUncommittedCount(data.uncommittedCount);
        }
      } else {
        setIngestionBanner({
          type: "error",
          message: "Studio Crawl failed",
          details: data.error,
        });
      }
    } catch (err: unknown) {
      setIngestionBanner({
        type: "error",
        message: "Studio Crawl error",
        details: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBatchIngesting(false);
      setStudioVideosLoading(false);
      fetchAutoCommitStatus();
    }
  };

  const handleAutoCrawlCatalog = async (pagesToCrawl = 3) => {
    setBatchIngesting(true);
    setCatalogLoading(true);
    setCatalogError(null);
    setIngestionBanner(null);

    try {
      const res = await fetch("/api/scrapers/javtiful/auto-crawl-and-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "catalog",
          startPage: catalogPage,
          pagesToCrawl,
          enrichDetails: true,
        }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.scrapeResult) {
          setCatalogResult(data.scrapeResult);
        }
        if (data.lastCrawledPage) {
          setCatalogPage(data.lastCrawledPage);
        }
        setIngestionBanner({
          type: "success",
          message:
            data.message ||
            `Catalog Multi-Page Crawl: Saved ${data.ingestedCount} videos across ${data.pagesCrawled} pages (${data.duplicateCount} duplicates filtered)`,
          details: data.autoCommitEnabled
            ? `GitHub Atomic Commit: ${data.commitSha ? data.commitSha.slice(0, 7) : "pushed"}`
            : `Database Staged: Staged in memory (${data.uncommittedCount || 0} pending files — Auto-Commit is OFF)`,
        });
        if (typeof data.autoCommitEnabled === "boolean") {
          setAutoCommitEnabled(data.autoCommitEnabled);
        }
        if (typeof data.uncommittedCount === "number") {
          setUncommittedCount(data.uncommittedCount);
        }
      } else {
        setCatalogError(data.error || "Catalog auto-crawl failed");
      }
    } catch (err: unknown) {
      setCatalogError(err instanceof Error ? err.message : String(err));
    } finally {
      setBatchIngesting(false);
      setCatalogLoading(false);
      fetchAutoCommitStatus();
    }
  };

  const ingestAllUnregistered = async () => {
    if (!catalogResult?.items) return;
    const unregistered = catalogResult.items.filter((it) => !it.isDuplicate);
    if (unregistered.length === 0) return;

    setBatchIngesting(true);
    setIngestionBanner(null);
    try {
      const res = await fetch("/api/scrapers/javtiful/auto-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: catalogResult.items,
          enrichDetails: true,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setIngestionBanner({
          type: "success",
          message:
            data.message ||
            `Batch Ingestion: ${data.ingestedCount} new videos ingested (${data.duplicateCount} duplicates filtered).`,
          details: data.autoCommitEnabled
            ? `GitHub Atomic Commit: ${data.commitSha ? data.commitSha.slice(0, 7) : "pushed"} — updated ${
                data.modifiedFiles?.length || 0
              } files.`
            : `Database Staged: Staged in memory (${data.uncommittedCount || 0} files pending commit — Auto-Commit is OFF)`,
        });
        catalogResult.items.forEach((it) => {
          it.isDuplicate = true;
        });
        catalogResult.duplicateCount += data.ingestedCount;
        catalogResult.uniqueCount = Math.max(
          0,
          catalogResult.uniqueCount - data.ingestedCount
        );
        if (typeof data.autoCommitEnabled === "boolean") {
          setAutoCommitEnabled(data.autoCommitEnabled);
        }
        if (typeof data.uncommittedCount === "number") {
          setUncommittedCount(data.uncommittedCount);
        }
      } else {
        setIngestionBanner({
          type: "error",
          message: `Batch ingestion failed: ${data.error || "Unknown error"}`,
        });
      }
    } catch (err: unknown) {
      setIngestionBanner({
        type: "error",
        message: `Batch ingestion error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    } finally {
      setBatchIngesting(false);
      fetchAutoCommitStatus();
    }
  };

  const handleBulkScrapeUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bulkUrl.trim()) return;

    setBulkScraping(true);
    setBulkScrapeError(null);
    setCommitReceipt(null);
    try {
      const res = await fetch("/api/scraper/bulk-scrape-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: bulkUrl.trim(),
          filterDuplicates: bulkFilterDuplicates,
          enrichDetails: bulkEnrichDetails,
          maxEnrich: 15,
        }),
      });
      if (!res.ok) {
        throw new Error(`Failed to scrape URL: HTTP ${res.status}`);
      }
      const data: JavtifulScrapeResult = await res.json();
      setBulkScrapeResult(data);
    } catch (err: unknown) {
      setBulkScrapeError(err instanceof Error ? err.message : String(err));
    } finally {
      setBulkScraping(false);
    }
  };

  const handleCommitAllBulk = async () => {
    if (!bulkScrapeResult?.items) return;
    const unregistered = bulkScrapeResult.items.filter((it) => !it.isDuplicate);
    if (unregistered.length === 0) return;

    setBulkBatchCommitting(true);
    setCommitReceipt(null);
    try {
      const payload = unregistered.map((item) => ({
        code: item.code,
        title: item.title,
        actress: item.actress,
        actressSlug: item.actressSlug,
        studio: item.studio,
        studioSlug: item.studioSlug,
        duration: item.duration,
        releaseDate: item.releaseDate,
        thumbnail: item.coverImage,
        postUrl: item.postUrl,
      }));

      const res = await fetch("/api/scraper/bulk-commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: payload,
          commitMessage: `[Bulk Ingestion] Batch ingested ${payload.length} videos from ${bulkUrl} in single transaction`,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setCommitReceipt({
          commitSha: data.commitSha || "N/A",
          commitUrl: data.commitUrl,
          modifiedFiles: data.modifiedFiles || [],
          ingestedCount: data.ingestedCount,
          duplicateCount: data.duplicateCount,
          isSingleCommit: data.isSingleCommit ?? true,
        });

        bulkScrapeResult.items.forEach((it) => {
          it.isDuplicate = true;
        });
        bulkScrapeResult.duplicateCount += data.ingestedCount;
        bulkScrapeResult.uniqueCount = Math.max(
          0,
          bulkScrapeResult.uniqueCount - data.ingestedCount
        );
      } else {
        setBulkScrapeError(data.error || "Bulk commit transaction failed");
      }
    } catch (err: unknown) {
      setBulkScrapeError(err instanceof Error ? err.message : String(err));
    } finally {
      setBulkBatchCommitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          id="btn-tab-bulk"
          onClick={() => setActiveTab("bulk")}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
            activeTab === "bulk"
              ? "bg-neutral-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
              : "bg-white dark:bg-[#101728] text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-[#1e293b] hover:bg-neutral-50 dark:hover:bg-[#1e293b]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Bulk Scraper</span>
        </button>

        <button
          id="btn-tab-catalog"
          onClick={() => setActiveTab("catalog")}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
            activeTab === "catalog"
              ? "bg-neutral-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
              : "bg-white dark:bg-[#101728] text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-[#1e293b] hover:bg-neutral-50 dark:hover:bg-[#1e293b]"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Catalog</span>
        </button>

        <button
          id="btn-tab-search"
          onClick={() => setActiveTab("search")}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
            activeTab === "search"
              ? "bg-neutral-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
              : "bg-white dark:bg-[#101728] text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-[#1e293b] hover:bg-neutral-50 dark:hover:bg-[#1e293b]"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
        </button>

        <button
          id="btn-tab-actresses"
          onClick={() => {
            setActiveTab("actresses");
            loadActresses();
          }}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
            activeTab === "actresses"
              ? "bg-neutral-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
              : "bg-white dark:bg-[#101728] text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-[#1e293b] hover:bg-neutral-50 dark:hover:bg-[#1e293b]"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Actresses</span>
        </button>

        <button
          id="btn-tab-studios"
          onClick={() => {
            setActiveTab("studios");
            loadStudios();
          }}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
            activeTab === "studios"
              ? "bg-neutral-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
              : "bg-white dark:bg-[#101728] text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-[#1e293b] hover:bg-neutral-50 dark:hover:bg-[#1e293b]"
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Studios</span>
        </button>
      </div>

      {/* Global Ingestion Banner */}
      <IngestionBanner
        banner={ingestionBanner}
        onDismiss={() => setIngestionBanner(null)}
      />

      {/* Tab Panels */}
      {activeTab === "bulk" && (
        <UniversalScraperTab
          bulkUrl={bulkUrl}
          setBulkUrl={setBulkUrl}
          bulkFilterDuplicates={bulkFilterDuplicates}
          setBulkFilterDuplicates={setBulkFilterDuplicates}
          bulkEnrichDetails={bulkEnrichDetails}
          setBulkEnrichDetails={setBulkEnrichDetails}
          bulkScraping={bulkScraping}
          bulkScrapeResult={bulkScrapeResult}
          bulkScrapeError={bulkScrapeError}
          bulkBatchCommitting={bulkBatchCommitting}
          commitReceipt={commitReceipt}
          ingestingCode={ingestingCode}
          onScrape={handleBulkScrapeUrl}
          onCommitAll={handleCommitAllBulk}
          onInspect={inspectPostDetails}
          onIngest={ingestVideo}
        />
      )}

      {activeTab === "catalog" && (
        <CatalogScraperTab
          catalogPage={catalogPage}
          filterDuplicates={filterDuplicates}
          setFilterDuplicates={setFilterDuplicates}
          enrichDetails={enrichDetails}
          setEnrichDetails={setEnrichDetails}
          catalogLoading={catalogLoading}
          catalogResult={catalogResult}
          catalogError={catalogError}
          batchIngesting={batchIngesting}
          ingestingCode={ingestingCode}
          autoCommitEnabled={autoCommitEnabled}
          uncommittedCount={uncommittedCount}
          onPageChange={fetchCatalog}
          onIngestAll={ingestAllUnregistered}
          onAutoCrawlAndSave={handleAutoCrawlCatalog}
          onInspect={inspectPostDetails}
          onIngest={ingestVideo}
        />
      )}

      {activeTab === "search" && (
        <SearchScraperTab
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPage={searchPage}
          filterDuplicates={filterDuplicates}
          setFilterDuplicates={setFilterDuplicates}
          enrichDetails={enrichDetails}
          setEnrichDetails={setEnrichDetails}
          searchLoading={searchLoading}
          searchResult={searchResult}
          searchError={searchError}
          ingestingCode={ingestingCode}
          autoSaving={autoSaving}
          autoCommitEnabled={autoCommitEnabled}
          uncommittedCount={uncommittedCount}
          onSearch={(e) => handleSearch(e, 1)}
          onAutoSaveAll={handleAutoSaveSearch}
          onAutoSearchAndSave={handleAutoSearchAndSave}
          onPageChange={handleSearchPageChange}
          onInspect={inspectPostDetails}
          onIngest={ingestVideo}
        />
      )}

      {activeTab === "actresses" && (
        <ActressDirectoryTab
          actresses={actresses}
          actressesLoading={actressesLoading}
          actressesPage={actressesPage}
          actressesPagination={actressesPagination}
          selectedActress={selectedActress}
          selectedActressName={selectedActressName}
          selectedActressThumbnail={selectedActressThumbnail}
          selectedActressVideoCount={selectedActressVideoCount}
          actressVideos={actressVideos}
          actressVideosPage={actressVideosPage}
          actressVideosLoading={actressVideosLoading}
          actressVideosPagination={actressVideosPagination}
          filterDuplicates={actressFilterDuplicates}
          isSavingActress={isSavingActress}
          actressSaveReceipt={actressSaveReceipt}
          ingestingCode={ingestingCode}
          onLoadActresses={loadActresses}
          onSelectActress={(slug, name, thumb, count) => {
            viewActressVideos(slug, name, thumb, count, 1);
          }}
          onBackToDirectory={() => {
            setSelectedActress(null);
            setSelectedActressName(null);
            setSelectedActressThumbnail(null);
            setSelectedActressVideoCount(undefined);
            setActressSaveReceipt(null);
          }}
          onActressVideosPageChange={(page) => {
            if (selectedActress) {
              viewActressVideos(
                selectedActress,
                selectedActressName || undefined,
                selectedActressThumbnail || undefined,
                selectedActressVideoCount,
                page,
                actressFilterDuplicates
              );
            }
          }}
          onToggleFilterDuplicates={handleToggleActressFilterDuplicates}
          onSaveActressToDatabase={handleSaveActressToDatabase}
          onInspect={inspectPostDetails}
          onIngest={ingestVideo}
          onNavigateToDatabase={() => {
            if (onNavigate) {
              onNavigate("actresses");
            }
          }}
        />
      )}

      {activeTab === "studios" && (
        <StudioDirectoryTab
          studios={studios}
          studiosLoading={studiosLoading}
          studiosPage={studiosPage}
          studiosPagination={studiosPagination}
          selectedStudio={selectedStudio}
          selectedStudioName={selectedStudioName}
          studioVideos={studioVideos}
          studioVideosPage={studioVideosPage}
          studioVideosLoading={studioVideosLoading}
          studioVideosPagination={studioVideosPagination}
          ingestingCode={ingestingCode}
          onLoadStudios={loadStudios}
          onSelectStudio={(slug, name) => {
            viewStudioVideos(slug, name, 1);
          }}
          onBackToDirectory={() => {
            setSelectedStudio(null);
            setSelectedStudioName(null);
          }}
          batchIngesting={batchIngesting}
          onAutoCrawlAndSave={handleAutoCrawlStudio}
          onStudioVideosPageChange={(page) => {
            if (selectedStudio) {
              viewStudioVideos(selectedStudio, selectedStudioName || undefined, page);
            }
          }}
          onInspect={inspectPostDetails}
          onIngest={ingestVideo}
        />
      )}

      {/* Inspector Modal */}
      <PostInspectorModal
        video={selectedVideo}
        inspectLoading={inspectLoading}
        onClose={() => setSelectedVideo(null)}
        onIngest={ingestVideo}
        onRegisterInRegistry={registerItemInRegistry}
        isIngesting={Boolean(selectedVideo?.code && ingestingCode === selectedVideo.code)}
        isRegistering={Boolean(selectedVideo?.code && registeringCode === selectedVideo.code)}
      />
    </div>
  );
};
