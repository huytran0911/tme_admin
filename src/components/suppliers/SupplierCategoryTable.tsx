import { SupplierCategoryRow } from "./SupplierCategoryRow";
import type { SupplierCategory } from "@/types/supplier-category";

type SupplierCategoryTableProps = {
  categories: SupplierCategory[];
  selectedIds: Set<number>;
  loading?: boolean;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onChangeCategory: (category: SupplierCategory) => void;
  onSaveCategory: (category: SupplierCategory) => void;
  onDeleteCategory: (category: SupplierCategory) => void;
  newCategory?: SupplierCategory;
  onNewCategoryChange?: (category: SupplierCategory) => void;
  onCreateNew?: () => void;
  onCancelNew?: () => void;
};

export function SupplierCategoryTable({
  categories,
  selectedIds,
  loading,
  onToggleSelect,
  onToggleSelectAll,
  onChangeCategory,
  onSaveCategory,
  onDeleteCategory,
  newCategory,
  onNewCategoryChange,
  onCreateNew,
  onCancelNew,
}: SupplierCategoryTableProps) {
  const safeCategories = Array.isArray(categories) ? categories : [];
  const allSelected = safeCategories.length > 0 && selectedIds.size === safeCategories.length;

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Đang tải danh sách danh mục nhà cung cấp...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      <div className="overflow-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
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
              <HeaderCell label="Tên Nhà Cung Cấp" />
              <HeaderCell label="Tên Tiếng Anh" />
              <HeaderCell label="Logo" />
              <th className="px-3 py-3 text-right text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                Chức năng
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {safeCategories.map((category) => (
              <SupplierCategoryRow
                key={category.id}
                category={category}
                checked={selectedIds.has(category.id)}
                onToggle={onToggleSelect}
                onChange={onChangeCategory}
                onSave={onSaveCategory}
                onDelete={onDeleteCategory}
              />
            ))}
            {newCategory && onNewCategoryChange && onCreateNew && (
              <SupplierCategoryRow
                category={newCategory}
                checked={false}
                onToggle={() => {}}
                onChange={onNewCategoryChange}
                onSave={onCreateNew}
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

function HeaderCell({ label }: { label: string }) {
  return (
    <th className="px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
      {label}
    </th>
  );
}
