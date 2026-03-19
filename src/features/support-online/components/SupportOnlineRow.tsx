"use client";

import { useEffect, useState } from "react";
import { SaveActionButton, EditActionButton, DeleteActionButton } from "@/components/shared";
import type { SupportOnlineItem } from "../types";

type SupportOnlineRowProps = {
  item: SupportOnlineItem;
  checked: boolean;
  onToggle: (id: number) => void;
  onChange: (item: SupportOnlineItem) => void;
  onSave: (item: SupportOnlineItem) => void;
  onEdit: (item: SupportOnlineItem) => void;
  onDelete: (item: SupportOnlineItem) => void;
};

export function SupportOnlineRow({
  item,
  checked,
  onToggle,
  onChange,
  onSave,
  onEdit,
  onDelete,
}: SupportOnlineRowProps) {
  const [draft, setDraft] = useState<SupportOnlineItem>(item);

  useEffect(() => {
    setDraft(item);
  }, [item]);

  const updateField = <K extends keyof SupportOnlineItem>(key: K, value: SupportOnlineItem[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onChange(next);
    // Auto-check when there's a change
    if (!checked) {
      onToggle(item.id);
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
          onChange={() => onToggle(item.id)}
        />
      </td>

      {/* Name */}
      <td className="px-2 py-1.5">
        <div className="text-sm font-medium text-slate-900">
          {item.name || "-"}
        </div>
      </td>

      {/* Link / Yahoo ID */}
      <td className="px-2 py-1.5 text-sm text-slate-600">
        {item.link || "-"}
      </td>

      {/* Phone */}
      <td className="px-2 py-1.5 text-sm text-slate-600">
        {item.phone || "-"}
      </td>

      {/* Email - Inline edit */}
      <td className="px-2 py-1.5">
        <input
          type="email"
          value={draft.email ?? ""}
          onChange={(e) => updateField("email", e.target.value || null)}
          className="tme-input w-full"
          placeholder="Email..."
        />
      </td>

      {/* Sort - Inline edit */}
      <td className="px-2 py-1.5">
        <input
          type="number"
          value={draft.sort ?? 0}
          onChange={(e) => updateField("sort", Number(e.target.value) || null)}
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

      {/* Actions */}
      <td className="px-2 py-1.5 text-right">
        <div className="flex justify-end gap-1.5">
          <SaveActionButton
            label="Lưu"
            onClick={() => onSave(draft)}
            disabled={!checked}
          />
          <EditActionButton
            label="Sửa"
            onClick={() => onEdit(item)}
          />
          <DeleteActionButton
            onClick={() => onDelete(item)}
          />
        </div>
      </td>
    </tr>
  );
}
