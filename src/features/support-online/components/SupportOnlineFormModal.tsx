"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/components/shared/Toast";
import { createSupportOnline, updateSupportOnline } from "../api";
import type { SupportOnlineItem } from "../types";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialValue?: SupportOnlineItem | null;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  name: string;
  link: string;
  phone: string;
  email: string;
  sort: number;
  status: 0 | 1;
};

const defaultState: FormState = {
  name: "",
  link: "",
  phone: "",
  email: "",
  sort: 1,
  status: 1,
};

export function SupportOnlineFormModal({ open, mode, initialValue, onClose, onSaved }: Props) {
  const { notify } = useToast();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<FormState>(defaultState);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    if (initialValue) {
      setForm({
        name: initialValue.name ?? "",
        link: initialValue.link ?? "",
        phone: initialValue.phone ?? "",
        email: initialValue.email ?? "",
        sort: initialValue.sort ?? 1,
        status: (initialValue.status ?? 1) === 0 ? 0 : 1,
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notify({ message: "Tên trực tuyến bắt buộc.", variant: "info" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        link: form.link.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        sort: Number(form.sort) || 0,
        status: form.status,
      };
      if (mode === "create") {
        await createSupportOnline(payload);
        notify({ message: "Đã thêm hỗ trợ trực tuyến.", variant: "success" });
      } else if (initialValue) {
        await updateSupportOnline(initialValue.id, payload);
        notify({ message: "Đã cập nhật hỗ trợ trực tuyến.", variant: "success" });
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
      <div className="absolute inset-0 bg-slate-900/30" onClick={() => !submitting && onClose()} />
      <div className="relative z-10 w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
              {mode === "create" ? "Thêm mới" : "Cập nhật"}
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              {mode === "create" ? "Thêm mới hỗ trợ trực tuyến" : "Cập nhật hỗ trợ trực tuyến"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            aria-label="Đóng"
            disabled={submitting}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tên trực tuyến *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="tme-input w-full"
              placeholder="Nhập tên hiển thị..."
              required
              disabled={mode === "edit"}
              readOnly={mode === "edit"}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Link / Yahoo ID</label>
            <input
              type="text"
              value={form.link}
              onChange={(e) => setForm((prev) => ({ ...prev, link: e.target.value }))}
              className="tme-input w-full"
              placeholder="Nhập Yahoo ID hoặc link liên hệ..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Số điện thoại</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="tme-input w-full"
                placeholder="Nhập số điện thoại..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="tme-input w-full"
                placeholder="Nhập email..."
              />
            </div>
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
            <button type="submit" disabled={submitting} className="tme-btn tme-btn-primary">
              {mode === "create" ? "Thêm mới" : "Cập nhật"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
