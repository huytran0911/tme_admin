"use client";

import { useRouter } from "next/navigation";
import { ActionIconButton } from "@/components/shared/ActionIconButton";
import { EditActionButton } from "@/components/shared/EditActionButton";
import { formatDate } from "@/lib/utils";
import type { PaymentMethod } from "@/hooks/admin/usePaymentMethods";

type Props = {
  items: PaymentMethod[];
  isLoading: boolean;
  savingIds: Set<number>;
  selectedIds: Set<number>;
  onFieldChange: (id: number, field: "name" | "sort" | "status", value: string | number | boolean) => void;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onSaveRow: (id: number) => void;
  onDeleteRow: (id: number, name: string) => void;
  onCreate?: () => void;
  hasRowChanged: (item: PaymentMethod) => boolean;
};

export function PaymentMethodsTable({
  items,
  isLoading,
  savingIds,
  selectedIds,
  onFieldChange,
  onToggleSelect,
  onToggleSelectAll,
  onSaveRow,
  onDeleteRow,
  onCreate,
  hasRowChanged,
}: Props) {
  const router = useRouter();

  return (
    <div className="tme-table-card">
      <div className="tme-table-wrapper">
        <table className="tme-table">
          <thead className="tme-table-head">
            <tr>
              <th className="w-10 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={onToggleSelectAll}
                  aria-label="Chọn tất cả"
                />
              </th>
              <HeaderCell label="Tên phương thức" />
              <HeaderCell label="Thứ tự" className="w-24 text-center" />
              <HeaderCell label="Ẩn" className="w-16 text-center" />
              <HeaderCell label="Ngày tạo" />
              <HeaderCell label="Chức năng" className="text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <LoadingRows />
            ) : items.length ? (
              items.map((item) => {
                const saving = savingIds.has(item.id);
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.name}
                        disabled={saving}
                        onChange={(e) => onFieldChange(item.id, "name", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        className={`tme-input w-full text-sm ${saving ? "opacity-60" : ""}`}
                        placeholder="Tên phương thức"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        value={item.sort ?? 0}
                        disabled={saving}
                        onChange={(e) => onFieldChange(item.id, "sort", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        className={`tme-input w-20 text-center ${saving ? "opacity-60" : ""}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={item.status === 0}
                        onChange={(e) => onFieldChange(item.id, "status", e.target.checked)}
                        disabled={saving}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-600">{formatDate(item.createdAt, "dd/MM/yyyy") || "--"}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        <ActionIconButton
                          label="Cập nhật"
                          onClick={() => onSaveRow(item.id)}
                          disabled={saving || !hasRowChanged(item)}
                          variant="primary"
                          icon={
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path d="M16.78 5.72a.75.75 0 0 0-1.06-1.06l-7.25 7.25-3.19-3.2a.75.75 0 1 0-1.06 1.06l3.72 3.72a.75.75 0 0 0 1.06 0l7.78-7.77Z" />
                            </svg>
                          }
                        />
                        <EditActionButton label="Sửa" onClick={() => router.push(`/payment-methods/${item.id}`)} disabled={saving} />
                        <ActionIconButton
                          label="Xóa"
                          onClick={() => onDeleteRow(item.id, item.name)}
                          variant="danger"
                          icon={
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path d="M7.5 3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v.75h3.75a.75.75 0 0 1 0 1.5h-.57l-.7 9.06A2.25 2.25 0 0 1 12.74 17H7.26a2.25 2.25 0 0 1-2.24-2.19l-.7-9.06h-.57a.75.75 0 0 1 0-1.5H7.5V3.5Zm1.5.75h2V3.5h-2v.75Zm-3 1.5.68 8.83a.75.75 0 0 0 .75.67h5.14a.75.75 0 0 0 .75-.67l.68-8.83H6Z" />
                            </svg>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  Chưa có phương thức nào.{" "}
                  {onCreate ? (
                    <button className="text-emerald-600 underline" onClick={onCreate}>
                      Thêm phương thức đầu tiên
                    </button>
                  ) : null}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderCell({ label, className = "" }: { label: string; className?: string }) {
  return (
    <th className={`px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500 ${className}`}>
      {label}
    </th>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, idx) => (
        <tr key={idx} className="animate-pulse bg-slate-50/80">
          <td className="px-3 py-3">
            <div className="h-4 w-4 rounded bg-slate-200" />
          </td>
          <td className="px-3 py-3">
            <div className="h-4 w-40 rounded bg-slate-200" />
          </td>
          <td className="px-3 py-3 text-center">
            <div className="mx-auto h-4 w-14 rounded bg-slate-200" />
          </td>
          <td className="px-3 py-3 text-center">
            <div className="mx-auto h-4 w-6 rounded bg-slate-200" />
          </td>
          <td className="px-3 py-3">
            <div className="h-4 w-24 rounded bg-slate-200" />
          </td>
          <td className="px-3 py-3 text-right">
            <div className="ml-auto h-4 w-20 rounded bg-slate-200" />
          </td>
        </tr>
      ))}
    </>
  );
}
