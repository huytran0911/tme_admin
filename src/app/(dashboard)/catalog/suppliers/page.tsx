"use client";

import { useEffect, useRef, useState } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Pagination } from "@/components/shared/Pagination";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { createSupplier, deleteSupplier, fetchSuppliers, updateSupplier } from "@/features/suppliers/api";
import type { GetSupplierListParams, Supplier } from "@/features/suppliers/types";
import { SaveActionButton, DeleteActionButton, ActionIconButton } from "@/components/shared";
import { DeleteSelectedButton, UpdateButton, AddNewButton } from "@/components/shared/ToolbarButton";

type SupplierDraft = Omit<Supplier, "id">;

export default function SuppliersPage() {
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();
  const originalSuppliersRef = useRef<Record<number, Supplier>>({});

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [newSupplier, setNewSupplier] = useState<SupplierDraft | null>(null);
  const [keyword, setKeyword] = useState("");
  const [params, setParams] = useState<GetSupplierListParams>({ page: 1, pageSize: 10, keyword: "" });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const loadSuppliers = async (nextParams: GetSupplierListParams = params) => {
    setLoading(true);
    try {
      const data = await fetchSuppliers(nextParams);
      const items = Array.isArray(data?.items) ? data.items : [];
      setSuppliers(items);
      originalSuppliersRef.current = items.reduce<Record<number, Supplier>>((acc, item) => {
        acc[item.id] = { ...item };
        return acc;
      }, {});
      setTotal(typeof data?.total === "number" ? data.total : 0);
      setSelectedIds(new Set());
      setDirtyIds(new Set());
    } catch {
      notify({ message: "Không thể tải danh sách nhà cung cấp.", variant: "error" });
      setSuppliers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParams((prev) => {
        if (prev.keyword === keyword && prev.page === 1) {
          return prev;
        }
        return { ...prev, page: 1, keyword };
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleSearchSubmit = () => {
    setParams((prev) => ({ ...prev, page: 1, keyword }));
  };

  const markSaving = (id: number, saving: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev);
      saving ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === suppliers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suppliers.map((s) => s.id)));
    }
  };

  const clearSelectionFor = (id: number) => {
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const hasSupplierChanged = (supplier: Supplier) => {
    const original = originalSuppliersRef.current[supplier.id];
    if (!original) return true;
    return ["name", "nameEn", "logo"].some((field) => (supplier as any)[field] !== (original as any)[field]);
  };

  const handleChangeField = (id: number, key: keyof Supplier, value: string) => {
    setSuppliers((prev) => {
      let updated: Supplier | null = null;
      const next = prev.map((item) => {
        if (item.id !== id) return item;
        updated = { ...item, [key]: value };
        return updated;
      });
      if (updated) {
        const changed = hasSupplierChanged(updated);
        setDirtyIds((prevDirty) => {
          const nextDirty = new Set(prevDirty);
          changed ? nextDirty.add(updated!.id) : nextDirty.delete(updated!.id);
          return nextDirty;
        });
        setSelectedIds((prevSelected) => {
          const nextSelected = new Set(prevSelected);
          if (changed) {
            nextSelected.add(updated!.id);
          } else {
            nextSelected.delete(updated!.id);
          }
          return nextSelected;
        });
      }
      return next;
    });
  };

  const computeDirtyIds = () => {
    const dirty = new Set<number>();
    suppliers.forEach((supplier) => {
      if (hasSupplierChanged(supplier)) {
        dirty.add(supplier.id);
      }
    });
    return dirty;
  };

  const handleSaveSupplier = async (supplier: Supplier) => {
    if (!hasSupplierChanged(supplier)) return;
    markSaving(supplier.id, true);
    try {
      await updateSupplier(supplier.id, {
        name: supplier.name,
        nameEn: supplier.nameEn,
        logo: supplier.logo,
      });
      originalSuppliersRef.current[supplier.id] = { ...supplier };
      notify({ message: "Đã cập nhật nhà cung cấp.", variant: "success" });
      clearSelectionFor(supplier.id);
    } catch {
      notify({ message: "Cập nhật thất bại. Vui lòng kiểm tra API.", variant: "error" });
      setSuppliers((prev) =>
        prev.map((item) => (item.id === supplier.id ? originalSuppliersRef.current[supplier.id] : item)),
      );
      clearSelectionFor(supplier.id);
    } finally {
      markSaving(supplier.id, false);
    }
  };

  const performBulkUpdate = async (targetIds: number[]) => {
    if (!targetIds.length) return;
    setBulkProcessing(true);
    try {
      for (const id of targetIds) {
        const supplier = suppliers.find((s) => s.id === id);
        if (!supplier) continue;
        try {
          markSaving(id, true);
          await updateSupplier(id, {
            name: supplier.name,
            nameEn: supplier.nameEn,
            logo: supplier.logo,
          });
          originalSuppliersRef.current[id] = { ...supplier };
          clearSelectionFor(id);
        } finally {
          markSaving(id, false);
        }
      }
      notify({ message: "Đã cập nhật danh sách nhà cung cấp.", variant: "success" });
      loadSuppliers(params);
    } catch {
      notify({ message: "Cập nhật hàng loạt thất bại.", variant: "error" });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkUpdateClick = () => {
    const dirtyPool = dirtyIds.size ? new Set(dirtyIds) : computeDirtyIds();
    setDirtyIds(dirtyPool);
    const targetIds = Array.from(dirtyPool);
    if (!targetIds.length) {
      notify({ message: "Không có thay đổi nào cần cập nhật.", variant: "info" });
      return;
    }
    setSelectedIds(dirtyPool);
    confirm({
      title: "Cập nhật nhà cung cấp",
      description: `Áp dụng cập nhật cho ${targetIds.length} nhà cung cấp đã thay đổi?`,
      confirmText: "Cập nhật",
      onConfirm: () => performBulkUpdate(targetIds),
    });
  };

  const performBulkDelete = async (ids: number[]) => {
    if (!ids.length) return;
    setBulkProcessing(true);
    try {
      for (const id of ids) {
        await deleteSupplier(id);
      }
      notify({ message: "Đã xóa các nhà cung cấp đã chọn.", variant: "success" });
      setSelectedIds(new Set());
      setDirtyIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      loadSuppliers(params);
    } catch {
      notify({ message: "Xóa hàng loạt thất bại.", variant: "error" });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDeleteClick = () => {
    if (!selectedIds.size) return;
    confirm({
      title: "Xóa nhà cung cấp",
      description: `Bạn có chắc muốn xóa ${selectedIds.size} nhà cung cấp đã chọn?`,
      confirmText: "Xóa",
      onConfirm: () => performBulkDelete(Array.from(selectedIds)),
    });
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    confirm({
      title: "Xóa nhà cung cấp",
      description: `Bạn có chắc muốn xóa "${supplier.name}"?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          await deleteSupplier(supplier.id);
          notify({ message: "Đã xóa nhà cung cấp.", variant: "success" });
          clearSelectionFor(supplier.id);
          loadSuppliers(params);
        } catch {
          notify({ message: "Xóa thất bại. Vui lòng kiểm tra API.", variant: "error" });
        }
      },
    });
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier || !newSupplier.name.trim()) {
      notify({ message: "Tên nhà cung cấp không được để trống.", variant: "info" });
      return;
    }
    setCreating(true);
    try {
      await createSupplier({
        name: newSupplier.name.trim(),
        nameEn: newSupplier.nameEn.trim(),
        logo: newSupplier.logo.trim(),
      });
      notify({ message: "Đã tạo nhà cung cấp mới.", variant: "success" });
      setNewSupplier(null);
      setParams((prev) => ({ ...prev, page: 1 }));
      loadSuppliers({ ...params, page: 1 });
    } catch {
      notify({ message: "Tạo nhà cung cấp thất bại.", variant: "error" });
    } finally {
      setCreating(false);
    }
  };

  const handleStartCreate = () => {
    if (newSupplier) return;
    setNewSupplier({ name: "", nameEn: "", logo: "" });
  };

  const handleCancelCreate = () => setNewSupplier(null);

  const handlePageChange = (page: number) => setParams((prev) => ({ ...prev, page }));
  const handlePageSizeChange = (pageSize: number) => setParams((prev) => ({ ...prev, page: 1, pageSize }));

  const selectedCount = selectedIds.size;
  const allSelected = suppliers.length > 0 && selectedIds.size === suppliers.length;

  return (
    <div className="space-y-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Quản trị</p>
          <h1 className="text-xl font-semibold text-slate-900">Danh mục Nhà Cung Cấp</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Quản lý danh mục", href: "/catalog/product-groups" },
            { label: "Danh mục nhà cung cấp" },
          ]}
          className="justify-end"
        />
      </div>

      <div className="mt-2 flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <DeleteSelectedButton
            count={selectedCount}
            onClick={handleBulkDeleteClick}
            disabled={bulkProcessing}
          />
          <UpdateButton onClick={handleBulkUpdateClick} disabled={bulkProcessing} />
          <AddNewButton onClick={handleStartCreate} disabled={Boolean(newSupplier) || bulkProcessing}>
            Thêm nhà cung cấp
          </AddNewButton>
        </div>

        <div className="flex w-full justify-end sm:w-auto">
          <div className="flex w-full max-w-xs items-center gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
              placeholder="Tìm theo tên nhà cung cấp..."
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
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
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Chọn tất cả"
                  />
                </th>
                <HeaderCell label="Tên nhà cung cấp" />
                <HeaderCell label="Tên tiếng Anh" />
                <HeaderCell label="Logo" />
                <HeaderCell label="Chức năng" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {newSupplier && (
                <tr className="bg-emerald-50/40">
                    <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                      checked={true}
                      disabled
                    />
                    </td>
                  <td className="px-3 py-2">
                    <input
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                      className="tme-input w-full"
                      placeholder="Tên nhà cung cấp"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={newSupplier.nameEn}
                      onChange={(e) => setNewSupplier((prev) => (prev ? { ...prev, nameEn: e.target.value } : prev))}
                      className="tme-input w-full"
                      placeholder="English name"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={newSupplier.logo}
                      onChange={(e) => setNewSupplier((prev) => (prev ? { ...prev, logo: e.target.value } : prev))}
                      className="tme-input w-full"
                      placeholder="https://..."
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1.5">
                      <SaveActionButton
                        label={creating ? "Đang lưu..." : "Lưu"}
                        onClick={handleCreateSupplier}
                        disabled={creating}
                      />
                      <ActionIconButton
                        label="Hủy"
                        onClick={handleCancelCreate}
                        variant="secondary"
                        disabled={creating}
                        icon={
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M6.28 6.28a.75.75 0 0 1 1.06 0L10 8.94l2.66-2.66a.75.75 0 1 1 1.06 1.06L11.06 10l2.66 2.66a.75.75 0 1 1-1.06 1.06L10 11.06l-2.66 2.66a.75.75 0 1 1-1.06-1.06L8.94 10 6.28 7.34a.75.75 0 0 1 0-1.06Z" />
                          </svg>
                        }
                      />
                    </div>
                  </td>
                </tr>
              )}

              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-5 text-center text-sm text-slate-500">
                    Đang tải danh sách nhà cung cấp...
                  </td>
                </tr>
              ) : suppliers.length ? (
                suppliers.map((supplier) => {
                  const saving = savingIds.has(supplier.id);
                  const dirty = dirtyIds.has(supplier.id);
                  const disabled = saving || bulkProcessing;
                  return (
                    <tr key={supplier.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                          checked={selectedIds.has(supplier.id)}
                          onChange={() => toggleSelect(supplier.id)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={supplier.name}
                          disabled={disabled}
                          onChange={(e) => handleChangeField(supplier.id, "name", e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveSupplier(supplier)}
                          className={`tme-input w-full ${disabled ? "opacity-60" : ""}`}
                          placeholder="Tên nhà cung cấp"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={supplier.nameEn}
                          disabled={disabled}
                          onChange={(e) => handleChangeField(supplier.id, "nameEn", e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveSupplier(supplier)}
                          className={`tme-input w-full ${disabled ? "opacity-60" : ""}`}
                          placeholder="English name"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={supplier.logo}
                          disabled={disabled}
                          onChange={(e) => handleChangeField(supplier.id, "logo", e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveSupplier(supplier)}
                          className={`tme-input w-full ${disabled ? "opacity-60" : ""}`}
                          placeholder="https://..."
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1.5">
                          <SaveActionButton
                            label="Cập nhật"
                            onClick={() => handleSaveSupplier(supplier)}
                            disabled={!dirty || disabled}
                          />
                          <DeleteActionButton
                            onClick={() => handleDeleteSupplier(supplier)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    Chưa có nhà cung cấp nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={params.page || 1}
        pageSize={params.pageSize || 10}
        totalItems={total}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
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
