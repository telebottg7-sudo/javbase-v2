import React, { useState, useEffect } from "react";
import {
  MaintenanceReport,
  MaintenanceIssue,
  RebuildIndexesResult,
  RepairResult,
  Step11TestReport,
} from "../../types";
import {
  Wrench,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  RotateCcw,
  Play,
  Loader2,
  FileCheck,
  Copy,
  FolderMinus,
  Link2Off,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export const MaintenanceView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<MaintenanceReport | null>(null);
  const [filter, setFilter] = useState<"all" | "errors" | "warnings" | "autofix">("all");

  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildResult, setRebuildResult] = useState<RebuildIndexesResult | null>(null);

  const [isRepairing, setIsRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);


  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/maintenance/diagnostics");
      const data: MaintenanceReport = await res.json();
      setReport(data);
    } catch (err) {
      console.error("Failed to load diagnostics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const handleRebuildIndexes = async () => {
    if (
      !confirm(
        "Rebuilding all indexes will scan every sharded entity file and atomically commit reconstructed master indexes to GitHub. Proceed?"
      )
    ) {
      return;
    }

    setIsRebuilding(true);
    setRebuildResult(null);
    try {
      const res = await fetch("/api/maintenance/rebuild-indexes", { method: "POST" });
      const data: RebuildIndexesResult = await res.json();
      setRebuildResult(data);
      await fetchDiagnostics();
    } catch (err) {
      console.error("Rebuild failed:", err);
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleAutoRepair = async () => {
    setIsRepairing(true);
    setRepairResult(null);
    try {
      const res = await fetch("/api/maintenance/repair", { method: "POST" });
      const data: RepairResult = await res.json();
      setRepairResult(data);
      await fetchDiagnostics();
    } catch (err) {
      console.error("Auto repair failed:", err);
    } finally {
      setIsRepairing(false);
    }
  };


  const filteredIssues = (report?.issues || []).filter((issue) => {
    if (filter === "errors") return issue.severity === "error";
    if (filter === "warnings") return issue.severity === "warning";
    if (filter === "autofix") return issue.autoFixable;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wide">
            <Wrench className="w-3.5 h-3.5 text-neutral-700 dark:text-slate-300" />
            <span>Database Integrity & Maintenance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mt-1">
            Validation & Maintenance
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchDiagnostics}
            disabled={loading}
            className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#1e293b] hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] text-neutral-700 dark:text-slate-300 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Scan Database</span>
          </button>

          <button
            onClick={handleAutoRepair}
            disabled={isRepairing || !report?.summary.autoFixableIssues}
            className="px-3.5 py-2 rounded-lg border border-neutral-200 dark:border-[#1e293b] hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] text-neutral-800 dark:text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            {isRepairing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>Auto-Repair</span>
          </button>

          <button
            onClick={handleRebuildIndexes}
            disabled={isRebuilding}
            className="px-3.5 py-2 rounded-lg border border-neutral-200 dark:border-[#1e293b] hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] text-neutral-800 dark:text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isRebuilding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-neutral-600 dark:text-slate-400" />
            )}
            <span>Rebuild Indexes</span>
          </button>

          
        </div>
      </div>

      {/* Rebuild & Repair Result Banners */}
      {rebuildResult && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold">Rebuild Succeeded: </span>
              <span>
                Synchronized {rebuildResult.rebuiltIndexes.actresses} actresses,{" "}
                {rebuildResult.rebuiltIndexes.studios} studios,{" "}
                {rebuildResult.rebuiltIndexes.videos} videos, and{" "}
                {rebuildResult.rebuiltIndexes.codes} codes in {rebuildResult.durationMs}ms.
              </span>
            </div>
          </div>
          <a
            href={rebuildResult.commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono underline text-emerald-800 hover:text-emerald-950 font-semibold self-start sm:self-auto shrink-0"
          >
            Commit {rebuildResult.commitSha.slice(0, 7)}
          </a>
        </div>
      )}

      {repairResult && (
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 text-xs text-blue-900 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Auto-Repair Completed</div>
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-blue-800 font-mono text-[11px]">
              {repairResult.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Diagnostics Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-[#1e293b] bg-white dark:bg-[#101728]">
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 dark:text-slate-400">
            <span>Repo Health</span>
            {report?.healthy ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            )}
          </div>
          <div
            className={`text-base font-bold mt-1 ${
              report?.healthy ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {report?.healthy ? "Synchronized" : "Action Needed"}
          </div>
          <div className="text-[10px] text-neutral-400 dark:text-slate-500 mt-0.5 font-mono">
            {report?.summary.totalIssues || 0} issues
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-[#1e293b] bg-white dark:bg-[#101728]">
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 dark:text-slate-400">
            <span>Files Verified</span>
            <FileCheck className="w-3.5 h-3.5 text-neutral-600 dark:text-slate-400" />
          </div>
          <div className="text-base font-bold font-mono text-neutral-900 dark:text-white mt-1">
            {report?.summary.totalFilesChecked || 0}
          </div>
          <div className="text-[10px] text-neutral-400 dark:text-slate-500 mt-0.5 font-mono">Master & Shards</div>
        </div>

        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-[#1e293b] bg-white dark:bg-[#101728]">
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 dark:text-slate-400">
            <span>Duplicate Codes</span>
            <Copy className="w-3.5 h-3.5 text-neutral-600 dark:text-slate-400" />
          </div>
          <div
            className={`text-base font-bold font-mono mt-1 ${
              report?.summary.duplicateCodesCount ? "text-rose-600" : "text-emerald-700"
            }`}
          >
            {report?.summary.duplicateCodesCount || 0}
          </div>
          <div className="text-[10px] text-neutral-400 dark:text-slate-500 mt-0.5 font-mono">0 Collisions</div>
        </div>

        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-[#1e293b] bg-white dark:bg-[#101728]">
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 dark:text-slate-400">
            <span>Orphan Files</span>
            <FolderMinus className="w-3.5 h-3.5 text-neutral-600 dark:text-slate-400" />
          </div>
          <div
            className={`text-base font-bold font-mono mt-1 ${
              report?.summary.orphanFilesCount ? "text-amber-600" : "text-emerald-700"
            }`}
          >
            {report?.summary.orphanFilesCount || 0}
          </div>
          <div className="text-[10px] text-neutral-400 dark:text-slate-500 mt-0.5 font-mono">Unindexed JSON</div>
        </div>

        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-[#1e293b] bg-white dark:bg-[#101728]">
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 dark:text-slate-400">
            <span>Dangling Pointers</span>
            <Link2Off className="w-3.5 h-3.5 text-neutral-600 dark:text-slate-400" />
          </div>
          <div
            className={`text-base font-bold font-mono mt-1 ${
              report?.summary.danglingPointersCount ? "text-rose-600" : "text-emerald-700"
            }`}
          >
            {report?.summary.danglingPointersCount || 0}
          </div>
          <div className="text-[10px] text-neutral-400 dark:text-slate-500 mt-0.5 font-mono">Dead Index Paths</div>
        </div>

        <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-[#1e293b] bg-white dark:bg-[#101728]">
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 dark:text-slate-400">
            <span>Count Mismatches</span>
            <RefreshCw className="w-3.5 h-3.5 text-neutral-600 dark:text-slate-400" />
          </div>
          <div
            className={`text-base font-bold font-mono mt-1 ${
              report?.summary.countMismatchesCount ? "text-amber-600" : "text-emerald-700"
            }`}
          >
            {report?.summary.countMismatchesCount || 0}
          </div>
          <div className="text-[10px] text-neutral-400 dark:text-slate-500 mt-0.5 font-mono">totalCount sync</div>
        </div>
      </div>

          </div>
  );
};
