"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
};

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 20, 30, 50],
  onPageChange,
  onPageSizeChange,
  className,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const pages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const range = new Set<number>();
    range.add(1);
    range.add(totalPages);

    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);

    for (let i = start; i <= end; i += 1) range.add(i);
    range.add(start - 1);
    range.add(end + 1);

    const sorted = Array.from(range).filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

    const result: (number | "...")[] = [];
    for (let i = 0; i < sorted.length; i += 1) {
      const curr = sorted[i];
      const prev = sorted[i - 1];
      if (prev && curr - prev > 1) {
        result.push("...");
      }
      result.push(curr);
    }
    return result;
  }, [currentPage, totalPages]);

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span>
          Trang {currentPage} / {totalPages} • Tổng {totalItems} bản ghi
        </span>
        {onPageSizeChange && (
          <label className="flex items-center gap-1 text-slate-600">
            • Hiển thị
            <select
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentPage <= 1}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-emerald-50 hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          « Trước
        </button>

        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-[11px] text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "min-w-[32px] rounded-md px-2 py-1 text-[11px] font-semibold transition",
                p === currentPage
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200",
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-emerald-50 hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sau »
        </button>
      </div>
    </div>
  );
};
