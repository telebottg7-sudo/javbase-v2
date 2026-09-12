import React, { useState, useEffect } from "react";
import {
  BackendStatus,
  NavView,
  SelfTestReport,
  DatabaseStatusReport,
  StoragePerformanceMetrics,
  Step10PerformanceReport,
  AutoCommitStatus,
} from "../../types";
import { fetchWithRetry } from "../../utils/fetchWithRetry";
import {
  Search,
  Layers,
  Users,
  Building2,
  Hash,
  Film,
  ArrowRight,
  HardDrive,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  RefreshCw,
  Zap,
  Trash2,
  Wrench,
  Calendar,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { DatabaseHealthGauges } from "../home/DatabaseHealthGauges";
import { AutoCommitControlCard } from "../home/AutoCommitControlCard";

interface LatestVideo {
  code: string;
  title: string;
  thumbnail?: string | null;
  postUrl?: string | null;
  releaseDate?: string | null;
  addedAt?: string;
  actress?: { name: string; slug: string } | null;
  studio?: { name: string; slug: string } | null;
}

interface LatestIndexData {
  version: number;
  updatedAt: string;
  totalCount: number;
  videos: LatestVideo[];
}

interface HomeViewProps {
  status: BackendStatus | null;
  onNavigate: (view: NavView) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ status, onNavigate }) => {
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testReport, setTestReport] = useState<SelfTestReport | null>(null);

  // Schema status & interactive samples
  const [schemaReport, setSchemaReport] = useState<DatabaseStatusReport | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  // Step 10: Performance, Caching & Concurrency telemetry
  const [perfMetrics, setPerfMetrics] = useState<StoragePerformanceMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [isRunningPerfTest, setIsRunningPerfTest] = useState(false);
  const [perfReport, setPerfReport] = useState<Step10PerformanceReport | null>(null);
  const [isPurgingCache, setIsPurgingCache] = useState(false);
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null);

  // Auto-Commit & Uncommitted files state
  const [autoCommitStatus, setAutoCommitStatus] = useState<AutoCommitStatus | null>(null);
  const [loadingAutoCommit, setLoadingAutoCommit] = useState(false);

  // Latest.json index state
  const [latestData, setLatestData] = useState<LatestIndexData | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);

  const fetchLatestVideos = async () => {
    setLoadingLatest(true);
    try {
      const res = await fetchWithRetry("/api/database/latest");
      if (res.ok) {
        const data = await res.json();
        setLatestData(data);
      }
    } catch (err) {
      console.error("Failed to load latest.json:", err);
    } finally {
      setLoadingLatest(false);
    }
  };

  const fetchAutoCommitStatus = async () => {
    setLoadingAutoCommit(true);
    try {
      const res = await fetch("/api/system/auto-commit");
      if (res.ok) {
        const data = await res.json();
        setAutoCommitStatus({
          autoCommitEnabled: data.autoCommitEnabled ?? true,
          uncommittedCount: data.uncommittedCount ?? 0,
          uncommittedFiles: data.uncommittedFiles ?? [],
          lastModifiedAt: data.lastModifiedAt,
        });
      }
    } catch (err) {
      console.error("Failed to load auto-commit status:", err);
    } finally {
      setLoadingAutoCommit(false);
    }
  };

  const handleToggleAutoCommit = async (enable: boolean) => {
    const res = await fetch("/api/system/auto-commit/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: enable }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to toggle" }));
      throw new Error(err.error || "Failed to toggle auto-commit");
    }
    const data = await res.json();
    setAutoCommitStatus({
      autoCommitEnabled: data.autoCommitEnabled,
      uncommittedCount: data.uncommittedCount,
      uncommittedFiles: data.uncommittedFiles,
      lastModifiedAt: data.lastModifiedAt,
    });
  };

  const handleCommitPending = async (message?: string) => {
    const res = await fetch("/api/system/auto-commit/commit-pending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to commit" }));
      throw new Error(err.error || "Failed to commit pending files");
    }
    const data = await res.json();
    setAutoCommitStatus({
      autoCommitEnabled: data.autoCommitEnabled,
      uncommittedCount: data.uncommittedCount,
      uncommittedFiles: data.uncommittedFiles,
      lastModifiedAt: data.lastModifiedAt,
    });
    await fetchSchemaStatus();
  };

  const handleDiscardPending = async () => {
    const res = await fetch("/api/system/auto-commit/discard-pending", {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to discard" }));
      throw new Error(err.error || "Failed to discard pending changes");
    }
    const data = await res.json();
    setAutoCommitStatus({
      autoCommitEnabled: data.autoCommitEnabled,
      uncommittedCount: data.uncommittedCount,
      uncommittedFiles: data.uncommittedFiles,
      lastModifiedAt: data.lastModifiedAt,
    });
    await fetchSchemaStatus();
  };

  const fetchSchemaStatus = async () => {
    setLoadingSchema(true);
    try {
      const res = await fetch("/api/database/schema-status");
      const data: DatabaseStatusReport = await res.json();
      setSchemaReport(data);
    } catch (err) {
      console.error("Failed to load schema status:", err);
    } finally {
      setLoadingSchema(false);
    }
  };

  const fetchPerformanceMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch("/api/storage/metrics");
      const data = await res.json();
      if (data.metrics) {
        setPerfMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Failed to load performance metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchSchemaStatus();
    fetchPerformanceMetrics();
    fetchAutoCommitStatus();
    fetchLatestVideos();
  }, []);

  const runStorageSelfTest = async () => {
    setIsRunningTest(true);
    try {
      const res = await fetch("/api/storage/test", { method: "POST" });
      const data: SelfTestReport = await res.json();
      setTestReport(data);
    } catch (err) {
      console.error("Storage test error:", err);
    } finally {
      setIsRunningTest(false);
    }
  };

  const handlePurgeCache = async () => {
    setIsPurgingCache(true);
    setPurgeFeedback(null);
    try {
      const res = await fetch("/api/storage/cache/purge", { method: "POST" });
      const data = await res.json();
      setPurgeFeedback(data.message || `Purged ${data.purgedCount} cache entries.`);
      await fetchPerformanceMetrics();
    } catch (err) {
      setPurgeFeedback("Failed to purge storage cache.");
      console.error(err);
    } finally {
      setIsPurgingCache(false);
      setTimeout(() => setPurgeFeedback(null), 4000);
    }
  };

  const runStep10PerformanceSuite = async () => {
    setIsRunningPerfTest(true);
    try {
      const res = await fetch("/api/system/step10-performance-test", { method: "POST" });
      const data: Step10PerformanceReport = await res.json();
      setPerfReport(data);
      if (data.metrics) {
        setPerfMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Performance test suite error:", err);
    } finally {
      setIsRunningPerfTest(false);
    }
  };

  const directoryLayout = [
    {
      path: "database/index/codes.json",
      desc: "Global master index of normalized video codes for instantaneous deduplication checks.",
      type: "Index",
      count: schemaReport?.files?.codes?.totalCount,
    },
    {
      path: "database/index/videos.json",
      desc: "Chronological registry of cataloged video records with thumbnail and metadata references.",
      type: "Index",
      count: schemaReport?.files?.videos?.totalCount,
    },
    {
      path: "database/index/actresses.json",
      desc: "Master index of all actress slugs, profile pointers, and catalog summary counts.",
      type: "Index",
      count: schemaReport?.files?.actresses?.totalCount,
    },
    {
      path: "database/index/studios.json",
      desc: "Master index of all studio and channel slugs with indexed releases counters.",
      type: "Index",
      count: schemaReport?.files?.studios?.totalCount,
    },
    {
      path: "database/pstar/{a..z}/{slug}.json",
      desc: "Sharded individual actress profiles containing full video lists and aliases.",
      type: "Entity Store",
    },
    {
      path: "database/studio/{a..z}/{slug}.json",
      desc: "Sharded individual studio profiles containing production video references.",
      type: "Entity Store",
    },
  ];

  const quickLinks: Array<{ id: NavView; label: string; icon: React.ElementType; desc: string; badge?: string }> = [
    { id: "bulk-scraper", label: "Bulk Scraper", icon: Layers, desc: "Batch ingestion pipeline for Javtiful videos, actresses & channels", badge: "Ingestion" },
    { id: "search", label: "Search Engine", icon: Search, desc: "Sub-millisecond query across code, actress, studio & release title", badge: "Live Query" },
    { id: "code", label: "Code Registry", icon: Hash, desc: "Normalized code de-duplication registry & prefix analytics", badge: `${schemaReport?.files?.codes?.totalCount ?? 62} Codes` },
    { id: "videos", label: "Video Catalog", icon: Film, desc: "Browse full video database with rich tags, performers & studio info", badge: `${schemaReport?.files?.videos?.totalCount ?? 60} Releases` },
    { id: "actress", label: "Actress Catalog", icon: Users, desc: "Explore sharded actress profiles in database/pstar/", badge: `${schemaReport?.files?.actresses?.totalCount ?? 34} Profiles` },
    { id: "studio", label: "Studio Catalog", icon: Building2, desc: "Explore studio directory and production releases in database/studio/", badge: `${schemaReport?.files?.studios?.totalCount ?? 22} Studios` },
    { id: "maintenance", label: "Maintenance Tools", icon: Wrench, desc: "Deep validation, duplicate/orphan detection, index repairs & rebuilds", badge: "Health Audit" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* 1. GITHUB AUTO-COMMIT CONTROL & UNCOMMITTED FILES SIGNAL */}
      <AutoCommitControlCard
        status={autoCommitStatus}
        loading={loadingAutoCommit}
        onToggleAutoCommit={handleToggleAutoCommit}
        onCommitPending={handleCommitPending}
        onDiscardPending={handleDiscardPending}
        onRefresh={fetchAutoCommitStatus}
      />

      {/* 2. NEWEST VIDEO RELEASES (POWERED DIRECTLY BY database/index/latest.json) */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                Newest Video Releases
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                database/index/latest.json
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Chronological feed of recent additions ({latestData?.totalCount ?? 0} videos indexed, sorted by addedAt descending)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLatestVideos}
              disabled={loadingLatest}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLatest ? "animate-spin" : ""}`} />
              <span>Refresh Feed</span>
            </button>
            <button
              onClick={() => onNavigate("videos")}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>Explore All Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loadingLatest ? (
          <div className="py-12 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            <span>Loading latest.json video index...</span>
          </div>
        ) : !latestData?.videos || latestData.videos.length === 0 ? (
          <div className="py-10 text-center text-xs text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-200/60 p-6">
            <Film className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="font-semibold text-neutral-700">No videos indexed in latest.json yet</p>
            <p className="mt-1 text-neutral-400">Use Bulk Scraper or Maintenance Tools to ingest recent releases.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {latestData.videos.slice(0, 12).map((vid, idx) => (
              <div
                key={vid.code || idx}
                className="bg-neutral-50 border border-neutral-200/80 rounded-xl overflow-hidden group hover:border-neutral-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail */}
                  <div className="aspect-16/10 bg-neutral-900 relative overflow-hidden">
                    {vid.thumbnail ? (
                      <img
                        src={vid.thumbnail}
                        alt={vid.title || vid.code}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <Film className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-neutral-950/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-white/20">
                      {vid.code}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-3 space-y-1.5">
                    <h3 className="text-xs font-bold text-neutral-900 line-clamp-2 leading-snug group-hover:text-neutral-950">
                      {vid.title || vid.code}
                    </h3>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap gap-1 pt-1 text-[10px]">
                      {vid.actress?.name && (
                        <span className="bg-neutral-200/70 text-neutral-800 font-medium px-1.5 py-0.5 rounded">
                          {vid.actress.name}
                        </span>
                      )}
                      {vid.studio?.name && (
                        <span className="bg-neutral-200/70 text-neutral-700 px-1.5 py-0.5 rounded">
                          {vid.studio.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-3 pb-3 pt-1 flex items-center justify-between text-[10px] text-neutral-500 border-t border-neutral-200/50 mt-2">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3 text-neutral-400" />
                    {vid.releaseDate || "2026-09-11"}
                  </span>
                  {vid.postUrl ? (
                    <a
                      href={vid.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-600 hover:text-neutral-900 flex items-center gap-0.5 font-medium"
                    >
                      <span>Post</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="font-mono text-neutral-400">Indexed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. GRAPHICAL DATABASE HEALTH GAUGES & COMPOSITION CHART */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
              Database Health & Performance Telemetry
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Real-time in-memory caching efficiency, sub-millisecond lookup latency & concurrency metrics
            </p>
          </div>
          <button
            onClick={() => {
              fetchSchemaStatus();
              fetchPerformanceMetrics();
            }}
            disabled={loadingSchema || loadingMetrics}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSchema || loadingMetrics ? "animate-spin" : ""}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        <DatabaseHealthGauges
          schemaReport={schemaReport}
          perfMetrics={perfMetrics}
          onNavigate={onNavigate}
        />
      </div>

      {/* 4. STORAGE VERIFICATION & CONCURRENCY BENCHMARK SUITES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Verification Suite */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-neutral-700" />
                <h3 className="text-sm font-bold text-neutral-900">GitHub Storage Verification Suite</h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                Step 2 Suite
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Validates read, write, existence-check, atomic multi-file commit, and cleanup against repository storage.
            </p>
          </div>

          <div>
            <button
              onClick={runStorageSelfTest}
              disabled={isRunningTest}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-950 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-xs"
            >
              {isRunningTest ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Running Storage Diagnostics...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Storage Self-Test</span>
                </>
              )}
            </button>

            {testReport && (
              <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  {testReport.success ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Passed ({testReport.totalDurationMs}ms)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      Failed
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-neutral-400">
                    {new Date(testReport.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                  {testReport.steps.map((step, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-neutral-50 border border-neutral-200/60 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-neutral-800">{step.name}</span>
                      <span className="font-mono text-neutral-500">{step.durationMs}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 10 Concurrency & Performance Suite */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-neutral-900">Step 10 Concurrency & Benchmark</h3>
              </div>
              <button
                onClick={handlePurgeCache}
                disabled={isPurgingCache}
                className="text-[11px] text-neutral-600 hover:text-neutral-900 font-semibold flex items-center gap-1 underline"
              >
                <Trash2 className="w-3 h-3" />
                <span>Purge Cache</span>
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Runs concurrent load tests, race-condition safety checks, and in-memory cache speed benchmarks.
            </p>
          </div>

          <div>
            <button
              onClick={runStep10PerformanceSuite}
              disabled={isRunningPerfTest}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-950 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-xs"
            >
              {isRunningPerfTest ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Benchmarking Concurrency...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Step 10 Concurrency Suite</span>
                </>
              )}
            </button>

            {perfReport && (
              <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  {perfReport.success ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      All Race Checks Passed ({perfReport.totalDurationMs}ms)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      Identified Errors
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-neutral-400">
                    {new Date(perfReport.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                  {perfReport.steps.map((step, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-neutral-50 border border-neutral-200/60 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-neutral-800">{step.name}</span>
                      <span className="font-mono text-neutral-500">{step.durationMs}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7. QUICK ACCESS EXPLORER TILES */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
            Application Modules & Catalogs
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Direct access to ingestion pipelines, code indexes, performers, and maintenance tools
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className="p-4 rounded-2xl border border-neutral-200/90 bg-white hover:border-neutral-300 hover:shadow-xs transition-all text-left flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    {link.badge && (
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                        {link.badge}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-neutral-900 group-hover:text-neutral-950">{link.label}</div>
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">{link.desc}</p>
                </div>
                <div className="mt-4 pt-2 border-t border-neutral-100 flex items-center gap-1 text-xs font-semibold text-neutral-600 group-hover:text-neutral-900">
                  <span>Open view</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
