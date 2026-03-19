"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { EditActionButton, DeleteActionButton } from "@/components/shared";
import { DeleteSelectedButton, UpdateButton, AddNewButton } from "@/components/shared/ToolbarButton";
import { Pagination } from "@/components/shared/Pagination";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toast";
import { buildImageUrl, formatDate } from "@/lib/utils";
import {
  createWebsiteAdvertising,
  deleteWebsiteAdvertising,
  fetchWebsiteAdvertisings,
  updateWebsiteAdvertising,
  uploadWebsiteAdvertisingImage,
} from "@/features/website-advertisings/api";
import type { WebsiteAdvertising } from "@/features/website-advertisings/types";

type ModalMode = "create" | "edit";

type ModalState = {
  open: boolean;
  mode: ModalMode;
  item?: WebsiteAdvertising | null;
};

type PreviewState = {
  open: boolean;
  url: string;
  title: string;
};

const normalizeId = (value: number | string) => Number(value) || 0;

export default function WebsiteAdvertisingsPage() {
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [items, setItems] = useState<WebsiteAdvertising[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({ open: false, mode: "create", item: null });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ open: false, url: "", title: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWebsiteAdvertisings({
        page,
        pageSize,
        keyword,
        status: statusFilter === "all" ? undefined : statusFilter === "active" ? 1 : 0,
      });
      const list = Array.isArray(data?.items) ? data.items.map((i) => ({ ...i, id: normalizeId(i.id) })) : [];
      setItems(list);
      setTotal(typeof data?.total === "number" ? data.total : list.length);
      setPage(data.page ?? page);
      setPageSize(data.pageSize ?? pageSize);
      setSelectedIds(new Set());
    } catch {
      notify({ message: "Không thể tải danh sách quảng cáo. Vui lòng kiểm tra API.", variant: "error" });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [keyword, notify, page, pageSize, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(load, 350);
    return () => clearTimeout(timer);
  }, [load]);

  const handleSearchSubmit = () => {
    setPage(1);
  };

  const findItem = (id: number) => items.find((i) => i.id === id);

  const markSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const updateItemLocal = (id: number, updater: (item: WebsiteAdvertising) => WebsiteAdvertising) => {
    setItems((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
    markSelected(id);
  };

  const openPreview = (url?: string, title?: string) => {
    if (!url) return;
    setPreview({ open: true, url: buildImageUrl(url), title: title ?? "" });
  };

  const closePreview = () => setPreview({ open: false, url: "", title: "" });

  const handleDelete = (item: WebsiteAdvertising) => {
    confirm({
      title: "Xóa quảng cáo",
      description: `Bạn chắc chắn muốn xóa "${item.name || "quảng cáo"}"?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          await deleteWebsiteAdvertising(item.id);
          notify({ message: "Đã xóa quảng cáo.", variant: "success" });
          const newPage = items.length === 1 && page > 1 ? page - 1 : page;
          if (newPage !== page) {
            setPage(newPage);
          } else {
            load();
          }
        } catch {
          notify({ message: "Xóa thất bại.", variant: "error" });
        }
      },
    });
  };

  const openModal = (mode: ModalMode, item?: WebsiteAdvertising | null) => {
    setModalState({ open: true, mode, item: item ?? null });
  };

  const closeModal = () => setModalState((prev) => ({ ...prev, open: false }));

  const handleSaved = () => {
    setModalState((prev) => ({ ...prev, open: false }));
    load();
  };

  const handleKeyDownNumber = (e: KeyboardEvent<HTMLInputElement>, id: number) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      handleSortChange(e.currentTarget.value, id);
    }
  };

  const handleSortChange = (value: string, id: number) => {
    const num = Number(value) || 0;
    updateItemLocal(id, (item) => ({ ...item, sort: num }));
  };

  const handleTextBlur = (id: number, field: "name" | "address", value: string) => {
    updateItemLocal(id, (item) => ({ ...item, [field]: value.trim() }));
  };

  const handleTextKeyDown = (e: KeyboardEvent<HTMLInputElement>, id: number, field: "name" | "address") => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      handleTextBlur(id, field, e.currentTarget.value);
    }
  };

  const handleToggleStatus = (item: WebsiteAdvertising) => {
    const nextStatus: 0 | 1 = item.status === 1 ? 0 : 1;
    updateItemLocal(item.id, (current) => ({ ...current, status: nextStatus }));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!items.length) return;
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    confirm({
      title: "Xóa quảng cáo",
      description: `Bạn chắc chắn muốn xóa ${ids.length} quảng cáo đã chọn?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        setBulkSaving(true);
        try {
          for (const id of ids) {
            await deleteWebsiteAdvertising(id);
          }
          notify({ message: "Đã xóa các quảng cáo đã chọn.", variant: "success" });
          const newPage = items.length === ids.length && page > 1 ? page - 1 : page;
          setSelectedIds(new Set());
          if (newPage !== page) {
            setPage(newPage);
          } else {
            load();
          }
        } catch {
          notify({ message: "Xóa thất bại.", variant: "error" });
        } finally {
          setBulkSaving(false);
        }
      },
    });
  };

  const handleBulkUpdate = () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    confirm({
      title: "Cập nhật quảng cáo",
      description: `Áp dụng cập nhật cho ${ids.length} quảng cáo đã chọn?`,
      confirmText: "Cập nhật",
      onConfirm: async () => {
        setBulkSaving(true);
        try {
          for (const id of ids) {
            const item = findItem(id);
            if (!item) continue;
            await updateWebsiteAdvertising(id, {
              name: item.name ?? "",
              address: item.address ?? "",
              image: item.image ?? "",
              status: item.status,
              sort: item.sort ?? 0,
            });
          }
          notify({ message: "Đã cập nhật các quảng cáo đã chọn.", variant: "success" });
          setSelectedIds(new Set());
          load();
        } catch {
          notify({ message: "Cập nhật thất bại.", variant: "error" });
        } finally {
          setBulkSaving(false);
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 px-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Quản trị</p>
          <h1 className="text-xl font-semibold text-slate-900">Quản Lý Quảng Cáo</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Nội dung sản phẩm" },
            { label: "Quản lý quảng cáo" },
          ]}
          className="justify-end"
        />
      </div>

      <div className="flex flex-col gap-3 px-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <DeleteSelectedButton
            count={selectedIds.size}
            onClick={handleBulkDelete}
            disabled={bulkSaving}
          />
          <UpdateButton onClick={handleBulkUpdate} disabled={bulkSaving} />
          <AddNewButton onClick={() => openModal("create")}>Thêm quảng cáo</AddNewButton>
        </div>

        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:justify-end">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
            placeholder="Tìm theo tên quảng cáo hoặc Địa chỉ..."
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 md:w-80"
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
                    checked={items.length > 0 && selectedIds.size === items.length}
                    onChange={toggleSelectAll}
                    aria-label="Chọn tất cả"
                  />
                </th>
                <HeaderCell label="Tên quảng cáo" />
                <HeaderCell label="Hình ảnh" />
                <HeaderCell label="Địa chỉ" />
                <HeaderCell label="Thứ tự" className="w-24 text-center" />
                <HeaderCell label="Ẩn" className="w-16 text-center" />
                <HeaderCell label="Lượt xem" className="w-24 text-center" />
                <HeaderCell label="Ngày tạo" />
                <HeaderCell label="Chức năng" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">
                    Đang tải danh sách quảng cáo...
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.name || ""}
                        onBlur={(e) => handleTextBlur(item.id, "name", e.target.value)}
                        onKeyDown={(e) => handleTextKeyDown(e, item.id, "name")}
                        onChange={(e) => updateItemLocal(item.id, (current) => ({ ...current, name: e.target.value }))}
                        className="tme-input w-full text-sm"
                        placeholder="Tên quảng cáo"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {item.image ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                          onClick={() => openPreview(item.image ?? "", item.name ?? "")}
                        >
                          Xem ảnh
                        </button>
                      ) : (
                        <span className="text-xs italic text-slate-400">Chưa có ảnh</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.address || ""}
                        onBlur={(e) => handleTextBlur(item.id, "address", e.target.value)}
                        onKeyDown={(e) => handleTextKeyDown(e, item.id, "address")}
                        onChange={(e) => updateItemLocal(item.id, (current) => ({ ...current, address: e.target.value }))}
                        className="tme-input w-full text-sm"
                        placeholder="Nhập địa chỉ..."
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        value={item.sort ?? 0}
                        onBlur={(e) => handleSortChange(e.target.value, item.id)}
                        onKeyDown={(e) => handleKeyDownNumber(e, item.id)}
                        onChange={(e) => handleSortChange(e.target.value, item.id)}
                        className="tme-input w-20 text-center"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={item.status === 0}
                        onChange={() => handleToggleStatus(item)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                      />
                    </td>
                    <td className="px-3 py-2 text-center text-sm text-slate-600">
                      {typeof item.view === "number" ? item.view : 0}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-600">
                      {item.createdAt ? formatDate(item.createdAt, "dd/MM/yyyy") : "--"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        <EditActionButton
                          label="Sửa"
                          onClick={() => openModal("edit", item)}
                        />
                        <DeleteActionButton
                          onClick={() => handleDelete(item)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">
                    Chưa có quảng cáo nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page || 1} pageSize={pageSize || 10} totalItems={total} onPageChange={setPage} onPageSizeChange={(s) => setPageSize(s)} />

      <AdvertisingModal open={modalState.open} mode={modalState.mode} item={modalState.item || undefined} onClose={closeModal} onSaved={handleSaved} />

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
                ×
              </button>
            </div>
            <img src={preview.url} alt={preview.title || "Advertising image"} className="max-h-[75vh] w-full rounded-2xl object-contain" />
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

type ModalProps = {
  open: boolean;
  mode: ModalMode;
  item?: WebsiteAdvertising;
  onClose: () => void;
  onSaved: () => void;
};

function AdvertisingModal({ open, mode, item, onClose, onSaved }: ModalProps) {
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    image: "",
    status: 1 as 0 | 1,
    sort: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      if (item) {
        setForm({
          name: item.name ?? "",
          address: item.address ?? "",
          image: item.image ?? "",
          status: item.status ?? 1,
          sort: Number(item.sort ?? 0),
        });
      } else {
        setForm({ name: "", address: "", image: "", status: 1, sort: 0 });
      }
    }
  }, [open, item]);

  if (!open) return null;

  const triggerFile = () => fileInputRef.current?.click();

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadWebsiteAdvertisingImage(file);
      setForm((prev) => ({ ...prev, image: url }));
      notify({ message: "Đã tải ảnh lên.", variant: "success" });
    } catch {
      notify({ message: "Upload ảnh thất bại.", variant: "error" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      notify({ message: "Tên quảng cáo bắt buộc.", variant: "info" });
      return;
    }
    if (!form.address.trim()) {
      notify({ message: "Địa chỉ không được để trống.", variant: "info" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        image: form.image.trim(),
        status: form.status,
        sort: Number(form.sort) || 0,
      };
      if (mode === "create") {
        await createWebsiteAdvertising(payload);
        notify({ message: "Đã thêm quảng cáo.", variant: "success" });
      } else if (item) {
        await updateWebsiteAdvertising(item.id, payload, item);
        notify({ message: "Đã cập nhật quảng cáo.", variant: "success" });
      }
      onSaved();
    } catch {
      notify({ message: "Lưu thất bại. Vui lòng thử lại.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={() => !submitting && !uploading && onClose()} />
      <div className="relative z-10 w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
              {mode === "create" ? "Thêm mới" : "Cập nhật"}
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              {mode === "create" ? "Thêm quảng cáo" : "Cập nhật quảng cáo"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            aria-label="Đóng"
            disabled={submitting || uploading}
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tên quảng cáo *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="tme-input w-full"
              placeholder="Banner trang chủ"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Địa chỉ *</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="tme-input w-full"
              placeholder="Nhập địa chỉ..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium text-slate-700">Hình ảnh</label>
              <div className="flex gap-2">
                <button type="button" onClick={triggerFile} className="tme-btn tme-btn-secondary px-3 py-1 text-xs" disabled={uploading}>
                  {uploading ? "Đang tải..." : "Chọn ảnh"}
                </button>
              </div>
            </div>
            <input
              type="text"
              value={form.image}
              onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
              onDoubleClick={triggerFile}
              className="tme-input w-full"
              placeholder="/uploads/ads/banner1.jpg"
              disabled={uploading}
            />
            {form.image && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <img src={buildImageUrl(form.image)} alt="Preview" className="h-14 w-14 rounded-2xl object-cover" />
                <span className="text-xs text-slate-500">Double click để đổi ảnh khác.</span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <input
                id="status-hidden"
                type="checkbox"
                checked={form.status === 0}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.checked ? 0 : 1 }))}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
              />
              <label htmlFor="status-hidden" className="text-sm font-medium text-slate-700">
                Không hiển thị (ẩn)
              </label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Thứ tự sắp xếp</label>
              <input
                type="number"
                value={form.sort}
                onChange={(e) => setForm((prev) => ({ ...prev, sort: Number(e.target.value) || 0 }))}
                className="tme-input w-full"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="tme-btn tme-btn-secondary" disabled={submitting || uploading}>
              Hủy
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting || uploading} className="tme-btn tme-btn-primary">
              {mode === "create" ? "Thêm mới" : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
