"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toast";
import {
  DeleteSelectedButton,
  UpdateButton,
  AddNewButton,
} from "@/components/shared/ToolbarButton";
import { SaveActionButton, DeleteActionButton } from "@/components/shared";
import {
  fetchProductTypeValues,
  createProductTypeValue,
  updateProductTypeValue,
  deleteProductTypeValue,
} from "@/features/product-type-values/api";
import type {
  ProductTypeValue,
  UpdateProductTypeValueRequest,
} from "@/features/product-type-values/types";

type ProductTypeValueDraft = ProductTypeValue & {
  saving?: boolean;
  error?: boolean;
  isNew?: boolean;
};

type ProductTypeValuesDrawerProps = {
  isOpen: boolean;
  typeId: number;
  typeName: string;
  onClose: () => void;
};

export function ProductTypeValuesDrawer({
  isOpen,
  typeId,
  typeName,
  onClose,
}: ProductTypeValuesDrawerProps) {
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();
  const [values, setValues] = useState<ProductTypeValueDraft[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [keywordBuffer, setKeywordBuffer] = useState("");
  const [newDraft, setNewDraft] = useState<ProductTypeValueDraft | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Filter values based on keyword, include newDraft at the top
  const filteredValues = useMemo(() => {
    let result = values;
    if (keywordBuffer.trim()) {
      const kw = keywordBuffer.trim().toLowerCase();
      result = result.filter(
        (value) =>
          value.value?.toLowerCase().includes(kw)
      );
    }
    // Add new draft at the beginning if exists
    if (newDraft) {
      return [newDraft, ...result];
    }
    return result;
  }, [values, keywordBuffer, newDraft]);

  const loadData = async () => {
    if (!typeId) return;
    setLoading(true);
    try {
      const data = await fetchProductTypeValues(typeId, {
        page: 1,
        pageSize: 9999,
      });
      const loadedValues = Array.isArray(data.items) ? data.items : [];
      setValues(loadedValues);
      setSelectedIds(new Set());
    } catch {
      setValues([]);
      setSelectedIds(new Set());
      notify({
        message: "Không tải được danh sách giá trị.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && typeId) {
      loadData();
      setKeywordBuffer("");
      setNewDraft(null);
      setSelectedIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, typeId]);

  // Update unsaved changes flag
  useEffect(() => {
    setHasUnsavedChanges(!!newDraft || selectedIds.size > 0);
  }, [newDraft, selectedIds]);

  const markSaving = (id: number, saving: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev);
      saving ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const saveValue = async (value: ProductTypeValueDraft) => {
    // Handle new value creation
    if (value.isNew) {
      if (!value.value || value.value.trim() === "") {
        notify({ message: "Giá trị là bắt buộc.", variant: "error" });
        return;
      }

      markSaving(value.id, true);
      try {
        await createProductTypeValue(typeId, {
          name: value.value.trim(),
          sortOrder: value.sortOrder || 0,
          isActive: value.isActive ?? true,
        });
        notify({ message: "Đã tạo giá trị mới.", variant: "success" });
        setNewDraft(null);
        // Reload to get the new value with real ID
        loadData();
      } catch {
        notify({ message: "Tạo giá trị thất bại.", variant: "error" });
      } finally {
        markSaving(value.id, false);
      }
      return;
    }

    // Handle existing value update
    markSaving(value.id, true);
    try {
      await updateProductTypeValue(value.id, {
        name: value.value?.trim() || "",
        sortOrder: value.sortOrder,
        isActive: value.isActive,
      });
      // Deselect after successful save
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(value.id);
        return next;
      });
      notify({ message: "Đã lưu giá trị.", variant: "success" });
    } catch {
      notify({ message: "Lưu giá trị thất bại.", variant: "error" });
    } finally {
      markSaving(value.id, false);
    }
  };

  const handleChangeField = (
    id: number,
    key: keyof ProductTypeValue,
    val: any
  ) => {
    // Handle new draft changes
    if (newDraft && newDraft.id === id) {
      setNewDraft((prev) => (prev ? { ...prev, [key]: val } : null));
      return;
    }

    // Handle existing value changes
    setValues((prev) =>
      prev.map((value) => (value.id === id ? { ...value, [key]: val } : value))
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
      notify({
        message: "Vui lòng hoàn thành hoặc hủy mục đang tạo.",
        variant: "error",
      });
      return;
    }

    // Create a new draft with temporary negative ID
    setNewDraft({
      id: -1,
      productTypeId: typeId,
      productTypeName: typeName,
      value: "",
      sortOrder: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      isNew: true,
    });
  };

  const handleCancelNew = () => {
    setNewDraft(null);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredValues.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredValues.map((value) => value.id)));
    }
  };

  const handleDeleteSingle = (value: ProductTypeValue) => {
    confirm({
      title: "Xóa giá trị",
      description: `Bạn có chắc muốn xóa giá trị "${value.value}"?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          await deleteProductTypeValue(value.id);
          setValues((prev) => prev.filter((v) => v.id !== value.id));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(value.id);
            return next;
          });
          notify({ message: "Đã xóa giá trị.", variant: "success" });
        } catch (error: any) {
          // Handle error from BE - value in use
          const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "Xóa giá trị thất bại.";
          notify({
            message: errorMessage,
            variant: "error",
          });
        }
      },
    });
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.size) return;

    confirm({
      title: "Xóa giá trị",
      description: `Bạn có chắc muốn xóa ${selectedIds.size} giá trị đã chọn?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        const idsToDelete = Array.from(selectedIds);
        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        for (const id of idsToDelete) {
          try {
            await deleteProductTypeValue(id);
            successCount++;
          } catch (error: any) {
            failCount++;
            const errorMsg =
              error?.response?.data?.message || error?.message || "Lỗi không xác định";
            errors.push(errorMsg);
          }
        }

        // Remove deleted values from state
        setValues((prev) => prev.filter((value) => !selectedIds.has(value.id)));
        setSelectedIds(new Set());

        if (failCount === 0) {
          notify({
            message: `Đã xóa ${successCount} giá trị.`,
            variant: "success",
          });
        } else {
          // Show first error message
          notify({
            message:
              errors[0] ||
              `Xóa ${successCount}/${idsToDelete.length} giá trị. ${failCount} thất bại.`,
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

    const selectedValues = filteredValues.filter((value) =>
      selectedIds.has(value.id)
    );
    for (const value of selectedValues) {
      await saveValue(value);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      confirm({
        title: "Có thay đổi chưa lưu",
        description:
          "Bạn có chắc muốn đóng không? Các thay đổi sẽ bị mất.",
        confirmText: "Đóng không lưu",
        onConfirm: () => {
          setNewDraft(null);
          setSelectedIds(new Set());
          onClose();
        },
      });
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const inputBase = "tme-input";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[800px] flex-col bg-white shadow-2xl animate-slide-in-right">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Giá trị của "{typeName}"
            </h2>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              title="Đóng"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Bar - Sticky */}
        <div className="sticky top-[73px] z-10 border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                value={keywordBuffer}
                onChange={(e) => setKeywordBuffer(e.target.value)}
                placeholder="Tìm theo giá trị..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <span className="text-sm font-medium text-slate-600">
              ({filteredValues.length} giá trị)
            </span>
          </div>
        </div>

        {/* Toolbar - Sticky */}
        <div className="sticky top-[136px] z-10 border-b border-slate-100 bg-white px-6 py-3">
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
            <AddNewButton onClick={handleAddNew}>Thêm giá trị</AddNewButton>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Đang tải giá trị...
            </div>
          ) : filteredValues.length === 0 && !newDraft ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 text-6xl">📦</div>
              <p className="mb-2 text-base font-medium text-slate-900">
                Chưa có giá trị nào
              </p>
              <p className="mb-6 text-sm text-slate-500">
                Thêm giá trị đầu tiên cho loại sản phẩm "{typeName}"
              </p>
              <button
                onClick={handleAddNew}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Thêm giá trị
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="tme-table">
                <thead className="tme-table-head">
                  <tr>
                    <th className="w-10 px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                        checked={
                          filteredValues.length > 0 &&
                          selectedIds.size === filteredValues.length
                        }
                        onChange={toggleSelectAll}
                        aria-label="Chọn tất cả"
                      />
                    </th>
                    <HeaderCell label="ID" className="text-center" />
                    <HeaderCell label="Giá trị" />
                    <HeaderCell label="Thứ tự" className="text-center" />
                    <HeaderCell label="Trạng thái" className="text-center" />
                    <HeaderCell label="Chức năng" className="text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredValues.map((value) => {
                    const saving = savingIds.has(value.id);
                    const disabledClass = saving ? "opacity-60 bg-slate-50" : "";
                    const isNewValue = value.isNew === true;

                    return (
                      <tr
                        key={value.id}
                        className={`hover:bg-slate-50/80 ${isNewValue ? "bg-emerald-50/30" : ""}`}
                      >
                        <td className="px-2 py-1.5">
                          {!isNewValue && (
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                              checked={selectedIds.has(value.id)}
                              onChange={() => toggleSelect(value.id)}
                            />
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {isNewValue ? (
                            <span className="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              Mới
                            </span>
                          ) : (
                            <span className="text-sm text-slate-600">
                              {value.id}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={value.value || ""}
                            disabled={saving}
                            onChange={(e) =>
                              handleChangeField(value.id, "value", e.target.value)
                            }
                            placeholder={isNewValue ? "Nhập giá trị *" : ""}
                            className={`${inputBase} w-full ${disabledClass} ${isNewValue ? "border-emerald-300 focus:border-emerald-400" : ""}`}
                            autoFocus={isNewValue}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <input
                            type="number"
                            value={value.sortOrder ?? 0}
                            disabled={saving}
                            onChange={(e) =>
                              handleChangeField(value.id, "sortOrder", parseInt(e.target.value) || 0)
                            }
                            placeholder="0"
                            className={`${inputBase} w-20 text-center ${disabledClass} ${isNewValue ? "border-emerald-300 focus:border-emerald-400" : ""}`}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={value.isActive ?? true}
                              disabled={saving}
                              onChange={(e) =>
                                handleChangeField(value.id, "isActive", e.target.checked)
                              }
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </label>
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <SaveActionButton
                              label={isNewValue ? "Lưu" : "Cập nhật"}
                              onClick={() => saveValue(value)}
                              disabled={
                                isNewValue
                                  ? saving
                                  : !selectedIds.has(value.id) || saving
                              }
                            />
                            {isNewValue ? (
                              <button
                                type="button"
                                onClick={handleCancelNew}
                                disabled={saving}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Hủy"
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                                Hủy
                              </button>
                            ) : (
                              <DeleteActionButton
                                onClick={() => handleDeleteSingle(value)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {dialog}
    </>
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
