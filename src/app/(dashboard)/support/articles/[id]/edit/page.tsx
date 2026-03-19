"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { fetchNewsById, updateNews, NewsType } from "@/features/news";
import type { NewsDetail } from "@/features/news/types";
import { NewsForm, type NewsFormValues } from "@/components/news/NewsForm";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";

type Props = {
  params: Promise<{ id: string }>;
};

export default function SupportArticleEditPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { notify } = useToast();
  const [item, setItem] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchItem = async () => {
      try {
        const data = await fetchNewsById(parseInt(id, 10));
        if (!mounted) return;
        setItem(data);
      } catch (err) {
        console.error("Failed to fetch support article:", err);
        if (!mounted) return;
        setError("Không thể tải bài viết hỗ trợ. Vui lòng thử lại.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchItem();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSubmit = async (values: NewsFormValues) => {
    try {
      await updateNews(parseInt(id, 10), {
        ...values,
        typeNews: NewsType.Support, // Force "hotro" type
      });
      notify({ message: "Cập nhật bài viết hỗ trợ thành công.", variant: "success" });
      router.push("/support/articles");
    } catch (err) {
      console.error("Failed to update support article:", err);
      notify({ message: "Không thể cập nhật bài viết hỗ trợ. Vui lòng thử lại.", variant: "error" });
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Đang tải bài viết hỗ trợ...
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
        {error || "Không tìm thấy bài viết hỗ trợ."}
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
            {item.name || "Bài viết hỗ trợ"}
          </h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Bài viết hỗ trợ", href: "/support/articles" },
            { label: "Chỉnh sửa" },
          ]}
          className="justify-end"
        />
      </div>

      <NewsForm
        defaultValues={{
          name: item.name,
          nameEn: item.nameEn || "",
          image: item.image || "",
          shortDescription: item.shortDescription || "",
          shortDescriptionEn: item.shortDescriptionEn || "",
          description: item.description || "",
          descriptionEn: item.descriptionEn || "",
          status: item.status,
          sort: item.sort,
          typeNews: item.typeNews || undefined,
        }}
        onSubmit={handleSubmit}
        isEdit
      />
    </div>
  );
}
