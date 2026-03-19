"use client";

import { useEffect, useState } from "react";
import { SaveActionButton } from "@/components/shared";
import type { AppConfig } from "../types";

type AppConfigRowProps = {
  config: AppConfig;
  checked: boolean;
  onToggle: (id: number) => void;
  onChange: (config: AppConfig) => void;
  onSave: (config: AppConfig) => void;
};

export function AppConfigRow({
  config,
  checked,
  onToggle,
  onChange,
  onSave,
}: AppConfigRowProps) {
  const [draft, setDraft] = useState<AppConfig>(config);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const updateField = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onChange(next);
  };

  const isDirty = checked;

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-2 py-1.5">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
          checked={checked}
          onChange={() => onToggle(config.id)}
        />
      </td>

      {/* Code - read only */}
      <td className="min-w-0 px-2 py-1.5">
        <input
          value={draft.code}
          readOnly
          className="tme-input w-full bg-slate-50 text-slate-500 cursor-not-allowed"
          title="Code không được chỉnh sửa"
        />
      </td>

      {/* Name - editable */}
      <td className="min-w-0 px-2 py-1.5">
        <input
          value={draft.name}
          onChange={(e) => updateField("name", e.target.value)}
          className="tme-input w-full"
          placeholder="Tên cấu hình"
        />
      </td>

      {/* Value - editable */}
      <td className="min-w-0 px-2 py-1.5">
        <input
          value={draft.value}
          onChange={(e) => updateField("value", e.target.value)}
          className="tme-input w-full"
          placeholder="Giá trị"
        />
      </td>

      {/* Actions */}
      <td className="w-[10%] px-2 py-1.5 text-right">
        <div className="flex justify-end gap-1.5">
          <SaveActionButton
            label="Cập nhật"
            onClick={() => onSave(draft)}
            disabled={!isDirty}
          />
        </div>
      </td>
    </tr>
  );
}
