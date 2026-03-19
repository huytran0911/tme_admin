"use client";

import { useRouter } from "next/navigation";
import { createNews } from "@/features/news/api";
import { NewsForm, type NewsFormValues } from "@/components/news/NewsForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";

export default function NewsCreatePage() {
  const router = useRouter();
  const { notify } = useToast();

  const handleSubmit = async (values: NewsFormValues) => {
    try {
      await createNews(values);
      notify({ message: "Tạo tin tức thành công.", variant: "success" });
      router.push("/news");
    } catch (err) {
      console.error("Failed to create news:", err);
      notify({ message: "Không thể tạo tin tức. Vui lòng thử lại.", variant: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Tạo mới
          </p>
          <h1 className="text-xl font-semibold text-slate-900">Tin tức mới</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Tin tức", href: "/news" },
            { label: "Tạo mới" },
          ]}
          className="justify-end"
        />
      </div>

      <NewsForm onSubmit={handleSubmit} />
    </div>
  );
}
