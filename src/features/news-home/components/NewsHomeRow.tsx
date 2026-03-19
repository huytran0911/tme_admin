"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { SaveActionButton, DeleteActionButton } from "@/components/shared";
import { getMediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/utils";
import type { NewsHomeItem } from "../types";

type NewsHomeRowProps = {
  item: NewsHomeItem;
  checked: boolean;
  onToggle: (newsId: number) => void;
  onChange: (item: NewsHomeItem) => void;
  onSave: (item: NewsHomeItem) => void;
  onDelete: (item: NewsHomeItem) => void;
};

export function NewsHomeRow({
  item,
  checked,
  onToggle,
  onChange,
  onSave,
  onDelete,
}: NewsHomeRowProps) {
  const [draft, setDraft] = useState<NewsHomeItem>(item);

  useEffect(() => {
    setDraft(item);
  }, [item]);

  const updateField = <K extends keyof NewsHomeItem>(key: K, value: NewsHomeItem[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onChange(next);
    // Auto-check when there's a change
    if (!checked) {
      onToggle(item.newsId);
    }
  };

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
      {/* Checkbox */}
      <td className="px-2 py-1.5">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
          checked={checked}
          onChange={() => onToggle(item.newsId)}
        />
      </td>

      {/* News Name */}
      <td className="min-w-0 px-2 py-1.5">
        <div className="text-sm font-medium text-slate-900 line-clamp-2">
          {item.newsName || "-"}
        </div>
      </td>

      {/* Image */}
      <td className="px-2 py-1.5">
        <div className="h-10 w-14 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
          {item.newsImage ? (
            <img
              src={getMediaUrl(item.newsImage)}
              alt={item.newsName || ""}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
              No img
            </div>
          )}
        </div>
      </td>

      {/* Sort - Inline edit */}
      <td className="px-2 py-1.5">
        <input
          type="number"
          value={draft.sort ?? 0}
          onChange={(e) => updateField("sort", Number(e.target.value) || 0)}
          className="tme-input w-16 text-center"
        />
      </td>

      {/* Status - Checkbox (0 = hidden, 1 = visible) */}
      <td className="px-2 py-1.5 text-center">
        <input
          type="checkbox"
          checked={draft.status === 0}
          onChange={(e) => updateField("status", e.target.checked ? 0 : 1)}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
          title={draft.status === 0 ? "Đang ẩn" : "Đang hiển thị"}
        />
      </td>

      {/* Date added */}
      <td className="px-2 py-1.5 text-sm text-slate-600">
        {formatDate(item.dateAdded, "dd/MM/yyyy")}
      </td>

      {/* Actions */}
      <td className="px-2 py-1.5 text-right">
        <div className="flex justify-end gap-1.5">
          <SaveActionButton
            label="Lưu"
            onClick={() => onSave(draft)}
            disabled={!checked}
          />
          <DeleteActionButton
            onClick={() => onDelete(item)}
          />
        </div>
      </td>
    </tr>
  );
}
