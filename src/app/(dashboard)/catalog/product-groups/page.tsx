"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProductGroup,
  deleteProductGroup,
  fetchProductGroups,
  updateProductGroup,
} from "@/features/product-groups/api";
import type { GetProductGroupListParams, ProductGroup } from "@/features/product-groups/types";
import { ProductGroupTable } from "@/features/product-groups/components/ProductGroupTable";
import { Pagination } from "@/components/shared/Pagination";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { DeleteSelectedButton, UpdateButton, AddNewButton } from "@/components/shared/ToolbarButton";

export default function ProductGroupsPage() {
  const { notify } = useToast();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const originalGroupsRef = useRef<Record<number, ProductGroup>>({});
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());
  const [newGroup, setNewGroup] = useState<ProductGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [params, setParams] = useState<GetProductGroupListParams>({ page: 1, pageSize: 10, keyword: "" });
  const [total, setTotal] = useState(0);

  const load = async (nextParams: GetProductGroupListParams = params) => {
    setLoading(true);
    try {
      const data = await fetchProductGroups(nextParams);
      const items = Array.isArray(data?.items) ? data.items : [];
      setGroups(items);
      originalGroupsRef.current = items.reduce<Record<number, ProductGroup>>((acc, item) => {
        acc[item.id] = { ...item };
        return acc;
      }, {});
      setDirtyIds(new Set());
      setSelectedIds(new Set());
      setTotal(typeof data?.total === "number" ? data.total : 0);
      if (!Array.isArray(data?.items)) {
        notify({
          message: "Dữ liệu trả về không hợp lệ. Vui lòng kiểm tra API /admin/v1/groups.",
          variant: "error",
        });
      }
    } catch {
      notify({
        message: "Không thể tải danh sách nhóm sản phẩm. Kiểm tra API /admin/v1/groups.",
        variant: "error",
      });
      setGroups([]);
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
      setParams((prev) => ({ ...prev, page: 1, keyword }));
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === groups.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(groups.map((g) => g.id)));
    }
  };

  const clearSelectionFor = (id: number) => {
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const hasGroupChanged = (group: ProductGroup) => {
    const original = originalGroupsRef.current[group.id];
    if (!original) return false;
    const fields: (keyof ProductGroup)[] = ["name", "nameEn", "image", "showStyle", "slideStyle", "sort", "sortNew"];
    return fields.some((field) => {
      const nextValue = group[field] ?? "";
      const originalValue = original[field] ?? "";
      return nextValue !== originalValue;
    });
  };

  const handleChangeGroup = (updated: ProductGroup) => {
    const changed = hasGroupChanged(updated);
    setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    setDirtyIds((prev) => {
      const next = new Set(prev);
      changed ? next.add(updated.id) : next.delete(updated.id);
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      changed ? next.add(updated.id) : next.delete(updated.id);
      return next;
    });
  };

  const performDeleteGroup = async (group: ProductGroup) => {
    setSaving(true);
    try {
      await deleteProductGroup(group.id);
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      clearSelectionFor(group.id);
      notify({ message: "Đã xóa nhóm sản phẩm.", variant: "success" });
      load(params);
    } catch {
      notify({ message: "Xóa thất bại. Vui lòng kiểm tra API.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGroup = async (group: ProductGroup) => {
    setSaving(true);
    try {
      const updated = await updateProductGroup(group);
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      clearSelectionFor(updated.id);
      notify({ message: "Đã cập nhật nhóm sản phẩm.", variant: "success" });
      load(params);
    } catch {
      notify({ message: "Cập nhật thất bại. Vui lòng kiểm tra API.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    if (!ids.length) return;
    setSaving(true);
    try {
      for (const id of ids) {
        await deleteProductGroup(id);
      }
      notify({ message: "Đã xóa các nhóm đã chọn.", variant: "success" });
      setSelectedIds(new Set());
      load(params);
    } catch {
      notify({ message: "Xóa hàng loạt thất bại.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleViewCategories = (group: ProductGroup) => {
    router.push(`/catalog/categories?groupId=${group.id}`);
  };

  const createNewGroupFromDraft = async () => {
    if (!newGroup) return null;
    const payload = {
      name: newGroup.name,
      nameEn: newGroup.nameEn,
      image: newGroup.image,
      showStyle: newGroup.showStyle,
      slideStyle: newGroup.slideStyle,
      sort: newGroup.sort,
      sortNew: newGroup.sortNew,
    };
    const created = await createProductGroup(payload);
    setGroups((prev) => [created, ...prev]);
    setNewGroup(null);
    return created;
  };

  const handleBulkUpdate = async (targetIds: number[], includeNewGroup = false) => {
    if (!targetIds.length && !includeNewGroup) return;
    setSaving(true);
    try {
      for (const id of targetIds) {
        const item = groups.find((g) => g.id === id);
        if (item) {
          await updateProductGroup(item);
          clearSelectionFor(id);
        }
      }
      if (includeNewGroup) {
        await createNewGroupFromDraft();
        notify({
          message: targetIds.length
            ? "Đã cập nhật các nhóm thay đổi và thêm nhóm mới."
            : "Đã tạo nhóm mới.",
          variant: "success",
        });
      } else if (targetIds.length) {
        notify({ message: "Đã cập nhật danh sách nhóm.", variant: "success" });
      }
      setSelectedIds(new Set());
      load(params);
    } catch {
      notify({
        message: includeNewGroup && !targetIds.length ? "Tạo nhóm mới thất bại." : "Cập nhật hàng loạt thất bại.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRow = async () => {
    if (!newGroup) return;
    setSaving(true);
    try {
      await createNewGroupFromDraft();
      notify({ message: "Đã tạo nhóm mới.", variant: "success" });
      load(params);
    } catch {
      notify({ message: "Tạo nhóm thất bại.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const computeDirtyIds = () => {
    const dirty = new Set<number>();
    groups.forEach((group) => {
      if (hasGroupChanged(group)) {
        dirty.add(group.id);
      }
    });
    return dirty;
  };

  const handleBulkUpdateClick = () => {
    const dirtyPool = dirtyIds.size ? new Set(dirtyIds) : computeDirtyIds();
    setDirtyIds(dirtyPool);
    const targetIds = Array.from(dirtyPool);
    const hasNewGroup = Boolean(newGroup);
    if (!targetIds.length && !hasNewGroup) {
      notify({ message: "Không có thay đổi nào cần cập nhật.", variant: "info" });
      return;
    }
    setSelectedIds(new Set(targetIds));
    confirm({
      title: hasNewGroup && targetIds.length ? "Cập nhật & tạo mới" : hasNewGroup ? "Tạo nhóm mới" : "Cập nhật nhóm",
      description: hasNewGroup
        ? targetIds.length
          ? `Áp dụng cập nhật cho ${targetIds.length} nhóm đã thay đổi và tạo nhóm mới?`
          : "Tạo nhóm mới từ dữ liệu bạn vừa nhập?"
        : `Áp dụng cập nhật cho ${targetIds.length} nhóm đã thay đổi?`,
      confirmText: hasNewGroup ? "Thực hiện" : "Cập nhật",
      onConfirm: () => handleBulkUpdate(targetIds, hasNewGroup),
    });
  };

  const handleBulkDeleteClick = () => {
    if (!selectedIds.size) return;
    confirm({
      title: "Xóa nhóm sản phẩm",
      description: `Bạn có chắc muốn xóa ${selectedIds.size} nhóm đã chọn?`,
      confirmText: "Xóa",
      onConfirm: () => handleBulkDelete(Array.from(selectedIds)),
    });
  };

  const handleStartCreate = () => {
    if (newGroup) return;
    setNewGroup({
      id: 0,
      name: "Nhóm mới",
      nameEn: "New group",
      image: "",
      showStyle: 0,
      slideStyle: 0,
      sort: 1,
      sortNew: 1,
    });
  };

  const handleCancelNew = () => setNewGroup(null);

  const selectedCount = selectedIds.size;

  const handlePageChange = (nextPage: number) => {
    setParams((prev) => ({ ...prev, page: nextPage }));
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Quản trị</p>
          <h1 className="text-xl font-semibold text-slate-900">Nhóm sản phẩm</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Quản lý danh mục", href: "/catalog/product-groups" },
            { label: "Nhóm sản phẩm" },
          ]}
          className="justify-end"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 px-2">
        <div className="flex flex-wrap items-center gap-2">
          <DeleteSelectedButton
            count={selectedCount}
            onClick={handleBulkDeleteClick}
            disabled={saving}
          />
          <UpdateButton onClick={handleBulkUpdateClick} disabled={saving} />
          <AddNewButton onClick={handleStartCreate} disabled={Boolean(newGroup) || saving}>
            Thêm nhóm
          </AddNewButton>
        </div>

        <div className="ml-auto flex w-full max-w-xs items-center gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên nhóm..."
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

  <ProductGroupTable
        groups={groups}
        selectedIds={selectedIds}
        loading={loading}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onChangeGroup={handleChangeGroup}
        onSaveGroup={handleSaveGroup}
        onDeleteGroup={(group) =>
          confirm({
            title: "Xóa nhóm sản phẩm",
            description: "Bạn có chắc muốn xóa nhóm này?",
            confirmText: "Xóa",
            onConfirm: () => performDeleteGroup(group),
          })
        }
        onViewCategories={handleViewCategories}
        newGroup={newGroup ?? undefined}
        onNewGroupChange={newGroup ? (group) => setNewGroup(group) : undefined}
        onCreateNew={handleCreateRow}
        onCancelNew={handleCancelNew}
      />

      <Pagination
        page={params.page || 1}
        pageSize={params.pageSize || 10}
        totalItems={total}
        onPageChange={handlePageChange}
        onPageSizeChange={(s) => setParams((prev) => ({ ...prev, page: 1, pageSize: s }))}
      />
      {dialog}
    </div>
  );
}
