import { AppConfigRow } from "./AppConfigRow";
import type { AppConfig } from "../types";

type AppConfigTableProps = {
  configs: AppConfig[];
  selectedIds: Set<number>;
  loading?: boolean;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onChangeConfig: (config: AppConfig) => void;
  onSaveConfig: (config: AppConfig) => void;
};

export function AppConfigTable({
  configs,
  selectedIds,
  loading,
  onToggleSelect,
  onToggleSelectAll,
  onChangeConfig,
  onSaveConfig,
}: AppConfigTableProps) {
  const safeConfigs = Array.isArray(configs) ? configs : [];
  const allSelected = safeConfigs.length > 0 && selectedIds.size === safeConfigs.length;

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Đang tải danh sách cấu hình...
      </div>
    );
  }

  if (!safeConfigs.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-base font-semibold text-slate-900">Chưa có cấu hình nào</p>
        <p className="mt-1 text-sm text-slate-500">Danh sách cấu hình trống.</p>
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
              <HeaderCell label="Code" />
              <HeaderCell label="Tên cấu hình" />
              <HeaderCell label="Giá trị" />
              <HeaderCell label="Chức năng" className="text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {safeConfigs.map((config) => (
              <AppConfigRow
                key={config.id}
                config={config}
                checked={selectedIds.has(config.id)}
                onToggle={onToggleSelect}
                onChange={onChangeConfig}
                onSave={onSaveConfig}
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
      className={`px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500 ${className || ""}`}
    >
      {label}
    </th>
  );
}
