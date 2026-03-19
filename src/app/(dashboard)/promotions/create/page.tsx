"use client";

import { useRouter } from "next/navigation";
import { createPromotion } from "@/features/promotions/api";
import { PromotionForm, type PromotionFormValues } from "@/components/promotions/PromotionForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";

export default function PromotionCreatePage() {
  const router = useRouter();
  const { notify } = useToast();

  const handleSubmit = async (values: PromotionFormValues) => {
    try {
      await createPromotion({
        name: values.name || undefined,
        nameEn: values.nameEn || undefined,
        description: values.description || undefined,
        descriptionEn: values.descriptionEn || undefined,
        content: values.content || undefined,
        contentEn: values.contentEn || undefined,
        applyFrom: values.applyFrom,
        applyTo: values.applyTo,
        saleOff: values.saleOff,
        isPercent: values.isPercent,
        freeTransportFee: values.freeTransportFee,
        applyForTotal: values.applyForTotal,
        sort: values.sort,
        forever: values.forever,
        popup: values.popup,
        image: values.image || undefined,
        point: values.point,
        menu: values.menu,
      });
      notify({ message: "Tạo khuyến mãi thành công.", variant: "success" });
      router.push("/promotions");
    } catch (err) {
      console.error("Failed to create promotion:", err);
      notify({ message: "Không thể tạo khuyến mãi. Vui lòng thử lại.", variant: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Thêm mới</p>
          <h1 className="text-2xl font-semibold text-slate-900">Tạo khuyến mãi</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Khuyến mãi", href: "/promotions" },
            { label: "Tạo mới" },
          ]}
        />
      </div>

      <PromotionForm onSubmit={handleSubmit} />
    </div>
  );
}
