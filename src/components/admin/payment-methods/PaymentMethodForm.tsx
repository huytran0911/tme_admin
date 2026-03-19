"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TipTapEditor } from "@/components/common/TipTapEditor";
import { collapseMediaUrls } from "@/lib/media";
import { useToast } from "@/components/shared/Toast";
import {
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  getErrorMessage,
  type PaymentMethod,
} from "@/hooks/admin/usePaymentMethods";

type FormValues = {
  name: string;
  nameEn: string;
  content: string;
  contentEn: string;
  status: 0 | 1;
  sort: number;
};

type Props = {
  initial?: PaymentMethod | null;
  mode: "create" | "edit";
};

export function PaymentMethodForm({ initial, mode }: Props) {
  const router = useRouter();
  const { notify } = useToast();
  const [form, setForm] = useState<FormValues>({
    name: "",
    nameEn: "",
    content: "",
    contentEn: "",
    status: 1,
    sort: 0,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  // React Query mutations
  const createMutation = useCreatePaymentMethod();
  const updateMutation = useUpdatePaymentMethod();

  const submitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name ?? "",
        nameEn: initial.nameEn ?? "",
        content: initial.content ?? "",
        contentEn: initial.contentEn ?? "",
        status: initial.status ?? 1,
        sort: Number(initial.sort ?? 0),
      });
    }
  }, [initial]);

  const handleSubmit = async () => {
    const nextErrors: typeof errors = {};
    if (!form.name.trim()) nextErrors.name = "Tên phương thức bắt buộc.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    // Collapse full URLs to relative paths before sending to API
    const dataToSubmit = {
      ...form,
      content: collapseMediaUrls(form.content),
      contentEn: collapseMediaUrls(form.contentEn),
    };

    if (mode === "create") {
      createMutation.mutate(dataToSubmit, {
        onSuccess: () => {
          notify({ message: "Thêm phương thức thanh toán thành công.", variant: "success" });
          router.push("/payment-methods");
        },
        onError: (error) => {
          notify({ message: getErrorMessage(error), variant: "error" });
        },
      });
    } else if (initial) {
      updateMutation.mutate(
        { id: initial.id, data: dataToSubmit },
        {
          onSuccess: () => {
            notify({ message: "Cập nhật phương thức thanh toán thành công.", variant: "success" });
            router.push("/payment-methods");
          },
          onError: (error) => {
            notify({ message: getErrorMessage(error), variant: "error" });
          },
        }
      );
    }
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tên phương thức *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className={`tme-input w-full ${errors.name ? "border-rose-300 ring-2 ring-rose-100" : ""}`}
            placeholder="Thanh toán khi nhận hàng"
          />
          {errors.name ? <p className="mt-1 text-xs text-rose-500">{errors.name}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tên Tiếng Anh</label>
          <input
            type="text"
            value={form.nameEn}
            onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))}
            className="tme-input w-full"
            placeholder="Cash on Delivery"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Trạng thái</label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <input
              type="checkbox"
              checked={form.status === 0}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.checked ? 0 : 1 }))}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
            />
            <span className="text-sm text-slate-700">Ẩn</span>
          </div>
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

      <div className="mt-5 space-y-4">
        <TipTapEditor
          label="Mô tả (Tiếng Việt)"
          value={form.content}
          onChange={(val) => setForm((prev) => ({ ...prev, content: val }))}
        />
        <TipTapEditor
          label="Mô tả (Tiếng Anh)"
          value={form.contentEn}
          onChange={(val) => setForm((prev) => ({ ...prev, contentEn: val }))}
        />
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={() => router.push("/payment-methods")} className="tme-btn tme-btn-secondary" disabled={submitting}>
          Hủy
        </button>
        <button type="button" onClick={handleSubmit} className="tme-btn tme-btn-primary" disabled={submitting}>
          {mode === "create" ? "Thêm mới" : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
}
