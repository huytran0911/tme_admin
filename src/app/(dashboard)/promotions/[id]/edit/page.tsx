"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { fetchPromotionById, updatePromotion } from "@/features/promotions/api";
import type { PromotionDetail } from "@/features/promotions/types";
import { PromotionForm, type PromotionFormValues } from "@/components/promotions/PromotionForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";

type Props = {
  params: Promise<{ id: string }>;
};

export default function PromotionEditPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { notify } = useToast();
  const [promotion, setPromotion] = useState<PromotionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchItem = async () => {
      try {
        const data = await fetchPromotionById(parseInt(id, 10));
        if (!mounted) return;
        setPromotion(data);
      } catch (err) {
        console.error("Failed to fetch promotion:", err);
        if (!mounted) return;
        setError("Không thể tải khuyến mãi. Vui lòng thử lại.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchItem();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSubmit = async (values: PromotionFormValues) => {
    try {
      await updatePromotion(parseInt(id, 10), {
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
      notify({ message: "Cập nhật khuyến mãi thành công.", variant: "success" });
      router.push("/promotions");
    } catch (err) {
      console.error("Failed to update promotion:", err);
      notify({ message: "Không thể cập nhật khuyến mãi. Vui lòng thử lại.", variant: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-slate-500">Đang tải...</p>
      </div>
    );
  }

  if (error || !promotion) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-rose-600">{error || "Không tìm thấy khuyến mãi."}</p>
        <button
          onClick={() => router.push("/promotions")}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  // Format dates for input type="date" (YYYY-MM-DD)
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Chỉnh sửa</p>
          <h1 className="text-2xl font-semibold text-slate-900">{promotion.name}</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Khuyến mãi", href: "/promotions" },
            { label: "Chỉnh sửa" },
          ]}
        />
      </div>

      <PromotionForm
        defaultValues={{
          name: promotion.name || "",
          nameEn: promotion.nameEn || "",
          description: promotion.description || "",
          descriptionEn: promotion.descriptionEn || "",
          content: promotion.content || "",
          contentEn: promotion.contentEn || "",
          applyFrom: formatDateForInput(promotion.applyFrom),
          applyTo: formatDateForInput(promotion.applyTo),
          saleOff: promotion.saleOff,
          isPercent: promotion.isPercent,
          freeTransportFee: promotion.freeTransportFee,
          applyForTotal: promotion.applyForTotal,
          sort: promotion.sort,
          forever: promotion.forever,
          popup: promotion.popup,
          image: promotion.image || "",
          point: promotion.point,
          menu: promotion.menu,
        }}
        onSubmit={handleSubmit}
        isEdit
      />
    </div>
  );
}
