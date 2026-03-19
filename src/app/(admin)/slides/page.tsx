"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Pagination } from "@/components/shared/Pagination";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { ActionIconButton } from "@/components/shared/ActionIconButton";
import { EditActionButton } from "@/components/shared/EditActionButton";
import { DeleteSelectedButton, UpdateButton, AddNewButton } from "@/components/shared/ToolbarButton";
import { SlideFormModal } from "@/features/slides/components/SlideFormModal";
import { deleteSlide, fetchSlides, updateSlide } from "@/features/slides/api";
import type { AdminSlide, GetSlideListParams } from "@/features/slides/types";
import { buildImageUrl } from "@/lib/utils";

type EditableField = "name" | "content" | "sort" | "url";

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  slide: AdminSlide | null;
};

type PreviewState = {
  open: boolean;
  url: string;
  title: string;
};

export default function SlidesPage() {
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();
  const originalSlidesRef = useRef<Record<number, AdminSlide>>({});

  const [slides, setSlides] = useState<AdminSlide[]>([]);
  const [params, setParams] = useState<GetSlideListParams>({ page: 1, pageSize: 10, keyword: "" });
  const [keyword, setKeyword] = useState(params.keyword ?? "");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({ open: false, mode: "create", slide: null });
  const [preview, setPreview] = useState<PreviewState>({ open: false, url: "", title: "" });

  const loadSlides = useCallback(
    async (nextParams: GetSlideListParams) => {
      setLoading(true);
      try {
        const data = await fetchSlides(nextParams);
        const items = Array.isArray(data?.items) ? data.items : [];
        setSlides(items);
        originalSlidesRef.current = items.reduce<Record<number, AdminSlide>>((acc, item) => {
          acc[item.id] = { ...item };
          return acc;
        }, {});
        setTotal(typeof data?.total === "number" ? data.total : items.length);
        setSelectedIds(new Set());
      } catch {
        notify({ message: "Không thể tải danh sách slide. Vui lòng kiểm tra API.", variant: "error" });
        setSlides([]);
        setTotal(0);
        setSelectedIds(new Set());
      } finally {
        setLoading(false);
      }
    },
    [notify],
  );

  useEffect(() => {
    loadSlides(params);
  }, [loadSlides, params]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParams((prev) => ({
        ...prev,
        page: 1,
        keyword,
      }));
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  const setRowSaving = (id: number, saving: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev);
      saving ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const hasRowChanged = (slide: AdminSlide) => {
    const original = originalSlidesRef.current[slide.id];
    if (!original) return false;
    const normalize = (val?: string) => (val ?? "").trim();
    return (
      normalize(slide.name) !== normalize(original.name) ||
      normalize(slide.image) !== normalize(original.image) ||
      normalize(slide.content) !== normalize(original.content) ||
      normalize(slide.url) !== normalize(original.url) ||
      Number(slide.sort ?? 0) !== Number(original.sort ?? 0)
    );
  };

  const handleFieldChange = (id: number, field: EditableField, value: string) => {
    const current = slides.find((slide) => slide.id === id);
    const updated =
      current && field === "sort"
        ? ({ ...current, sort: Number(value) || 0 } as AdminSlide)
        : current
          ? ({ ...current, [field]: value } as AdminSlide)
          : null;

    setSlides((prev) => prev.map((slide) => (slide.id === id && updated ? updated : slide)));

    if (updated) {
      const changed = hasRowChanged(updated);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        changed ? next.add(id) : next.delete(id);
        return next;
      });
    }
  };
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const updateSlideInline = async (id: number, payload: Partial<AdminSlide>) => {
    if (!Object.keys(payload).length) return;
    closePreview();
    const cleanPayload = {
      name: (payload.name ?? originalSlidesRef.current[id]?.name ?? "").trim(),
      image: (payload.image ?? originalSlidesRef.current[id]?.image ?? "").trim(),
      content: (payload.content ?? originalSlidesRef.current[id]?.content ?? "").trim(),
      url: (payload.url ?? originalSlidesRef.current[id]?.url ?? "").trim(),
      sort: Number(payload.sort ?? originalSlidesRef.current[id]?.sort ?? 0),
    };
    setRowSaving(id, true);
    try {
      const existing = originalSlidesRef.current[id] ?? slides.find((slide) => slide.id === id);
      const updated = await updateSlide(id, cleanPayload, existing);
      const merged = { ...(existing || { id }), ...cleanPayload, ...updated } as AdminSlide;
      originalSlidesRef.current[id] = merged;
      setSlides((prev) => prev.map((slide) => (slide.id === id ? merged : slide)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        hasRowChanged(merged) ? next.add(id) : next.delete(id);
        return next;
      });
      notify({ message: "Đã cập nhật slide.", variant: "success" });
    } catch {
      notify({ message: "Cập nhật slide thất bại.", variant: "error" });
      const fallback = originalSlidesRef.current[id];
      if (fallback) {
        setSlides((prev) => prev.map((slide) => (slide.id === id ? fallback : slide)));
      }
    } finally {
      setRowSaving(id, false);
    }
  };

  const handleDeleteSlide = (slide: AdminSlide) => {
    confirm({
      title: "Xóa slide",
      description: `Bạn chắc chắn muốn xóa "${slide.name}"?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          await deleteSlide(slide.id);
          notify({ message: "Đã xóa slide.", variant: "success" });
          loadSlides(params);
        } catch {
          notify({ message: "Xóa slide thất bại.", variant: "error" });
        }
      },
    });
  };

  const openCreateModal = () => setModalState({ open: true, mode: "create", slide: null });
  const openEditModal = (slide: AdminSlide) => setModalState({ open: true, mode: "edit", slide });
  const closeModal = () => setModalState((prev) => ({ ...prev, open: false }));

  const openPreview = (url?: string, title?: string) => {
    if (!url) return;
    setPreview({ open: true, url: buildImageUrl(url), title: title ?? "" });
  };
  const closePreview = () => setPreview({ open: false, url: "", title: "" });

  const handlePageChange = (page: number) => setParams((prev) => ({ ...prev, page }));
  const handlePageSizeChange = (pageSize: number) => setParams((prev) => ({ ...prev, pageSize, page: 1 }));

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!slides.length) return;
    if (selectedIds.size === slides.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(slides.map((s) => s.id)));
    }
  };

  const computeDirtyIds = () => {
    const dirty = new Set<number>();
    slides.forEach((slide) => {
      if (hasRowChanged(slide)) dirty.add(slide.id);
    });
    return dirty;
  };

  const handleBulkDeleteClick = () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    confirm({
      title: "Xóa slide",
      description: `Bạn chắc chắn muốn xóa ${ids.length} slide đã chọn?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        setBulkSaving(true);
        try {
          for (const id of ids) {
            await deleteSlide(id);
          }
          notify({ message: "Đã xóa các slide đã chọn.", variant: "success" });
          setSelectedIds(new Set());
          loadSlides(params);
        } catch {
          notify({ message: "Xóa slide thất bại.", variant: "error" });
        } finally {
          setBulkSaving(false);
        }
      },
    });
  };

  const handleBulkUpdateClick = () => {
    const dirtySet = selectedIds.size ? new Set(selectedIds) : computeDirtyIds();
    if (!dirtySet.size) {
      notify({ message: "Không có thay đổi cần cập nhật.", variant: "info" });
      return;
    }
    confirm({
      title: "Cập nhật slide",
      description: `Áp dụng cập nhật cho ${dirtySet.size} slide đã chọn?`,
      confirmText: "Cập nhật",
      onConfirm: async () => {
        setBulkSaving(true);
        try {
          for (const id of dirtySet) {
            const slide = slides.find((s) => s.id === id);
            if (slide) {
              await updateSlideInline(id, {
                name: slide.name,
                image: slide.image,
                content: slide.content,
                url: slide.url,
                sort: slide.sort,
              });
            }
          }
          setSelectedIds(new Set());
          notify({ message: "Đã cập nhật slide.", variant: "success" });
          loadSlides(params);
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
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Quản trị</p>
          <h1 className="text-xl font-semibold text-slate-900">Quản lý Slide</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Nội dung sản phẩm" },
            { label: "Quản lý slide" },
          ]}
          className="justify-end"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 px-2">
        <div className="flex flex-wrap items-center gap-2">
          <DeleteSelectedButton
            count={selectedIds.size}
            onClick={handleBulkDeleteClick}
            disabled={bulkSaving}
          />
          <UpdateButton onClick={handleBulkUpdateClick} disabled={bulkSaving} />
          <AddNewButton onClick={openCreateModal}>Thêm slide</AddNewButton>
        </div>

        <div className="ml-auto flex w-full max-w-xs items-center gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên slide..."
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
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
                    checked={slides.length > 0 && selectedIds.size === slides.length}
                    onChange={toggleSelectAll}
                    aria-label="Chọn tất cả"
                  />
                </th>
                <HeaderCell label="Tên slide" />
                <HeaderCell label="Hình ảnh" />
                <HeaderCell label="Thứ tự" className="text-center" />
                <HeaderCell label="Đường dẫn" />
                <HeaderCell label="Mô tả" />
                <HeaderCell label="Chức năng" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    Đang tải danh sách slide...
                  </td>
                </tr>
              ) : slides.length ? (
                slides.map((slide) => {
                  const rowSaving = savingIds.has(slide.id);
                  const isSelected = selectedIds.has(slide.id);
                  return (
                    <tr key={slide.id} className="hover:bg-slate-50/60">
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                          checked={isSelected}
                          onChange={() => toggleSelect(slide.id)}
                        />
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <input
                          type="text"
                          value={slide.name}
                          disabled={rowSaving}
                          onChange={(e) => handleFieldChange(slide.id, "name", e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          className={`tme-input w-full ${rowSaving ? "opacity-60" : ""}`}
                          placeholder="Tên slide"
                        />
                        {(slide.groupName || slide.groupId) && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            {slide.groupName ? slide.groupName : `Nhóm #${slide.groupId}`}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {slide.image ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={buildImageUrl(slide.image)}
                              alt={slide.name}
                              className="h-10 w-10 cursor-pointer rounded-lg object-cover shadow-sm transition hover:opacity-90"
                              onClick={() => openPreview(slide.image, slide.name)}
                            />
                            <button
                              type="button"
                              onClick={() => openPreview(slide.image, slide.name)}
                              className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                            >
                              Xem ảnh
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">Chưa có ảnh</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="number"
                          value={slide.sort}
                          disabled={rowSaving}
                          onChange={(e) => handleFieldChange(slide.id, "sort", e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          className={`tme-input w-20 text-center ${rowSaving ? "opacity-60" : ""}`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={slide.url ?? ""}
                          disabled={rowSaving}
                          onDoubleClick={() => openEditModal(slide)}
                          onChange={(e) => handleFieldChange(slide.id, "url", e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          className={`tme-input w-full ${rowSaving ? "opacity-60" : ""}`}
                          placeholder="/products?sale=true"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={slide.content ?? ""}
                          disabled={rowSaving}
                          onDoubleClick={() => openEditModal(slide)}
                          onChange={(e) => handleFieldChange(slide.id, "content", e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          className={`tme-input w-full ${rowSaving ? "opacity-60" : ""}`}
                          placeholder="Mô tả hoặc ghi chú..."
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <ActionIconButton
                            label="Cập nhật"
                          onClick={() =>
                            updateSlideInline(slide.id, {
                              name: slide.name,
                              image: slide.image,
                              content: slide.content,
                              url: slide.url,
                              sort: slide.sort,
                            })
                          }
                            disabled={rowSaving || !hasRowChanged(slide)}
                            variant="primary"
                            icon={
                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path d="M16.78 5.72a.75.75 0 0 0-1.06-1.06l-7.25 7.25-3.19-3.2a.75.75 0 1 0-1.06 1.06l3.72 3.72a.75.75 0 0 0 1.06 0l7.78-7.77Z" />
                              </svg>
                            }
                          />
                          <EditActionButton onClick={() => openEditModal(slide)} disabled={rowSaving} />
                          <ActionIconButton
                            label="Xóa"
                            onClick={() => handleDeleteSlide(slide)}
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
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    Chưa có slide nào.
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

      <SlideFormModal
        open={modalState.open}
        mode={modalState.mode}
        initialValue={modalState.mode === "edit" ? modalState.slide ?? undefined : undefined}
        onClose={closeModal}
        onSaved={() => loadSlides(params)}
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
            <img src={preview.url} alt={preview.title || "Slide image"} className="max-h-[75vh] w-full rounded-2xl object-contain" />
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
