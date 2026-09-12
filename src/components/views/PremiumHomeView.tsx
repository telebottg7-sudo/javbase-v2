import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Code2,
  Film,
  Github,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
  Wifi,
} from "lucide-react";
import { NavView } from "../../types";

interface LatestVideo {
  code: string;
  title: string;
  thumbnail?: string | null;
  releaseDate?: string | null;
  addedAt?: string;
  actress?: { name: string; slug: string } | null;
  studio?: { name: string; slug: string } | null;
}

interface LatestIndexData {
  totalCount: number;
  videos: LatestVideo[];
}

interface PremiumHomeViewProps {
  onNavigate: (view: NavView) => void;
}

type AutoCommitStatus = {
  autoCommitEnabled: boolean;
  uncommittedCount: number;
  lastModifiedAt?: string;
};

const fallbackHero =
  "linear-gradient(115deg, #070b13 5%, #111827 45%, #3b0764 100%)";

export const PremiumHomeView: React.FC<PremiumHomeViewProps> = ({ onNavigate }) => {
  const [latestData, setLatestData] = useState<LatestIndexData | null>(null);
  const [autoCommit, setAutoCommit] = useState<AutoCommitStatus | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [loadingAutoCommit, setLoadingAutoCommit] = useState(true);
  const [togglingAutoCommit, setTogglingAutoCommit] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [query, setQuery] = useState("");

  const loadLatest = async () => {
    setLoadingLatest(true);
    try {
      const res = await fetch("/api/database/latest");
      if (!res.ok) throw new Error("Failed to load latest releases");
      setLatestData(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLatest(false);
    }
  };

  const loadAutoCommit = async () => {
    setLoadingAutoCommit(true);
    try {
      const res = await fetch("/api/system/auto-commit");
      if (!res.ok) throw new Error("Failed to load auto-commit status");
      const data = await res.json();
      setAutoCommit({
        autoCommitEnabled: data.autoCommitEnabled ?? true,
        uncommittedCount: data.uncommittedCount ?? 0,
        lastModifiedAt: data.lastModifiedAt,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAutoCommit(false);
    }
  };

  useEffect(() => {
    void loadLatest();
    void loadAutoCommit();
  }, []);

  const toggleAutoCommit = async () => {
    if (!autoCommit || togglingAutoCommit) return;
    setTogglingAutoCommit(true);
    try {
      const enabled = !autoCommit.autoCommitEnabled;
      const res = await fetch("/api/system/auto-commit/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle auto-commit");
      const data = await res.json();
      setAutoCommit({
        autoCommitEnabled: data.autoCommitEnabled,
        uncommittedCount: data.uncommittedCount ?? 0,
        lastModifiedAt: data.lastModifiedAt,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setTogglingAutoCommit(false);
    }
  };

  const commitPending = async () => {
    if (!autoCommit?.uncommittedCount || committing) return;
    setCommitting(true);
    try {
      const res = await fetch("/api/system/auto-commit/commit-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Commit pending Javbase database changes" }),
      });
      if (!res.ok) throw new Error("Failed to commit pending files");
      const data = await res.json();
      setAutoCommit({
        autoCommitEnabled: data.autoCommitEnabled,
        uncommittedCount: data.uncommittedCount ?? 0,
        lastModifiedAt: data.lastModifiedAt,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setCommitting(false);
    }
  };

  const releases = useMemo(() => latestData?.videos?.slice(0, 5) ?? [], [latestData]);
  const heroImage = latestData?.videos?.find((video) => video.thumbnail)?.thumbnail;

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    onNavigate("search");
  };

  const categoryCards = [
    { label: "Videos", description: "Browse the full video library", icon: Film, view: "videos" as NavView },
    { label: "Actresses", description: "Explore actress profiles", icon: UserRound, view: "actress" as NavView },
    { label: "Studios", description: "Browse all studios", icon: Building2, view: "studio" as NavView },
    { label: "Codes", description: "Search and browse by code", icon: Code2, view: "code" as NavView },
  ];

  return (
    <div className="min-h-full bg-[#050912] text-white">
      <div className="mx-auto max-w-[1500px] space-y-7 p-4 sm:p-6 lg:p-8">
        {/* Cinematic hero */}
        <section
          className="relative min-h-[360px] overflow-hidden rounded-3xl border border-white/10 bg-cover bg-center shadow-2xl"
          style={{
            backgroundImage: heroImage
              ? `linear-gradient(90deg, rgba(3,7,18,.98) 0%, rgba(3,7,18,.88) 38%, rgba(3,7,18,.34) 72%, rgba(3,7,18,.58) 100%), url(${heroImage})`
              : fallbackHero,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(124,58,237,.26),transparent_35%)]" />
          <div className="relative flex min-h-[360px] items-center p-7 sm:p-10 lg:p-14">
            <div className="max-w-3xl">
              <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" /> More than just videos
              </div>
              <h1 className="text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
                Jav<span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">base</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Your complete Japanese video database with fast search, organized browsing, and powerful scraping tools.
              </p>

              <form onSubmit={submitSearch} className="mt-7 flex max-w-2xl items-center gap-2 rounded-2xl border border-white/15 bg-black/45 p-2 backdrop-blur-xl">
                <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by code, title, actress, studio..."
                  className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />
                <button className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-5 py-3 text-sm font-semibold shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-indigo-400">
                  Search <ArrowRight className="ml-1 inline h-4 w-4" />
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {releases.slice(0, 5).map((video) => (
                  <button
                    key={video.code}
                    type="button"
                    onClick={() => onNavigate("search")}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 transition hover:bg-white/10"
                  >
                    {video.code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Metrics + Auto Commit */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Videos", value: latestData?.totalCount ?? "—", icon: Film, accent: "from-violet-500/25" },
            { label: "Actresses", value: "—", icon: UserRound, accent: "from-pink-500/25" },
            { label: "Studios", value: "—", icon: Building2, accent: "from-blue-500/25" },
            { label: "Codes", value: "—", icon: Code2, accent: "from-emerald-500/25" },
          ].map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={() => onNavigate(stat.label === "Videos" ? "videos" : stat.label === "Actresses" ? "actress" : stat.label === "Studios" ? "studio" : "code")}
              className={`group rounded-2xl border border-white/10 bg-gradient-to-br ${stat.accent} to-white/[0.02] p-5 text-left transition hover:-translate-y-0.5 hover:border-white/20`}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-slate-200"><stat.icon className="h-5 w-5" /></span>
                <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:text-slate-300" />
              </div>
              <div className="mt-4 text-xs text-slate-400">{stat.label}</div>
              <div className="mt-1 text-2xl font-bold tracking-tight">{stat.value}</div>
            </button>
          ))}

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Github className="h-4 w-4 text-slate-300" /> Auto Commit
                </div>
                <p className="mt-1 text-[11px] text-slate-500">GitHub repository updates</p>
              </div>
              <button
                type="button"
                onClick={toggleAutoCommit}
                disabled={loadingAutoCommit || togglingAutoCommit}
                aria-label={autoCommit?.autoCommitEnabled ? "Turn auto commit off" : "Turn auto commit on"}
                className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition ${autoCommit?.autoCommitEnabled ? "bg-violet-600" : "bg-slate-700"}`}
              >
                <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${autoCommit?.autoCommitEnabled ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px]">
              <span className={autoCommit?.autoCommitEnabled ? "text-emerald-400" : "text-amber-400"}>
                {loadingAutoCommit ? "Loading..." : autoCommit?.autoCommitEnabled ? "● Active" : "● Paused"}
              </span>
              {Boolean(autoCommit?.uncommittedCount) && (
                <button type="button" onClick={commitPending} disabled={committing} className="font-semibold text-violet-300 hover:text-violet-200">
                  {committing ? "Committing..." : `${autoCommit?.uncommittedCount} pending → Commit`}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Explore categories */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Layers className="h-5 w-5 text-violet-400" /> Explore Categories</h2>
            <button type="button" onClick={() => onNavigate("videos")} className="text-xs font-medium text-violet-300 hover:text-violet-200">View all <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categoryCards.map(({ label, description, icon: Icon, view }) => (
              <button key={label} type="button" onClick={() => onNavigate(view)} className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-left transition hover:border-violet-500/40 hover:bg-white/[0.055]">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300"><Icon className="h-5 w-5" /></span>
                  <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-slate-300" />
                </div>
                <h3 className="mt-5 text-sm font-semibold">{label}</h3>
                <p className="mt-1 text-xs text-slate-500">{description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Latest releases */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold"><span className="text-xl">🔥</span> Latest Releases</h2>
            <div className="flex items-center gap-3">
              <button type="button" onClick={loadLatest} disabled={loadingLatest} className="text-slate-500 transition hover:text-white">
                <RefreshCw className={`h-4 w-4 ${loadingLatest ? "animate-spin" : ""}`} />
              </button>
              <button type="button" onClick={() => onNavigate("videos")} className="text-xs font-medium text-violet-300 hover:text-violet-200">View all <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button>
            </div>
          </div>

          {loadingLatest ? (
            <div className="flex h-56 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading releases...</div>
          ) : releases.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center text-sm text-slate-500">No releases are available yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {releases.map((video) => (
                <button key={video.code} type="button" onClick={() => onNavigate("videos")} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] text-left transition hover:-translate-y-1 hover:border-violet-500/30 hover:bg-white/[0.06]">
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt={video.title || video.code} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : <div className="flex h-full items-center justify-center text-slate-700"><Play className="h-8 w-8" /></div>}
                    <span className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[10px] font-mono text-white backdrop-blur">{video.code}</span>
                  </div>
                  <div className="p-3">
                    <div className="truncate text-xs font-semibold text-white">{video.title || video.code}</div>
                    <div className="mt-1 truncate text-[11px] text-slate-500">{video.actress?.name || "Unknown actress"}</div>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-600">
                      <span>{video.studio?.name || "—"}</span>
                      <span>{video.releaseDate || "—"}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* System footer */}
        <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.05] to-white/[0.02] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> System Status</div>
              <p className="mt-1 text-xs text-slate-500">Javbase services and storage overview</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-4 lg:grid-cols-5">
              {[
                ["GitHub Storage", Github],
                ["Database", Wifi],
                ["API Services", Wifi],
                ["Cache", Layers],
                ["Auto Commit", Github],
              ].map(([label, Icon]) => (
                <div key={String(label)} className="flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.55)]" />
                  <span>{String(label)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
