"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toast";
import { ProductTypeValuesDrawer } from "@/components/product-type-values/ProductTypeValuesDrawer";
import {
  DeleteSelectedButton,
  UpdateButton,
  AddNewButton,
} from "@/components/shared/ToolbarButton";
import {
  SaveActionButton,
  DeleteActionButton,
} from "@/components/shared";
import {
  fetchProductTypes,
  createProductType,
  updateProductType,
  deleteProductType,
} from "@/features/product-types/api";
import type {
  ProductType,
  UpdateProductTypeRequest,
} from "@/features/product-types/types";
import { formatDate } from "@/lib/utils";

type ProductTypeDraft = ProductType & { saving?: boolean; error?: boolean; isNew?: boolean };

function ProductTypesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();
  const [items, setItems] = useState<ProductTypeDraft[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [keywordBuffer, setKeywordBuffer] = useState("");
  const [newDraft, setNewDraft] = useState<ProductTypeDraft | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Filter items locally based on keyword, include newDraft at the top
  const filteredItems = useMemo(() => {
    let result = items;
    if (keywordBuffer.trim()) {
      const kw = keywordBuffer.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(kw) ||
          item.code?.toLowerCase().includes(kw)
      );
    }
    // Add new draft at the beginning if exists
    if (newDraft) {
      return [newDraft, ...result];
    }
    return result;
  }, [items, keywordBuffer, newDraft]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchProductTypes({ page: 1, pageSize: 9999 });
      const loadedItems = Array.isArray(data.items) ? data.items : [];
      setItems(loadedItems);
      setSelectedIds(new Set());
    } catch {
      setItems([]);
      setSelectedIds(new Set());
      notify({ message: "Không tải được danh sách phân loại sản phẩm.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle URL query param for drawer
  useEffect(() => {
    const viewValuesParam = searchParams.get("viewValues");
    if (viewValuesParam && items.length > 0) {
      const typeId = parseInt(viewValuesParam, 10);
      const type = items.find((item) => item.id === typeId);
      if (type) {
        setSelectedType({ id: type.id, name: type.name || "" });
        setDrawerOpen(true);
      }
    }
  }, [searchParams, items]);

  const markSaving = (id: number, saving: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev);
      saving ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const saveItem = async (item: ProductTypeDraft) => {
    // Handle new item creation
    if (item.isNew) {
      if (!item.name || item.name.trim() === "") {
        notify({ message: "Tên phân loại sản phẩm là bắt buộc.", variant: "error" });
        return;
      }

      markSaving(item.id, true);
      try {
        await createProductType({
          name: item.name.trim(),
          code: item.code?.trim() || undefined,
          isActive: item.isActive ?? true,
        });
        notify({ message: "Đã tạo phân loại sản phẩm mới.", variant: "success" });
        setNewDraft(null);
        // Reload to get the new item with real ID
        loadData();
      } catch {
        notify({ message: "Tạo phân loại sản phẩm thất bại.", variant: "error" });
      } finally {
        markSaving(item.id, false);
      }
      return;
    }

    // Handle existing item update
    markSaving(item.id, true);
    try {
      const payload: UpdateProductTypeRequest = {
        name: item.name ?? undefined,
        code: item.code ?? undefined,
        isActive: item.isActive,
      };
      await updateProductType(item.id, payload);
      // Deselect after successful save
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      notify({ message: "Đã lưu phân loại sản phẩm.", variant: "success" });
    } catch {
      notify({ message: "Lưu phân loại sản phẩm thất bại.", variant: "error" });
    } finally {
      markSaving(item.id, false);
    }
  };

  const handleChangeField = (
    id: number,
    key: keyof ProductType,
    value: any
  ) => {
    // Handle new draft changes
    if (newDraft && newDraft.id === id) {
      setNewDraft((prev) => (prev ? { ...prev, [key]: value } : null));
      return;
    }

    // Handle existing item changes
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
    // Auto-check when there's a change
    if (!selectedIds.has(id)) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  };

  const handleAddNew = () => {
    if (newDraft) {
      notify({ message: "Vui lòng hoàn thành hoặc hủy mục đang tạo.", variant: "error" });
      return;
    }

    // Create a new draft with temporary negative ID
    setNewDraft({
      id: -1,
      name: "",
      code: "",
      isActive: true,
      valuesCount: 0,
      createdAt: new Date().toISOString(),
      isNew: true,
    });
  };

  const handleCancelNew = () => {
    setNewDraft(null);
  };

  const handleOpenDrawer = (typeId: number, typeName: string) => {
    setSelectedType({ id: typeId, name: typeName });
    setDrawerOpen(true);
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("viewValues", typeId.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedType(null);
    // Remove query param
    const params = new URLSearchParams(searchParams.toString());
    params.delete("viewValues");
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.push(newUrl, { scroll: false });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.size) return;

    confirm({
      title: "Xóa phân loại sản phẩm",
      description: `Bạn có chắc muốn xóa ${selectedIds.size} phân loại sản phẩm đã chọn?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        const idsToDelete = Array.from(selectedIds);
        let successCount = 0;
        let failCount = 0;

        for (const id of idsToDelete) {
          try {
            await deleteProductType(id);
            successCount++;
          } catch {
            failCount++;
          }
        }

        // Remove deleted items from state
        setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
        setSelectedIds(new Set());

        if (failCount === 0) {
          notify({
            message: `Đã xóa ${successCount} phân loại sản phẩm.`,
            variant: "success",
          });
        } else {
          notify({
            message: `Xóa ${successCount}/${idsToDelete.length} phân loại sản phẩm. ${failCount} thất bại.`,
            variant: "error",
          });
        }

        // Reload to ensure consistency
        loadData();
      },
    });
  };

  const handleUpdateSelected = async () => {
    if (!selectedIds.size) return;

    const selectedItems = filteredItems.filter((item) =>
      selectedIds.has(item.id)
    );
    for (const item of selectedItems) {
      await saveItem(item);
    }
  };

  const handleDeleteSingle = (item: ProductType) => {
    confirm({
      title: "Xóa phân loại sản phẩm",
      description: `Bạn có chắc muốn xóa phân loại sản phẩm "${item.name}"?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          await deleteProductType(item.id);
          notify({ message: "Đã xóa phân loại sản phẩm.", variant: "success" });
          // Reload data from API
          await loadData();
        } catch {
          notify({
            message: "Xóa phân loại sản phẩm thất bại.",
            variant: "error",
          });
        }
      },
    });
  };

  const inputBase = "tme-input";

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Quản trị
          </p>
          <h1 className="text-xl font-semibold text-slate-900">
            Phân loại sản phẩm
          </h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Quản lý danh mục", href: "/catalog/product-groups" },
            { label: "Phân loại sản phẩm" },
          ]}
          className="justify-end"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2">
          <DeleteSelectedButton
            count={selectedIds.size}
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
          />
          <UpdateButton
            onClick={handleUpdateSelected}
            disabled={selectedIds.size === 0}
          />
          <AddNewButton onClick={handleAddNew}>
            Thêm phân loại sản phẩm
          </AddNewButton>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={keywordBuffer}
            onChange={(e) => setKeywordBuffer(e.target.value)}
            placeholder="Tìm theo tên hoặc mã..."
            className="w-48 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      <div className="tme-table-card">
        <div className="tme-table-wrapper">
          <table className="tme-table">
            <thead className="tme-table-head">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                    checked={
                      filteredItems.length > 0 &&
                      selectedIds.size === filteredItems.length
                    }
                    onChange={toggleSelectAll}
                    aria-label="Chọn tất cả"
                  />
                </th>
                <HeaderCell label="ID" className="text-center" />
                <HeaderCell label="Tên phân loại sản phẩm" />
                <HeaderCell label="Mã code" />
                <HeaderCell label="Trạng thái" className="text-center" />
                <HeaderCell label="Số giá trị" className="text-center" />
                <HeaderCell label="Ngày tạo" />
                <HeaderCell label="Chức năng" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-5 text-center text-sm text-slate-500"
                  >
                    Đang tải phân loại sản phẩm...
                  </td>
                </tr>
              ) : filteredItems.length ? (
                filteredItems.map((item) => {
                  const saving = savingIds.has(item.id);
                  const disabledClass = saving
                    ? "opacity-60 bg-slate-50"
                    : "";
                  const isNewItem = item.isNew === true;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 ${isNewItem ? 'bg-emerald-50/30' : ''}`}
                    >
                      <td className="px-2 py-1.5">
                        {!isNewItem && (
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {isNewItem ? (
                          <span className="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Mới
                          </span>
                        ) : (
                          <span className="text-sm text-slate-600">
                            {item.id}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.name || ""}
                          disabled={saving}
                          onChange={(e) =>
                            handleChangeField(item.id, "name", e.target.value)
                          }
                          placeholder={isNewItem ? "Nhập tên phân loại sản phẩm *" : ""}
                          className={`${inputBase} w-full ${disabledClass} ${isNewItem ? 'border-emerald-300 focus:border-emerald-400' : ''}`}
                          autoFocus={isNewItem}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.code || ""}
                          disabled={saving}
                          onChange={(e) =>
                            handleChangeField(item.id, "code", e.target.value)
                          }
                          placeholder={isNewItem ? "Nhập mã code" : ""}
                          className={`${inputBase} w-full ${disabledClass} ${isNewItem ? 'border-emerald-300 focus:border-emerald-400' : ''}`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isActive ?? true}
                            disabled={saving}
                            onChange={(e) =>
                              handleChangeField(item.id, "isActive", e.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </label>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {!isNewItem ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(item.id, item.name || "")}
                            className="group inline-flex items-center gap-1.5 text-sm text-slate-600 transition hover:text-emerald-600"
                            title="Xem/Thêm giá trị"
                          >
                            <span className="font-medium">{item.valuesCount ?? 0}</span>
                            <svg
                              className="h-4 w-4 transition group-hover:translate-x-0.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-sm text-slate-500">0</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="text-sm text-slate-600">
                          {isNewItem ? "—" : formatDate(item.createdAt, "dd/MM/yyyy") || "—"}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <SaveActionButton
                            label={isNewItem ? "Lưu" : "Cập nhật"}
                            onClick={() => saveItem(item)}
                            disabled={isNewItem ? saving : (!selectedIds.has(item.id) || saving)}
                          />
                          {isNewItem ? (
                            <button
                              type="button"
                              onClick={handleCancelNew}
                              disabled={saving}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Hủy"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Hủy
                            </button>
                          ) : (
                            <DeleteActionButton
                              onClick={() => handleDeleteSingle(item)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    Chưa có phân loại sản phẩm nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Show total count */}
      <div className="px-2 text-sm text-slate-500">
        Hiển thị {filteredItems.length} phân loại sản phẩm
      </div>

      {/* Values Drawer */}
      {selectedType && (
        <ProductTypeValuesDrawer
          isOpen={drawerOpen}
          typeId={selectedType.id}
          typeName={selectedType.name}
          onClose={handleCloseDrawer}
        />
      )}

      {dialog}
    </div>
  );
}

function HeaderCell({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500 ${className}`}
    >
      {label}
    </th>
  );
}

export default function ProductTypesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-slate-500">
          Đang tải phân loại sản phẩm...
        </div>
      }
    >
      <ProductTypesPageContent />
    </Suspense>
  );
}
