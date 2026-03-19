"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import type { NewsListItem } from "@/features/news/types";
import { NewsStatus, NewsStatusLabels } from "@/features/news/types";
import { getMediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/utils";

type NewsTableProps = {
  items: NewsListItem[];
  loading?: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onInlineUpdate: (id: number, data: { sort?: number; status?: number }) => Promise<void>;
  onDelete: (item: NewsListItem) => void;
};

type EditingCell = {
  id: number;
  field: "sort" | "status";
};

export function NewsTable({
  items,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onInlineUpdate,
  onDelete,
}: NewsTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleStartEdit = (id: number, field: "sort" | "status", currentValue: number) => {
    setEditingCell({ id, field });
    setEditValue(String(currentValue));
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;
    setSaving(true);
    try {
      const value = parseInt(editValue, 10);
      if (!isNaN(value)) {
        await onInlineUpdate(editingCell.id, { [editingCell.field]: value });
      }
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleToggleStatus = async (item: NewsListItem) => {
    const newStatus = item.status === NewsStatus.ACTIVE ? NewsStatus.HIDDEN : NewsStatus.ACTIVE;
    setSaving(true);
    try {
      await onInlineUpdate(item.id, { status: newStatus });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Đang tải danh sách tin tức...
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-base font-medium text-slate-900">Chưa có tin tức nào</p>
        <p className="mt-1 text-sm text-slate-500">
          Tạo tin tức mới để bắt đầu quản lý nội dung.
        </p>
      </div>
    );
  }

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="w-10 px-2 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500">Hình ảnh</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500">Tiêu đề</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500">Trạng thái</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500">Thứ tự</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500">Lượt xem</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500">Ngày tạo</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-500">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {items.map((item, index) => (
            <tr
              key={item.id}
              className={`${index % 2 === 1 ? "bg-slate-50/60" : ""} ${
                selectedIds.has(item.id) ? "bg-emerald-50/50" : ""
              }`}
            >
              <td className="px-2 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => onToggleSelect(item.id)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </td>
              <td className="px-4 py-3">
                <div className="h-12 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {item.image ? (
                    <Image
                      src={getMediaUrl(item.image)}
                      alt={item.name}
                      width={64}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      No img
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <Link
                    href={`/news/${item.id}/edit`}
                    className="font-medium text-slate-900 hover:text-sky-600"
                  >
                    {item.name}
                  </Link>
                  {item.nameEn && (
                    <span className="text-xs text-slate-500">{item.nameEn}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(item)}
                  disabled={saving}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                    item.status === NewsStatus.ACTIVE
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.status === NewsStatus.ACTIVE ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {NewsStatusLabels[item.status] || "Không xác định"}
                </button>
              </td>
              <td className="px-4 py-3">
                {editingCell?.id === item.id && editingCell.field === "sort" ? (
                  <input
                    ref={inputRef}
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleKeyDown}
                    className="w-16 rounded border border-emerald-300 bg-white px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    disabled={saving}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartEdit(item.id, "sort", item.sort)}
                    className="rounded px-2 py-1 text-slate-800 hover:bg-slate-100"
                    title="Click để sửa"
                  >
                    {item.sort}
                  </button>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">{item.view}</td>
              <td className="px-4 py-3 text-slate-600">
                {formatDate(item.dateAdded)}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/news/${item.id}/edit`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-sky-200 hover:bg-slate-50"
                  >
                    Sửa
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                  >
                    Xóa
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
