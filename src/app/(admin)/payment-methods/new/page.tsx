"use client";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PaymentMethodForm } from "@/components/admin/payment-methods/PaymentMethodForm";

export default function PaymentMethodCreatePage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Quản trị</p>
          <h1 className="text-xl font-semibold text-slate-900">Thêm phương thức thanh toán</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Cấu hình" },
            { label: "Phương thức thanh toán", href: "/payment-methods" },
            { label: "Thêm mới" },
          ]}
        />
      </div>

      <PaymentMethodForm mode="create" />
    </div>
  );
}
