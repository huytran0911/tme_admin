"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toast";
import { DeleteSelectedButton, UpdateButton, AddNewButton } from "@/components/shared/ToolbarButton";
import { SaveActionButton } from "@/components/shared/SaveActionButton";
import { EditActionButton } from "@/components/shared/EditActionButton";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { ProductManagementPopup } from "@/components/sale-off/ProductManagementPopup";
import {
  fetchSaleOffs,
  updateSaleOff,
  deleteSaleOff,
} from "@/features/sale-off/api";
import type { SaleOff } from "@/features/sale-off/types";
import { Pagination } from "@/components/shared/Pagination";

type SaleOffDraft = SaleOff & { saving?: boolean };

export default function SaleOffPage() {
  const router = useRouter();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [items, setItems] = useState<SaleOffDraft[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Filter
  const [keyword, setKeyword] = useState("");
  const [keywordBuffer, setKeywordBuffer] = useState("");

  // Product management popup state
  const [productPopupOpen, setProductPopupOpen] = useState(false);
  const [selectedSaleOff, setSelectedSaleOff] = useState<SaleOff | null>(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await fetchSaleOffs({
        Page: page,
        PageSize: pageSize,
        Keyword: keyword || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
      setSelectedIds(new Set());
    } catch {
      notify({ message: "Không tải được danh sách.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, keyword]);

  const handleSearch = () => {
    setPage(1);
    setKeyword(keywordBuffer);
  };

  const markSaving = (id: number, saving: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev);
      saving ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const handleChangeField = (id: number, key: keyof SaleOff, value: any) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
    if (!selectedIds.has(id)) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  };

  const saveItem = async (item: SaleOff) => {
    markSaving(item.id, true);
    try {
      await updateSaleOff(item.id, {
        name: item.name,
        nameEn: item.nameEn || "",
        applyFrom: item.applyFrom || undefined,
        applyTo: item.applyTo || undefined,
        forever: item.forever,
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      notify({ message: "Đã lưu thành công.", variant: "success" });
    } catch {
      notify({ message: "Lưu thất bại.", variant: "error" });
    } finally {
      markSaving(item.id, false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  // Navigate to create page
  const handleCreate = () => {
    router.push("/sale-off/create");
  };

  // Navigate to edit page
  const handleEdit = (item: SaleOff) => {
    router.push(`/sale-off/${item.id}/edit`);
  };

  // Open product management popup
  const handleManageProducts = (item: SaleOff) => {
    setSelectedSaleOff(item);
    setProductPopupOpen(true);
  };

  const handleDelete = (item: SaleOff) => {
    confirm({
      title: "Xóa chiến dịch",
      description: `Bạn có chắc muốn xóa "${item.name}"?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          await deleteSaleOff(item.id);
          notify({ message: "Đã xóa.", variant: "success" });
          loadItems();
        } catch {
          notify({ message: "Xóa thất bại.", variant: "error" });
        }
      },
    });
  };

  const handleDeleteSelected = () => {
    if (!selectedIds.size) return;
    confirm({
      title: "Xóa chiến dịch",
      description: `Bạn có chắc muốn xóa ${selectedIds.size} chiến dịch đã chọn?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        const idsToDelete = Array.from(selectedIds);
        let successCount = 0;
        for (const id of idsToDelete) {
          try {
            await deleteSaleOff(id);
            successCount++;
          } catch {
            // ignore
          }
        }
        notify({ message: `Đã xóa ${successCount} chiến dịch.`, variant: "success" });
        loadItems();
      },
    });
  };

  const handleUpdateSelected = async () => {
    if (!selectedIds.size) return;
    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    for (const item of selectedItems) {
      await saveItem(item);
    }
  };

  const inputBase = "tme-input";

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Quản trị</p>
          <h1 className="text-xl font-semibold text-slate-900">Giảm giá sản phẩm</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Giảm giá sản phẩm" },
          ]}
          className="justify-end"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2">
          <DeleteSelectedButton count={selectedIds.size} onClick={handleDeleteSelected} disabled={selectedIds.size === 0} />
          <UpdateButton onClick={handleUpdateSelected} disabled={selectedIds.size === 0} />
          <AddNewButton onClick={handleCreate}>Tạo mới</AddNewButton>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={keywordBuffer}
            onChange={(e) => setKeywordBuffer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Tìm kiếm..."
            className="w-48 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
          <button
            onClick={handleSearch}
            className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Tìm
          </button>
        </div>
      </div>

      {/* Table */}
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
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  Tiêu đề
                </th>
                <th className="px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  Tiêu đề En
                </th>
                <th className="px-3 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  Từ ngày
                </th>
                <th className="px-3 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  Đến ngày
                </th>
                <th className="px-3 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  Mãi mãi
                </th>
                <th className="px-3 py-3 text-center text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  Cập nhật SP
                </th>
                <th className="px-3 py-3 text-right text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  Chức năng
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-5 text-center text-sm text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                    Chưa có chiến dịch nào.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const saving = savingIds.has(item.id);
                  const disabledClass = saving ? "opacity-60 bg-slate-50" : "";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.name}
                          disabled={saving}
                          onChange={(e) => handleChangeField(item.id, "name", e.target.value)}
                          className={`${inputBase} w-full ${disabledClass}`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.nameEn || ""}
                          disabled={saving}
                          onChange={(e) => handleChangeField(item.id, "nameEn", e.target.value)}
                          className={`${inputBase} w-full ${disabledClass}`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="date"
                          value={item.applyFrom ? item.applyFrom.split("T")[0] : ""}
                          disabled={saving || item.forever}
                          onChange={(e) => handleChangeField(item.id, "applyFrom", e.target.value)}
                          className={`${inputBase} w-36 text-center ${disabledClass}`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="date"
                          value={item.applyTo ? item.applyTo.split("T")[0] : ""}
                          disabled={saving || item.forever}
                          onChange={(e) => handleChangeField(item.id, "applyTo", e.target.value)}
                          className={`${inputBase} w-36 text-center ${disabledClass}`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={item.forever}
                          disabled={saving}
                          onChange={(e) => handleChangeField(item.id, "forever", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleManageProducts(item)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-emerald-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" />
                          </svg>
                          Quản lý SP
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <SaveActionButton
                            label="Cập nhật"
                            onClick={() => saveItem(item)}
                            disabled={!selectedIds.has(item.id) || saving}
                          />
                          <EditActionButton
                            label="Chỉnh sửa"
                            onClick={() => handleEdit(item)}
                          />
                          <DeleteActionButton
                            onClick={() => handleDelete(item)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
      )}

      {/* Info */}
      <div className="px-2 text-sm text-slate-500">
        Hiển thị {items.length} / {total} chiến dịch
      </div>

      {/* Product Management Popup */}
      {selectedSaleOff && (
        <ProductManagementPopup
          open={productPopupOpen}
          onClose={() => {
            setProductPopupOpen(false);
            setSelectedSaleOff(null);
          }}
          saleOffId={selectedSaleOff.id}
          saleOffName={selectedSaleOff.name}
        />
      )}

      {dialog}
    </div>
  );
}
