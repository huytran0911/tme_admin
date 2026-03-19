import { ProductGroupRow } from "./ProductGroupRow";
import type { ProductGroup } from "@/types/product-group";

type ProductGroupTableProps = {
  groups: ProductGroup[];
  selectedIds: Set<number>;
  loading?: boolean;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onChangeGroup: (group: ProductGroup) => void;
};

export function ProductGroupTable({
  groups,
  selectedIds,
  loading,
  onToggleSelect,
  onToggleSelectAll,
  onChangeGroup,
}: ProductGroupTableProps) {
  const safeGroups = Array.isArray(groups) ? groups : [];
  const allSelected = selectedIds.size === safeGroups.length;

  if (loading) {
    return <ProductGroupTableLoading />;
  }

  if (!safeGroups.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-base font-semibold text-slate-900">Chưa có nhóm sản phẩm</p>
        <p className="mt-1 text-sm text-slate-500">Tạo mới để bắt đầu quản lý các nhóm sản phẩm của bạn.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
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
              <HeaderCell label="Tên nhóm" className="w-[16%]" />
              <HeaderCell label="Tên tiếng Anh" className="w-[16%]" />
              <HeaderCell label="Hình ảnh" className="w-[10%]" />
              <HeaderCell label="Kiểu hiển thị" className="w-[12%]" />
              <HeaderCell label="Kiểu slide" className="w-[8%]" />
              <HeaderCell label="Thứ tự" className="w-[7%]" />
              <HeaderCell label="Thứ tự new" className="w-[7%]" />
              <HeaderCell label="Chức năng" className="w-[7%]" />
              {/* <th className="w-[7%] px-3 py-3 text-right text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                Chức năng
              </th> */}
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
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderCell({ label, className = "" }: { label: string; className?: string }) {
  return (
    <th
      className={`px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500 ${className}`}
    >
      {label}
    </th>
  );
}

function ProductGroupTableLoading() {
  const placeholders = Array.from({ length: 5 });

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm shadow-emerald-200/70"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-white to-slate-50" />
      <div className="relative space-y-8">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/90 text-emerald-500 shadow-inner shadow-emerald-100">
            <div className="absolute inset-2 rounded-full border border-emerald-100/80" />
            <div
              className="absolute inset-2 rounded-full border-4 border-transparent border-t-emerald-500/90 border-r-emerald-200 animate-spin"
              style={{ animationDuration: "1s" }}
              aria-hidden="true"
            />
            <div className="h-5 w-5 rounded-full bg-emerald-400/70 shadow-lg shadow-emerald-200/60" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">Dang tai danh sach nhom san pham</p>
            <p className="text-sm text-slate-500">Chuan bi du lieu moi nhat, vui long doi trong giay lat.</p>
          </div>
        </div>
        <div className="space-y-4">
          {placeholders.map((_, index) => (
            <div
              key={index}
              className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm shadow-slate-200/70"
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-5 w-5 rounded-md bg-slate-200/80" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded-full bg-slate-200/80" />
                  <div className="h-3 w-1/2 rounded-full bg-slate-100" />
                </div>
                <div className="hidden w-1/3 gap-2 md:flex">
                  <div className="h-3 flex-1 rounded-full bg-slate-100" />
                  <div className="h-3 flex-1 rounded-full bg-slate-200/70" />
                  <div className="h-3 flex-1 rounded-full bg-slate-100" />
                </div>
                <div className="ml-auto flex w-24 justify-end">
                  <div className="h-8 w-16 rounded-xl bg-slate-100" />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-60 animate-[pulse_2.4s_ease-in-out_infinite]" />
            </div>
          ))}
        </div>
      </div>
      <p className="sr-only">Dang tai, xin doi them chut.</p>
    </div>
  );
}
