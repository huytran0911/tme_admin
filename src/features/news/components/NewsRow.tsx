"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { SaveActionButton, EditActionButton, DeleteActionButton } from "@/components/shared";
import { getMediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/utils";
import type { NewsListItem } from "../types";
import { NewsStatus, NewsStatusLabels } from "../types";

type NewsRowProps = {
  item: NewsListItem;
  checked: boolean;
  editBasePath?: string;
  onToggle: (id: number) => void;
  onChange: (item: NewsListItem) => void;
  onSave: (item: NewsListItem) => void;
  onDelete: (item: NewsListItem) => void;
};

export function NewsRow({
  item,
  checked,
  editBasePath = "/news",
  onToggle,
  onChange,
  onSave,
  onDelete,
}: NewsRowProps) {
  const [draft, setDraft] = useState<NewsListItem>(item);

  useEffect(() => {
    setDraft(item);
  }, [item]);

  const updateField = <K extends keyof NewsListItem>(key: K, value: NewsListItem[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onChange(next);
    // Auto-check when there's a change
    if (!checked) {
      onToggle(item.id);
    }
  };

  const toggleStatus = () => {
    const newStatus = draft.status === NewsStatus.ACTIVE ? NewsStatus.HIDDEN : NewsStatus.ACTIVE;
    updateField("status", newStatus);
  };

  return (
    <tr className="border-b border-slate-100 last:border-0">
      {/* Checkbox */}
      <td className="px-2 py-1.5">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
          checked={checked}
          onChange={() => onToggle(item.id)}
        />
      </td>

      {/* Image */}
      <td className="px-2 py-1.5">
        <div className="h-10 w-14 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
          {item.image ? (
            <img
              src={getMediaUrl(item.image)}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
              No img
            </div>
          )}
        </div>
      </td>

      {/* Title */}
      <td className="min-w-0 px-2 py-1.5">
        <div className="flex flex-col">
          <Link
            href={`${editBasePath}/${item.id}/edit`}
            className="truncate text-sm font-medium text-slate-900 hover:text-emerald-600"
          >
            {item.name}
          </Link>
          {item.nameEn && (
            <span className="truncate text-xs text-slate-500">{item.nameEn}</span>
          )}
        </div>
      </td>

      {/* Status - Toggle button */}
      <td className="px-2 py-1.5">
        <button
          type="button"
          onClick={toggleStatus}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
            draft.status === NewsStatus.ACTIVE
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-slate-200 text-slate-600 hover:bg-slate-300"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              draft.status === NewsStatus.ACTIVE ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />
          {NewsStatusLabels[draft.status] || "N/A"}
        </button>
      </td>

      {/* Sort - Inline edit */}
      <td className="px-2 py-1.5">
        <input
          type="number"
          value={draft.sort}
          onChange={(e) => updateField("sort", Number(e.target.value))}
          className="tme-input w-16 text-center"
        />
      </td>

      {/* View count */}
      <td className="px-2 py-1.5 text-center text-sm text-slate-600">
        {item.view}
      </td>

      {/* Date added */}
      <td className="px-2 py-1.5 text-sm text-slate-600">
        {formatDate(item.dateAdded, "dd/MM/yyyy")}
      </td>

      {/* Actions */}
      <td className="px-2 py-1.5 text-right">
        <div className="flex justify-end gap-1.5">
          <SaveActionButton
            label="Cập nhật"
            onClick={() => onSave(draft)}
            disabled={!checked}
          />
          <Link href={`${editBasePath}/${item.id}/edit`}>
            <EditActionButton
              label="Sửa"
              onClick={() => {}}
            />
          </Link>
          <DeleteActionButton
            onClick={() => onDelete(item)}
          />
        </div>
      </td>
    </tr>
  );
}
