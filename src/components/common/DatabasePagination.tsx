import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface DatabasePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  idPrefix?: string;
  className?: string;
  showJumpToPage?: boolean;
}

export const DatabasePagination: React.FC<DatabasePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  loading = false,
  onPageChange,
  idPrefix = "db-pagination",
  className = "",
  showJumpToPage = true,
}) => {
  const [jumpPage, setJumpPage] = useState<string>("");

  if (totalPages <= 1 && (!totalItems || totalItems <= 0)) {
    return null;
  }

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpPage("");
    }
  };

  // Generate page numbers range for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  // Item range text
  let itemRangeText = "";
  if (totalItems !== undefined && itemsPerPage) {
    const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    itemRangeText = `Showing ${startItem.toLocaleString()}-${endItem.toLocaleString()} of ${totalItems.toLocaleString()} items`;
  } else if (totalItems !== undefined) {
    itemRangeText = `${totalItems.toLocaleString()} total items`;
  }

  return (
    <div
      id={idPrefix}
      className={`bg-white dark:bg-[#101728] border border-neutral-200 dark:border-[#1e293b] rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${className}`}
    >
      {/* Left side: Item count info */}
      <div className="flex items-center gap-2 text-neutral-500 dark:text-slate-400 font-mono text-[11px] sm:text-xs text-center sm:text-left">
        {itemRangeText ? (
          <span>{itemRangeText}</span>
        ) : (
          <span>
            Page <strong className="text-neutral-900 dark:text-white font-semibold">{currentPage}</strong> of{" "}
            <strong className="text-neutral-900 dark:text-white font-semibold">{totalPages}</strong>
          </span>
        )}
      </div>

      {/* Center: Pagination Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* First Page */}
        <button
          id={`${idPrefix}-first`}
          disabled={currentPage <= 1 || loading}
          onClick={() => onPageChange(1)}
          className="p-1.5 sm:p-2 border border-neutral-200 dark:border-[#1e293b] rounded-lg text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 hover:border-neutral-300 dark:hover:border-[#2b3a54] dark:border-[#2b3a54] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          id={`${idPrefix}-prev`}
          disabled={currentPage <= 1 || loading}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-2.5 sm:px-3 py-1.5 border border-neutral-200 dark:border-[#1e293b] rounded-lg text-xs font-medium text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 hover:border-neutral-300 dark:hover:border-[#2b3a54] dark:border-[#2b3a54] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-all cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 py-1 text-neutral-400 dark:text-slate-500 font-mono text-xs select-none"
                >
                  ...
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                id={`${idPrefix}-page-${p}`}
                disabled={loading}
                onClick={() => onPageChange(p as number)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center ${
                  isCurrent
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "bg-neutral-50 dark:bg-[#0b101a] border border-neutral-200 dark:border-[#1e293b] text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 hover:border-neutral-300 dark:hover:border-[#2b3a54] dark:border-[#2b3a54]"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          id={`${idPrefix}-next`}
          disabled={currentPage >= totalPages || loading}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-2.5 sm:px-3 py-1.5 border border-neutral-200 dark:border-[#1e293b] rounded-lg text-xs font-medium text-neutral-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 hover:border-neutral-300 dark:hover:border-[#2b3a54] dark:border-[#2b3a54] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-all cursor-pointer"
          title="Next Page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          id={`${idPrefix}-last`}
          disabled={currentPage >= totalPages || loading}
          onClick={() => onPageChange(totalPages)}
          className="p-1.5 sm:p-2 border border-neutral-200 dark:border-[#1e293b] rounded-lg text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800 hover:border-neutral-300 dark:hover:border-[#2b3a54] dark:border-[#2b3a54] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right side: Jump to Page Form */}
      {showJumpToPage && totalPages > 3 && (
        <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
          <span className="text-neutral-500 dark:text-slate-400 text-[11px] font-mono hidden md:inline">Go to:</span>
          <input
            id={`${idPrefix}-jump-input`}
            type="number"
            min={1}
            max={totalPages}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            placeholder="#"
            className="w-12 px-2 py-1 text-xs border border-neutral-300 dark:border-[#2b3a54] rounded-md bg-white dark:bg-[#101728] font-mono text-center focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
          <button
            type="submit"
            disabled={!jumpPage.trim() || loading}
            className="px-2 py-1 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-slate-200 disabled:opacity-40 text-white dark:text-slate-900 text-[11px] font-semibold rounded-md transition-colors cursor-pointer"
          >
            Go
          </button>
        </form>
      )}
    </div>
  );
};
