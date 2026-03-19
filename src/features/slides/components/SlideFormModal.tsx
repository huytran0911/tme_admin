"use client";
/* eslint-disable @next/next/no-img-element */

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useToast } from "@/components/shared/Toast";
import { createSlide, updateSlide, uploadSlideAsset } from "../api";
import type { AdminSlide } from "../types";
import { buildImageUrl } from "@/lib/utils";

type SlideFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValue?: AdminSlide | null;
  onClose: () => void;
  onSaved: () => void;
};

type SlideFormState = {
  name: string;
  content: string;
  image: string;
  url: string;
  sort: number;
};

const defaultState: SlideFormState = {
  name: "",
  content: "",
  image: "",
  url: "",
  sort: 1,
};

export function SlideFormModal({ open, mode, initialValue, onClose, onSaved }: SlideFormModalProps) {
  const { notify } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<SlideFormState>(defaultState);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    if (initialValue) {
      setForm({
        name: initialValue.name ?? "",
        content: initialValue.content ?? "",
        image: initialValue.image ?? "",
        url: initialValue.url ?? "",
        sort: initialValue.sort ?? 1,
      }); 
      //setPreviewUrl(initialValue.image ? buildImageUrl(initialValue.image) : "");
    } else {
      setForm(defaultState);
      setPreviewUrl("");
    }
  }, [initialValue, open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = () => {
    if (submitting || uploading) return;
    onClose();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notify({ message: "Tên slide không được để trống.", variant: "info" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        content: form.content.trim() || undefined,
        image: form.image.trim() || undefined,
        url: form.url.trim() || undefined,
        sort: Number(form.sort) || 0,
      };
      if (mode === "create") {
        await createSlide(payload);
        notify({ message: "Đã thêm slide mới.", variant: "success" });
      } else if (initialValue) {
        await updateSlide(initialValue.id, payload, initialValue);
        notify({ message: "Đã cập nhật slide.", variant: "success" });
      }
      onSaved();
      onClose();
    } catch {
      notify({ message: "Không thể lưu slide. Vui lòng thử lại.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const triggerFilePicker = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadSlideAsset(file);
      setForm((prev) => ({ ...prev, image: url }));
      setPreviewUrl("");
      notify({ message: "Đã tải ảnh lên thành công.", variant: "success" });
    } catch {
      notify({ message: "Tải ảnh thất bại. Vui lòng thử lại.", variant: "error" });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const openPreview = () => {
    if (!form.image) return;
    setPreviewUrl(buildImageUrl(form.image));
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
              {mode === "create" ? "Thêm mới" : "Cập nhật"}
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              {mode === "create" ? "Thêm mới slide" : "Cập nhật slide"}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            aria-label="Đóng"
          >
            x
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tên slide *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="tme-input w-full"
              placeholder="Banner chủ đề..."
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-10 sm:items-center">
            <div className="sm:col-span-7">
              <label className="mb-1 block text-sm font-medium text-slate-700">Đường dẫn (URL)</label>
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
                className="tme-input w-full"
                placeholder="/products?sale=true"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Thứ tự sắp xếp</label>
              <input
                type="number"
                value={form.sort}
                onChange={(e) => setForm((prev) => ({ ...prev, sort: Number(e.target.value) || 0 }))}
                className="tme-input w-full"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-10 sm:items-end">
            <div className="sm:col-span-7">
              <label className="mb-1 block text-sm font-medium text-slate-700">Hình ảnh</label>
              <input
                type="text"
                value={form.image}
                onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
              className="tme-input w-full bg-white"
              placeholder="/uploads/slides/xxx.jpg"
            />
          </div>
            <div className="flex items-center justify-start gap-2 sm:col-span-3 sm:justify-end">
              <button
                type="button"
                onClick={triggerFilePicker}
                className="tme-btn tme-btn-secondary px-3 py-2 text-xs"
                disabled={uploading}
              >
                {uploading ? "Đang tải..." : "Chọn ảnh"}
              </button>
              {form.image && (
                <button
                  type="button"
                  onClick={openPreview}
                  className="tme-btn tme-btn-primary px-3 py-2 text-xs"
                >
                  Xem ảnh
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              rows={3}
              className="tme-input w-full"
              placeholder="Mô tả tiếng Việt..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="tme-btn tme-btn-secondary"
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="tme-btn tme-btn-primary"
            >
              {mode === "create" ? "Thêm mới" : "Cập nhật"}
            </button>
          </div>
        </form>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {previewUrl && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/60 px-4" onClick={() => setPreviewUrl("")}>
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800 line-clamp-1">{form.name || "Xem ảnh"}</p>
              <button
                type="button"
                onClick={() => setPreviewUrl("")}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <img src={previewUrl} alt={form.name || "Preview"} className="max-h-[75vh] w-full rounded-2xl object-contain" />
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
