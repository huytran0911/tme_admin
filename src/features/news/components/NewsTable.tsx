"use client";

import { NewsRow } from "./NewsRow";
import type { NewsListItem } from "../types";

type NewsTableProps = {
  items: NewsListItem[];
  selectedIds: Set<number>;
  loading?: boolean;
  editBasePath?: string;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onChangeItem: (item: NewsListItem) => void;
  onSaveItem: (item: NewsListItem) => void;
  onDeleteItem: (item: NewsListItem) => void;
};

export function NewsTable({
  items,
  selectedIds,
  loading,
  editBasePath = "/news",
  onToggleSelect,
  onToggleSelectAll,
  onChangeItem,
  onSaveItem,
  onDeleteItem,
}: NewsTableProps) {
  const safeItems = Array.isArray(items) ? items : [];
  const allSelected = safeItems.length > 0 && selectedIds.size === safeItems.length;

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Đang tải danh sách tin tức...
      </div>
    );
  }

  if (!safeItems.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-base font-semibold text-slate-900">Chưa có tin tức nào</p>
        <p className="mt-1 text-sm text-slate-500">
          Thêm tin tức mới để bắt đầu quản lý nội dung.
        </p>
      </div>
    );
  }

  return (
    <div className="tme-table-card">
      <div className="tme-table-wrapper">
        <table className="tme-table">
          <thead className="tme-table-head">
            <tr>
              <th className="w-10 px-2 py-3 text-left">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Chọn tất cả"
                />
              </th>
              <HeaderCell label="Hình ảnh" className="w-20" />
              <HeaderCell label="Tiêu đề" />
              <HeaderCell label="Trạng thái" className="w-28" />
              <HeaderCell label="Thứ tự" className="w-20" />
              <HeaderCell label="Lượt xem" className="w-24 text-center" />
              <HeaderCell label="Ngày tạo" className="w-28" />
              <HeaderCell label="Chức năng" className="w-32 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {safeItems.map((item) => (
              <NewsRow
                key={item.id}
                item={item}
                checked={selectedIds.has(item.id)}
                editBasePath={editBasePath}
                onToggle={onToggleSelect}
                onChange={onChangeItem}
                onSave={onSaveItem}
                onDelete={onDeleteItem}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderCell({ label, className }: { label: string; className?: string }) {
  return (
    <th
      className={`px-2 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500 ${className || ""}`}
    >
      {label}
    </th>
  );
}
