"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Pagination } from "@/components/shared/Pagination";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { ActionIconButton } from "@/components/shared/ActionIconButton";
import { EditActionButton } from "@/components/shared/EditActionButton";
import { DeleteSelectedButton, UpdateButton, AddNewButton } from "@/components/shared/ToolbarButton";
import { WebsiteAssociateFormModal } from "@/features/website-associates/components/WebsiteAssociateFormModal";
import { deleteWebsiteAssociate, fetchWebsiteAssociates, updateWebsiteAssociate } from "@/features/website-associates/api";
import type { GetWebsiteAssociateParams, WebsiteAssociate } from "@/features/website-associates/types";
import { buildImageUrl, formatDate } from "@/lib/utils";

type EditableField = "name" | "address" | "sort" | "status";
type StatusFilter = "all" | "active" | "inactive";

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  associate: WebsiteAssociate | null;
};

type PreviewState = {
  open: boolean;
  url: string;
  title: string;
};

export default function WebsiteAssociatesPage() {
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();
  const originalRef = useRef<Record<number, WebsiteAssociate>>({});
  const normalizeId = (value: number | string) => Number(value) || 0;

  const [items, setItems] = useState<WebsiteAssociate[]>([]);
  const [params, setParams] = useState<GetWebsiteAssociateParams>({ page: 1, pageSize: 10 });
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modalState, setModalState] = useState<ModalState>({ open: false, mode: "create", associate: null });
  const [preview, setPreview] = useState<PreviewState>({ open: false, url: "", title: "" });

  const load = useCallback(
    async (nextParams: GetWebsiteAssociateParams) => {
      setLoading(true);
      try {
        const data = await fetchWebsiteAssociates(nextParams);
        const rawList = Array.isArray(data?.items) ? data.items : [];
        const normalizedList = rawList.map((item) => ({ ...item, id: normalizeId(item.id) }));
        setItems(normalizedList);
        originalRef.current = normalizedList.reduce<Record<number, WebsiteAssociate>>((acc, item) => {
          const key = normalizeId(item.id);
          acc[key] = { ...item, id: key };
          return acc;
        }, {});
        setSelectedIds(new Set());
        setTotal(typeof data?.total === "number" ? data.total : normalizedList.length);
      } catch {
        notify({ message: "Không thể tải danh sách liên kết.", variant: "error" });
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [notify],
  );

  useEffect(() => {
    load(params);
  }, [load, params]);

  useEffect(() => {
    const next = new Set<number>();
    items.forEach((item) => {
      const key = normalizeId(item.id);
      if (hasRowChanged(item)) {
        next.add(key);
      }
    });
    setSelectedIds(next);
  }, [items]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParams((prev) => ({
        ...prev,
        page: 1,
        keyword,
        status: statusFilter === "all" ? undefined : statusFilter === "active" ? 1 : 0,
      }));
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword, statusFilter]);

  const handleSearchSubmit = () => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      keyword,
      status: statusFilter === "all" ? undefined : statusFilter === "active" ? 1 : 0,
    }));
  };

  const setRowSaving = (id: number, saving: boolean) => {
    const key = normalizeId(id);
    setSavingIds((prev) => {
      const next = new Set(prev);
      saving ? next.add(key) : next.delete(key);
      return next;
    });
  };

  const hasRowChanged = (item: WebsiteAssociate) => {
    const original = originalRef.current[normalizeId(item.id)];
    if (!original) return false;
    const normalize = (val?: string | number | null) => (val ?? "").toString().trim();
    return (
      normalize(item.name) !== normalize(original.name) ||
      normalize(item.address) !== normalize(original.address) ||
      normalize(item.logoUrl) !== normalize(original.logoUrl) ||
      Number(item.sort ?? 0) !== Number(original.sort ?? 0) ||
      Number(item.status ?? 1) !== Number(original.status ?? 1)
    );
  };

  const hasFieldChanged = (id: number, field: EditableField) => {
    const key = normalizeId(id);
    const current = items.find((item) => normalizeId(item.id) === key);
    const original = originalRef.current[key];
    if (!current || !original) return false;
    if (field === "sort" || field === "status") {
      return Number(current[field] ?? 0) !== Number(original[field] ?? 0);
    }
    const nextValue = (current[field] ?? "").toString().trim();
    const prevValue = (original[field] ?? "").toString().trim();
    return nextValue !== prevValue;
  };

  const handleFieldChange = (id: number, field: EditableField, value: string | number | boolean) => {
    const key = normalizeId(id);
    let updatedItem: WebsiteAssociate | undefined;
    setItems((prev) =>
      prev.map((item) => {
        if (normalizeId(item.id) !== key) return item;
        if (field === "sort") {
          updatedItem = { ...item, id: key, sort: Number(value) || 0 };
          return updatedItem;
        }
        if (field === "status") {
          updatedItem = { ...item, id: key, status: value ? 0 : 1 };
          return updatedItem;
        }
        updatedItem = { ...item, id: key, [field]: value } as WebsiteAssociate;
        return updatedItem;
      }),
    );
    if (updatedItem) {
      const changed = hasRowChanged(updatedItem);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        changed ? next.add(key) : next.delete(key);
        return next;
      });
    }
  };

  const commitField = (id: number, field: EditableField) => {
    const key = normalizeId(id);
    if (!hasFieldChanged(id, field) || savingIds.has(id)) return;
    const item = items.find((x) => normalizeId(x.id) === key);
    if (!item) return;
    if (field === "sort" || field === "status") {
      updateInline(id, { [field]: field === "sort" ? Number(item.sort) || 0 : item.status } as Partial<WebsiteAssociate>);
    } else {
      const value = (item[field] ?? "").toString().trim();
      updateInline(id, { [field]: value } as Partial<WebsiteAssociate>);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const toggleSelect = (id: number) => {
    const key = normalizeId(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
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

  const updateInline = async (id: number, payload: Partial<WebsiteAssociate>) => {
    if (!Object.keys(payload).length) return;
    const key = normalizeId(id);
    setRowSaving(id, true);
    try {
      const existing = originalRef.current[key] ?? items.find((item) => normalizeId(item.id) === key);
      const updated = await updateWebsiteAssociate(key, payload, existing);
      const merged = { ...(existing || { id: key }), ...payload, ...updated, id: key } as WebsiteAssociate;
      originalRef.current[key] = merged;
      setItems((prev) => prev.map((item) => (normalizeId(item.id) === key ? merged : item)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        hasRowChanged(merged) ? next.add(key) : next.delete(key);
        return next;
      });
      notify({ message: "Đã cập nhật liên kết.", variant: "success" });
    } catch {
      notify({ message: "Cập nhật thất bại.", variant: "error" });
      const fallback = originalRef.current[key];
      if (fallback) {
        setItems((prev) => prev.map((item) => (normalizeId(item.id) === key ? fallback : item)));
      }
    } finally {
      setRowSaving(id, false);
    }
  };

  const handleDelete = (item: WebsiteAssociate) => {
    confirm({
      title: "Xóa liên kết",
      description: `Bạn chắc chắn muốn xóa "${item.name}"?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          await deleteWebsiteAssociate(item.id);
          notify({ message: "Đã xóa liên kết.", variant: "success" });
          load(params);
        } catch {
          notify({ message: "Xóa thất bại.", variant: "error" });
        }
      },
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    confirm({
      title: "Xóa các liên kết đã chọn",
      description: `Bạn chắc chắn muốn xóa ${ids.length} liên kết đã chọn?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        setLoading(true);
        try {
          for (const id of ids) {
            await deleteWebsiteAssociate(id);
          }
          notify({ message: "Đã xóa các liên kết đã chọn.", variant: "success" });
          setSelectedIds(new Set());
          load(params);
        } catch {
          notify({ message: "Xóa hàng loạt thất bại.", variant: "error" });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleBulkUpdate = () => {
    const targetIds = Array.from(selectedIds).filter((id) => {
      const item = items.find((x) => x.id === id);
      return item ? hasRowChanged(item) : false;
    });
    if (!targetIds.length) {
      notify({ message: "Không có thay đổi cần cập nhật.", variant: "info" });
      return;
    }
    confirm({
      title: "Cập nhật các liên kết đã chọn",
      description: `Áp dụng cập nhật cho ${targetIds.length} liên kết đã chọn?`,
      confirmText: "Cập nhật",
      onConfirm: async () => {
        setLoading(true);
        try {
          for (const id of targetIds) {
            const item = items.find((x) => x.id === id);
            if (!item) continue;
            await updateInline(id, {
              name: (item.name ?? "").trim(),
              address: (item.address ?? "").trim(),
              sort: Number(item.sort) || 0,
              status: Number(item.status ?? 1) as 0 | 1,
            });
          }
          notify({ message: "Đã cập nhật các liên kết đã chọn.", variant: "success" });
          setSelectedIds(new Set());
          load(params);
        } catch {
          notify({ message: "Cập nhật hàng loạt thất bại.", variant: "error" });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const openCreateModal = () => setModalState({ open: true, mode: "create", associate: null });
  const openEditModal = (associate: WebsiteAssociate) => setModalState({ open: true, mode: "edit", associate });
  const closeModal = () => setModalState((prev) => ({ ...prev, open: false }));
  const openPreview = (url?: string, title?: string) => {
    if (!url) return;
    setPreview({ open: true, url: buildImageUrl(url), title: title ?? "" });
  };
  const closePreview = () => setPreview({ open: false, url: "", title: "" });

  const handleModalSaved = () => {
    load(params);
  };

  const handlePageChange = (page: number) => setParams((prev) => ({ ...prev, page }));
  const handlePageSizeChange = (pageSize: number) => setParams((prev) => ({ ...prev, pageSize, page: 1 }));

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Quản trị</p>
          <h1 className="text-xl font-semibold text-slate-900">Liên kết website</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Liên kết website" },
          ]}
          className="justify-end"
        />
      </div>

      <div className="mt-2 flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <DeleteSelectedButton
            count={selectedIds.size}
            onClick={handleBulkDelete}
            disabled={loading}
          />
          <UpdateButton onClick={handleBulkUpdate} disabled={loading} />
          <AddNewButton onClick={openCreateModal}>Thêm liên kết</AddNewButton>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex w-full max-w-xs items-center gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
              placeholder="Tìm theo tên hoặc địa chỉ..."
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
                    checked={selectedIds.size === items.length && items.length > 0}
                    onChange={toggleSelectAll}
                    aria-label="Chọn tất cả"
                  />
                </th>
                <HeaderCell label="Tên liên kết" />
                <HeaderCell label="Địa chỉ" />
                <HeaderCell label="Thứ tự" className="text-center w-24" />
                <HeaderCell label="Ẩn" className="text-center w-16" />
                <HeaderCell label="Lượt xem" className="text-center w-24" />
                <HeaderCell label="Ngày tạo" />
                <HeaderCell label="Chức năng" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">
                    Đang tải danh sách liên kết...
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => {
                  const rowSaving = savingIds.has(item.id);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="text"
                          value={item.name}
                          disabled={rowSaving}
                          onChange={(e) => handleFieldChange(item.id, "name", e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          className={`tme-input w-full ${rowSaving ? "opacity-60" : ""}`}
                          placeholder="Tên liên kết"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.address ?? ""}
                          disabled={rowSaving}
                          onChange={(e) => handleFieldChange(item.id, "address", e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          className={`tme-input w-full ${rowSaving ? "opacity-60" : ""}`}
                          placeholder="https://..."
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          value={item.sort ?? 0}
                          disabled={rowSaving}
                          onChange={(e) => handleFieldChange(item.id, "sort", e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          className={`tme-input w-20 text-center ${rowSaving ? "opacity-60" : ""}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={item.status === 0}
                          disabled={rowSaving}
                          onChange={(e) => handleFieldChange(item.id, "status", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200 disabled:opacity-60"
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-slate-600 w-24">
                        {typeof item.viewCount === "number" ? item.viewCount : typeof item.view === "number" ? item.view : "-"}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600">
                        {item.createdAt ? formatDate(item.createdAt, "dd-MM-yyyy") : "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1.5">
                          <ActionIconButton
                            label="Cập nhật"
                            onClick={() =>
                              updateInline(item.id, {
                                name: (item.name ?? "").trim(),
                                address: (item.address ?? "").trim(),
                                sort: Number(item.sort) || 0,
                                status: Number(item.status ?? 1) as 0 | 1,
                              })
                            }
                            disabled={rowSaving || !hasRowChanged(item)}
                            variant="primary"
                            icon={
                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path d="M16.78 5.72a.75.75 0 0 0-1.06-1.06l-7.25 7.25-3.19-3.2a.75.75 0 1 0-1.06 1.06l3.72 3.72a.75.75 0 0 0 1.06 0l7.78-7.77Z" />
                              </svg>
                            }
                          />
                          {/* <EditActionButton onClick={() => openEditModal(item)} disabled={rowSaving} /> */}
                          <ActionIconButton
                            label="Xóa"
                            onClick={() => handleDelete(item)}
                            disabled={rowSaving}
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
                  <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">
                    Chưa có liên kết nào.
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

      <WebsiteAssociateFormModal
        open={modalState.open}
        mode={modalState.mode}
        initialValue={modalState.mode === "edit" ? modalState.associate ?? undefined : undefined}
        onClose={closeModal}
        onSaved={handleModalSaved}
      />
      {preview.open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 px-4" onClick={closePreview}>
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800 line-clamp-1">{preview.title || "Xem ảnh"}</p>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <img
              src={preview.url}
              alt={preview.title || "Website associate image"}
              className="max-h-[75vh] w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
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
