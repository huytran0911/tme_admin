"use client";

import { useRouter } from "next/navigation";
import { createSaleOff } from "@/features/sale-off/api";
import { SaleOffForm, type SaleOffFormValues } from "@/components/sale-off/SaleOffForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";

export default function SaleOffCreatePage() {
  const router = useRouter();
  const { notify } = useToast();

  const handleSubmit = async (values: SaleOffFormValues) => {
    try {
      // If forever, set far future dates
      const applyFrom = values.forever
        ? "2026-01-01"
        : (values.applyFrom || null);
      const applyTo = values.forever
        ? "2100-12-12"
        : (values.applyTo || null);

      await createSaleOff({
        name: values.name,
        nameEn: values.nameEn || "",
        description: values.description || "",
        descriptionEn: values.descriptionEn || "",
        content: values.content || "",
        contentEn: values.contentEn || "",
        applyFrom,
        applyTo,
        forever: values.forever ?? false,
      });
      notify({ message: "Tạo chiến dịch thành công.", variant: "success" });
      router.push("/sale-off");
    } catch (err) {
      console.error("Failed to create sale-off:", err);
      notify({ message: "Không thể tạo chiến dịch. Vui lòng thử lại.", variant: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Tạo mới</p>
          <h1 className="text-xl font-semibold text-slate-900">Chiến dịch giảm giá</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Giảm giá sản phẩm", href: "/sale-off" },
            { label: "Tạo mới" },
          ]}
          className="justify-end"
        />
      </div>

      <SaleOffForm onSubmit={handleSubmit} />
    </div>
  );
}
