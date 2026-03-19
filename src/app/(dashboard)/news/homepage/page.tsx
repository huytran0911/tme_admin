"use client";

import { useEffect, useState } from "react";
import { fetchNewsHomeList, updateNewsHome, deleteNewsFromHome } from "@/features/news-home/api";
import type { NewsHomeItem } from "@/features/news-home/types";
import { NewsHomeRow } from "@/features/news-home/components/NewsHomeRow";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { DeleteSelectedButton, UpdateButton } from "@/components/shared/ToolbarButton";

export default function NewsHomePage() {
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [items, setItems] = useState<NewsHomeItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadNewsHome = async () => {
    setLoading(true);
    try {
      const data = await fetchNewsHomeList();
      setItems(data);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to fetch news home:", err);
      notify({
        message: "Không thể tải danh sách tin tức trang chủ. Vui lòng kiểm tra API.",
        variant: "error",
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNewsHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSelect = (newsId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(newsId)) {
        next.delete(newsId);
      } else {
        next.add(newsId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.newsId)));
    }
  };

  // Handle inline changes (update local state)
  const handleChangeItem = (updatedItem: NewsHomeItem) => {
    setItems((prev) =>
      prev.map((item) => (item.newsId === updatedItem.newsId ? updatedItem : item))
    );
  };

  // Save item inline (sort, status)
  const handleSaveItem = async (item: NewsHomeItem) => {
    try {
      await updateNewsHome(item.newsId, {
        sort: item.sort,
        status: item.status,
      });

      notify({ message: "Đã cập nhật tin tức trang chủ.", variant: "success" });

      // Deselect after save
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.newsId);
        return next;
      });
    } catch (err) {
      console.error("Failed to update news home:", err);
      notify({ message: "Cập nhật thất bại. Vui lòng thử lại.", variant: "error" });
    }
  };

  const performDelete = async (item: NewsHomeItem) => {
    try {
      await deleteNewsFromHome(item.newsId);
      notify({ message: "Đã xóa tin tức khỏi trang chủ.", variant: "success" });
      loadNewsHome();
    } catch (err) {
      console.error("Failed to delete news from home:", err);
      notify({ message: "Xóa thất bại. Vui lòng thử lại.", variant: "error" });
    }
  };

  const handleDeleteItem = (item: NewsHomeItem) => {
    confirm({
      title: "Xóa tin tức trang chủ",
      description: `Bạn có chắc muốn xóa "${item.newsName}" khỏi trang chủ?`,
      confirmText: "Xóa",
      onConfirm: () => performDelete(item),
    });
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;

    try {
      for (const newsId of selectedIds) {
        await deleteNewsFromHome(newsId);
      }
      notify({ message: "Đã xóa các tin tức đã chọn khỏi trang chủ.", variant: "success" });
      setSelectedIds(new Set());
      loadNewsHome();
    } catch (err) {
      console.error("Failed to bulk delete:", err);
      notify({ message: "Xóa hàng loạt thất bại.", variant: "error" });
    }
  };

  const handleBulkDeleteClick = () => {
    if (!selectedIds.size) return;
    confirm({
      title: "Xóa tin tức trang chủ",
      description: `Bạn có chắc muốn xóa ${selectedIds.size} tin tức đã chọn khỏi trang chủ?`,
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

    const selectedItems = items.filter((item) => selectedIds.has(item.newsId));
    let successCount = 0;

    for (const item of selectedItems) {
      try {
        await updateNewsHome(item.newsId, {
          sort: item.sort,
          status: item.status,
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to update news ${item.newsId}:`, err);
      }
    }

    if (successCount > 0) {
      notify({ message: `Đã cập nhật ${successCount} tin tức.`, variant: "success" });
      setSelectedIds(new Set());
      loadNewsHome();
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
      title: "Cập nhật tin tức trang chủ",
      description: `Cập nhật ${selectedIds.size} tin tức đã chọn?`,
      confirmText: "Cập nhật",
      onConfirm: handleBulkUpdate,
    });
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Quản lý nội dung
          </p>
          <h1 className="text-xl font-semibold text-slate-900">Cập nhật tin tức trang chủ</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Tin tức", href: "/news" },
            { label: "Tin tức trang chủ" },
          ]}
          className="justify-end"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-2">
        <div className="flex flex-wrap items-center gap-2">
          <DeleteSelectedButton
            count={selectedIds.size}
            onClick={handleBulkDeleteClick}
          />
          <UpdateButton onClick={handleBulkUpdateClick} />
        </div>
      </div>

      {/* Table */}
      <div className="tme-table-card">
        <div className="tme-table-wrapper">
          <table className="tme-table">
            <thead className="tme-table-head">
              <tr>
                <th className="w-10 px-2 py-3 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                    checked={items.length > 0 && selectedIds.size === items.length}
                    onChange={toggleSelectAll}
                    aria-label="Chọn tất cả"
                  />
                </th>
                <HeaderCell label="Tên tin tức" />
                <HeaderCell label="Hình ảnh" className="w-20" />
                <HeaderCell label="Thứ tự" className="w-20 text-center" />
                <HeaderCell label="Ẩn" className="w-16 text-center" />
                <HeaderCell label="Ngày tạo" className="w-28" />
                <HeaderCell label="Chức năng" className="w-32 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    Đang tải danh sách tin tức trang chủ...
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => (
                  <NewsHomeRow
                    key={item.newsId}
                    item={item}
                    checked={selectedIds.has(item.newsId)}
                    onToggle={toggleSelect}
                    onChange={handleChangeItem}
                    onSave={handleSaveItem}
                    onDelete={handleDeleteItem}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    Chưa có tin tức nào trên trang chủ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dialog}
    </div>
  );
}

function HeaderCell({ label, className }: { label: string; className?: string }) {
  return (
    <th
      className={`px-2 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500 ${className || ""}`}
    >
      {label}
    </th>
  );
}
