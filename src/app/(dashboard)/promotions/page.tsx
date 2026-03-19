"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchPromotions, fetchPromotionById, updatePromotion, deletePromotion } from "@/features/promotions/api";
import type { Promotion } from "@/features/promotions/types";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";
import { AddNewButton, UpdateButton, DeleteSelectedButton } from "@/components/shared/ToolbarButton";
import { Pagination } from "@/components/shared/Pagination";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { EditActionButton, DeleteActionButton, SaveActionButton } from "@/components/shared";

type PromotionDraft = Promotion & { saving?: boolean };

export default function PromotionsPage() {
  const router = useRouter();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [promotions, setPromotions] = useState<PromotionDraft[]>([]);
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

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const data = await fetchPromotions({
        Page: page,
        PageSize: pageSize,
        Keyword: keyword || undefined,
      });
      setPromotions(data.items);
      setTotal(data.total);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to fetch promotions:", err);
      notify({ message: "Không thể tải danh sách khuyến mãi.", variant: "error" });
      setPromotions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
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

  const handleChangeField = (id: number, key: keyof Promotion, value: any) => {
    setPromotions((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
    if (!selectedIds.has(id)) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  };

  const saveItem = async (item: Promotion) => {
    markSaving(item.id, true);
    try {
      // Fetch full detail to keep fields that are not editable inline
      const fullDetail = await fetchPromotionById(item.id);

      await updatePromotion(item.id, {
        name: item.name || undefined,
        nameEn: item.nameEn || undefined,
        description: fullDetail.description,
        descriptionEn: fullDetail.descriptionEn,
        content: fullDetail.content,
        contentEn: fullDetail.contentEn,
        applyFrom: item.applyFrom,
        applyTo: item.applyTo,
        saleOff: item.saleOff,
        isPercent: item.isPercent,
        freeTransportFee: item.freeTransportFee,
        applyForTotal: item.applyForTotal,
        sort: fullDetail.sort,
        forever: item.forever,
        popup: item.popup,
        image: fullDetail.image,
        point: fullDetail.point,
        menu: fullDetail.menu,
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      notify({ message: "Đã lưu thành công.", variant: "success" });
    } catch (err) {
      console.error("Failed to save promotion:", err);
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
    if (selectedIds.size === promotions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(promotions.map((item) => item.id)));
    }
  };

  const handleEdit = (item: Promotion) => {
    router.push(`/promotions/${item.id}/edit`);
  };

  const handleDelete = (promotion: Promotion) => {
    confirm({
      title: "Xóa khuyến mãi",
      description: `Bạn có chắc muốn xóa "${promotion.name}"?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          await deletePromotion(promotion.id);
          notify({ message: "Đã xóa khuyến mãi.", variant: "success" });
          loadPromotions();
        } catch (err) {
          console.error("Failed to delete promotion:", err);
          notify({ message: "Không thể xóa khuyến mãi.", variant: "error" });
        }
      },
    });
  };

  const handleDeleteSelected = () => {
    if (!selectedIds.size) return;
    confirm({
      title: "Xóa khuyến mãi",
      description: `Bạn có chắc muốn xóa ${selectedIds.size} khuyến mãi đã chọn?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        const idsToDelete = Array.from(selectedIds);
        let successCount = 0;
        for (const id of idsToDelete) {
          try {
            await deletePromotion(id);
            successCount++;
          } catch {
            // ignore
          }
        }
        notify({ message: `Đã xóa ${successCount} khuyến mãi.`, variant: "success" });
        loadPromotions();
      },
    });
  };

  const handleUpdateSelected = async () => {
    if (!selectedIds.size) return;
    const selectedItems = promotions.filter((item) => selectedIds.has(item.id));
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
          <h1 className="text-xl font-semibold text-slate-900">Chương trình khuyến mãi</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Khuyến mãi" },
          ]}
          className="justify-end"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2">
          <DeleteSelectedButton count={selectedIds.size} onClick={handleDeleteSelected} disabled={selectedIds.size === 0} />
          <UpdateButton onClick={handleUpdateSelected} disabled={selectedIds.size === 0} />
          <AddNewButton onClick={() => router.push("/promotions/create")}>Tạo mới</AddNewButton>
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
                    checked={promotions.length > 0 && selectedIds.size === promotions.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <HeaderCell label="Tiêu đề" />
                <HeaderCell label="Từ ngày" />
                <HeaderCell label="Đến ngày" />
                <HeaderCell label="Giá trị" className="text-right" />
                <HeaderCell label="%" className="text-center" />
                <HeaderCell label="Free ship" className="text-center" />
                <HeaderCell label="> Tổng tiền" className="text-right" />
                <HeaderCell label="Mãi mãi" className="text-center" />
                <HeaderCell label="Popup" className="text-center" />
                <HeaderCell label="Chức năng" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-5 text-center text-sm text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-sm text-slate-500">
                    Chưa có khuyến mãi nào.
                  </td>
                </tr>
              ) : (
                promotions.map((item) => {
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
                          value={item.name || ""}
                          disabled={saving}
                          onChange={(e) => handleChangeField(item.id, "name", e.target.value)}
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
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={item.saleOff}
                          disabled={saving}
                          onChange={(e) => handleChangeField(item.id, "saleOff", parseInt(e.target.value) || 0)}
                          className={`${inputBase} w-24 text-right ${disabledClass}`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={item.isPercent}
                          disabled={saving}
                          onChange={(e) => handleChangeField(item.id, "isPercent", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={item.freeTransportFee}
                          disabled={saving}
                          onChange={(e) => handleChangeField(item.id, "freeTransportFee", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={item.applyForTotal}
                          disabled={saving}
                          onChange={(e) => handleChangeField(item.id, "applyForTotal", parseInt(e.target.value) || 0)}
                          className={`${inputBase} w-24 text-right ${disabledClass}`}
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
                        <input
                          type="checkbox"
                          checked={item.popup}
                          disabled={saving}
                          onChange={(e) => handleChangeField(item.id, "popup", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                        />
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
        Hiển thị {promotions.length} / {total} khuyến mãi
      </div>

      {dialog}
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
