import React, { useState, useEffect } from "react";
import {
  BackendStatus,
  NavView,
  NavParams,
  SelfTestReport,
  DatabaseStatusReport,
  StoragePerformanceMetrics,
  Step10PerformanceReport,
  AutoCommitStatus,
} from "../../types";
import { fetchWithRetry } from "../../utils/fetchWithRetry";
import {
  Search,
  Users,
  Building2,
  Code as CodeIcon,
  Film,
  ArrowRight,
  HardDrive,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Zap,
  Trash2,
  Sparkles,
  HelpCircle,
  MoreVertical,
  Activity,
  Layers,
  ChevronRight,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

interface LatestVideo {
  code: string;
  title: string;
  thumbnail?: string | null;
  postUrl?: string | null;
  releaseDate?: string | null;
  duration?: string;
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
  onNavigate: (view: NavView, params?: NavParams) => void;
}

// Fallback visual sample videos matching the reference layout
const defaultReleases: LatestVideo[] = [
  {
    code: "ABP-1234",
    title: "Beautiful Girl Next Door",
    duration: "2:34:12",
    releaseDate: "2025-04-28",
    thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    actress: { name: "Mizuki Akari", slug: "mizuki-akari" },
    studio: { name: "S1", slug: "s1" },
  },
  {
    code: "SSS-5678",
    title: "Office Lady Temptation",
    duration: "1:48:20",
    releaseDate: "2025-04-27",
    thumbnail: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
    actress: { name: "Sakura Aoi", slug: "sakura-aoi" },
    studio: { name: "S1", slug: "s1" },
  },
  {
    code: "IPX-9012",
    title: "Late Night Secrets",
    duration: "2:17:45",
    releaseDate: "2025-04-26",
    thumbnail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
    actress: { name: "Rino Mizuki", slug: "rino-mizuki" },
    studio: { name: "IPX", slug: "ipx" },
  },
  {
    code: "MIDE-3344",
    title: "First Time With You",
    duration: "1:52:33",
    releaseDate: "2025-04-25",
    thumbnail: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
    actress: { name: "Yua Mikami", slug: "yua-mikami" },
    studio: { name: "MIDE", slug: "mide" },
  },
  {
    code: "FSD-7788",
    title: "Schoolgirl Fantasy",
    duration: "2:05:17",
    releaseDate: "2025-04-24",
    thumbnail: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80",
    actress: { name: "Rikako Sasaki", slug: "rikako-sasaki" },
    studio: { name: "FSD", slug: "fsd" },
  },
];

export const HomeView: React.FC<HomeViewProps> = ({ status, onNavigate }) => {
  const [heroSearch, setHeroSearch] = useState("");
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testReport, setTestReport] = useState<SelfTestReport | null>(null);

  // Schema status
  const [schemaReport, setSchemaReport] = useState<DatabaseStatusReport | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);

  // Performance telemetry
  const [perfMetrics, setPerfMetrics] = useState<StoragePerformanceMetrics | null>(null);
  const [isRunningPerfTest, setIsRunningPerfTest] = useState(false);
  const [perfReport, setPerfReport] = useState<Step10PerformanceReport | null>(null);
  const [isPurgingCache, setIsPurgingCache] = useState(false);

  // Auto-Commit & Uncommitted files state
  const [autoCommitStatus, setAutoCommitStatus] = useState<AutoCommitStatus | null>(null);
  const [loadingAutoCommit, setLoadingAutoCommit] = useState(false);
  const [isTogglingCommit, setIsTogglingCommit] = useState(false);
  const [isCommittingManual, setIsCommittingManual] = useState(false);

  // Latest.json index state
  const [latestData, setLatestData] = useState<LatestIndexData | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

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

  const handleToggleAutoCommit = async () => {
    if (isTogglingCommit) return;
    setIsTogglingCommit(true);
    const newTarget = !autoCommitStatus?.autoCommitEnabled;
    try {
      const res = await fetch("/api/system/auto-commit/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newTarget }),
      });
      if (res.ok) {
        const data = await res.json();
        setAutoCommitStatus({
          autoCommitEnabled: data.autoCommitEnabled,
          uncommittedCount: data.uncommittedCount,
          uncommittedFiles: data.uncommittedFiles,
          lastModifiedAt: data.lastModifiedAt,
        });
      }
    } catch (err) {
      console.error("Failed to toggle auto commit:", err);
    } finally {
      setIsTogglingCommit(false);
    }
  };

  const handleManualCommit = async () => {
    if (isCommittingManual || !autoCommitStatus?.uncommittedCount) return;
    setIsCommittingManual(true);
    try {
      const res = await fetch("/api/system/auto-commit/commit-pending", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setAutoCommitStatus({
          autoCommitEnabled: data.autoCommitEnabled,
          uncommittedCount: data.uncommittedCount,
          uncommittedFiles: data.uncommittedFiles,
          lastModifiedAt: data.lastModifiedAt,
        });
      }
    } catch (err) {
      console.error("Failed to commit manually:", err);
    } finally {
      setIsCommittingManual(false);
    }
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
    try {
      const res = await fetch("/api/storage/metrics");
      const data = await res.json();
      if (data.metrics) {
        setPerfMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Failed to load performance metrics:", err);
    }
  };

  useEffect(() => {
    fetchSchemaStatus();
    fetchPerformanceMetrics();
    fetchAutoCommitStatus();
    fetchLatestVideos();
  }, []);

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      onNavigate("search", { query: heroSearch.trim() });
    }
  };

  const handleTagClick = (tag: string) => {
    onNavigate("search", { query: tag });
  };

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
    try {
      await fetch("/api/storage/cache/purge", { method: "POST" });
      await fetchPerformanceMetrics();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPurgingCache(false);
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

  const videosCount = schemaReport?.files?.videos?.totalCount ?? 12482;
  const actressesCount = schemaReport?.files?.actresses?.totalCount ?? 1842;
  const studiosCount = schemaReport?.files?.studios?.totalCount ?? 426;
  const codesCount = schemaReport?.files?.codes?.totalCount ?? 15203;

  const displayVideos = (latestData?.videos && latestData.videos.length > 0)
    ? latestData.videos.slice(0, 5)
    : defaultReleases;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* 1. HERO BANNER SECTION */}
      <div className="relative rounded-3xl overflow-hidden border border-[#1f293d] shadow-2xl bg-[#0d1424]">
        {/* Background Overlay Image with moody ambient lighting */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-luminosity filter contrast-125"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b101d] via-[#0b101d]/90 to-[#0b101d]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b101d] via-transparent to-transparent" />

        <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          {/* Hero Left Content */}
          <div className="max-w-2xl space-y-5">
            <div className="text-[11px] font-mono font-bold tracking-[0.2em] text-cyan-400 uppercase">
              MORE THAN JUST VIDEOS
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-none">
              Jav<span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">base</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
              Your complete Japanese video database with search, browsing and powerful scraping tools.
            </p>

            {/* Hero Search Box */}
            <form onSubmit={handleHeroSearchSubmit} className="pt-1">
              <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-2xl bg-[#131b2e]/90 border border-[#23314d] backdrop-blur-md shadow-xl max-w-xl">
                <div className="flex items-center gap-3 px-3 flex-1 w-full">
                  <Search className="w-5 h-5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    placeholder="Search by code, title, actress, studio..."
                    className="w-full bg-transparent text-white placeholder-slate-400 text-sm py-2.5 focus:outline-hidden"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-500/25 shrink-0 cursor-pointer"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Popular Search Tag Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <span className="text-slate-400 font-medium">Popular:</span>
              {["IPX-901", "MIDE-334", "Sakurai Aoi", "FSD-7788", "Rion Mizuki"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="px-3 py-1 rounded-lg bg-[#182238]/80 hover:bg-indigo-600/30 text-slate-300 hover:text-white border border-[#273654] hover:border-indigo-500/50 text-xs font-mono transition-all cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Hero Right Feature Stack */}
          <div className="w-full lg:w-72 space-y-3 shrink-0">
            {[
              { title: "Fast & Reliable", desc: "GitHub powered storage", icon: Zap },
              { title: "Smart Search", desc: "Find exactly what you need", icon: Search },
              { title: "Regular Updates", desc: "Latest releases & more", icon: RefreshCw },
              { title: "Powerful Tools", desc: "Scraper, bulk & maintenance", icon: Layers },
            ].map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#131b2e]/80 border border-[#22304d]/80 backdrop-blur-md flex items-center gap-3 hover:border-indigo-500/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#1e2b47] flex items-center justify-center text-indigo-400 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-snug">{feat.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. METRICS ROW & AUTO-COMMIT CONTROL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Videos */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#101728] border border-slate-200 dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-[#2b3a54] transition-all flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            {/* Sparkline visualization */}
            <svg className="w-16 h-8 text-purple-500 dark:text-purple-400 stroke-current fill-none stroke-2" viewBox="0 0 60 25">
              <path d="M 0 20 Q 15 5 30 15 T 60 5" />
            </svg>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Videos</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{videosCount.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+12 this week</span>
            </div>
          </div>
        </div>

        {/* Card 2: Actresses */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#101728] border border-slate-200 dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-[#2b3a54] transition-all flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            {/* Sparkline */}
            <svg className="w-16 h-8 text-pink-500 dark:text-pink-400 stroke-current fill-none stroke-2" viewBox="0 0 60 25">
              <path d="M 0 18 Q 15 22 30 10 T 60 8" />
            </svg>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Actresses</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{actressesCount.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+5 this week</span>
            </div>
          </div>
        </div>

        {/* Card 3: Studios */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#101728] border border-slate-200 dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-[#2b3a54] transition-all flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            {/* Sparkline */}
            <svg className="w-16 h-8 text-blue-500 dark:text-blue-400 stroke-current fill-none stroke-2" viewBox="0 0 60 25">
              <path d="M 0 22 Q 20 8 40 16 T 60 10" />
            </svg>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Studios</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{studiosCount.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+2 this week</span>
            </div>
          </div>
        </div>

        {/* Card 4: Codes */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#101728] border border-slate-200 dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-[#2b3a54] transition-all flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CodeIcon className="w-5 h-5" />
            </div>
            {/* Sparkline */}
            <svg className="w-16 h-8 text-emerald-500 dark:text-emerald-400 stroke-current fill-none stroke-2" viewBox="0 0 60 25">
              <path d="M 0 15 Q 15 25 30 8 T 60 4" />
            </svg>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Codes</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{codesCount.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+18 this week</span>
            </div>
          </div>
        </div>

        {/* Card 5: Auto Commit Toggle Control */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#101728] border border-slate-200 dark:border-[#1e293b] hover:border-slate-300 dark:hover:border-[#2b3a54] transition-all flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-300 font-semibold">
              <span>Auto Commit</span>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" title="Automatically commit updates to GitHub repository" />
            </div>

            {/* Toggle Switch Button */}
            <button
              onClick={handleToggleAutoCommit}
              disabled={loadingAutoCommit || isTogglingCommit}
              className={`w-11 h-6 rounded-full p-1 transition-colors relative cursor-pointer ${
                autoCommitStatus?.autoCommitEnabled ?? true
                  ? "bg-indigo-600"
                  : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white dark:bg-[#101728] transition-transform ${
                  autoCommitStatus?.autoCommitEnabled ?? true
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Automatically commit updates to GitHub repository
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-[#1e293b] space-y-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full ${
                  (autoCommitStatus?.autoCommitEnabled ?? true) ? "bg-emerald-500" : "bg-amber-500"
                }`} />
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {(autoCommitStatus?.autoCommitEnabled ?? true) ? "Active" : "Disabled"}
                </span>
                {autoCommitStatus?.uncommittedCount ? (
                  <span className="text-[10px] font-mono bg-amber-500/20 text-amber-600 dark:text-amber-300 px-1.5 py-0.2 rounded">
                    {autoCommitStatus.uncommittedCount} pending
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {autoCommitStatus?.lastModifiedAt
                    ? `Last commit: ${new Date(autoCommitStatus.lastModifiedAt).toLocaleString()}`
                    : "No commits yet"}
                </div>
                {!(autoCommitStatus?.autoCommitEnabled ?? true) && !!autoCommitStatus?.uncommittedCount && (
                  <button
                    onClick={handleManualCommit}
                    disabled={isCommittingManual}
                    className="text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                  >
                    {isCommittingManual ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Commit Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. LATEST RELEASES GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Latest Releases</h2>
          </div>
          <button
            onClick={() => onNavigate("videos")}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingLatest ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <span>Loading release feed...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {displayVideos.map((vid, idx) => (
              <div
                key={vid.code || idx}
                onClick={() => onNavigate("search", { query: vid.code })}
                className="group bg-white dark:bg-[#101728] border border-slate-200 dark:border-[#1e293b] hover:border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:shadow-indigo-500/10 flex flex-col justify-between"
              >
                <div>
                  {/* Card Thumbnail */}
                  <div className="aspect-16/10 bg-slate-900 relative overflow-hidden">
                    <img
                      src={vid.thumbnail || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80"}
                      alt={vid.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80";
                      }}
                    />

                    {/* Top-Left Code Pill */}
                    <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-white/10">
                      {vid.code}
                    </div>

                    {/* Top-Right Duration Pill */}
                    <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-md text-slate-200 text-[10px] font-mono px-2 py-0.5 rounded-md border border-white/10">
                      {vid.duration || "2:15:00"}
                    </div>

                    {/* Hover Arrow Indicator */}
                    <div className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 shadow-lg">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 space-y-1.5">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {vid.title}
                    </h3>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {vid.actress?.name || "Actress Record"}
                    </div>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="px-3.5 pb-3.5 pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-[#1c2638]">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px]">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>Actress</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px]">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span>{vid.studio?.name || "Studio"}</span>
                    </span>
                  </div>
                  <button className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. EXPLORE CATEGORIES */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Explore Categories</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tile 1: Actress Directory */}
          <div
            onClick={() => onNavigate("actress")}
            className="p-5 rounded-2xl bg-white dark:bg-[#101728] border border-slate-200 dark:border-[#1e293b] hover:border-pink-500/50 hover:bg-slate-50 dark:hover:bg-[#131b2e] transition-all cursor-pointer group flex items-center justify-between shadow-xs hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">Actress Directory</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Browse all actresses</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
          </div>

          {/* Tile 2: Studio Directory */}
          <div
            onClick={() => onNavigate("studio")}
            className="p-5 rounded-2xl bg-white dark:bg-[#101728] border border-slate-200 dark:border-[#1e293b] hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-[#131b2e] transition-all cursor-pointer group flex items-center justify-between shadow-xs hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Studio Directory</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Browse all studios</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </div>

          {/* Tile 3: Code Browser */}
          <div
            onClick={() => onNavigate("code")}
            className="p-5 rounded-2xl bg-white dark:bg-[#101728] border border-slate-200 dark:border-[#1e293b] hover:border-cyan-500/50 hover:bg-slate-50 dark:hover:bg-[#131b2e] transition-all cursor-pointer group flex items-center justify-between shadow-xs hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CodeIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">Code Browser</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Browse by code</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
          </div>

          {/* Tile 4: Video Library */}
          <div
            onClick={() => onNavigate("videos")}
            className="p-5 rounded-2xl bg-white dark:bg-[#101728] border border-slate-200 dark:border-[#1e293b] hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-[#131b2e] transition-all cursor-pointer group flex items-center justify-between shadow-xs hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Video Library</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Explore all videos</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>

      {/* 5. SYSTEM STATUS BOTTOM BAR */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#101728] border border-slate-200 dark:border-[#1e293b] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">System Status</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">Everything is running smoothly</span>
          </div>

          {/* Status indicators flex */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>GitHub Storage Connected</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Database Healthy</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>API Services Online</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Cache Active</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Auto Commit Enabled</span>
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto shrink-0 border-t lg:border-t-0 border-slate-200 dark:border-[#1e293b] pt-4 lg:pt-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span className="block text-[10px] text-slate-400 dark:text-slate-400 uppercase tracking-wider">Last Update</span>
            <span>Apr 28, 2025 15:42</span>
          </div>

          <button
            onClick={() => onNavigate("system-tests")}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#182338] hover:bg-indigo-600 text-slate-700 dark:text-slate-200 hover:text-white border border-slate-200 dark:border-[#263757] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>View System Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 6. EXPANDABLE DIAGNOSTICS & BENCHMARK SUITES (PRESERVES ALL SYSTEM TESTING FUNCTIONS) */}
      <div className="pt-2">
        <button
          onClick={() => setShowDiagnostics((prev) => !prev)}
          className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Activity className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span>{showDiagnostics ? "Hide Storage & Concurrency Diagnostics" : "Show Storage & Concurrency Diagnostics"}</span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showDiagnostics ? "rotate-90" : ""}`} />
        </button>

        {showDiagnostics && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5 border-t border-slate-200 dark:border-[#1e293b] pt-4">
            {/* Storage Verification */}
            <div className="bg-white dark:bg-[#101728] border border-slate-200 dark:border-[#1e293b] rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1e293b]">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">GitHub Storage Diagnostics</h3>
                </div>
              </div>

              <button
                onClick={runStorageSelfTest}
                disabled={isRunningTest}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isRunningTest ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Running Diagnostics...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Storage Diagnostics</span>
                  </>
                )}
              </button>

              {testReport && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1e293b] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    {testReport.success ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Passed ({testReport.totalDurationMs}ms)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                        <XCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs custom-scrollbar">
                    {testReport.steps.map((step, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-[#141d33] border border-slate-200 dark:border-[#22304e] flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{step.name}</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">{step.durationMs}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Concurrency Suite */}
            <div className="bg-white dark:bg-[#101728] border border-slate-200 dark:border-[#1e293b] rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1e293b]">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Concurrency & Performance Suite</h3>
                </div>
                <button
                  onClick={handlePurgeCache}
                  disabled={isPurgingCache}
                  className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 underline cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Purge Cache</span>
                </button>
              </div>

              <button
                onClick={runStep10PerformanceSuite}
                disabled={isRunningPerfTest}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isRunningPerfTest ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Benchmarking Concurrency...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Concurrency Benchmark</span>
                  </>
                )}
              </button>

              {perfReport && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1e293b] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    {perfReport.success ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Checks Passed ({perfReport.totalDurationMs}ms)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                        <XCircle className="w-3.5 h-3.5" />
                        Identified Errors
                      </span>
                    )}
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs custom-scrollbar">
                    {perfReport.steps.map((step, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-[#141d33] border border-slate-200 dark:border-[#22304e] flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{step.name}</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">{step.durationMs}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
