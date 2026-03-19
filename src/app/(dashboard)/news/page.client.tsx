"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchNewsList, updateNews, deleteNews, fetchNewsById, NewsType } from "@/features/news";
import type { NewsListItem, NewsListParams } from "@/features/news/types";
import { NewsTable } from "@/features/news/components/NewsTable";
import { Pagination } from "@/components/shared/Pagination";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { DeleteSelectedButton, UpdateButton, AddNewButton } from "@/components/shared/ToolbarButton";
import { addNewsListToHome } from "@/features/news-home/api";

export function NewsListClient() {
  const router = useRouter();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();
  const [items, setItems] = useState<NewsListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [params, setParams] = useState<NewsListParams>({
    Page: 1,
    PageSize: 10,
    Keyword: "",
    TypeNews: NewsType.News, // Only fetch "tintuc" type
  });
  const [total, setTotal] = useState(0);

  const load = async (nextParams: NewsListParams = params) => {
    setLoading(true);
    try {
      const data = await fetchNewsList(nextParams);
      setItems(data.items);
      setTotal(data.total);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to fetch news:", err);
      notify({
        message: "Không thể tải danh sách tin tức. Vui lòng kiểm tra API.",
        variant: "error",
      });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParams((prev) => ({ ...prev, Page: 1, Keyword: keyword }));
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  // Handle inline changes (update local state)
  const handleChangeItem = (updatedItem: NewsListItem) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  // Save item inline (sort, status)
  const handleSaveItem = async (item: NewsListItem) => {
    try {
      // First fetch the full news data to get all fields
      const newsDetail = await fetchNewsById(item.id);

      // Update with the new values from inline edit
      await updateNews(item.id, {
        name: newsDetail.name,
        nameEn: newsDetail.nameEn,
        image: newsDetail.image,
        shortDescription: newsDetail.shortDescription,
        shortDescriptionEn: newsDetail.shortDescriptionEn,
        description: newsDetail.description,
        descriptionEn: newsDetail.descriptionEn,
        status: item.status,
        sort: item.sort,
      });

      notify({ message: "Đã cập nhật tin tức.", variant: "success" });
      // Deselect after save
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } catch (err) {
      console.error("Failed to update news:", err);
      notify({ message: "Cập nhật thất bại. Vui lòng thử lại.", variant: "error" });
    }
  };

  const performDelete = async (item: NewsListItem) => {
    try {
      await deleteNews(item.id);
      notify({ message: "Đã xóa tin tức.", variant: "success" });
      load(params);
    } catch (err) {
      console.error("Failed to delete news:", err);
      notify({ message: "Xóa thất bại. Vui lòng thử lại.", variant: "error" });
    }
  };

  const handleDeleteItem = (item: NewsListItem) => {
    confirm({
      title: "Xóa tin tức",
      description: `Bạn có chắc muốn xóa tin tức "${item.name}"?`,
      confirmText: "Xóa",
      onConfirm: () => performDelete(item),
    });
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;

    try {
      for (const id of selectedIds) {
        await deleteNews(id);
      }
      notify({ message: "Đã xóa các tin tức đã chọn.", variant: "success" });
      setSelectedIds(new Set());
      load(params);
    } catch (err) {
      console.error("Failed to bulk delete:", err);
      notify({ message: "Xóa hàng loạt thất bại.", variant: "error" });
    }
  };

  const handleBulkDeleteClick = () => {
    if (!selectedIds.size) return;
    confirm({
      title: "Xóa tin tức",
      description: `Bạn có chắc muốn xóa ${selectedIds.size} tin tức đã chọn?`,
      confirmText: "Xóa",
      onConfirm: handleBulkDelete,
    });
  };

  // Bulk update all selected items
  const handleBulkUpdate = async () => {
    if (!selectedIds.size) {
      notify({ message: "Chưa có thay đổi nào cần cập nhật.", variant: "info" });
      return;
    }

    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    let successCount = 0;

    for (const item of selectedItems) {
      try {
        const newsDetail = await fetchNewsById(item.id);
        await updateNews(item.id, {
          name: newsDetail.name,
          nameEn: newsDetail.nameEn,
          image: newsDetail.image,
          shortDescription: newsDetail.shortDescription,
          shortDescriptionEn: newsDetail.shortDescriptionEn,
          description: newsDetail.description,
          descriptionEn: newsDetail.descriptionEn,
          status: item.status,
          sort: item.sort,
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to update news ${item.id}:`, err);
      }
    }

    if (successCount > 0) {
      notify({ message: `Đã cập nhật ${successCount} tin tức.`, variant: "success" });
      setSelectedIds(new Set());
      load(params);
    } else {
      notify({ message: "Cập nhật thất bại.", variant: "error" });
    }
  };

  const handleBulkUpdateClick = () => {
    if (!selectedIds.size) {
      notify({ message: "Vui lòng chọn ít nhất 1 tin tức để cập nhật.", variant: "info" });
      return;
    }
    confirm({
      title: "Cập nhật tin tức",
      description: `Cập nhật ${selectedIds.size} tin tức đã chọn?`,
      confirmText: "Cập nhật",
      onConfirm: handleBulkUpdate,
    });
  };

  // Add selected news to home page
  const handleAddToHomePage = async () => {
    if (!selectedIds.size) {
      notify({ message: "Vui lòng chọn ít nhất 1 tin tức để thêm vào trang chủ.", variant: "info" });
      return;
    }

    try {
      const newsItems = Array.from(selectedIds).map((newsId) => ({
        newsId,
        sort: 0,
        status: 1, // 1 = visible
      }));

      await addNewsListToHome({ newsItems });
      notify({ message: "Đã thêm tin tức vào trang chủ.", variant: "success" });

      // Navigate to news homepage
      router.push("/news/homepage");
    } catch (err) {
      console.error("Failed to add news to home:", err);
      notify({ message: "Thêm tin tức vào trang chủ thất bại.", variant: "error" });
    }
  };

  const handlePageChange = (nextPage: number) => {
    setParams((prev) => ({ ...prev, Page: nextPage }));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-2">
        <div className="flex flex-wrap items-center gap-2">
          <DeleteSelectedButton
            count={selectedIds.size}
            onClick={handleBulkDeleteClick}
          />
          <UpdateButton onClick={handleBulkUpdateClick} />
          <AddNewButton href="/news/create">Thêm tin tức</AddNewButton>
          <button
            onClick={handleAddToHomePage}
            disabled={selectedIds.size === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Cập nhật tin tức trang chủ
          </button>
        </div>

        <div className="ml-auto flex w-full max-w-xs items-center gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tiêu đề..."
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      {/* Table */}
      <NewsTable
        items={items}
        loading={loading}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onChangeItem={handleChangeItem}
        onSaveItem={handleSaveItem}
        onDeleteItem={handleDeleteItem}
      />

      {/* Pagination */}
      <Pagination
        page={params.Page || 1}
        pageSize={params.PageSize || 10}
        totalItems={total}
        onPageChange={handlePageChange}
        onPageSizeChange={(s) => setParams((prev) => ({ ...prev, Page: 1, PageSize: s }))}
      />

      {dialog}
    </div>
  );
}
