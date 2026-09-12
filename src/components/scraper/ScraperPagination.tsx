import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface ScraperPaginationProps {
  currentPage: number;
  totalPages?: number;
  hasNext: boolean;
  hasPrev: boolean;
  loading?: boolean;
  onPageChange: (page: number) => void;
  idPrefix?: string;
}

export const ScraperPagination: React.FC<ScraperPaginationProps> = ({
  currentPage,
  totalPages = 1,
  hasNext,
  hasPrev,
  loading = false,
  onPageChange,
  idPrefix = "scraper-pagination",
}) => {
  return (
    <div
      id={idPrefix}
      className="flex items-center justify-between gap-4 p-4 bg-white border border-neutral-200 rounded-xl"
    >
      <div className="flex items-center gap-1.5">
        <button
          id={`${idPrefix}-first`}
          disabled={!hasPrev || loading}
          onClick={() => onPageChange(1)}
          className="p-2 border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          id={`${idPrefix}-prev`}
          disabled={!hasPrev || loading}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-3.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>
      </div>

      <div className="text-xs font-semibold text-neutral-600">
        Page <span className="text-neutral-900">{currentPage}</span>
        {totalPages > 1 && (
          <>
            {" "}
            of <span className="text-neutral-900">{totalPages}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          id={`${idPrefix}-next`}
          disabled={!hasNext || loading}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3.5 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
        {totalPages > 1 && (
          <button
            id={`${idPrefix}-last`}
            disabled={!hasNext || loading || currentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            className="p-2 border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
