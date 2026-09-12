import React, { useState } from "react";
import {
  Database,
  Layers,
  Cpu,
  HardDrive,
  Search,
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldCheck,
  Server,
  FileJson,
  Sparkles,
} from "lucide-react";

interface DatabaseTopologyGraphicProps {
  cacheHitRatio?: number;
  avgLatencyMs?: number;
  totalCodes?: number;
  totalVideos?: number;
  totalActresses?: number;
  totalStudios?: number;
  onNavigate?: (view: any) => void;
}

export const DatabaseTopologyGraphic: React.FC<DatabaseTopologyGraphicProps> = ({
  cacheHitRatio = 0.75,
  avgLatencyMs = 0.01,
  totalCodes = 62,
  totalVideos = 60,
  totalActresses = 34,
  totalStudios = 22,
  onNavigate,
}) => {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const nodes = [
    {
      id: "source",
      title: "Scraper Ingestion",
      subtitle: "javtiful.com feeds",
      icon: Layers,
      color: "blue",
      badge: "HTTP / HTML",
      status: "Online",
      metrics: "Live Pagination Parsing",
      description: "Extracts video codes, release dates, actresses & studio metadata with multi-page crawler support.",
    },
    {
      id: "engine",
      title: "Deduplication & Code Normalizer",
      subtitle: "Deterministic Sanitizer",
      icon: Cpu,
      color: "purple",
      badge: "Regex & Prefix",
      status: "Active",
      metrics: "O(1) Collision Check",
      description: "Standardizes code naming patterns (e.g. SSIS-001) and flags duplicate titles before commits.",
    },
    {
      id: "cache",
      title: "In-Memory LRU Cache",
      subtitle: "Fast Telemetry Layer",
      icon: Zap,
      color: "amber",
      badge: `${(cacheHitRatio * 100).toFixed(0)}% Hit Rate`,
      status: "Accelerated",
      metrics: `< ${avgLatencyMs.toFixed(2)}ms Read Latency`,
      description: "Caches index files in RAM with instant invalidation upon background atomic writes.",
    },
    {
      id: "storage",
      title: "GitHub Repository JSON DB",
      subtitle: "database/index/ & pstar/",
      icon: HardDrive,
      color: "emerald",
      badge: "Atomic Commits",
      status: "100% Synced",
      metrics: `${totalCodes + totalVideos + totalActresses + totalStudios} total objects`,
      description: "Stores persistent canonical JSON files with SHA version control, write queue mutex, and rollback safety.",
    },
    {
      id: "query",
      title: "Unified Query & Search API",
      subtitle: "Instant Multi-Filter",
      icon: Search,
      color: "indigo",
      badge: "Fast Read",
      status: "Ready",
      metrics: "Sub-millisecond Search",
      description: "Serves search queries across codes, actresses, studios, and release titles simultaneously.",
    },
  ];

  return (
    <div className="bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-50 dark:bg-emerald-900/200/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/200/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Database Topology
            </span>
            <span className="text-xs text-neutral-400 dark:text-slate-500 font-mono hidden sm:inline-block">
              Single-Source JSON Engine
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mt-1.5 tracking-tight flex items-center gap-2">
            <span>Avdb Data Pipeline & Storage Architecture</span>
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-neutral-800 dark:bg-slate-200/80 border border-neutral-700/60 text-neutral-300 dark:text-slate-500 flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>State: <strong className="text-emerald-400 font-bold">HEALTHY</strong></span>
          </div>
        </div>
      </div>

      {/* Interactive Topology Graph Flow */}
      <div className="relative z-10 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            const isHovered = activeNode === node.id;
            return (
              <div
                key={node.id}
                onMouseEnter={() => setActiveNode(node.id)}
                onMouseLeave={() => setActiveNode(null)}
                className={`relative group p-4 rounded-xl transition-all duration-200 cursor-pointer border ${
                  isHovered
                    ? "bg-neutral-800 dark:bg-slate-200/90 border-neutral-600 shadow-lg scale-[1.02]"
                    : "bg-neutral-800 dark:bg-slate-200/40 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 dark:hover:bg-slate-200/60"
                }`}
              >
                {/* Node Connector Line for Desktop */}
                {index < nodes.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 items-center justify-center">
                    <div className="w-3 h-0.5 bg-neutral-700 group-hover:bg-neutral-500 transition-colors" />
                    <ArrowRight className="w-3 h-3 text-neutral-500 dark:text-slate-400 group-hover:text-emerald-400 transition-colors -ml-1" />
                  </div>
                )}

                {/* Node Content */}
                <div className="flex flex-col h-full justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-neutral-700/50 border border-neutral-600/50 flex items-center justify-center text-white group-hover:border-emerald-500/40 group-hover:bg-emerald-50 dark:bg-emerald-900/200/10 transition-colors">
                        <Icon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 dark:bg-white border border-neutral-700 text-neutral-300 dark:text-slate-500">
                        {node.badge}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                      {node.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 dark:text-slate-500 mt-0.5">
                      {node.subtitle}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 text-[10px] font-mono text-neutral-300 dark:text-slate-500 flex items-center justify-between">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {node.status}
                    </span>
                    <span className="text-neutral-400 dark:text-slate-500 text-right truncate pl-1">
                      {node.metrics}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Node Details Inspection Banner */}
      {activeNode ? (
        <div className="relative z-10 mt-2 p-3.5 rounded-xl bg-neutral-800 dark:bg-slate-200/80 border border-neutral-700/80 text-xs flex items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold text-white">
                {nodes.find((n) => n.id === activeNode)?.title}:
              </span>{" "}
              <span className="text-neutral-300 dark:text-slate-500">
                {nodes.find((n) => n.id === activeNode)?.description}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-neutral-400 dark:text-slate-500 shrink-0 bg-neutral-900 dark:bg-white px-2 py-1 rounded">
            Node: {activeNode}
          </span>
        </div>
      ) : (
        <div className="relative z-10 mt-2 p-3 rounded-xl bg-neutral-900/60 dark:bg-neutral-950/80 border border-neutral-800/80 text-[11px] text-neutral-400 dark:text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-50 dark:bg-emerald-900/200 animate-pulse" />
            <span>Hover over any pipeline node to inspect real-time component responsibilities and throughput specs.</span>
          </div>
          <span className="font-mono text-[10px] text-neutral-500 dark:text-slate-400 hidden sm:inline-block">FIFO Mutex Locked</span>
        </div>
      )}
    </div>
  );
};
