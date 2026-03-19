"use client";

import { useEffect, useState } from "react";
import type { SupplierCategory } from "@/types/supplier-category";

type SupplierCategoryRowProps = {
  category: SupplierCategory;
  checked: boolean;
  onToggle: (id: number) => void;
  onChange: (category: SupplierCategory) => void;
  onSave: (category: SupplierCategory) => void;
  onDelete: (category: SupplierCategory) => void;
  isNew?: boolean;
  onCancelNew?: () => void;
};

export function SupplierCategoryRow({
  category,
  checked,
  onToggle,
  onChange,
  onSave,
  onDelete,
  isNew,
  onCancelNew,
}: SupplierCategoryRowProps) {
  const [editing, setEditing] = useState<boolean>(!!isNew);
  const [draft, setDraft] = useState<SupplierCategory>(category);

  useEffect(() => {
    if (!editing) {
      setDraft(category);
    }
  }, [category, editing]);

  const updateField = <K extends keyof SupplierCategory>(
    key: K,
    value: SupplierCategory[K],
  ) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onChange(next);
  };

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    if (isNew && onCancelNew) {
      onCancelNew();
      return;
    }
    setDraft(category);
    onChange(category);
    setEditing(false);
  };

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-3 py-3">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
          checked={checked}
          onChange={() => onToggle(category.id)}
        />
      </td>

      <td className="px-3 py-3">
        {editing ? (
          <input
            value={draft.nameVi}
            onChange={(e) => updateField("nameVi", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="Tên Nhà Cung Cấp"
          />
        ) : (
          <p className="text-sm font-semibold text-slate-900">{category.nameVi}</p>
        )}
      </td>

      <td className="px-3 py-3">
        {editing ? (
          <input
            value={draft.nameEn}
            onChange={(e) => updateField("nameEn", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="English name"
          />
        ) : (
          <p className="text-sm text-slate-700">{category.nameEn}</p>
        )}
      </td>

      <td className="px-3 py-3">
        {editing ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
              {draft.logoUrl ? (
                <img
                  src={draft.logoUrl}
                  alt={draft.nameVi}
                  className="h-full w-full object-cover"
                />
              ) : (
                "Logo"
              )}
            </div>
            <input
              value={draft.logoUrl ?? ""}
              onChange={(e) => updateField("logoUrl", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="https://..."
            />
          </div>
        ) : draft.logoUrl ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <img src={draft.logoUrl} alt={draft.nameVi} className="h-full w-full object-cover" />
            </div>
            <p className="truncate text-xs text-slate-500">{draft.logoUrl}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Chưa có</p>
        )}
      </td>

      <td className="px-3 py-3 text-right">
        <div className="flex justify-end gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(56,199,147,0.16)]"
              >
                {isNew ? "Thêm" : "Lưu"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Hủy
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Sửa
              </button>
              <button
                type="button"
                onClick={() => onDelete(category)}
                className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Xóa
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
