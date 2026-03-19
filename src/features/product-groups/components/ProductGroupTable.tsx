import { ProductGroupRow } from "./ProductGroupRow";
import type { ProductGroup } from "../types";

type ProductGroupTableProps = {
  groups: ProductGroup[];
  selectedIds: Set<number>;
  loading?: boolean;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onChangeGroup: (group: ProductGroup) => void;
  onSaveGroup: (group: ProductGroup) => void;
  onDeleteGroup: (group: ProductGroup) => void;
  onViewCategories?: (group: ProductGroup) => void;
  newGroup?: ProductGroup;
  onNewGroupChange?: (group: ProductGroup) => void;
  onCreateNew?: () => void;
  onCancelNew?: () => void;
};

export function ProductGroupTable({
  groups,
  selectedIds,
  loading,
  onToggleSelect,
  onToggleSelectAll,
  onChangeGroup,
  onSaveGroup,
  onDeleteGroup,
  onViewCategories,
  newGroup,
  onNewGroupChange,
  onCreateNew,
  onCancelNew,
}: ProductGroupTableProps) {
  const safeGroups = Array.isArray(groups) ? groups : [];
  const allSelected = safeGroups.length > 0 && selectedIds.size === safeGroups.length;

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Đang tải danh sách nhóm sản phẩm...
      </div>
    );
  }

  if (!safeGroups.length && !newGroup) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-base font-semibold text-slate-900">Chưa có nhóm sản phẩm</p>
        <p className="mt-1 text-sm text-slate-500">Thêm nhóm mới để bắt đầu tổ chức danh mục của bạn.</p>
      </div>
    );
  }

  return (
    <div className="tme-table-card">
      <div className="tme-table-wrapper">
        <table className="tme-table table-fixed">
          <thead className="tme-table-head">
            <tr>
              <th className="w-10 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Chọn tất cả"
                />
              </th>
              <HeaderCell label="Tên nhóm" />
              <HeaderCell label="Tên tiếng Anh" />
              <HeaderCell label="Hình ảnh" />
              <HeaderCell label="Kiểu hiển thị" />
              <HeaderCell label="Kiểu slide" />
              <HeaderCell label="Thứ tự" />
              <HeaderCell label="Thứ tự mới" />
              <HeaderCell label="Chức năng" className="w-[13%] text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {safeGroups.map((group) => (
              <ProductGroupRow
                key={group.id}
                group={group}
                checked={selectedIds.has(group.id)}
                onToggle={onToggleSelect}
                onChange={onChangeGroup}
                onSave={onSaveGroup}
                onDelete={onDeleteGroup}
                onViewCategories={onViewCategories}
              />
            ))}
            {newGroup && onNewGroupChange && onCreateNew && (
              <ProductGroupRow
                group={newGroup}
                checked
                onToggle={() => {}}
                onChange={onNewGroupChange}
                onSave={(_group) => onCreateNew()}
                onDelete={() => onCancelNew?.()}
                isNew
                onCancelNew={onCancelNew}
              />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderCell({ label, className }: { label: string; className?: string }) {
  return (
    <th className={`px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500 ${className || ""}`}>
      {label}
    </th>
  );
}


