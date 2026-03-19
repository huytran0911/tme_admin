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

export function SupportArticlesListClient() {
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
    TypeNews: NewsType.Support, // Only fetch "hotro" type
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
      console.error("Failed to fetch support articles:", err);
      notify({
        message: "Không thể tải danh sách bài viết hỗ trợ. Vui lòng kiểm tra API.",
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

      notify({ message: "Đã cập nhật bài viết hỗ trợ.", variant: "success" });
      // Deselect after save
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } catch (err) {
      console.error("Failed to update support article:", err);
      notify({ message: "Cập nhật thất bại. Vui lòng thử lại.", variant: "error" });
    }
  };

  const performDelete = async (item: NewsListItem) => {
    try {
      await deleteNews(item.id);
      notify({ message: "Đã xóa bài viết hỗ trợ.", variant: "success" });
      load(params);
    } catch (err) {
      console.error("Failed to delete support article:", err);
      notify({ message: "Xóa thất bại. Vui lòng thử lại.", variant: "error" });
    }
  };

  const handleDeleteItem = (item: NewsListItem) => {
    confirm({
      title: "Xóa bài viết hỗ trợ",
      description: `Bạn có chắc muốn xóa bài viết "${item.name}"?`,
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
      notify({ message: "Đã xóa các bài viết hỗ trợ đã chọn.", variant: "success" });
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
      title: "Xóa bài viết hỗ trợ",
      description: `Bạn có chắc muốn xóa ${selectedIds.size} bài viết hỗ trợ đã chọn?`,
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
        console.error(`Failed to update support article ${item.id}:`, err);
      }
    }

    if (successCount > 0) {
      notify({ message: `Đã cập nhật ${successCount} bài viết hỗ trợ.`, variant: "success" });
      setSelectedIds(new Set());
      load(params);
    } else {
      notify({ message: "Cập nhật thất bại.", variant: "error" });
    }
  };

  const handleBulkUpdateClick = () => {
    if (!selectedIds.size) {
      notify({ message: "Vui lòng chọn ít nhất 1 bài viết hỗ trợ để cập nhật.", variant: "info" });
      return;
    }
    confirm({
      title: "Cập nhật bài viết hỗ trợ",
      description: `Cập nhật ${selectedIds.size} bài viết hỗ trợ đã chọn?`,
      confirmText: "Cập nhật",
      onConfirm: handleBulkUpdate,
    });
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
          <AddNewButton href="/support/articles/create">Thêm bài viết hỗ trợ</AddNewButton>
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
        editBasePath="/support/articles"
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
