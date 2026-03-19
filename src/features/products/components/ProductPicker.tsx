"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { fetchProducts, fetchGroups, fetchAllCategories } from "../api";
import type { Product, Group, Category } from "../types";
import { buildImageUrl } from "@/lib/utils";

// Full tree node type for Group > Category hierarchy
type TreeNode = {
  id: number;
  name: string | null;
  type: "group" | "category";
  level: number;
  groupId?: number | null;
  parentId?: number;
  sortOrder: number;
  children: TreeNode[];
};

// Build category tree
function buildTree(groups: Group[], categories: Category[]): TreeNode[] {
  const roots: TreeNode[] = [];
  const categoryMap = new Map<number, TreeNode>();

  categories.forEach((cat) => {
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      type: "category",
      level: 1,
      groupId: cat.groupId,
      parentId: cat.parentId,
      sortOrder: cat.sortOrder,
      children: [],
    });
  });

  const categoryRoots: TreeNode[] = [];
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

  groups.forEach((group) => {
    const groupNode: TreeNode = {
      id: group.id,
      name: group.name,
      type: "group",
      level: 0,
      sortOrder: group.sort,
      children: [],
    };

    categoryRoots.forEach((catNode) => {
      if (catNode.groupId === group.id) {
        groupNode.children.push(catNode);
      }
    });

    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      nodes.forEach((n) => sortNodes(n.children));
    };
    sortNodes(groupNode.children);
    roots.push(groupNode);
  });

  roots.sort((a, b) => a.sortOrder - b.sortOrder);
  return roots;
}

function flattenTree(nodes: TreeNode[], result: TreeNode[] = []): TreeNode[] {
  nodes.forEach((node) => {
    result.push(node);
    if (node.children.length > 0) {
      flattenTree(node.children, result);
    }
  });
  return result;
}

type ProductPickerProps = {
  /** Currently selected product IDs */
  selectedProductIds: number[];
  /** Callback when selection changes */
  onSelectionChange: (ids: number[]) => void;
  /** Current product ID to exclude from search results */
  excludeProductId?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Maximum number of products that can be selected */
  maxSelection?: number;
  /** Label for empty state */
  emptyLabel?: string;
  /** Callback when a product is removed */
  onProductRemoved?: (productId: number, productName: string | null) => void;
  /** Callback when a product is added (returns full product info) */
  onProductAdded?: (product: { id: number; code: string | null; name: string | null; image: string | null }) => void;
  /** Hide the selected products list (useful when using custom display) */
  hideSelectedList?: boolean;
};

type SelectedProductInfo = {
  id: number;
  code: string | null;
  name: string | null;
  image: string | null;
};

export function ProductPicker({
  selectedProductIds,
  onSelectionChange,
  excludeProductId,
  disabled = false,
  maxSelection,
  emptyLabel = "Chưa có sản phẩm nào được chọn",
  onProductRemoved,
  onProductAdded,
  hideSelectedList = false,
}: ProductPickerProps) {
  // Search state
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Selected products details
  const [selectedProducts, setSelectedProducts] = useState<SelectedProductInfo[]>([]);
  const [loadingSelected, setLoadingSelected] = useState(false);

  // Category tree
  const [categoryTree, setCategoryTree] = useState<TreeNode[]>([]);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load category tree
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const [groups, categories] = await Promise.all([
          fetchGroups({ Page: 1, PageSize: 999 }).then((res) => res.items || []),
          fetchAllCategories(),
        ]);
        const tree = buildTree(groups, categories);
        setCategoryTree(tree);
      } catch (error) {
        console.error("Load categories error:", error);
      }
    };
    loadCategories();
  }, []);

  // Load selected products details
  useEffect(() => {
    const loadSelectedProducts = async () => {
      if (selectedProductIds.length === 0) {
        setSelectedProducts([]);
        return;
      }

      setLoadingSelected(true);
      try {
        // Fetch product details for each selected ID
        const results: SelectedProductInfo[] = [];

        // Batch fetch by searching with large page
        const response = await fetchProducts({
          page: 1,
          pageSize: 999,
          search: "",
        });

        const productMap = new Map(response.items.map((p) => [p.id, p]));

        selectedProductIds.forEach((id) => {
          const product = productMap.get(id);
          if (product) {
            results.push({
              id: product.id,
              code: product.code,
              name: product.name,
              image: product.image,
            });
          } else {
            // Product not found, keep minimal info
            results.push({
              id,
              code: null,
              name: `Sản phẩm #${id}`,
              image: null,
            });
          }
        });

        setSelectedProducts(results);
      } catch (error) {
        console.error("Load selected products error:", error);
      } finally {
        setLoadingSelected(false);
      }
    };

    loadSelectedProducts();
  }, [selectedProductIds]);

  // Search products with debounce
  const doSearch = useCallback(async (keyword: string, categoryId: number | null) => {
    if (!keyword.trim() && !categoryId) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetchProducts({
        page: 1,
        pageSize: 20,
        search: keyword.trim(),
        categoryId: categoryId || undefined,
      });

      // Filter out current product and already selected products
      let filtered = response.items.filter((p) => {
        if (excludeProductId && p.id === excludeProductId) return false;
        return true;
      });

      setSearchResults(filtered);
    } catch (error) {
      console.error("Search products error:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [excludeProductId]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (showResults) {
        doSearch(searchKeyword, selectedCategoryId);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchKeyword, selectedCategoryId, showResults, doSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddProduct = (product: Product) => {
    if (selectedProductIds.includes(product.id)) return;
    if (maxSelection && selectedProductIds.length >= maxSelection) return;

    // Immediately add product info to selectedProducts (don't wait for re-fetch)
    setSelectedProducts((prev) => [
      ...prev,
      {
        id: product.id,
        code: product.code,
        name: product.name,
        image: product.image,
      },
    ]);

    onSelectionChange([...selectedProductIds, product.id]);

    // Call onProductAdded callback with full product info
    if (onProductAdded) {
      onProductAdded({
        id: product.id,
        code: product.code,
        name: product.name,
        image: product.image,
      });
    }

    setSearchKeyword("");
    setShowResults(false);
  };

  const handleRemoveProduct = (productId: number) => {
    // Find product name before removing
    const removedProduct = selectedProducts.find((p) => p.id === productId);
    onSelectionChange(selectedProductIds.filter((id) => id !== productId));
    // Call callback after removing
    if (onProductRemoved) {
      onProductRemoved(productId, removedProduct?.name || null);
    }
  };

  const flatCategories = useMemo(() => flattenTree(categoryTree), [categoryTree]);

  const isMaxReached = maxSelection !== undefined && selectedProductIds.length >= maxSelection;

  return (
    <div className="space-y-4">
      {/* Search Section */}
      <div className="space-y-3">
        <div className="flex gap-3" ref={searchContainerRef}>
          {/* Category Filter */}
          <div className="w-64">
            <select
              value={selectedCategoryId ?? ""}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null);
                setShowResults(true);
              }}
              disabled={disabled}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
            >
              <option value="">Tất cả danh mục</option>
              {flatCategories.map((node) => {
                const isGroup = node.type === "group";
                const indent = "\u00A0".repeat(node.level * 4);
                return (
                  <option
                    key={`${node.type}-${node.id}`}
                    value={isGroup ? "" : node.id}
                    disabled={isGroup}
                    className={isGroup ? "font-semibold text-slate-500" : ""}
                  >
                    {indent}{isGroup ? `── ${node.name} ──` : node.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                disabled={disabled || isMaxReached}
                placeholder={isMaxReached ? `Đã đạt tối đa ${maxSelection} sản phẩm` : "Tìm kiếm sản phẩm theo tên, mã..."}
                className="w-full pl-10 pr-3 py-2 rounded-md border border-slate-200 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg
                    className="animate-spin h-4 w-4 text-emerald-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && (searchKeyword.trim() || selectedCategoryId) && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    {searching ? "Đang tìm kiếm..." : "Không tìm thấy sản phẩm"}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {searchResults.map((product) => {
                      const isSelected = selectedProductIds.includes(product.id);
                      return (
                        <div
                          key={product.id}
                          onClick={() => !isSelected && handleAddProduct(product)}
                          className={`flex items-center gap-3 p-3 cursor-pointer ${
                            isSelected
                              ? "bg-slate-50 opacity-60 cursor-not-allowed"
                              : "hover:bg-emerald-50"
                          }`}
                        >
                          {/* Product Image */}
                          <div className="w-12 h-12 rounded bg-slate-100 overflow-hidden flex-shrink-0">
                            {typeof product.image === "string" && product.image ? (
                              <img
                                src={buildImageUrl(product.image)}
                                alt={typeof product.name === "string" ? product.name : ""}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">
                              {typeof product.name === "string" ? product.name : `Sản phẩm #${product.id}`}
                            </div>
                            <div className="text-xs text-slate-500">
                              {typeof product.code === "string" ? product.code : `ID: ${product.id}`}
                            </div>
                          </div>

                          {/* Add/Selected Indicator */}
                          {isSelected ? (
                            <span className="text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded">
                              Đã chọn
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100"
                            >
                              Thêm
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selection info */}
        {maxSelection && (
          <div className="text-xs text-slate-500">
            Đã chọn: <span className="font-medium">{selectedProductIds.length}</span>/{maxSelection} sản phẩm
          </div>
        )}
      </div>

      {/* Selected Products List */}
      {!hideSelectedList && (
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        {loadingSelected ? (
          <div className="p-8 text-center text-slate-500">
            <svg
              className="animate-spin h-6 w-6 mx-auto mb-2 text-emerald-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Đang tải...
          </div>
        ) : selectedProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-50">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm">{emptyLabel}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {selectedProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50"
              >
                {/* Order number */}
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 flex-shrink-0">
                  {index + 1}
                </div>

                {/* Product Image */}
                <div className="w-12 h-12 rounded bg-slate-100 overflow-hidden flex-shrink-0">
                  {typeof product.image === "string" && product.image ? (
                    <img
                      src={buildImageUrl(product.image)}
                      alt={typeof product.name === "string" ? product.name : ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {typeof product.name === "string" ? product.name : `Sản phẩm #${product.id}`}
                  </div>
                  <div className="text-xs text-slate-500">
                    {typeof product.code === "string" ? product.code : `ID: ${product.id}`}
                  </div>
                </div>

                {/* Remove Button */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(product.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                    title="Xóa khỏi danh sách"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
