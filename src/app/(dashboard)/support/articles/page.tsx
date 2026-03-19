import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SupportArticlesListClient } from "./page.client";

export default function SupportArticlesPage() {
  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Quản lý hỗ trợ
          </p>
          <h1 className="text-xl font-semibold text-slate-900">Bài viết hỗ trợ</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Bài viết hỗ trợ" },
          ]}
          className="justify-end"
        />
      </div>

      <SupportArticlesListClient />
    </div>
  );
}
