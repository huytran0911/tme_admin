"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Pagination } from "@/components/shared/Pagination";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { PaymentMethodsTable } from "@/components/admin/payment-methods/PaymentMethodsTable";
import {
  usePaymentMethodsList,
  useUpdatePaymentMethod,
  useDeletePaymentMethod,
  type PaymentMethod,
} from "@/hooks/admin/usePaymentMethods";
import { DeleteSelectedButton, UpdateButton, AddNewButton } from "@/components/shared/ToolbarButton";

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();
  const originalRef = useRef<Record<number, PaymentMethod>>({});
  const [keyword, setKeyword] = useState("");
  const [statusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [items, setItems] = useState<PaymentMethod[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  // React Query hooks
  const { data, isLoading, refetch, error } = usePaymentMethodsList({
    page,
    pageSize,
    keyword,
    status: statusFilter === "all" ? undefined : statusFilter === "active" ? 1 : 0,
  });

  const updateMutation = useUpdatePaymentMethod();
  const deleteMutation = useDeletePaymentMethod();

  useEffect(() => {
    if (error) {
      notify({ message: "Không tải được danh sách phương thức thanh toán. Thử lại.", variant: "error" });
    }
  }, [error, notify]);

  useEffect(() => {
    if (!data?.items) {
      setItems([]);
      originalRef.current = {};
      setSelectedIds(new Set());
      return;
    }
    setItems(data.items);
    originalRef.current = data.items.reduce<Record<number, PaymentMethod>>((acc, item) => {
      acc[item.id] = { ...item };
      return acc;
    }, {});
    setSelectedIds(new Set());
  }, [data?.items]);

  const setRowSaving = (id: number, saving: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev);
      saving ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const normalize = (value?: string | number | null) => (value ?? "").toString().trim();

  const hasRowChanged = (item: PaymentMethod) => {
    const original = originalRef.current[item.id];
    if (!original) return false;
    return (
      normalize(item.name) !== normalize(original.name) ||
      Number(item.sort ?? 0) !== Number(original.sort ?? 0) ||
      Number(item.status ?? 1) !== Number(original.status ?? 1)
    );
  };

  const updateSelectionForItem = (item: PaymentMethod) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      hasRowChanged(item) ? next.add(item.id) : next.delete(item.id);
      return next;
    });
  };

  const handleFieldChange = (id: number, field: "name" | "sort" | "status", value: string | number | boolean) => {
    let updatedItem: PaymentMethod | null = null;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "sort") {
          updatedItem = { ...item, sort: Number(value) || 0 };
          return updatedItem;
        }
        if (field === "status") {
          updatedItem = { ...item, status: value ? 0 : 1 };
          return updatedItem;
        }
        updatedItem = { ...item, [field]: value } as PaymentMethod;
        return updatedItem;
      }),
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (updatedItem) {
      updateSelectionForItem(updatedItem);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!items.length) return;
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  const saveRow = async (id: number) => {
    if (savingIds.has(id)) return;
    const item = items.find((row) => row.id === id);
    if (!item || !hasRowChanged(item)) return;
    setRowSaving(id, true);
    try {
      const payload = {
        name: (item.name ?? "").trim(),
        sort: Number(item.sort) || 0,
        status: item.status,
      };
      await updateMutation.mutateAsync({ id, data: payload });
      const merged = { ...item, ...payload, id };
      originalRef.current[id] = merged;
      setItems((prev) => prev.map((row) => (row.id === id ? merged : row)));
      updateSelectionForItem(merged);
      notify({ message: "Đã cập nhật.", variant: "success" });
    } catch {
      notify({ message: "Cập nhật thất bại.", variant: "error" });
    } finally {
      setRowSaving(id, false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    confirm({
      title: "Xóa phương thức thanh toán",
      description: `Bạn chắc chắn muốn xóa ${ids.length} phương thức đã chọn?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        setBulkSaving(true);
        try {
          for (const id of ids) {
            await deleteMutation.mutateAsync(id);
          }
          notify({ message: "Đã xóa các phương thức đã chọn.", variant: "success" });
          setSelectedIds(new Set());
          refetch();
        } catch {
          notify({ message: "Xóa thất bại.", variant: "error" });
        } finally {
          setBulkSaving(false);
        }
      },
    });
  };

  const handleBulkUpdate = () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      notify({ message: "Không có thay đổi cần cập nhật.", variant: "info" });
      return;
    }
    confirm({
      title: "Cập nhật phương thức thanh toán",
      description: `Áp dụng cập nhật cho ${ids.length} phương thức đã chọn?`,
      confirmText: "Cập nhật",
      onConfirm: async () => {
        setBulkSaving(true);
        try {
          for (const id of ids) {
            const item = items.find((row) => row.id === id);
            if (!item || !hasRowChanged(item)) continue;
            const payload = {
              name: (item.name ?? "").trim(),
              sort: Number(item.sort) || 0,
              status: item.status,
            };
            await updateMutation.mutateAsync({ id, data: payload });
            const merged = { ...item, ...payload, id };
            originalRef.current[id] = merged;
            setItems((prev) => prev.map((row) => (row.id === id ? merged : row)));
          }
          notify({ message: "Đã cập nhật phương thức thanh toán.", variant: "success" });
          setSelectedIds(new Set());
        } catch {
          notify({ message: "Cập nhật thất bại.", variant: "error" });
        } finally {
          setBulkSaving(false);
        }
      },
    });
  };

  const handleDeleteRow = (id: number, name: string) => {
    confirm({
      title: "Xóa phương thức thanh toán",
      description: `Bạn chắc chắn muốn xóa "${name || "phương thức thanh toán"}"?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          notify({ message: "Đã xóa.", variant: "success" });
          refetch();
        } catch {
          notify({ message: "Xóa thất bại.", variant: "error" });
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Quản trị</p>
          <h1 className="text-xl font-semibold text-slate-900">Phương thức thanh toán</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Cấu hình" },
            { label: "Phương thức thanh toán" },
          ]}
        />
      </div>

      <div className="mt-2 flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <DeleteSelectedButton
            count={selectedIds.size}
            onClick={handleBulkDelete}
            disabled={bulkSaving}
          />
          <UpdateButton onClick={handleBulkUpdate} disabled={bulkSaving} />
          <AddNewButton href="/payment-methods/new">Thêm mới</AddNewButton>
        </div>

        <div className="flex w-full max-w-xs items-center">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Tìm theo tên phương thức hoặc tiếng Anh..."
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Không tải được danh sách phương thức thanh toán.{" "}
          <button onClick={() => refetch()} className="font-semibold underline">
            Thử lại
          </button>
        </div>
      ) : null}

      <PaymentMethodsTable
        items={items}
        isLoading={isLoading}
        savingIds={savingIds}
        selectedIds={selectedIds}
        onFieldChange={handleFieldChange}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onSaveRow={saveRow}
        onDeleteRow={handleDeleteRow}
        onCreate={() => router.push("/payment-methods/new")}
        hasRowChanged={hasRowChanged}
      />

      <Pagination
        page={data?.page || page}
        pageSize={data?.pageSize || pageSize}
        totalItems={data?.total || 0}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
      {dialog}
    </div>
  );
}
