"use client";

import { useRouter } from "next/navigation";
import { createNews, NewsType } from "@/features/news";
import { NewsForm, type NewsFormValues } from "@/components/news/NewsForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";

export default function SupportArticleCreatePage() {
  const router = useRouter();
  const { notify } = useToast();

  const handleSubmit = async (values: NewsFormValues) => {
    try {
      await createNews({
        ...values,
        typeNews: NewsType.Support, // Force "hotro" type
      });
      notify({ message: "Tạo bài viết hỗ trợ thành công.", variant: "success" });
      router.push("/support/articles");
    } catch (err) {
      console.error("Failed to create support article:", err);
      notify({ message: "Không thể tạo bài viết hỗ trợ. Vui lòng thử lại.", variant: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Tạo mới
          </p>
          <h1 className="text-xl font-semibold text-slate-900">Bài viết hỗ trợ mới</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Bài viết hỗ trợ", href: "/support/articles" },
            { label: "Tạo mới" },
          ]}
          className="justify-end"
        />
      </div>

      <NewsForm onSubmit={handleSubmit} />
    </div>
  );
}
