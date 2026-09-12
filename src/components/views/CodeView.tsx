import React, { useState, useEffect, useMemo } from "react";
import {
  Hash,
  ShieldAlert,
  CheckCircle2,
  Search,
  RefreshCw,
  XCircle,
  ExternalLink,
  Users,
  Building2,
  Calendar,
  Download,
  Sparkles,
  Layers,
  ChevronRight,
  FolderTree,
  Table,
  Film,
  Flame,
  ArrowRight
} from "lucide-react";
import { CodeSummary, CodeCategorySummary, NavView, NavParams } from "../../types";
import { MediaHarvesterModal } from "../modals/MediaHarvesterModal";
import { CodeCategoryDetailView } from "../code/CodeCategoryDetailView";
import { DatabasePagination } from "../common/DatabasePagination";
import { fetchWithRetry } from "../../utils/fetchWithRetry";

const MASTER_PREFIX_LIST = [
  "ABF", "ABP", "ABW", "ADN", "ATID", "CAWD", "CJOD", "CJOB", "CND", "COS",
  "DANDY", "DASS", "DASD", "EBOD", "EBWH", "FSD", "FSDSS", "GVH", "HND", "HNTR",
  "IPX", "IPZ", "IPZZ", "JUFE", "JUL", "JUQ", "JUR", "JUX", "KSBJ", "KTRA",
  "MIAA", "MIAB", "MIDE", "MIDV", "MEYD", "MIDD", "MIRD", "MIMK", "MIST", "MIDA",
  "MUKD", "NACR", "NATR", "NGOD", "NHDT", "NKKD", "NTRD", "NSPS", "PRED", "PPPD",
  "RCT", "RCTD", "REAL", "RKI", "ROE", "SNIS", "SSNI", "SSIS", "SONE", "STARS",
  "T28", "T45", "VEC", "VEMA", "VENX", "VENU", "WAAA"
];

interface CodeViewProps {
  onNavigate?: (view: NavView, params?: NavParams) => void;
}

type TabType = "categories" | "flat-table" | "inspector" | "codes";

export const CodeView: React.FC<CodeViewProps> = ({ onNavigate }) => {
  // Navigation State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedInitialNumber, setSelectedInitialNumber] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("categories");

  // Category Index State
  const [categories, setCategories] = useState<CodeCategorySummary[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryQuery, setCategoryQuery] = useState("");

  // Prefix Tab State
  const [prefixQuery, setPrefixQuery] = useState("");
  const [prefixSort, setPrefixSort] = useState<"count-desc" | "name-asc" | "count-asc">("count-desc");
  const [selectedLetter, setSelectedLetter] = useState<string>("ALL");

  // Flat Codes State
  const [codes, setCodes] = useState<CodeSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Live Code Checker
  const [checkInput, setCheckInput] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    code: string;
    normalizedCode: string;
    isValidFormat: boolean;
    isDuplicate: boolean;
    existingEntry?: CodeSummary;
  } | null>(null);

  // Media Harvester Modal
  const [harvesterTarget, setHarvesterTarget] = useState<string | null>(null);

  const fetchCategories = async () => {
    setCategoryLoading(true);
    try {
      const res = await fetchWithRetry("/api/codes/categories");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      } else if (Array.isArray(data.data)) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setCategoryLoading(false);
    }
  };

  const fetchCodes = async (targetPage = 1, query = searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: "50",
      });
      if (query.trim()) params.append("q", query.trim());

      const res = await fetchWithRetry(`/api/codes?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCodes(data.codes || []);
      setTotalCount(data.totalCount || 0);
      setTotalFound(data.totalFound || 0);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || 1);
    } catch (err) {
      console.error("Failed to load codes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchCodes(1, searchQuery);
  }, []);

  const handleCategoryClick = (cat: string, num: number | null = null) => {
    setSelectedCategory(cat);
    setSelectedInitialNumber(num);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCodes(1, searchQuery);
  };

  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInput.trim()) return;
    setCheckLoading(true);
    try {
      const res = await fetch(`/api/codes/check?code=${encodeURIComponent(checkInput.trim())}`);
      const data = await res.json();
      setCheckResult(data);
    } catch (err) {
      console.error("Failed to check code:", err);
    } finally {
      setCheckLoading(false);
    }
  };

  // Filtered categories
  const filteredCategories = categories.filter((cat) => {
    if (!categoryQuery.trim()) return true;
    const q = categoryQuery.toLowerCase().trim();
    return (
      cat.category.toLowerCase().includes(q) ||
      cat.sampleCodes.some((c) => c.toLowerCase().includes(q)) ||
      cat.topActresses.some((a) => a.name.toLowerCase().includes(q)) ||
      cat.topStudios.some((s) => s.name.toLowerCase().includes(q))
    );
  });

  // Filtered & Sorted Code Category Prefixes for Codes Tab
  const filteredPrefixes = useMemo(() => {
    const map = new Map<string, CodeCategorySummary>();

    // First add server categories
    for (const cat of categories) {
      if (cat.category) {
        map.set(cat.category.toUpperCase(), cat);
      }
    }

    // Ensure all master prefixes are included
    for (const prefix of MASTER_PREFIX_LIST) {
      if (!map.has(prefix)) {
        map.set(prefix, {
          category: prefix,
          totalCount: 0,
          minNumber: 1,
          maxNumber: 1,
          numberRangeFormatted: "#001",
          sampleCodes: [],
          sampleNumbers: [],
          topActresses: [],
          topStudios: [],
          sampleThumbnails: [],
          lastAddedAt: new Date().toISOString(),
        });
      }
    }

    let result = Array.from(map.values());

    if (prefixQuery.trim()) {
      const q = prefixQuery.toLowerCase().trim();
      result = result.filter((cat) => cat.category.toLowerCase().includes(q));
    }

    if (selectedLetter !== "ALL") {
      result = result.filter((cat) => cat.category.toUpperCase().startsWith(selectedLetter));
    }

    if (prefixSort === "count-desc") {
      result.sort((a, b) => b.totalCount - a.totalCount || a.category.localeCompare(b.category));
    } else if (prefixSort === "count-asc") {
      result.sort((a, b) => a.totalCount - b.totalCount || a.category.localeCompare(b.category));
    } else if (prefixSort === "name-asc") {
      result.sort((a, b) => a.category.localeCompare(b.category));
    }

    return result;
  }, [categories, prefixQuery, prefixSort, selectedLetter]);

  // If a category is selected, render the Category Detail Page!
  if (selectedCategory) {
    return (
      <CodeCategoryDetailView
        category={selectedCategory}
        initialNumber={selectedInitialNumber}
        onBack={() => {
          setSelectedCategory(null);
          setSelectedInitialNumber(null);
        }}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-neutral-900 dark:bg-white text-white dark:text-slate-900 tracking-wide">
                Database Index
              </span>
              <h1 className="text-xl font-extrabold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
                <Hash className="w-5 h-5 text-neutral-700 dark:text-slate-300" />
                <span>Code Registry & Category Series</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-refresh-code-registry"
              onClick={() => {
                fetchCategories();
                fetchCodes(page, searchQuery);
              }}
              disabled={categoryLoading || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-[#2b3a54] hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] text-xs font-medium text-neutral-700 dark:text-slate-300 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${categoryLoading || loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-200 dark:border-[#1e293b]">
          <button
            id="tab-categories"
            onClick={() => setActiveTab("categories")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "categories"
                ? "bg-neutral-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                : "bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700"
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Category-Wise Index ({categories.length} series)</span>
          </button>

          <button
            id="tab-flat-table"
            onClick={() => setActiveTab("flat-table")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "flat-table"
                ? "bg-neutral-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                : "bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700"
            }`}
          >
            <Table className="w-4 h-4" />
            <span>All Database Codes ({totalCount || codes.length})</span>
          </button>

          <button
            id="tab-inspector"
            onClick={() => setActiveTab("inspector")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "inspector"
                ? "bg-neutral-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                : "bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Syntax & Deduplication Checker</span>
          </button>

          <button
            id="tab-codes"
            onClick={() => setActiveTab("codes")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "codes"
                ? "bg-neutral-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                : "bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700"
            }`}
          >
            <Hash className="w-4 h-4 text-indigo-500" />
            <span>Codes</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CATEGORY-WISE INDEX (Grouped with Number links) */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          {/* Search Categories Bar */}
          <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500" />
              <input
                id="input-search-categories"
                type="text"
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                placeholder="Search category series (e.g. SSIS, ABP, IPX)..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-300 dark:border-[#2b3a54] rounded-lg focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors"
              />
            </div>
            <div className="text-xs text-neutral-500 dark:text-slate-400 font-mono">
              Showing {filteredCategories.length} of {categories.length} category series
            </div>
          </div>

          {/* Categories Grid */}
          {categoryLoading ? (
            <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl p-12 text-center text-neutral-400 dark:text-slate-500 shadow-xs">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-neutral-600 dark:text-slate-400" />
              <p className="text-xs font-medium text-neutral-700 dark:text-slate-300">Loading code categories from database...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl p-12 text-center text-neutral-400 dark:text-slate-500 shadow-xs">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-neutral-700 dark:text-slate-300">No categories found matching "{categoryQuery}".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCategories.map((cat) => (
                <div
                  key={cat.category}
                  className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] hover:border-neutral-400 dark:hover:border-slate-600 dark:border-slate-600 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  {/* Category Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCategoryClick(cat.category)}
                          className="px-3 py-1 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:bg-slate-200 text-white font-mono font-extrabold text-sm rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                        >
                          <span>{cat.category}</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                        </button>
                        <span className="text-xs font-bold text-neutral-700 dark:text-slate-300 bg-neutral-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                          {cat.totalCount} items
                        </span>
                      </div>
                      {cat.minNumber > 0 && cat.maxNumber > 0 && (
                        <span className="text-[11px] font-mono text-neutral-500 dark:text-slate-400 bg-neutral-50 dark:bg-[#0b101a] border border-neutral-200 dark:border-[#1e293b] px-2 py-0.5 rounded">
                          #{String(cat.minNumber).padStart(3, "0")} - #{String(cat.maxNumber).padStart(3, "0")}
                        </span>
                      )}
                    </div>

                    {/* Thumbnails preview strip */}
                    {cat.sampleThumbnails && cat.sampleThumbnails.length > 0 && (
                      <div className="grid grid-cols-3 gap-1.5 my-3 rounded-lg overflow-hidden bg-neutral-100 dark:bg-slate-800 p-1 border border-neutral-200 dark:border-[#1e293b]">
                        {cat.sampleThumbnails.slice(0, 3).map((thumb, idx) => (
                          <div key={idx} className="aspect-video bg-neutral-900 dark:bg-white rounded overflow-hidden relative">
                            <img
                              src={thumb}
                              alt={cat.category}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Interactive Number Pills */}
                    {cat.sampleNumbers && cat.sampleNumbers.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-slate-400 font-medium">
                          <span>Quick Numbers</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cat.sampleNumbers.map((num) => (
                            <button
                              key={num}
                              onClick={() => handleCategoryClick(cat.category, num)}
                              className="px-2 py-0.5 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-900 dark:bg-white hover:text-white text-neutral-700 dark:text-slate-300 rounded text-xs font-mono font-semibold transition-colors cursor-pointer border border-neutral-200 dark:border-[#1e293b]"
                              title={`Open ${cat.category} #${num}`}
                            >
                              {num}
                            </button>
                          ))}
                          {cat.totalCount > cat.sampleNumbers.length && (
                            <button
                              onClick={() => handleCategoryClick(cat.category)}
                              className="px-1.5 py-0.5 bg-neutral-50 dark:bg-[#0b101a] hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-500 dark:text-slate-400 rounded text-[11px] font-mono cursor-pointer"
                            >
                              +{cat.totalCount - cat.sampleNumbers.length} more...
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Top Actresses & Studios Tags */}
                    <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap gap-1.5">
                      {cat.topActresses.map((act) => (
                        <span
                          key={act.name}
                          className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-0.5 rounded text-[10px] font-medium"
                        >
                          <Users className="w-2.5 h-2.5" />
                          {act.name} ({act.count})
                        </span>
                      ))}
                      {cat.topStudios.map((stu) => (
                        <span
                          key={stu.name}
                          className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-100 px-1.5 py-0.5 rounded text-[10px] font-medium"
                        >
                          <Building2 className="w-2.5 h-2.5" />
                          {stu.name} ({stu.count})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Open Category Button */}
                  <button
                    id={`btn-open-category-${cat.category}`}
                    onClick={() => handleCategoryClick(cat.category)}
                    className="w-full py-2 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:bg-slate-200 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Browse {cat.category}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FLAT MASTER TABLE VIEW */}
      {activeTab === "flat-table" && (
        <div className="space-y-4">
          <DatabasePagination
            idPrefix="codes-flat-db-pagination-top"
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalFound}
            itemsPerPage={30}
            loading={loading}
            onPageChange={(targetPage) => fetchCodes(targetPage)}
          />

          <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <form onSubmit={handleSearchSubmit} className="relative max-w-md w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search registry by code or title..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-300 dark:border-[#2b3a54] rounded-lg focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-colors"
                />
              </form>
              <div className="text-xs text-neutral-500 dark:text-slate-400 font-mono shrink-0">
                Showing {codes.length} of {totalFound} results
              </div>
            </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-neutral-50 dark:bg-[#0b101a] border-b border-neutral-200 dark:border-[#1e293b] text-neutral-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Title / Subject</th>
                  <th className="px-4 py-3">Relations</th>
                  <th className="px-4 py-3">Added Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading && codes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-neutral-400 dark:text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading registry...
                    </td>
                  </tr>
                ) : codes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-neutral-400 dark:text-slate-500">
                      <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      No codes found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  codes.map((item, idx) => (
                    <tr key={`${item.code}-${idx}`} className="hover:bg-neutral-50 dark:hover:bg-[#1e293b] dark:bg-[#0b101a] transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-neutral-900 dark:text-white">
                        {item.code}
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-neutral-600 dark:text-slate-400">
                        {item.title || "Unknown Title"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.actressName && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-rose-100 truncate max-w-[100px]">
                              <Users className="w-3 h-3 shrink-0" />
                              {item.actressName}
                            </span>
                          )}
                          {item.studioName && (
                            <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-sky-100 truncate max-w-[100px]">
                              <Building2 className="w-3 h-3 shrink-0" />
                              {item.studioName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-neutral-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-neutral-400 dark:text-slate-500" />
                          {new Date(item.addedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => setHarvesterTarget(item.code)}
                          className="inline-flex items-center justify-center p-1.5 text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-slate-800 dark:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Inspect Streams"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {item.postUrl && (
                          <a
                            href={item.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-1.5 text-neutral-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Open Source"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          </div>

          <DatabasePagination
            idPrefix="codes-flat-db-pagination-bottom"
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalFound}
            itemsPerPage={30}
            loading={loading}
            onPageChange={(targetPage) => fetchCodes(targetPage)}
          />
        </div>
      )}

      {/* TAB 3: SYNTAX & DEDUPLICATION INSPECTOR */}
      {activeTab === "inspector" && (
        <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="p-4 bg-neutral-50 dark:bg-[#0b101a] rounded-xl border border-neutral-200 dark:border-[#1e293b] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Live Code Syntax & Deduplication Checker</span>
              </span>
              <span className="text-[11px] text-neutral-400 dark:text-slate-500 font-mono">
                Total in Master Index: {totalCount} unique codes
              </span>
            </div>

            <form onSubmit={handleCheckCode} className="flex gap-2">
              <input
                type="text"
                value={checkInput}
                onChange={(e) => setCheckInput(e.target.value)}
                placeholder="Enter code to verify (e.g., SSIS-001, moil_008)..."
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-[#2b3a54] bg-white dark:bg-[#101728] font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
              <button
                type="submit"
                disabled={checkLoading || !checkInput.trim()}
                className="px-4 py-2 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:bg-slate-200 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              >
                {checkLoading ? "Checking..." : "Verify Code"}
              </button>
            </form>

            {/* Checker Result Display */}
            {checkResult && (
              <div className="p-3 bg-white dark:bg-[#101728] rounded-lg border border-neutral-200 dark:border-[#1e293b] text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-neutral-900 dark:text-white">
                      Input: {checkResult.code}
                    </span>
                    &rarr;
                    <span className="font-mono text-neutral-600 dark:text-slate-400 bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Normalized: {checkResult.normalizedCode || "Invalid"}
                    </span>
                  </div>

                  {checkResult.isDuplicate ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-xs font-medium">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                        Duplicate Detected (Already Indexed)
                      </span>
                      <button
                        onClick={() => setHarvesterTarget(checkResult.normalizedCode || checkResult.code)}
                        className="inline-flex items-center gap-1 text-neutral-900 dark:text-white hover:underline font-medium text-xs ml-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        Inspect Streams
                      </button>
                    </div>
                  ) : !checkResult.isValidFormat ? (
                    <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs font-medium">
                      <XCircle className="w-3.5 h-3.5" />
                      Invalid Code Format
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Available (Unique & Safe to Ingest)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CODES PREFIX DIRECTORY */}
      {activeTab === "codes" && (
        <div className="space-y-5">
          {/* Top Info Banner & Search Controls */}
          <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500" />
                <input
                  id="input-search-prefix"
                  type="text"
                  value={prefixQuery}
                  onChange={(e) => setPrefixQuery(e.target.value)}
                  placeholder="Search code prefix (e.g. SSIS, IPX, MIDV)..."
                  className="w-full pl-9 pr-8 py-2 text-xs border border-neutral-300 dark:border-[#2b3a54] rounded-lg focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors font-mono font-bold"
                />
                {prefixQuery && (
                  <button
                    onClick={() => setPrefixQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500 hover:text-neutral-700 dark:text-slate-300 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-neutral-500 dark:text-slate-400 whitespace-nowrap">
                  Sort Prefixes:
                </span>
                <div className="flex bg-neutral-100 dark:bg-slate-800 p-0.5 rounded-lg border border-neutral-200 dark:border-[#1e293b]">
                  <button
                    onClick={() => setPrefixSort("count-desc")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                      prefixSort === "count-desc" ? "bg-white dark:bg-[#101728] text-neutral-900 dark:text-white shadow-2xs font-bold" : "text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:text-white"
                    }`}
                  >
                    Most Releases
                  </button>
                  <button
                    onClick={() => setPrefixSort("name-asc")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                      prefixSort === "name-asc" ? "bg-white dark:bg-[#101728] text-neutral-900 dark:text-white shadow-2xs font-bold" : "text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:text-white"
                    }`}
                  >
                    A-Z Alphabetical
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Letter Filter Bar */}
            <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-neutral-100 pb-1 scrollbar-thin">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase font-mono mr-1.5 shrink-0">
                Filter Letter:
              </span>
              {["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")].map((letter) => {
                const countForLetter = letter === "ALL"
                  ? MASTER_PREFIX_LIST.length
                  : MASTER_PREFIX_LIST.filter((p) => p.toUpperCase().startsWith(letter)).length;
                const hasPrefixes = countForLetter > 0;

                return (
                  <button
                    key={letter}
                    onClick={() => setSelectedLetter(letter)}
                    disabled={!hasPrefixes}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all shrink-0 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed ${
                      selectedLetter === letter
                        ? "bg-neutral-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                        : "bg-neutral-50 dark:bg-[#0b101a] hover:bg-neutral-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 border border-neutral-200 dark:border-[#1e293b]"
                    }`}
                    title={hasPrefixes ? `${countForLetter} prefix series` : "No prefixes found"}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 dark:text-slate-400 pt-1 border-t border-neutral-100">
              <span>Showing {filteredPrefixes.length} category prefixes</span>
              <span className="hidden sm:inline">Click any prefix button to open sequence manager & missing numbers</span>
            </div>
          </div>

          {/* Category Prefixes Grid */}
          {categoryLoading ? (
            <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl p-12 text-center text-neutral-400 dark:text-slate-500 shadow-xs">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-neutral-600 dark:text-slate-400" />
              <p className="text-xs font-medium text-neutral-700 dark:text-slate-300">Loading code category prefixes...</p>
            </div>
          ) : filteredPrefixes.length === 0 ? (
            <div className="bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl p-12 text-center text-neutral-400 dark:text-slate-500 shadow-xs space-y-2">
              <Search className="w-8 h-8 mx-auto text-neutral-300 dark:text-slate-500" />
              <p className="text-xs font-semibold text-neutral-700 dark:text-slate-300">No code category prefixes found matching filter.</p>
              <p className="text-[11px] text-neutral-500 dark:text-slate-400">Try clearing your search query or selecting "ALL" letters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredPrefixes.map((cat) => (
                <button
                  key={cat.category}
                  id={`btn-prefix-${cat.category}`}
                  onClick={() => handleCategoryClick(cat.category)}
                  className="bg-white dark:bg-[#101728] hover:bg-neutral-900 dark:bg-white text-neutral-900 dark:text-white hover:text-white border border-neutral-200 dark:border-[#1e293b] hover:border-neutral-900 rounded-xl p-3.5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1 w-full mb-2">
                    <span className="font-mono text-base font-extrabold tracking-wider group-hover:text-amber-400 transition-colors">
                      {cat.category}
                    </span>
                    <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-slate-500 group-hover:text-white transition-colors shrink-0" />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono w-full pt-1 border-t border-neutral-100 group-hover:border-neutral-800">
                    <span className="font-bold text-neutral-700 dark:text-slate-300 group-hover:text-neutral-200">
                      {cat.totalCount} items
                    </span>
                    {cat.minNumber > 0 && cat.maxNumber > 0 && (
                      <span className="text-[10px] text-neutral-400 dark:text-slate-500 group-hover:text-neutral-300 dark:text-slate-500">
                        #{cat.minNumber}-#{cat.maxNumber}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Media Harvester Modal */}
      <MediaHarvesterModal
        isOpen={!!harvesterTarget}
        onClose={() => setHarvesterTarget(null)}
        postUrlOrCode={harvesterTarget}
      />
    </div>
  );
};

