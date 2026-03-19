"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/shared/Toast";
import {
  DeleteSelectedButton,
  UpdateButton,
} from "@/components/shared/ToolbarButton";
import {
  SaveActionButton,
  DeleteActionButton,
  EditActionButton,
} from "@/components/shared";
import {
  fetchProducts,
  fetchProductDetail,
  updateProduct,
  deleteProduct,
  fetchGroups,
  fetchCategories,
  fetchAllCategories,
} from "@/features/products/api";
import type {
  Product,
  UpdateProductRequest,
  Group,
  Category,
} from "@/features/products/types";
import { formatDate, buildImageUrl } from "@/lib/utils";

type ProductDraft = Product & {
  saving?: boolean;
  error?: boolean;
  selectedCategoryIds?: number[]; // For tracking selected categories in inline edit
};

// Tree node type for category tree
type CategoryTreeNode = Category & {
  children: CategoryTreeNode[];
  level: number;
};

// Full tree node type for Group > Category > Sub-category structure
type FullTreeNode = {
  id: number;
  name: string | null;
  type: "group" | "category"; // Distinguish between group and category
  level: number;
  groupId?: number | null;
  parentId?: number;
  sortOrder: number;
  children: FullTreeNode[];
};

// Build tree structure from flat list
function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const map = new Map<number, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // Create nodes
  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [], level: 0 });
  });

  // Build tree
  categories.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parentId === 0) {
      roots.push(node);
    } else {
      const parent = map.get(cat.parentId);
      if (parent) {
        node.level = parent.level + 1;
        parent.children.push(node);
      } else {
        // Parent not found, treat as root
        roots.push(node);
      }
    }
  });

  // Sort by sortOrder
  const sortNodes = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

// Flatten tree to array with level info for display
function flattenTree(nodes: CategoryTreeNode[], result: CategoryTreeNode[] = []): CategoryTreeNode[] {
  nodes.forEach((node) => {
    result.push(node);
    if (node.children.length > 0) {
      flattenTree(node.children, result);
    }
  });
  return result;
}

// Build full tree: Group (level 0) > Category (level 1) > Sub-category (level 2+)
function buildFullTree(groups: Group[], categories: Category[]): FullTreeNode[] {
  const roots: FullTreeNode[] = [];
  const categoryMap = new Map<number, FullTreeNode>();

  // First, convert all categories to FullTreeNode
  categories.forEach((cat) => {
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      type: "category",
      level: 1, // Will be adjusted later
      groupId: cat.groupId,
      parentId: cat.parentId,
      sortOrder: cat.sortOrder,
      children: [],
    });
  });

  // Build category tree (parentId relationships)
  const categoryRoots: FullTreeNode[] = [];
  categories.forEach((cat) => {
    const node = categoryMap.get(cat.id)!;
    if (cat.parentId === 0) {
      categoryRoots.push(node);
    } else {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        node.level = parent.level + 1;
        parent.children.push(node);
      } else {
        categoryRoots.push(node);
      }
    }
  });

  // Now attach category trees to their respective groups
  groups.forEach((group) => {
    const groupNode: FullTreeNode = {
      id: group.id,
      name: group.name,
      type: "group",
      level: 0,
      sortOrder: group.sort,
      children: [],
    };

    // Find all root categories belonging to this group
    categoryRoots.forEach((catNode) => {
      if (catNode.groupId === group.id) {
        groupNode.children.push(catNode);
      }
    });

    // Sort children by sortOrder
    const sortNodes = (nodes: FullTreeNode[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      nodes.forEach((n) => sortNodes(n.children));
    };
    sortNodes(groupNode.children);

    roots.push(groupNode);
  });

  // Sort groups by sortOrder
  roots.sort((a, b) => a.sortOrder - b.sortOrder);

  return roots;
}

// Flatten full tree to array for dropdown display
function flattenFullTree(nodes: FullTreeNode[], result: FullTreeNode[] = []): FullTreeNode[] {
  nodes.forEach((node) => {
    result.push(node);
    if (node.children.length > 0) {
      flattenFullTree(node.children, result);
    }
  });
  return result;
}

// Multi-select category dropdown component with checkboxes
function MultiSelectCategoryDropdown({
  fullTree,
  selectedIds,
  onChange,
  disabled,
}: {
  fullTree: FullTreeNode[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const flatNodes = flattenFullTree(fullTree);
  const selectableNodes = flatNodes.filter((node) => node.type === "category");

  const handleToggle = (nodeId: number) => {
    if (selectedIds.includes(nodeId)) {
      onChange(selectedIds.filter((id) => id !== nodeId));
    } else {
      onChange([...selectedIds, nodeId]);
    }
  };

  const selectedCount = selectedIds.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full text-left rounded-md border px-2.5 py-1.5 text-sm flex items-center justify-between ${disabled
          ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
      >
        <span>
          {selectedCount > 0 ? `${selectedCount} danh mục` : "Chọn danh mục"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-80 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          <div className="p-2">
            {flatNodes.map((node) => {
              const isGroup = node.type === "group";
              const indent = node.level > 0 ? node.level * 16 : 0;
              const isChecked = selectedIds.includes(node.id);

              return (
                <div
                  key={`${node.type}-${node.id}`}
                  style={{ paddingLeft: `${indent}px` }}
                  className={`py-1.5 px-2 rounded ${isGroup
                    ? "font-semibold text-slate-700 text-sm"
                    : "hover:bg-slate-50 cursor-pointer"
                    }`}
                  onClick={() => !isGroup && handleToggle(node.id)}
                >
                  {isGroup ? (
                    <div className="text-xs uppercase tracking-wide text-slate-500 py-1">
                      {node.name}
                    </div>
                  ) : (
                    <label className="flex items-center cursor-pointer space-x-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(node.id)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm text-slate-700 flex-1">{node.name}</span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductsPageContent() {
  const router = useRouter();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();
  const [items, setItems] = useState<ProductDraft[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [keywordBuffer, setKeywordBuffer] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Dropdown state
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [fullTree, setFullTree] = useState<FullTreeNode[]>([]); // For inline edit dropdown (all groups + categories)
  const [allCategories, setAllCategories] = useState<Category[]>([]); // All categories for full tree
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Load groups for dropdown and full tree
  const loadGroups = async () => {
    try {
      const data = await fetchGroups({ Page: 1, PageSize: 999 });
      setGroups(data.items || []);
      return data.items || [];
    } catch {
      notify({ message: "Không tải được danh sách nhóm sản phẩm.", variant: "error" });
      return [];
    }
  };

  // Load ALL categories for full tree (no filters)
  const loadAllCategoriesForTree = async () => {
    try {
      const allCats = await fetchAllCategories();
      setAllCategories(allCats);
      return allCats;
    } catch {
      notify({ message: "Không tải được danh sách danh mục.", variant: "error" });
      return [];
    }
  };

  // Load groups + categories and build full tree
  const loadFullTree = async () => {
    const [loadedGroups, loadedCategories] = await Promise.all([
      loadGroups(),
      loadAllCategoriesForTree(),
    ]);
    const tree = buildFullTree(loadedGroups, loadedCategories);
    setFullTree(tree);
  };

  // Load categories by groupId and build tree structure
  const loadCategories = async (groupId: number | null) => {
    if (!groupId) {
      setCategories([]);
      setCategoryTree([]);
      return;
    }

    try {
      const data = await fetchCategories({
        GroupId: groupId,
        // Load all categories (not just parents) to build tree
        Page: 1,
        PageSize: 999
      });
      const items = data.items || [];
      setCategories(items); // Keep for backward compatibility
      const tree = buildCategoryTree(items);
      setCategoryTree(tree);
    } catch {
      notify({ message: "Không tải được danh sách danh mục.", variant: "error" });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchProducts({
        page,
        pageSize,
        search: keywordBuffer.trim() || undefined,
        categoryId: selectedCategoryId || undefined
      });
      const loadedItems = Array.isArray(data.items) ? data.items : [];
      setItems(loadedItems);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 0);
      setSelectedIds(new Set());
    } catch {
      setItems([]);
      setTotalCount(0);
      setTotalPages(0);
      setSelectedIds(new Set());
      notify({ message: "Không tải được danh sách sản phẩm.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFullTree(); // Load groups + all categories for full tree
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload data when page, search, or category filter changes
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, keywordBuffer, selectedCategoryId]);

  // Reset page to 1 when search keyword or category filter changes
  useEffect(() => {
    setPage(1);
  }, [keywordBuffer, selectedCategoryId]);

  // When group changes, load categories for that group
  useEffect(() => {
    loadCategories(selectedGroupId);
    setSelectedCategoryId(null); // Reset category selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  // Items are now filtered server-side via API

  const markSaving = (id: number, saving: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev);
      saving ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const saveItem = async (item: ProductDraft) => {
    markSaving(item.id, true);
    try {
      // Fetch full product detail to get all fields (including those not in list view)
      const productDetail = await fetchProductDetail(item.id);

      // Destructure to remove fields that shouldn't be sent
      const { id, categories, createdAt, createdBy, updatedAt, updatedBy, dateAdded, view, variants, nhaCungCapName, ...restDetails } = productDetail as any;

      // Merge edited fields with existing data to preserve all fields
      const payload: UpdateProductRequest = {
        ...restDetails,
        code: item.code ?? productDetail.code ?? "",
        name: item.name ?? productDetail.name ?? "",
        nameEn: item.nameEn ?? productDetail.nameEn ?? "",
        categoryIds: item.selectedCategoryIds ?? (item.categories?.map(c => c.id) || productDetail.categoryIds || []),
        status: item.status ?? productDetail.status ?? 0,
        isNewProduct: (item as any).isNewProduct ?? productDetail.isNewProduct ?? false,
      };

      await updateProduct(item.id, payload);
      // Reload data to get updated categories from server
      await loadData();
      // Deselect after successful save
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      notify({ message: "Đã lưu sản phẩm.", variant: "success" });
    } catch (error) {
      console.error("Update product error:", error);
      notify({ message: "Lưu sản phẩm thất bại.", variant: "error" });
    } finally {
      markSaving(item.id, false);
    }
  };

  const handleChangeField = (
    id: number,
    key: keyof Product,
    value: any
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
    // Auto-check when there's a change
    if (!selectedIds.has(id)) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  };

  const handleChangeCategories = (id: number, categoryIds: number[]) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selectedCategoryIds: categoryIds } : item
      )
    );
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
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.size) return;

    confirm({
      title: "Xóa sản phẩm",
      description: `Bạn có chắc muốn xóa ${selectedIds.size} sản phẩm đã chọn?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        const idsToDelete = Array.from(selectedIds);
        let successCount = 0;
        let failCount = 0;

        for (const id of idsToDelete) {
          try {
            await deleteProduct(id);
            successCount++;
          } catch {
            failCount++;
          }
        }

        // Remove deleted items from state
        setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
        setSelectedIds(new Set());

        if (failCount === 0) {
          notify({
            message: `Đã xóa ${successCount} sản phẩm.`,
            variant: "success",
          });
        } else {
          notify({
            message: `Xóa ${successCount}/${idsToDelete.length} sản phẩm. ${failCount} thất bại.`,
            variant: "error",
          });
        }

        // Reload to ensure consistency
        loadData();
      },
    });
  };

  const handleUpdateSelected = async () => {
    if (!selectedIds.size) return;

    const selectedItems = items.filter((item) =>
      selectedIds.has(item.id)
    );
    for (const item of selectedItems) {
      await saveItem(item);
    }
  };

  const handleDeleteSingle = (item: Product) => {
    confirm({
      title: "Xóa sản phẩm",
      description: `Bạn có chắc muốn xóa sản phẩm "${item.name}"?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          await deleteProduct(item.id);
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          notify({ message: "Đã xóa sản phẩm.", variant: "success" });
        } catch {
          notify({
            message: "Xóa sản phẩm thất bại.",
            variant: "error",
          });
        }
      },
    });
  };

  const inputBase = "tme-input";

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Quản trị
          </p>
          <h1 className="text-xl font-semibold text-slate-900">
            Sản phẩm
          </h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Quản lý danh mục", href: "/catalog/product-groups" },
            { label: "Sản phẩm" },
          ]}
          className="justify-end"
        />
      </div>

      {/* Search Form with Cascading Dropdowns */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Nhóm sản phẩm
            </label>
            <select
              value={selectedGroupId ?? ""}
              onChange={(e) => setSelectedGroupId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">-- Chọn nhóm --</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Danh mục sản phẩm
            </label>
            <select
              value={selectedCategoryId ?? ""}
              onChange={(e) => setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null)}
              disabled={!selectedGroupId}
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">-- Chọn danh mục --</option>
              {flattenTree(categoryTree).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.level > 0 ? `${"—".repeat(cat.level)} ` : ""}
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Tìm kiếm
            </label>
            <input
              value={keywordBuffer}
              onChange={(e) => setKeywordBuffer(e.target.value)}
              placeholder="Tìm theo tên, mã..."
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2">
          <DeleteSelectedButton
            count={selectedIds.size}
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
          />
          <UpdateButton
            onClick={handleUpdateSelected}
            disabled={selectedIds.size === 0}
          />
        </div>
        <button
          onClick={() => router.push("/catalog/products/create")}
          className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Thêm sản phẩm
        </button>
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
                    checked={
                      items.length > 0 &&
                      selectedIds.size === items.length
                    }
                    onChange={toggleSelectAll}
                    aria-label="Chọn tất cả"
                  />
                </th>
                {/* <HeaderCell label="ID" className="text-center" /> */}
                {/* <HeaderCell label="Hình ảnh" className="text-center" /> */}
                <HeaderCell label="Mã sản phẩm" />
                <HeaderCell label="Tên sản phẩm" />
                <HeaderCell label="Tên tiếng Anh" />
                {/* <HeaderCell label="Danh mục" /> */}
                <HeaderCell label="Ẩn" className="text-center" />
                <HeaderCell label="SP Mới" className="text-center" />
                {/* <HeaderCell label="Giá min" className="text-right" /> */}
                {/* <HeaderCell label="Giá max" className="text-right" /> */}
                {/* <HeaderCell label="Biến thể" className="text-center" /> */}
                {/* <HeaderCell label="Tồn kho" className="text-center" /> */}
                <HeaderCell label="Ngày tạo" />
                <HeaderCell label="Chức năng" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-5 text-center text-sm text-slate-500"
                  >
                    Đang tải sản phẩm...
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => {
                  const saving = savingIds.has(item.id);
                  const disabledClass = saving
                    ? "opacity-60 bg-slate-50"
                    : "";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80"
                    >
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>
                      {/* <td className="px-2 py-1.5 text-center">
                        <span className="text-sm text-slate-600">
                          {item.id}
                        </span>
                      </td> */}
                      {/* <td className="px-2 py-1.5 text-center">
                        {item.image ? (
                          <img
                            src={buildImageUrl(item.image)}
                            alt={item.name || ""}
                            className="mx-auto h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-slate-400">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </td> */}
                      <td className="px-2 py-1.5">
                        <input
                          value={item.code || ""}
                          disabled={saving}
                          onChange={(e) =>
                            handleChangeField(item.id, "code", e.target.value)
                          }
                          className={`${inputBase} w-32 ${disabledClass}`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.name || ""}
                          disabled={saving}
                          onChange={(e) =>
                            handleChangeField(item.id, "name", e.target.value)
                          }
                          className={`${inputBase} w-72 ${disabledClass}`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.nameEn || ""}
                          disabled={saving}
                          onChange={(e) =>
                            handleChangeField(item.id, "nameEn", e.target.value)
                          }
                          className={`${inputBase} w-72 ${disabledClass}`}
                        />
                      </td>
                      {/* <td className="px-2 py-1.5">
                        <div className="flex flex-col gap-1.5">
                          <div className="text-xs text-slate-600 min-h-4">
                            {item.categories && item.categories.length > 0 ? (
                              item.categories.map((cat) => cat.name).join(", ")
                            ) : (
                              <span className="italic text-slate-400">Chưa chọn</span>
                            )}
                          </div>
                          <MultiSelectCategoryDropdown
                            fullTree={fullTree}
                            selectedIds={item.selectedCategoryIds ?? (item.categories?.map(c => c.id) || [])}
                            onChange={(ids) => handleChangeCategories(item.id, ids)}
                            disabled={saving}
                          />
                        </div>
                      </td> */}
                      <td className="px-2 py-1.5 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.status === 1}
                            disabled={saving}
                            onChange={(e) =>
                              handleChangeField(item.id, "status", e.target.checked ? 1 : 0)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </label>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isNewProduct === true}
                            disabled={saving}
                            onChange={(e) =>
                              handleChangeField(item.id, "isNewProduct" as any, e.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </label>
                      </td>
                      {/* <td className="px-2 py-1.5 text-right">
                        <span className="text-sm text-slate-600">
                          {item.minPrice?.toLocaleString("vi-VN") ?? "—"}
                        </span>
                      </td> */}
                      {/* <td className="px-2 py-1.5 text-right">
                        <span className="text-sm text-slate-600">
                          {item.maxPrice?.toLocaleString("vi-VN") ?? "—"}
                        </span>
                      </td> */}
                      {/* <td className="px-2 py-1.5 text-center">
                        <span className="text-sm text-slate-600">
                          {item.totalVariants}
                        </span>
                      </td> */}
                      {/* <td className="px-2 py-1.5 text-center">
                        <span className="text-sm text-slate-600">
                          {item.totalStock}
                        </span>
                      </td> */}
                      <td className="px-2 py-1.5">
                        <span className="text-sm text-slate-600">
                          {formatDate(item.createdAt, "dd/MM/yyyy") || "—"}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <SaveActionButton
                            label="Cập nhật"
                            onClick={() => saveItem(item)}
                            disabled={!selectedIds.has(item.id) || saving}
                          />
                          <EditActionButton
                            onClick={() => router.push(`/catalog/products/${item.id}`)}
                          />
                          <DeleteActionButton
                            onClick={() => handleDeleteSingle(item)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-sm text-slate-500"
                  >
                    Chưa có sản phẩm nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-slate-500">
          Hiển thị {items.length} / {totalCount} sản phẩm
          {selectedCategoryId && " (đã lọc theo danh mục)"}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Trước
          </button>
          <span className="text-sm text-slate-600">
            Trang {page} / {totalPages || 1}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading || totalPages === 0}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      </div>

      {dialog}
    </div>
  );
}

function HeaderCell({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500 ${className}`}
    >
      {label}
    </th>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-slate-500">
          Đang tải sản phẩm...
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
