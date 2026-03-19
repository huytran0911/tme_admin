"use client";
/* eslint-disable @next/next/no-img-element */

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useToast } from "@/components/shared/Toast";
import { buildImageUrl } from "@/lib/utils";
import { createWebsiteAssociate, updateWebsiteAssociate, uploadWebsiteAssociateLogo } from "../api";
import type { WebsiteAssociate } from "../types";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialValue?: WebsiteAssociate | null;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  name: string;
  address: string;
  logoUrl: string;
  status: 0 | 1;
  sort: number;
};

const defaultState: FormState = {
  name: "",
  address: "",
  logoUrl: "",
  status: 1,
  sort: 1,
};

export function WebsiteAssociateFormModal({ open, mode, initialValue, onClose, onSaved }: Props) {
  const { notify } = useToast();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<FormState>(defaultState);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    if (initialValue) {
      setForm({
        name: initialValue.name ?? "",
        address: initialValue.address ?? "",
        logoUrl: initialValue.logoUrl ?? "",
        status: (initialValue.status ?? 1) === 0 ? 0 : 1,
        sort: initialValue.sort ?? 1,
      });
    } else {
      setForm(defaultState);
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

  const triggerFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadWebsiteAssociateLogo(file);
      setForm((prev) => ({ ...prev, logoUrl: url }));
      notify({ message: "Đã tải ảnh lên.", variant: "success" });
    } catch {
      notify({ message: "Tải ảnh thất bại.", variant: "error" });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notify({ message: "Tên liên kết bắt buộc.", variant: "info" });
      return;
    }
    if (!form.address.trim()) {
      notify({ message: "Địa chỉ website bắt buộc.", variant: "info" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        logoUrl: form.logoUrl.trim() || undefined,
        status: form.status,
        sort: Number(form.sort) || 0,
      };
      if (mode === "create") {
        await createWebsiteAssociate(payload);
        notify({ message: "Đã thêm liên kết website.", variant: "success" });
      } else if (initialValue) {
        await updateWebsiteAssociate(initialValue.id, payload, initialValue);
        notify({ message: "Đã cập nhật liên kết website.", variant: "success" });
      }
      onSaved();
      onClose();
    } catch {
      notify({ message: "Không thể lưu. Vui lòng thử lại.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={() => !submitting && !uploading && onClose()} />
      <div className="relative z-10 w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
              {mode === "create" ? "Thêm mới" : "Cập nhật"}
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              {mode === "create" ? "Thêm mới liên kết website" : "Cập nhật liên kết website"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            aria-label="Đóng"
            disabled={submitting || uploading}
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tên liên kết *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="tme-input w-full"
                placeholder="Google, Facebook..."
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Địa chỉ website *</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className="tme-input w-full"
                placeholder="https://example.com"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium text-slate-700">Logo / Hình ảnh</label>
              <button
                type="button"
                onClick={triggerFilePicker}
                className="tme-btn tme-btn-secondary px-3 py-1 text-xs"
                disabled={uploading}
              >
                {uploading ? "Đang tải..." : "Chọn ảnh"}
              </button>
            </div>
            <input
              type="text"
              value={form.logoUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
              onDoubleClick={triggerFilePicker}
              className="tme-input w-full bg-white"
              placeholder="/uploads/website-links/logo.png"
            />
            {form.logoUrl && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <img
                  src={buildImageUrl(form.logoUrl)}
                  alt={form.name || "Logo preview"}
                  className="h-14 w-14 rounded-2xl object-cover"
                />
                <span className="text-xs text-slate-500">Double click để mở chọn ảnh khác.</span>
              </div>
            )}
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
            <button type="button" onClick={onClose} className="tme-btn tme-btn-secondary" disabled={submitting}>
              Hủy
            </button>
            <button type="submit" disabled={submitting || uploading} className="tme-btn tme-btn-primary">
              {mode === "create" ? "Thêm mới" : "Cập nhật"}
            </button>
          </div>
        </form>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
    </div>,
    document.body,
  );
}
