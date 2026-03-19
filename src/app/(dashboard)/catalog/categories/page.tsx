"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toast";
import { DeleteSelectedButton, UpdateButton, AddNewButton } from "@/components/shared/ToolbarButton";
import { SaveActionButton, EditActionButton, DeleteActionButton } from "@/components/shared";
import { fetchCategories, updateCategory, deleteCategory } from "@/features/categories/api";
import type { Category, UpdateCategoryRequest } from "@/features/categories/types";
import { fetchProductGroups } from "@/features/product-groups/api";
import type { ProductGroup } from "@/features/product-groups/types";

type CategoryDraft = Category & { saving?: boolean; error?: boolean };
type CategoryBreadcrumb = { id: number; name: string };

function CategoriesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  // All categories loaded from API (full list for current group)
  const [allCategories, setAllCategories] = useState<CategoryDraft[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [keywordBuffer, setKeywordBuffer] = useState("");
  const [groupId, setGroupId] = useState<number | undefined>(undefined);
  const [parentId, setParentId] = useState<number>(0);
  const [categoryPath, setCategoryPath] = useState<CategoryBreadcrumb[]>([]);

  // Filter categories locally based on parentId and keyword
  const categories = useMemo(() => {
    let filtered = allCategories.filter((c) => c.parentId === parentId);
    if (keywordBuffer.trim()) {
      const kw = keywordBuffer.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(kw) ||
          (c.nameEn && c.nameEn.toLowerCase().includes(kw))
      );
    }
    return filtered;
  }, [allCategories, parentId, keywordBuffer]);

  const loadGroups = async () => {
    try {
      const data = await fetchProductGroups({ page: 1, pageSize: 200 });
      const items = Array.isArray(data.items) ? data.items : [];
      setGroups(items);
      // Auto-select first group
      if (items.length > 0 && !groupId) {
        const firstGroupId = items[0].id;
        setGroupId(firstGroupId);
        loadAllCategories(firstGroupId);
      }
    } catch {
      notify({ message: "Không tải được danh sách nhóm.", variant: "error" });
    }
  };

  const loadAllCategories = async (gId: number) => {
    setLoading(true);
    try {
      const data = await fetchCategories({
        Page: 1,
        PageSize: 9999,
        GroupId: gId,
      });
      const items = Array.isArray(data.items) ? data.items : [];
      setAllCategories(items);
      setSelectedIds(new Set());
      // Reset to root level when loading new group
      setParentId(0);
      setCategoryPath([]);
    } catch {
      setAllCategories([]);
      setSelectedIds(new Set());
      notify({ message: "Không tải được danh mục.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const groupParam = searchParams.get("groupId");
    if (groupParam) {
      const parsedValue = Number(groupParam);
      if (!Number.isNaN(parsedValue) && groupId !== parsedValue) {
        setGroupId(parsedValue);
        loadAllCategories(parsedValue);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const markSaving = (id: number, saving: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev);
      saving ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const saveCategory = async (cat: Category) => {
    markSaving(cat.id, true);
    try {
      const payload: UpdateCategoryRequest = {
        name: cat.name,
        nameEn: cat.nameEn,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        price2point: cat.price2point,
        groupId: cat.groupId,
        parentId: cat.parentId,
      };
      await updateCategory(cat.id, payload);
      // Deselect after successful save
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(cat.id);
        return next;
      });
      notify({ message: "Đã lưu danh mục.", variant: "success" });
    } catch {
      notify({ message: "Lưu danh mục thất bại.", variant: "error" });
    } finally {
      markSaving(cat.id, false);
    }
  };

  const handleChangeField = (id: number, key: keyof Category, value: any) => {
    setAllCategories((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
    // Auto-check when there's a change
    if (!selectedIds.has(id)) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
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
    if (selectedIds.size === categories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(categories.map((c) => c.id)));
    }
  };

  const navigateToChildren = (cat: Category) => {
    setCategoryPath((prev) => [...prev, { id: cat.id, name: cat.name }]);
    setParentId(cat.id);
    setSelectedIds(new Set());
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index < 0) {
      // Go to root
      setCategoryPath([]);
      setParentId(0);
    } else {
      // Go to specific level
      const targetCat = categoryPath[index];
      setCategoryPath((prev) => prev.slice(0, index + 1));
      setParentId(targetCat.id);
    }
    setSelectedIds(new Set());
  };

  const handleGroupChange = (newGroupId: number) => {
    setGroupId(newGroupId);
    loadAllCategories(newGroupId);
  };

  const inputBase = "tme-input";

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Quản trị</p>
          <h1 className="text-xl font-semibold text-slate-900">Danh mục sản phẩm</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Quản lý danh mục", href: "/catalog/product-groups" },
            { label: "Danh mục sản phẩm" },
          ]}
          className="justify-end"
        />
      </div>

      {/* Category path breadcrumb */}
      {categoryPath.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 text-sm">
          <button
            type="button"
            onClick={() => navigateToBreadcrumb(-1)}
            className="text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Danh mục gốc
          </button>
          {categoryPath.map((item, idx) => (
            <span key={item.id} className="flex items-center gap-1.5">
              <span className="text-slate-400">/</span>
              {idx === categoryPath.length - 1 ? (
                <span className="font-medium text-slate-700">{item.name}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => navigateToBreadcrumb(idx)}
                  className="text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  {item.name}
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2">
          <DeleteSelectedButton
          count={selectedIds.size}
          onClick={() => {
            if (!selectedIds.size) return;
            confirm({
              title: "Xóa danh mục",
              description: `Bạn có chắc muốn xóa ${selectedIds.size} danh mục đã chọn?`,
              confirmText: "Xóa",
              onConfirm: async () => {
                const idsToDelete = Array.from(selectedIds);
                let successCount = 0;
                let failCount = 0;
                for (const id of idsToDelete) {
                  try {
                    await deleteCategory(id);
                    successCount++;
                  } catch {
                    failCount++;
                  }
                }
                // Remove deleted items from state
                setAllCategories((prev) => prev.filter((c) => !selectedIds.has(c.id) || failCount > 0 && idsToDelete.slice(successCount).includes(c.id)));
                setSelectedIds(new Set());
                if (failCount === 0) {
                  notify({ message: `Đã xóa ${successCount} danh mục.`, variant: "success" });
                } else {
                  notify({ message: `Xóa ${successCount}/${idsToDelete.length} danh mục. ${failCount} thất bại.`, variant: "error" });
                }
                // Reload to ensure consistency
                if (groupId) loadAllCategories(groupId);
              },
            });
          }}
          disabled={selectedIds.size === 0}
        />
        <UpdateButton
          onClick={async () => {
            if (!selectedIds.size) return;
            const selectedCats = categories.filter((c) => selectedIds.has(c.id));
            for (const cat of selectedCats) {
              await saveCategory(cat);
            }
          }}
          disabled={selectedIds.size === 0}
        />
        <AddNewButton
          onClick={() => router.push(`/catalog/categories/create?groupId=${groupId}&parentId=${parentId}`)}
        >
          Thêm danh mục
        </AddNewButton>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={groupId ?? ""}
            onChange={(e) => handleGroupChange(Number(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <input
            value={keywordBuffer}
            onChange={(e) => setKeywordBuffer(e.target.value)}
            placeholder="Tìm theo tên danh mục..."
            className="w-48 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      <div className="tme-table-card">
        <div className="tme-table-wrapper">
          <table className="tme-table">
            <thead className="tme-table-head">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                    checked={categories.length > 0 && selectedIds.size === categories.length}
                    onChange={toggleSelectAll}
                    aria-label="Chọn tất cả"
                  />
                </th>
                <HeaderCell label="Tên danh mục" />
                <HeaderCell label="Tên tiếng Anh" />
                <HeaderCell label="Giá / Điểm" className="text-center" />
                <HeaderCell label="Thứ tự" className="text-center" />
                <HeaderCell label="Hoạt động" className="text-center" />
                <HeaderCell label="Danh mục con" className="text-center" />
                <HeaderCell label="Chức năng" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-5 text-center text-sm text-slate-500">
                    Đang tải danh mục...
                  </td>
                </tr>
              ) : categories.length ? (
                categories.map((cat) => {
                  const saving = savingIds.has(cat.id);
                  const disabledClass = saving ? "opacity-60 bg-slate-50" : "";
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/80">
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                          checked={selectedIds.has(cat.id)}
                          onChange={() => toggleSelect(cat.id)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={cat.name}
                          disabled={saving}
                          onChange={(e) => handleChangeField(cat.id, "name", e.target.value)}
                          className={`${inputBase} w-full ${disabledClass}`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={cat.nameEn || ""}
                          disabled={saving}
                          onChange={(e) => handleChangeField(cat.id, "nameEn", e.target.value)}
                          className={`${inputBase} w-full ${disabledClass}`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="number"
                          value={cat.price2point ?? 0}
                          disabled={saving}
                          onChange={(e) => handleChangeField(cat.id, "price2point", Number(e.target.value))}
                          className={`tme-input w-24 text-center ${disabledClass}`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="number"
                          value={cat.sortOrder}
                          disabled={saving}
                          onChange={(e) => handleChangeField(cat.id, "sortOrder", Number(e.target.value))}
                          className={`tme-input w-20 text-center ${disabledClass}`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={cat.isActive}
                          disabled={saving}
                          onChange={(e) => handleChangeField(cat.id, "isActive", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => navigateToChildren(cat)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm7 10.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
                          </svg>
                          Xem
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <SaveActionButton
                            label="Cập nhật"
                            onClick={() => saveCategory(cat)}
                            disabled={!selectedIds.has(cat.id) || saving}
                          />
                          <EditActionButton
                            label="Chỉnh sửa"
                            onClick={() => router.push(`/catalog/categories/${cat.id}/edit`)}
                          />
                          <DeleteActionButton
                            onClick={() => {
                              confirm({
                                title: "Xóa danh mục",
                                description: `Bạn có chắc muốn xóa danh mục "${cat.name}"?`,
                                confirmText: "Xóa",
                                onConfirm: async () => {
                                  try {
                                    await deleteCategory(cat.id);
                                    setAllCategories((prev) => prev.filter((c) => c.id !== cat.id));
                                    setSelectedIds((prev) => {
                                      const next = new Set(prev);
                                      next.delete(cat.id);
                                      return next;
                                    });
                                    notify({ message: "Đã xóa danh mục.", variant: "success" });
                                  } catch {
                                    notify({ message: "Xóa danh mục thất bại.", variant: "error" });
                                  }
                                },
                              });
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                    Chưa có danh mục nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Show total count */}
      <div className="px-2 text-sm text-slate-500">
        Hiển thị {categories.length} danh mục
      </div>
      {dialog}
    </div>
  );
}

function HeaderCell({ label, className = "" }: { label: string; className?: string }) {
  return (
    <th
      className={`px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500 ${className}`}
    >
      {label}
    </th>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-slate-500">?ang t?i danh m?c...</div>}>
      <CategoriesPageContent />
    </Suspense>
  );
}
