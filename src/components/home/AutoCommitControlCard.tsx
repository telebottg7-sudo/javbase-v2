import React, { useState } from "react";
import {
  GitCommit,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  UploadCloud,
  FileCode,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { AutoCommitStatus } from "../../types";

interface AutoCommitControlCardProps {
  status: AutoCommitStatus | null;
  loading: boolean;
  onToggleAutoCommit: (enable: boolean) => Promise<void>;
  onCommitPending: (message?: string) => Promise<void>;
  onDiscardPending: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const AutoCommitControlCard: React.FC<AutoCommitControlCardProps> = ({
  status,
  loading,
  onToggleAutoCommit,
  onCommitPending,
  onDiscardPending,
  onRefresh,
}) => {
  const [isToggling, setIsToggling] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [showFilesList, setShowFilesList] = useState(true);
  const [customCommitMessage, setCustomCommitMessage] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const autoCommitEnabled = status?.autoCommitEnabled ?? true;
  const uncommittedCount = status?.uncommittedCount ?? 0;
  const uncommittedFiles = status?.uncommittedFiles ?? [];

  const handleToggle = async () => {
    setIsToggling(true);
    setFeedback(null);
    try {
      await onToggleAutoCommit(!autoCommitEnabled);
      setFeedback({
        type: "success",
        message: !autoCommitEnabled
          ? "Auto-commit resumed: All writes will now commit automatically to GitHub."
          : "Auto-commit stopped: Writes will be staged in memory without pushing to GitHub.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to toggle auto-commit",
      });
    } finally {
      setIsToggling(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleCommit = async () => {
    if (uncommittedCount === 0) return;
    setIsCommitting(true);
    setFeedback(null);
    try {
      await onCommitPending(customCommitMessage.trim() || undefined);
      setCustomCommitMessage("");
      setFeedback({
        type: "success",
        message: `Successfully pushed all ${uncommittedCount} uncommitted file(s) to GitHub in an atomic batch commit!`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to commit pending files",
      });
    } finally {
      setIsCommitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleDiscard = async () => {
    if (uncommittedCount === 0) return;
    if (!window.confirm(`Are you sure you want to discard all ${uncommittedCount} uncommitted staged file(s)? This will reset in-memory state to the latest GitHub commit.`)) {
      return;
    }
    setIsDiscarding(true);
    setFeedback(null);
    try {
      await onDiscardPending();
      setFeedback({
        type: "success",
        message: `Discarded ${uncommittedCount} uncommitted file(s). In-memory cache reset to remote GitHub state.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to discard uncommitted changes",
      });
    } finally {
      setIsDiscarding(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b]/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* Top Header & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              autoCommitEnabled
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            <GitCommit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-950 dark:text-white">GitHub Auto-Commit Control</h3>
              {autoCommitEnabled ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-Commit Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Auto-Commit Stopped
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">
              {autoCommitEnabled
                ? "All scraper batches and database records push immediately to remote GitHub repository."
                : "Auto-commit is paused. All database writes and scraper runs are safely staged in memory."}
            </p>
          </div>
        </div>

        {/* Action Toggle Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-refresh-autocommit"
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl border border-neutral-200 dark:border-[#1e293b] hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] text-neutral-600 dark:text-slate-400 transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            id="btn-toggle-auto-commit"
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs ${
              autoCommitEnabled
                ? "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white"
            }`}
          >
            {isToggling ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : autoCommitEnabled ? (
              <>
                <PauseCircle className="w-4 h-4" />
                <span>Stop All Auto-Commits</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                <span>Resume Auto-Commit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* UNCOMMITTED FILES SIGNAL SECTION */}
      {uncommittedCount > 0 ? (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span>Uncommitted Files Signal:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-mono text-[11px]">
                    {uncommittedCount} Pending File{uncommittedCount > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  These changes are staged in memory and will not be pushed to GitHub until you trigger a commit.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowFilesList(!showFilesList)}
              className="text-xs text-amber-800 hover:text-amber-950 font-medium flex items-center gap-1 self-start sm:self-center"
            >
              <span>{showFilesList ? "Hide Files" : "View Files"}</span>
              {showFilesList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Files List Accordion */}
          {showFilesList && (
            <div className="bg-white/90 dark:bg-[#101728]/90 border border-amber-200/80 rounded-lg p-2.5 max-h-48 overflow-y-auto space-y-1.5">
              {uncommittedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 text-xs p-1.5 rounded-md hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] border border-neutral-100 font-mono"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode className="w-3.5 h-3.5 text-neutral-400 dark:text-slate-500 shrink-0" />
                    <span className="truncate text-neutral-800 dark:text-slate-200 text-[11px]">{file.path}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        file.operation === "delete"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {file.operation}
                    </span>
                    {file.sizeBytes !== undefined && (
                      <span className="text-[10px] text-neutral-400 dark:text-slate-500">
                        {(file.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Manual Commit / Discard Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              value={customCommitMessage}
              onChange={(e) => setCustomCommitMessage(e.target.value)}
              placeholder={`Commit message (e.g. Ingest ${uncommittedCount} database records)`}
              className="flex-1 px-3 py-2 bg-white dark:bg-[#101728] border border-amber-300/80 rounded-xl text-xs text-neutral-800 dark:text-slate-200 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
            />

            <button
              id="btn-commit-pending-files"
              type="button"
              onClick={handleCommit}
              disabled={isCommitting}
              className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:bg-slate-200 active:bg-neutral-950 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              {isCommitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Pushing to GitHub...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Commit {uncommittedCount} Pending File{uncommittedCount > 1 ? "s" : ""}</span>
                </>
              )}
            </button>

            <button
              id="btn-discard-pending-files"
              type="button"
              onClick={handleDiscard}
              disabled={isDiscarding}
              className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-[#2b3a54] hover:bg-neutral-100 dark:hover:bg-slate-800 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isDiscarding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Discard</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/80 dark:bg-[#0b101a]/80 border border-neutral-200 dark:border-[#1e293b]/70 text-xs">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Clean Workspace:</strong> No uncommitted files pending. Remote repository is in sync.
            </span>
          </div>
          <span className="text-[11px] font-mono text-neutral-400 dark:text-slate-500">
            0 Staged Files
          </span>
        </div>
      )}
    </div>
  );
};
