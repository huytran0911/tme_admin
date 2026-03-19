"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { SaveActionButton, DeleteActionButton, ActionIconButton } from "@/components/shared";
import { useToast } from "@/components/shared/Toast";
import { uploadProductGroupImage } from "../api";
import type { ProductGroup } from "../types";

type ProductGroupRowProps = {
  group: ProductGroup;
  checked: boolean;
  onToggle: (id: number) => void;
  onChange: (group: ProductGroup) => void;
  onSave: (group: ProductGroup) => void;
  onDelete: (group: ProductGroup) => void;
  isNew?: boolean;
  onCancelNew?: () => void;
  onViewCategories?: (group: ProductGroup) => void;
};

const SHOW_STYLE_OPTIONS = [
  { value: 0, label: "0 - Không hiển thị" },
  { value: 1, label: "1 - Kiểu List" },
  { value: 2, label: "2 - Kiểu Thumbnail" },
];

export function ProductGroupRow({
  group,
  checked,
  onToggle,
  onChange,
  onSave,
  onDelete,
  isNew,
  onCancelNew,
  onViewCategories,
}: ProductGroupRowProps) {
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<ProductGroup>(group);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setDraft(group);
  }, [group]);

  const updateField = <K extends keyof ProductGroup>(key: K, value: ProductGroup[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onChange(next);
  };

  const disabledCheckbox = Boolean(isNew);
  const checkboxChecked = isNew ? true : checked;
  const isDirty = !isNew && checked;

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductGroupImage(file);
      updateField("image", url);
      notify({ message: "Đã tải ảnh lên.", variant: "success" });
    } catch {
      notify({ message: "Tải ảnh thất bại.", variant: "error" });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-2 py-1.5">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200 disabled:opacity-50"
          checked={checkboxChecked}
          disabled={disabledCheckbox}
          onChange={() => !disabledCheckbox && onToggle(group.id)}
        />
      </td>

      <td className="min-w-0 px-2 py-1.5">
        <input
          value={draft.name}
          onChange={(e) => updateField("name", e.target.value)}
          className="tme-input w-full"
          placeholder="Tên nhóm"
        />
      </td>

      <td className="min-w-0 px-2 py-1.5">
        <input
          value={draft.nameEn}
          onChange={(e) => updateField("nameEn", e.target.value)}
          className="tme-input w-full"
          placeholder="English name"
        />
      </td>

      <td className="min-w-0 px-2 py-1.5">
        <input
          value={draft.image ?? ""}
          onChange={(e) => updateField("image", e.target.value)}
          onDoubleClick={openFilePicker}
          className="tme-input w-full"
          placeholder="https://..."
          disabled={uploading}
          title="Click đúp để upload ảnh"
        />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </td>

      <td className="px-2 py-1.5">
        <SelectField value={draft.showStyle} onChange={(val) => updateField("showStyle", val)} label="Kiểu hiển thị" options={SHOW_STYLE_OPTIONS} />
      </td>

      <td className="px-2 py-1.5">
        <SelectField value={draft.slideStyle} onChange={(val) => updateField("slideStyle", val)} label="Kiểu slide" />
      </td>

      <td className="px-2 py-1.5">
        <input
          type="number"
          value={draft.sort}
          onChange={(e) => updateField("sort", Number(e.target.value))}
          className="tme-input w-16"
        />
      </td>

      <td className="px-2 py-1.5">
        <input
          type="number"
          value={draft.sortNew}
          onChange={(e) => updateField("sortNew", Number(e.target.value))}
          className="tme-input w-16"
        />
      </td>

      <td className="w-[13%] px-2 py-1.5 text-right">
        <div className="flex justify-end gap-1.5">
          {isNew ? (
            <>
              <SaveActionButton
                label="Lưu"
                onClick={() => onSave(draft)}
              />
              <ActionIconButton
                label="Hủy"
                onClick={onCancelNew ?? (() => {})}
                variant="secondary"
                icon={
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M6.28 6.28a.75.75 0 0 1 1.06 0L10 8.94l2.66-2.66a.75.75 0 1 1 1.06 1.06L11.06 10l2.66 2.66a.75.75 0 1 1-1.06 1.06L10 11.06l-2.66 2.66a.75.75 0 1 1-1.06-1.06L8.94 10 6.28 7.34a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                }
              />
            </>
          ) : (
            <>
              <SaveActionButton
                label="Cập nhật"
                onClick={() => onSave(group)}
                disabled={!isDirty}
              />
              <DeleteActionButton
                onClick={() => onDelete(group)}
              />
              {onViewCategories && (
                <ActionIconButton
                  label="Xem danh mục"
                  onClick={() => onViewCategories(group)}
                  variant="ghost"
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M9.5 3a6.5 6.5 0 0 1 5.05 10.5l2.3 2.3a.75.75 0 0 1-1.06 1.06l-2.3-2.3A6.5 6.5 0 1 1 9.5 3Zm0 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" />
                    </svg>
                  }
                />
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function SelectField({
  value,
  onChange,
  label,
  options,
}: {
  value: number;
  onChange: (val: number) => void;
  label: string;
  options?: { value: number; label: string }[];
}) {
  const items = options ?? [
    { value: 0, label: "0" },
    { value: 1, label: "1" },
    { value: 2, label: "2" },
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full min-w-[4.75rem] rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 shadow-sm transition focus:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
      aria-label={label}
    >
      {items.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
