"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { fetchSaleOffById, updateSaleOff } from "@/features/sale-off/api";
import type { SaleOffDetail } from "@/features/sale-off/types";
import { SaleOffForm, type SaleOffFormValues } from "@/components/sale-off/SaleOffForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";

type Props = {
  params: Promise<{ id: string }>;
};

export default function SaleOffEditPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { notify } = useToast();
  const [item, setItem] = useState<SaleOffDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchItem = async () => {
      try {
        const data = await fetchSaleOffById(parseInt(id, 10));
        if (!mounted) return;
        setItem(data);
      } catch (err) {
        console.error("Failed to fetch sale-off:", err);
        if (!mounted) return;
        setError("Không thể tải chiến dịch. Vui lòng thử lại.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchItem();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSubmit = async (values: SaleOffFormValues) => {
    try {
      // If forever, set far future dates
      const applyFrom = values.forever
        ? "2026-01-01"
        : (values.applyFrom || null);
      const applyTo = values.forever
        ? "2100-12-12"
        : (values.applyTo || null);

      await updateSaleOff(parseInt(id, 10), {
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
      notify({ message: "Cập nhật chiến dịch thành công.", variant: "success" });
      router.push("/sale-off");
    } catch (err) {
      console.error("Failed to update sale-off:", err);
      notify({ message: "Không thể cập nhật chiến dịch. Vui lòng thử lại.", variant: "error" });
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Đang tải chiến dịch...
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
        {error || "Không tìm thấy chiến dịch."}
      </div>
    );
  }

  // Helper to format date for input[type="date"]
  const formatDateForInput = (dateStr: string | null): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Chỉnh sửa</p>
          <h1 className="text-xl font-semibold text-slate-900">{item.name || "Chiến dịch"}</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Giảm giá sản phẩm", href: "/sale-off" },
            { label: "Chỉnh sửa" },
          ]}
          className="justify-end"
        />
      </div>

      <SaleOffForm
        defaultValues={{
          name: item.name,
          nameEn: item.nameEn || "",
          description: item.description || "",
          descriptionEn: item.descriptionEn || "",
          content: item.content || "",
          contentEn: item.contentEn || "",
          applyFrom: formatDateForInput(item.applyFrom),
          applyTo: formatDateForInput(item.applyTo),
          forever: item.forever,
        }}
        onSubmit={handleSubmit}
        isEdit
      />
    </div>
  );
}
