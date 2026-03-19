"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createCategory } from "@/features/categories/api";
import { CategoryForm, type CategoryFormValues } from "@/components/categories/CategoryForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";

function CategoryCreatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useToast();

  // Get default groupId and parentId from URL params
  const defaultGroupId = searchParams.get("groupId")
    ? parseInt(searchParams.get("groupId")!, 10)
    : 0;
  const defaultParentId = searchParams.get("parentId")
    ? parseInt(searchParams.get("parentId")!, 10)
    : 0;

  const handleSubmit = async (values: CategoryFormValues) => {
    try {
      await createCategory({
        name: values.name,
        nameEn: values.nameEn || null,
        content: values.content || null,
        contentEn: values.contentEn || null,
        image: values.image || null,
        groupId: values.groupId,
        parentId: values.parentId,
        sortOrder: values.sortOrder,
        displayType: values.displayType,
        status: values.status,
        priceToPoint: values.priceToPoint,
      });
      notify({ message: "Tạo danh mục thành công.", variant: "success" });
      router.push("/catalog/categories");
    } catch (err) {
      console.error("Failed to create category:", err);
      notify({ message: "Không thể tạo danh mục. Vui lòng thử lại.", variant: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Thêm mới
          </p>
          <h1 className="text-xl font-semibold text-slate-900">Tạo danh mục</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Danh mục sản phẩm", href: "/catalog/categories" },
            { label: "Thêm mới" },
          ]}
          className="justify-end"
        />
      </div>

      <CategoryForm
        defaultValues={{
          groupId: defaultGroupId,
          parentId: defaultParentId,
          sortOrder: 1,
          displayType: 0,
          status: 0,
          priceToPoint: 0,
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default function CategoryCreatePage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-slate-500">Đang tải...</div>}>
      <CategoryCreatePageContent />
    </Suspense>
  );
}
