"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PaymentMethodForm } from "@/components/admin/payment-methods/PaymentMethodForm";
import { usePaymentMethodDetail } from "@/hooks/admin/usePaymentMethods";
import { useToast } from "@/components/shared/Toast";

export default function PaymentMethodEditPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, isLoading, error } = usePaymentMethodDetail(id);
  const router = useRouter();
  const { notify } = useToast();

  useEffect(() => {
    if (error) {
      notify({ message: "Không thể tải dữ liệu.", variant: "error" });
    }
  }, [error, notify]);

  if (!id || error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
        Không tìm thấy phương thức thanh toán.
        <button onClick={() => router.push("/payment-methods")} className="ml-2 font-semibold underline">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  if (isLoading || !data) {
    return <div className="text-sm text-slate-600">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Quản trị</p>
          <h1 className="text-xl font-semibold text-slate-900">Cập nhật phương thức thanh toán</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Cấu hình" },
            { label: "Phương thức thanh toán", href: "/payment-methods" },
            { label: "Chỉnh sửa" },
          ]}
        />
      </div>

      <PaymentMethodForm mode="edit" initial={data} />
    </div>
  );
}