"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { fetchCategoryById, updateCategory } from "@/features/categories/api";
import type { CategoryDetail } from "@/features/categories/types";
import { CategoryForm, type CategoryFormValues } from "@/components/categories/CategoryForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";

type Props = {
  params: Promise<{ id: string }>;
};

export default function CategoryEditPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { notify } = useToast();
  const [item, setItem] = useState<CategoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchItem = async () => {
      try {
        const data = await fetchCategoryById(parseInt(id, 10));
        if (!mounted) return;
        setItem(data);
      } catch (err) {
        console.error("Failed to fetch category:", err);
        if (!mounted) return;
        setError("Không thể tải danh mục. Vui lòng thử lại.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchItem();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSubmit = async (values: CategoryFormValues) => {
    try {
      await updateCategory(parseInt(id, 10), {
        name: values.name,
        nameEn: values.nameEn || null,
        content: values.content || null,
        contentEn: values.contentEn || null,
        image: values.image || null,
        groupId: values.groupId,
        parentId: values.parentId,
        sortOrder: values.sortOrder,
        displayType: values.displayType,
      });
      notify({ message: "Cập nhật danh mục thành công.", variant: "success" });
      router.push("/catalog/categories");
    } catch (err) {
      console.error("Failed to update category:", err);
      notify({ message: "Không thể cập nhật danh mục. Vui lòng thử lại.", variant: "error" });
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Đang tải danh mục...
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
        {error || "Không tìm thấy danh mục."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Chỉnh sửa
          </p>
          <h1 className="text-xl font-semibold text-slate-900">
            {item.name || "Danh mục"}
          </h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Danh mục sản phẩm", href: "/catalog/categories" },
            { label: "Chỉnh sửa" },
          ]}
          className="justify-end"
        />
      </div>

      <CategoryForm
        defaultValues={{
          name: item.name || "",
          nameEn: item.nameEn || "",
          content: item.content || "",
          contentEn: item.contentEn || "",
          image: item.image || "",
          groupId: item.groupId || 0,
          parentId: item.parentId,
          sortOrder: item.sortOrder,
          displayType: item.displayType || 0,
          status: item.status || 0,
          priceToPoint: item.priceToPoint || 0,
        }}
        onSubmit={handleSubmit}
        isEdit
      />
    </div>
  );
}
