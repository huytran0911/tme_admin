import Link from "next/link";
import { Suspense } from "react";
import { NewsListClient } from "./page.client";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function NewsPage() {
  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Quản lý nội dung
          </p>
          <h1 className="text-xl font-semibold text-slate-900">Tin tức</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Tin tức" },
          ]}
          className="justify-end"
        />
      </div>

      <Suspense
        fallback={
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Đang tải dữ liệu...
          </div>
        }
      >
        <NewsListClient />
      </Suspense>
    </div>
  );
}
