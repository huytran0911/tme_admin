"use client";

import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { AddNewButton, DeleteSelectedButton, UpdateButton } from "@/components/shared/ToolbarButton";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toast";
import { fetchSupportOnlineList, deleteSupportOnline, updateSupportOnline } from "@/features/support-online/api";
import type { SupportOnlineItem } from "@/features/support-online/types";
import { SupportOnlineFormModal } from "@/features/support-online/components/SupportOnlineFormModal";
import { SupportOnlineRow } from "@/features/support-online/components/SupportOnlineRow";

type ModalMode = "create" | "edit";

type ModalState = {
  open: boolean;
  mode: ModalMode;
  item?: SupportOnlineItem | null;
};

export default function SupportOnlinePage() {
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();

  const [items, setItems] = useState<SupportOnlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>({ open: false, mode: "create", item: null });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchSupportOnlineList();
      setItems(data);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to fetch support online list:", err);
      notify({
        message: "Không thể tải danh sách hỗ trợ trực tuyến. Vui lòng kiểm tra API.",
        variant: "error",
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const openModal = (mode: ModalMode, item?: SupportOnlineItem | null) => {
    setModalState({ open: true, mode, item: item ?? null });
  };

  const closeModal = () => setModalState((prev) => ({ ...prev, open: false }));

  const handleSaved = () => {
    closeModal();
    loadData();
  };

  // Handle inline changes (update local state)
  const handleChangeItem = (updatedItem: SupportOnlineItem) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  // Save item inline (email, sort, status)
  const handleSaveItem = async (item: SupportOnlineItem) => {
    try {
      await updateSupportOnline(item.id, {
        name: item.name,
        link: item.link,
        phone: item.phone,
        email: item.email,
        sort: item.sort,
        status: item.status,
      });

      notify({ message: "Đã cập nhật hỗ trợ trực tuyến.", variant: "success" });

      // Deselect after save
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } catch (err) {
      console.error("Failed to update support online:", err);
      notify({ message: "Cập nhật thất bại. Vui lòng thử lại.", variant: "error" });
    }
  };

  const handleDelete = (item: SupportOnlineItem) => {
    confirm({
      title: "Xóa hỗ trợ trực tuyến",
      description: `Bạn có chắc muốn xóa "${item.name}"?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          await deleteSupportOnline(item.id);
          notify({ message: "Đã xóa hỗ trợ trực tuyến.", variant: "success" });
          loadData();
        } catch (err) {
          console.error("Failed to delete support online:", err);
          notify({ message: "Xóa thất bại. Vui lòng thử lại.", variant: "error" });
        }
      },
    });
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;

    try {
      for (const id of selectedIds) {
        await deleteSupportOnline(id);
      }
      notify({ message: "Đã xóa các hỗ trợ trực tuyến đã chọn.", variant: "success" });
      setSelectedIds(new Set());
      loadData();
    } catch (err) {
      console.error("Failed to bulk delete:", err);
      notify({ message: "Xóa hàng loạt thất bại.", variant: "error" });
    }
  };

  const handleBulkDeleteClick = () => {
    if (!selectedIds.size) return;
    confirm({
      title: "Xóa hỗ trợ trực tuyến",
      description: `Bạn có chắc muốn xóa ${selectedIds.size} hỗ trợ trực tuyến đã chọn?`,
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
        await updateSupportOnline(item.id, {
          name: item.name,
          link: item.link,
          phone: item.phone,
          email: item.email,
          sort: item.sort,
          status: item.status,
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to update support online ${item.id}:`, err);
      }
    }

    if (successCount > 0) {
      notify({ message: `Đã cập nhật ${successCount} hỗ trợ trực tuyến.`, variant: "success" });
      setSelectedIds(new Set());
      loadData();
    } else {
      notify({ message: "Cập nhật thất bại.", variant: "error" });
    }
  };

  const handleBulkUpdateClick = () => {
    if (!selectedIds.size) {
      notify({ message: "Vui lòng chọn ít nhất 1 hỗ trợ trực tuyến để cập nhật.", variant: "info" });
      return;
    }
    confirm({
      title: "Cập nhật hỗ trợ trực tuyến",
      description: `Cập nhật ${selectedIds.size} hỗ trợ trực tuyến đã chọn?`,
      confirmText: "Cập nhật",
      onConfirm: handleBulkUpdate,
    });
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Quản lý hỗ trợ
          </p>
          <h1 className="text-xl font-semibold text-slate-900">Quản lý hỗ trợ trực tuyến</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Hỗ trợ trực tuyến" },
          ]}
          className="justify-end"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-2">
        <div className="flex flex-wrap items-center gap-2">
          <AddNewButton onClick={() => openModal("create")} />
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
                <HeaderCell label="Tên trực tuyến" className="w-32" />
                <HeaderCell label="Link / Yahoo ID" className="w-48" />
                <HeaderCell label="Số điện thoại" className="w-32" />
                <HeaderCell label="Email" className="w-64" />
                <HeaderCell label="Thứ tự" className="w-20 text-center" />
                <HeaderCell label="Ẩn" className="w-16 text-center" />
                <HeaderCell label="Chức năng" className="w-32 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                    Đang tải danh sách hỗ trợ trực tuyến...
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => (
                  <SupportOnlineRow
                    key={item.id}
                    item={item}
                    checked={selectedIds.has(item.id)}
                    onToggle={toggleSelect}
                    onChange={handleChangeItem}
                    onSave={handleSaveItem}
                    onEdit={(item) => openModal("edit", item)}
                    onDelete={handleDelete}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                    Chưa có hỗ trợ trực tuyến nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <SupportOnlineFormModal
        open={modalState.open}
        mode={modalState.mode}
        initialValue={modalState.item}
        onClose={closeModal}
        onSaved={handleSaved}
      />
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
