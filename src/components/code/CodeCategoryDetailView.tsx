import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Hash,
  Search,
  RefreshCw,
  Download,
  ExternalLink,
  Users,
  Building2,
  Calendar,
  Layers,
  LayoutGrid,
  List,
  Filter,
  X,
  Play,
  Film,
  Sparkles,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Copy,
  Check,
  Trash2,
  Globe
} from "lucide-react";
import { CategoryDetailsResult, CategoryNumberItem, NavView, NavParams } from "../../types";
import { MediaHarvesterModal } from "../modals/MediaHarvesterModal";
import { DatabasePagination } from "../common/DatabasePagination";

import { fetchWithRetry } from "../../utils/fetchWithRetry";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error" | "complete";
  message: string;
  currentCode?: string;
  progress?: number;
}

interface CodeCategoryDetailViewProps {
  category: string;
  initialNumber?: number | null;
  onBack: () => void;
  onNavigate?: (view: NavView, params?: NavParams) => void;
}

type ViewMode = "numbered-grid" | "cards" | "table";

export const CodeCategoryDetailView: React.FC<CodeCategoryDetailViewProps> = ({
  category,
  initialNumber = null,
  onBack,
  onNavigate,
}) => {
  const [data, setData] = useState<CategoryDetailsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNumber, setSelectedNumber] = useState<number | null>(initialNumber);
  const [numberRange, setNumberRange] = useState<{ min?: number; max?: number } | null>(null);
  const [sortMode, setSortMode] = useState<string>("number_asc");
  const [viewMode, setViewMode] = useState<ViewMode>("numbered-grid");
  const [page, setPage] = useState(1);
  const [harvesterTarget, setHarvesterTarget] = useState<string | null>(null);
  const [batchLimit, setBatchLimit] = useState<number>(50);
  const [searchMissingLoading, setSearchMissingLoading] = useState(false);
  const [missingSearchReport, setMissingSearchReport] = useState<any | null>(null);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progressPct, setProgressPct] = useState(0);
  const [currentSearchingCode, setCurrentSearchingCode] = useState<string>("");
  const [liveFoundItems, setLiveFoundItems] = useState<any[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll console container
  useEffect(() => {
    if (autoScroll && consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  // Detect missing code numbers in sequence (e.g., SSIS-001, SSIS-002 -> missing SSIS-003...)
  const missingNumbers = useMemo(() => {
    if (!data?.allNumbers || data.allNumbers.length === 0) return [];
    const existingSet = new Set(data.allNumbers.map((n) => n.number));
    const minNum = numberRange?.min || data.minNumber || 1;
    const maxNum = numberRange?.max || data.maxNumber || 1;
    const missing: Array<{ number: number; code: string }> = [];

    for (let i = minNum; i <= maxNum; i++) {
      if (!existingSet.has(i)) {
        missing.push({
          number: i,
          code: `${category}-${String(i).padStart(3, "0")}`,
        });
      }
    }
    return missing;
  }, [data?.allNumbers, data?.minNumber, data?.maxNumber, numberRange, category]);

  const handleFindMissing = async (customNumbers?: number[], overrideLimit?: number) => {
    const activeLimit = overrideLimit || batchLimit;
    setSearchMissingLoading(true);
    setShowMissingModal(true);
    setMissingSearchReport(null);
    setLogs([]);
    setProgressPct(0);
    setCurrentSearchingCode("");
    setLiveFoundItems([]);

    const body: any = {
      startNum: numberRange?.min || data?.minNumber || 1,
      endNum: numberRange?.max || data?.maxNumber || 1,
      maxToSearch: activeLimit,
    };
    if (customNumbers && customNumbers.length > 0) {
      body.missingNumbers = customNumbers;
    }

    try {
      const response = await fetch(`/api/codes/category/${encodeURIComponent(category)}/find-missing?stream=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify(body),
      });

      if (!response.body) {
        throw new Error("ReadableStream response not supported by server");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const rawEvents = buffer.split("\n\n");
        buffer = rawEvents.pop() || "";

        for (const rawEvent of rawEvents) {
          if (!rawEvent.trim()) continue;
          const lines = rawEvent.split("\n");
          let eventName = "message";
          let eventDataRaw = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventName = line.substring(7).trim();
            } else if (line.startsWith("data: ")) {
              eventDataRaw = line.substring(6).trim();
            }
          }

          if (eventDataRaw) {
            try {
              const dataObj = JSON.parse(eventDataRaw);

              if (eventName === "log") {
                const newEntry: LogEntry = {
                  id: Math.random().toString(36).substring(2, 9),
                  timestamp: dataObj.timestamp || new Date().toLocaleTimeString(),
                  level: dataObj.level || "info",
                  message: dataObj.message,
                  currentCode: dataObj.currentCode,
                  progress: dataObj.progress,
                };
                setLogs((prev) => [...prev, newEntry]);
                if (typeof dataObj.progress === "number") {
                  setProgressPct(dataObj.progress);
                }
                if (dataObj.currentCode) {
                  setCurrentSearchingCode(dataObj.currentCode);
                }
              } else if (eventName === "found") {
                if (dataObj.item) {
                  setLiveFoundItems((prev) => {
                    if (prev.some((it) => it.code === dataObj.item.code)) return prev;
                    return [...prev, dataObj.item];
                  });
                }
              } else if (eventName === "complete") {
                setMissingSearchReport(dataObj);
                fetchCategoryDetails(1, searchQuery, selectedNumber, numberRange, sortMode);
              } else if (eventName === "error") {
                setMissingSearchReport({
                  success: false,
                  error: dataObj.error || "Streaming error occurred",
                });
              }
            } catch (e) {
              console.error("Error parsing event stream payload:", e, eventDataRaw);
            }
          }
        }
      }
    } catch (err: any) {
      setMissingSearchReport({
        success: false,
        error: err.message || "Network error while streaming missing numbers search",
      });
    } finally {
      setSearchMissingLoading(false);
    }
  };

  const copyConsoleLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleSearchSourceWebsite = (rawQuery?: string) => {
    const input = (rawQuery !== undefined ? rawQuery : searchQuery).trim();
    let queryToSearch = input;

    if (!input) {
      queryToSearch = category;
    } else if (/^\d+$/.test(input)) {
      const padded = String(parseInt(input, 10)).padStart(3, "0");
      queryToSearch = `${category}-${padded}`;
    } else if (input.toUpperCase().startsWith(`${category.toUpperCase()}-`)) {
      queryToSearch = input.toUpperCase();
    } else if (!input.includes("-") && input.toUpperCase().startsWith(category.toUpperCase())) {
      const numPart = input.substring(category.length).replace(/^[_-]/, "");
      if (/^\d+$/.test(numPart)) {
        queryToSearch = `${category}-${numPart.padStart(3, "0")}`;
      } else {
        queryToSearch = input;
      }
    } else {
      queryToSearch = input;
    }

    if (onNavigate) {
      onNavigate("bulk-scraper", { query: queryToSearch, tab: "search" });
    } else {
      setHarvesterTarget(queryToSearch);
    }
  };

  const fetchCategoryDetails = async (
    targetPage = 1,
    query = searchQuery,
    exactNum: number | null = selectedNumber,
    range = numberRange,
    sort = sortMode
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: "60",
        sort,
      });
      if (query.trim()) params.append("q", query.trim());
      if (exactNum !== null && exactNum !== undefined) {
        params.append("exactNum", exactNum.toString());
      } else {
        if (range?.min !== undefined) params.append("minNum", range.min.toString());
        if (range?.max !== undefined) params.append("maxNum", range.max.toString());
      }

      const res = await fetchWithRetry(`/api/codes/category/${encodeURIComponent(category)}?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setPage(json.data.page || 1);
      }
    } catch (err) {
      console.error("Failed to load category details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryDetails(1, searchQuery, selectedNumber, numberRange, sortMode);
  }, [category, selectedNumber, numberRange, sortMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedNumber(null);
    fetchCategoryDetails(1, searchQuery, null, numberRange, sortMode);
  };

  const handleNumberClick = (num: number) => {
    if (selectedNumber === num) {
      // Toggle off
      setSelectedNumber(null);
    } else {
      setSelectedNumber(num);
      setNumberRange(null);
      setSearchQuery("");
    }
  };

  const handleClearFilters = () => {
    setSelectedNumber(null);
    setNumberRange(null);
    setSearchQuery("");
  };

  // Generate range presets based on maxNumber (e.g. 1-50, 51-100, 101-150...)
  const rangePresets = useMemo(() => {
    if (!data?.allNumbers || data.allNumbers.length === 0) return [];
    const max = data.maxNumber || 100;
    const step = max > 500 ? 100 : 50;
    const presets: Array<{ label: string; min: number; max: number }> = [];

    for (let start = 1; start <= max; start += step) {
      const end = start + step - 1;
      // Check if any numbers exist in this range
      const hasAny = data.allNumbers.some((n) => n.number >= start && n.number <= end);
      if (hasAny) {
        presets.push({
          label: `${start} - ${end}`,
          min: start,
          max: end,
        });
      }
    }
    return presets;
  }, [data?.allNumbers, data?.maxNumber]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        {/* Navigation & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                id="btn-back-to-categories"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-xs font-medium text-neutral-700 transition-colors cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Categories</span>
              </button>
              <span className="text-neutral-300">/</span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-neutral-900 text-white tracking-wider">
                {category}
              </span>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
                <Hash className="w-5 h-5 text-neutral-600" />
                <span>{category} Series Archive</span>
              </h1>
              {data && (
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                    {data.totalCount} Registered Releases
                  </span>
                  {data.minNumber > 0 && data.maxNumber > 0 && (
                    <span className="bg-neutral-100 text-neutral-700 border border-neutral-200 px-2 py-0.5 rounded-md font-mono">
                      Span: #{String(data.minNumber).padStart(3, "0")} &rarr; #{String(data.maxNumber).padStart(3, "0")}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              id="btn-header-search-source-website"
              onClick={() => handleSearchSourceWebsite()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              title="Search live source website directly for this code or category"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>Search Source Website</span>
            </button>

            <button
              id="btn-refresh-category-details"
              onClick={() => fetchCategoryDetails(page, searchQuery, selectedNumber, numberRange, sortMode)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Interactive Number-Wise Sequential Link Bar (1, 2, 3, 4, 5...) */}
        {data && data.allNumbers && data.allNumbers.length > 0 && (
          <div className="pt-3 border-t border-neutral-200 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Sequential Number Index (1, 2, 3, 4...):</span>
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  ({data.allNumbers.length} active numbers)
                </span>
              </div>

              {(selectedNumber !== null || numberRange !== null || searchQuery) && (
                <button
                  id="btn-clear-category-number-filter"
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 font-medium px-2 py-0.5 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Number Filter</span>
                </button>
              )}
            </div>

            {/* Range Presets Tabs */}
            {rangePresets.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => {
                    setSelectedNumber(null);
                    setNumberRange(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                    selectedNumber === null && numberRange === null
                      ? "bg-neutral-900 text-white font-bold shadow-2xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  All Numbers ({data.allNumbers.length})
                </button>
                {rangePresets.map((p) => {
                  const isActive = numberRange?.min === p.min && numberRange?.max === p.max;
                  return (
                    <button
                      key={p.label}
                      onClick={() => {
                        setSelectedNumber(null);
                        setNumberRange({ min: p.min, max: p.max });
                      }}
                      className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-neutral-900 text-white font-bold shadow-2xs"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sequential Numbers Link Strip */}
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
              {data.allNumbers.map((numItem) => {
                const isSelected = selectedNumber === numItem.number;
                return (
                  <button
                    key={`${category}-${numItem.number}`}
                    id={`btn-number-${numItem.number}`}
                    onClick={() => handleNumberClick(numItem.number)}
                    title={`${numItem.code}: ${numItem.title || "Video entry"}`}
                    className={`px-2 py-1 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                      isSelected
                        ? "bg-emerald-600 text-white ring-2 ring-emerald-600 ring-offset-1 scale-105"
                        : "bg-white text-neutral-800 border border-neutral-300 hover:border-neutral-900 hover:bg-neutral-100 hover:text-neutral-900"
                    }`}
                  >
                    <span>{numItem.number}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  </button>
                );
              })}
            </div>

            {/* Missing Code Numbers Sequence Tracker */}
            {missingNumbers.length > 0 && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2.5 mt-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-amber-100 text-amber-800">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold text-amber-900">
                      Missing Sequence Detector:
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[11px] font-mono font-bold">
                      {missingNumbers.length} Missing Numbers ({category}-#{String(missingNumbers[0]?.number).padStart(3, "0")} &rarr; #{String(missingNumbers[missingNumbers.length - 1]?.number).padStart(3, "0")})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-white/90 border border-amber-300 rounded-lg p-1 shadow-2xs">
                      <span className="text-[11px] font-bold text-amber-900 px-1.5 whitespace-nowrap">
                        Batch:
                      </span>
                      {[25, 50, 60, 100, 200].map((size) => (
                        <button
                          key={size}
                          type="button"
                          id={`btn-batch-limit-${size}`}
                          onClick={() => setBatchLimit(size)}
                          disabled={searchMissingLoading}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                            batchLimit === size
                              ? "bg-amber-600 text-white shadow-2xs"
                              : "bg-amber-50/80 hover:bg-amber-100 text-amber-900 border border-amber-200/80"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                      <button
                        type="button"
                        id="btn-batch-limit-all"
                        onClick={() => setBatchLimit(missingNumbers.length)}
                        disabled={searchMissingLoading}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                          batchLimit === missingNumbers.length
                            ? "bg-amber-600 text-white shadow-2xs"
                            : "bg-amber-50/80 hover:bg-amber-100 text-amber-900 border border-amber-200/80"
                        }`}
                      >
                        All ({missingNumbers.length})
                      </button>
                    </div>

                    <button
                      id="btn-start-missing-numbers-search"
                      onClick={() => handleFindMissing()}
                      disabled={searchMissingLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-200" />
                      <span>Search & Auto-Harvest ({Math.min(batchLimit, missingNumbers.length)})</span>
                    </button>
                  </div>
                </div>

                {/* Scrollable Missing Numbers Chips */}
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-white/80 rounded-lg border border-amber-200/60">
                  {missingNumbers.slice(0, 100).map((m) => (
                    <button
                      key={`missing-${m.code}`}
                      id={`btn-missing-${m.number}`}
                      onClick={() => handleFindMissing([m.number])}
                      title={`Click to search source for missing release ${m.code}`}
                      className="px-2 py-0.5 rounded border border-dashed border-amber-400 bg-amber-50 hover:bg-amber-100 hover:border-amber-600 text-amber-900 font-mono text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>{m.code}</span>
                      <Search className="w-2.5 h-2.5 text-amber-600 opacity-70" />
                    </button>
                  ))}
                  {missingNumbers.length > 100 && (
                    <span className="text-[11px] text-amber-700 font-mono self-center px-1">
                      +{missingNumbers.length - 100} more missing
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and View Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input with Search Database & Search Source Website Buttons */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              id="input-search-within-category"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Enter ${category} code or number (e.g. ${category}-001, 12)...`}
              className="w-full pl-9 pr-8 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 font-mono font-medium transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  fetchCategoryDetails(1, "", selectedNumber, numberRange, sortMode);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="submit"
              id="btn-search-code-db"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold border border-neutral-300 transition-colors cursor-pointer"
              title="Search stored codes in local database"
            >
              <Search className="w-3.5 h-3.5 text-neutral-500" />
              <span>Search DB</span>
            </button>

            <button
              type="button"
              id="btn-search-code-source"
              onClick={() => handleSearchSourceWebsite()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              title="Search live source website directly for this code"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>Search Source Website</span>
            </button>
          </div>
        </form>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-600">
            <span className="hidden sm:inline">Sort:</span>
            <select
              id="select-category-sort"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="bg-neutral-50 border border-neutral-300 text-neutral-800 text-xs rounded-lg py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-neutral-500 cursor-pointer font-medium"
            >
              <option value="number_asc">Number Ascending (1, 2, 3...)</option>
              <option value="number_desc">Number Descending (999, 998...)</option>
              <option value="latest">Latest Added</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>

          {/* View Mode Switch */}
          <div className="flex items-center bg-neutral-100 border border-neutral-200 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("numbered-grid")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "numbered-grid"
                  ? "bg-white text-neutral-900 shadow-2xs font-bold"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
              title="Numbered Link Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white text-neutral-900 shadow-2xs font-bold"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
              title="Detailed Cards"
            >
              <Film className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-neutral-900 shadow-2xs font-bold"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
              title="Compact Table"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-xs text-neutral-500 font-mono">
            Showing {data?.items?.length || 0} of {data?.totalFound || 0}
          </div>
        </div>
      </div>

      {/* Top Pagination */}
      {data && data.totalPages > 1 && (
        <DatabasePagination
          idPrefix="category-db-pagination-top"
          currentPage={page}
          totalPages={data.totalPages}
          totalItems={data.totalFound}
          itemsPerPage={60}
          loading={loading}
          onPageChange={(targetPage) => fetchCategoryDetails(targetPage, searchQuery, selectedNumber, numberRange, sortMode)}
        />
      )}

      {/* Results Content */}
      {loading ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-400 shadow-xs">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-neutral-600" />
          <p className="text-xs font-medium text-neutral-700">Loading {category} numbered catalog...</p>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-400 shadow-xs space-y-3">
          <Search className="w-8 h-8 mx-auto text-neutral-400" />
          <h3 className="text-sm font-bold text-neutral-800">No releases found in {category}</h3>
          <p className="text-xs text-neutral-500">
            {selectedNumber !== null
              ? `No release registered with number #${selectedNumber}.`
              : "Try adjusting your search query or number filter."}
          </p>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium cursor-pointer shadow-2xs"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "numbered-grid" ? (
        /* NUMBERED GRID VIEW (1, 2, 3, 4...) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.items.map((item) => (
            <div
              key={item.code}
              className="group bg-white border border-neutral-200 hover:border-neutral-400 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
            >
              {/* Top Banner with Number badge & Code */}
              <div className="bg-neutral-900 text-white px-3.5 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-white font-mono font-extrabold text-xs">
                    #{item.number > 0 ? item.number : item.numberFormatted}
                  </span>
                  <span className="font-mono font-bold text-xs tracking-wider text-neutral-100">
                    {item.code}
                  </span>
                </div>
                {item.duration && (
                  <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.duration}
                  </span>
                )}
              </div>

              {/* Thumbnail / Poster */}
              <div className="relative aspect-video bg-neutral-950 overflow-hidden">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 bg-neutral-900 p-4 text-center">
                    <Film className="w-8 h-8 mb-1 opacity-50 text-neutral-500" />
                    <span className="text-[11px] font-mono text-neutral-400">{item.code}</span>
                  </div>
                )}

                {/* Overlay Action Button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    onClick={() => setHarvesterTarget(item.code)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-md flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Inspect Streams</span>
                  </button>
                  {item.postUrl && (
                    <a
                      href={item.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-white/90 hover:bg-white text-neutral-900 rounded-lg shadow-md transition-colors"
                      title="Open Source Post"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3
                    className="text-xs font-bold text-neutral-900 line-clamp-2 leading-snug group-hover:text-neutral-700 transition-colors"
                    title={item.title}
                  >
                    {item.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {item.actressName && (
                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px]">
                        <Users className="w-3 h-3 shrink-0" />
                        {item.actressName}
                      </span>
                    )}
                    {item.studioName && (
                      <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[120px]">
                        <Building2 className="w-3 h-3 shrink-0" />
                        {item.studioName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                  <span className="font-mono text-[10px]">
                    {item.releaseDate ? item.releaseDate : new Date(item.addedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => setHarvesterTarget(item.code)}
                    className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                  >
                    <span>Streams</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "cards" ? (
        /* DETAILED CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.items.map((item) => (
            <div
              key={item.code}
              className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs hover:border-neutral-400 transition-all flex flex-col"
            >
              <div className="relative aspect-video bg-neutral-950">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 bg-neutral-900 p-4">
                    <Film className="w-8 h-8 mb-1 opacity-50" />
                    <span className="text-xs font-mono">{item.code}</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-neutral-900/90 backdrop-blur-xs text-white px-2 py-0.5 rounded text-xs font-mono font-bold">
                  #{item.number > 0 ? item.number : item.numberFormatted} • {item.code}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-neutral-900 line-clamp-2" title={item.title}>
                    {item.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {item.actressName && (
                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded text-[11px] font-medium">
                        <Users className="w-3 h-3" />
                        {item.actressName}
                      </span>
                    )}
                    {item.studioName && (
                      <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded text-[11px] font-medium">
                        <Building2 className="w-3 h-3" />
                        {item.studioName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {item.releaseDate || new Date(item.addedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => setHarvesterTarget(item.code)}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* COMPACT TABLE VIEW */
        <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3"># No.</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Title / Subject</th>
                  <th className="px-4 py-3">Actress</th>
                  <th className="px-4 py-3">Studio</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.items.map((item) => (
                  <tr key={item.code} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-neutral-900 text-white font-mono font-bold text-[11px]">
                        #{item.number > 0 ? item.number : item.numberFormatted}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-neutral-900">
                      {item.code}
                    </td>
                    <td className="px-4 py-3 max-w-[280px] truncate text-neutral-700 font-medium">
                      {item.title}
                    </td>
                    <td className="px-4 py-3">
                      {item.actressName ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          <Users className="w-3 h-3" />
                          {item.actressName}
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.studioName ? (
                        <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          <Building2 className="w-3 h-3" />
                          {item.studioName}
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-neutral-500">
                      {item.releaseDate || new Date(item.addedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => setHarvesterTarget(item.code)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                        title="Inspect Streams"
                      >
                        <Download className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                      {item.postUrl && (
                        <a
                          href={item.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center p-1 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Open Source Link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Pagination */}
      {data && data.totalPages > 1 && (
        <DatabasePagination
          idPrefix="category-db-pagination-bottom"
          currentPage={page}
          totalPages={data.totalPages}
          totalItems={data.totalFound}
          itemsPerPage={60}
          loading={loading}
          onPageChange={(targetPage) => fetchCategoryDetails(targetPage, searchQuery, selectedNumber, numberRange, sortMode)}
        />
      )}

      {/* Media Harvester Modal */}
      <MediaHarvesterModal
        isOpen={!!harvesterTarget}
        onClose={() => setHarvesterTarget(null)}
        postUrlOrCode={harvesterTarget}
      />

      {/* Missing Numbers Auto-Harvest Search Modal */}
      {showMissingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-neutral-900">
                      Missing Sequence Recovery: {category}
                    </h2>
                    {searchMissingLoading ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold font-mono border border-emerald-300 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        LIVE STREAMING
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-bold font-mono border border-neutral-200">
                        SEARCH COMPLETED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Real-time online directory scraper & database registration workflow
                  </p>
                </div>
              </div>

              {!searchMissingLoading && (
                <button
                  onClick={() => setShowMissingModal(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Progress & Current Status Bar */}
              <div className="p-3.5 bg-neutral-900 text-white rounded-xl space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <RefreshCw className={`w-3.5 h-3.5 ${searchMissingLoading ? "animate-spin text-amber-400" : "text-emerald-400"}`} />
                    <span className="font-bold text-neutral-200">
                      {searchMissingLoading
                        ? `Processing missing sequence search (${progressPct}%)`
                        : "Search & harvest sequence complete"}
                    </span>
                  </div>
                  {currentSearchingCode && searchMissingLoading && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[11px] font-mono font-bold">
                      Current Code: {currentSearchingCode}
                    </span>
                  )}
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden relative">
                  <div
                    className="bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-300 relative"
                    style={{ width: `${Math.max(3, progressPct)}%` }}
                  >
                    {searchMissingLoading && (
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>

              {/* Real-time Console Log Box */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-md flex flex-col">
                {/* Console Bar Header */}
                <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold font-mono text-slate-200">Execution Console Log</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                      {logs.length} events
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAutoScroll(!autoScroll)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                        autoScroll ? "bg-emerald-950 text-emerald-400 border border-emerald-700/50" : "bg-slate-800 text-slate-400"
                      }`}
                      title="Toggle auto-scroll to latest log entries"
                    >
                      {autoScroll ? "Auto-Scroll: ON" : "Auto-Scroll: OFF"}
                    </button>

                    <button
                      onClick={copyConsoleLogs}
                      disabled={logs.length === 0}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors cursor-pointer disabled:opacity-40"
                      title="Copy all execution logs"
                    >
                      {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => setLogs([])}
                      disabled={logs.length === 0}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer disabled:opacity-40"
                      title="Clear console logs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Console Output Body */}
                <div className="p-3.5 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                  {logs.length === 0 ? (
                    <div className="text-slate-500 py-6 text-center italic text-xs">
                      Initializing stream connection to server log pipeline...
                    </div>
                  ) : (
                    logs.map((log) => {
                      let levelBadge = (
                        <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800 text-[10px] font-bold">
                          INFO
                        </span>
                      );
                      let textColor = "text-slate-300";

                      if (log.level === "success") {
                        levelBadge = (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                            SUCCESS
                          </span>
                        );
                        textColor = "text-emerald-300 font-medium";
                      } else if (log.level === "warning") {
                        levelBadge = (
                          <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold">
                            WARN
                          </span>
                        );
                        textColor = "text-amber-300";
                      } else if (log.level === "error") {
                        levelBadge = (
                          <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-bold">
                            ERROR
                          </span>
                        );
                        textColor = "text-rose-300 font-bold";
                      } else if (log.level === "complete") {
                        levelBadge = (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-extrabold text-[10px]">
                            DONE
                          </span>
                        );
                        textColor = "text-emerald-200 font-bold";
                      }

                      return (
                        <div key={log.id} className="flex items-start gap-2 border-b border-slate-900/60 pb-1">
                          <span className="text-slate-500 shrink-0 text-[10px]">{log.timestamp}</span>
                          <span className="shrink-0">{levelBadge}</span>
                          <span className={`break-all ${textColor}`}>{log.message}</span>
                        </div>
                      );
                    })
                  )}
                  {searchMissingLoading && (
                    <div className="flex items-center gap-2 text-amber-400 pt-1 text-[11px] animate-pulse">
                      <span>&gt;</span>
                      <span>Searching online registry & extracting media tags...</span>
                    </div>
                  )}
                  <div ref={consoleBottomRef} />
                </div>
              </div>

              {/* Real-time Discovered Releases Stream */}
              {liveFoundItems.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Live Discovered Releases ({liveFoundItems.length})</span>
                    </h4>
                    <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Ingesting into database
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
                    {liveFoundItems.map((item: any) => (
                      <div
                        key={`live-${item.code}`}
                        className="p-2.5 bg-white border border-neutral-200 rounded-xl flex items-center gap-3 shadow-2xs hover:border-emerald-300 transition-colors"
                      >
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 object-cover rounded-lg shrink-0 border border-neutral-200"
                          />
                        ) : (
                          <div className="w-11 h-11 bg-neutral-900 rounded-lg flex items-center justify-center shrink-0 text-white font-mono text-[10px] font-bold">
                            {item.code}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-neutral-900 text-white font-mono text-[10px] font-bold">
                              {item.code}
                            </span>
                            {item.duration && (
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {item.duration}
                              </span>
                            )}
                          </div>
                          <h5 className="text-xs font-semibold text-neutral-900 truncate mt-0.5">
                            {item.title}
                          </h5>
                          {item.actress && (
                            <span className="text-[10px] text-rose-600 font-medium truncate block">
                              {item.actress}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Final Metric Summary (When stream finishes) */}
              {!searchMissingLoading && missingSearchReport && (
                <div className="space-y-3 pt-2 border-t border-neutral-200">
                  {missingSearchReport.success ? (
                    <>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                          <div className="text-[11px] font-medium text-neutral-500">Searched Targets</div>
                          <div className="text-lg font-extrabold text-neutral-900 font-mono">
                            {missingSearchReport.searchedCount}
                          </div>
                        </div>
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <div className="text-[11px] font-medium text-emerald-700">Found & Saved</div>
                          <div className="text-lg font-extrabold text-emerald-700 font-mono">
                            {missingSearchReport.foundCount}
                          </div>
                        </div>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <div className="text-[11px] font-medium text-amber-800">Unreleased / Missing</div>
                          <div className="text-lg font-extrabold text-amber-800 font-mono">
                            {missingSearchReport.stillMissingCount}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{missingSearchReport.message}</span>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{missingSearchReport.error || "An error occurred during missing number recovery."}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!searchMissingLoading && (
              <div className="pt-3 border-t border-neutral-200 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-neutral-500 font-mono">
                  {logs.length > 0 ? `Logged ${logs.length} step events` : "Completed"}
                </span>

                <div className="flex items-center gap-2">
                  {missingSearchReport?.stillMissingCount > 0 && (
                    <button
                      onClick={() => handleFindMissing()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-2xs transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-200" />
                      <span>Search Next Batch ({Math.min(batchLimit, missingSearchReport.stillMissingCount)})</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowMissingModal(false)}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-2xs transition-all"
                  >
                    Close & View Updated Catalog
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
