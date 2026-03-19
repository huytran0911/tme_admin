"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";
import { RichTextEditor } from "@/components/shared";
import {
  fetchProductDetail,
  updateProduct,
  uploadImage,
  fetchGroups,
  fetchAllCategories,
  fetchProductTypes,
  fetchProductTypeValues,
  fetchProductVariants,
  updateProductVariant,
  fetchVariantPriceTiers,
  updateVariantPriceTiers,
  adjustInventory,
  fetchViewData,
  fetchRelatedProducts,
  setRelatedProducts,
  fetchSimilarProducts,
  setSimilarProducts,
  fetchCrossSellProducts,
  setCrossSellProducts,
  fetchProductGifts,
  createProductGift,
  updateProductGift,
  deleteProductGift,
  fetchProducts,
  type ViewDataItem,
  type CrossSellProduct,
  type CrossSellProductInput,
  type ProductGift,
  type ProductGiftInput,
} from "@/features/products/api";
import { ProductPicker } from "@/features/products/components";
import { fetchSuppliers } from "@/features/suppliers/api";
import type { Supplier } from "@/features/suppliers/types";
import type {
  ProductDetail,
  Group,
  Category,
  UpdateProductRequest,
  ProductType,
  ProductTypeValue,
  ProductVariant,
  PriceTier,
} from "@/features/products/types";
import { buildImageUrl } from "@/lib/utils";
import { ProductSalesTab } from "@/features/product-variants";

type TabKey =
  | "basic-info"
  | "description"
  | "variants-pricing"
  | "inventory"
  | "shipping"
  | "notes"
  | "related"
  | "similar"
  | "bundle"
  | "cross-sell";

const tabs: { key: TabKey; label: string }[] = [
  { key: "basic-info", label: "Thông tin" },
  { key: "description", label: "Mô tả" },
  { key: "notes", label: "Ghi chú" },
  { key: "variants-pricing", label: "Thông tin bán hàng" },
  // { key: "inventory", label: "Kho hàng" }, // Tạm thời ẩn
  { key: "shipping", label: "Vận chuyển" },
  { key: "related", label: "SP liên quan" },
  { key: "similar", label: "SP cùng chức năng" },
  { key: "bundle", label: "SP tặng kèm" },
  { key: "cross-sell", label: "SP bán kèm" },
];

// Full tree node type for Group > Category > Sub-category structure
type FullTreeNode = {
  id: number;
  name: string | null;
  type: "group" | "category";
  level: number;
  groupId?: number | null;
  parentId?: number;
  sortOrder: number;
  children: FullTreeNode[];
};

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
      level: 1,
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

// Multi-select category dropdown component with checkboxes and search
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
  const [searchKeyword, setSearchKeyword] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const flatNodes = flattenFullTree(fullTree);

  // Filter nodes based on search keyword
  const filteredNodes = useMemo(() => {
    if (!searchKeyword.trim()) return flatNodes;

    const keyword = searchKeyword.trim().toLowerCase();
    const matchingCategoryIds = new Set<number>();
    const matchingGroupIds = new Set<number>();

    // Find matching categories
    flatNodes.forEach((node) => {
      if (node.type === "category" && node.name?.toLowerCase().includes(keyword)) {
        matchingCategoryIds.add(node.id);
        // Also include parent group
        if (node.groupId) {
          matchingGroupIds.add(node.groupId);
        }
      }
    });

    // Return nodes that match or are parent groups of matches
    return flatNodes.filter((node) => {
      if (node.type === "group") {
        return matchingGroupIds.has(node.id);
      }
      return matchingCategoryIds.has(node.id);
    });
  }, [flatNodes, searchKeyword]);

  const handleToggle = (nodeId: number) => {
    if (selectedIds.includes(nodeId)) {
      onChange(selectedIds.filter((id) => id !== nodeId));
    } else {
      onChange([...selectedIds, nodeId]);
    }
  };

  const selectedCount = selectedIds.length;

  // Get selected category names for display
  const selectedNames = useMemo(() => {
    const names: string[] = [];
    flatNodes.forEach((node) => {
      if (node.type === "category" && selectedIds.includes(node.id) && node.name) {
        names.push(node.name);
      }
    });
    return names;
  }, [flatNodes, selectedIds]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full text-left rounded-md border px-2.5 py-1.5 text-sm flex items-center justify-between ${
          disabled
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
        }`}
      >
        <span className="truncate flex-1 pr-2">
          {selectedCount > 0
            ? selectedNames.length <= 2
              ? selectedNames.join(", ")
              : `${selectedNames.slice(0, 2).join(", ")} +${selectedNames.length - 2}`
            : "Chọn danh mục"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-96 bg-white border border-slate-200 rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm kiếm danh mục..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Category List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredNodes.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-500">
                Không tìm thấy danh mục phù hợp
              </div>
            ) : (
              filteredNodes.map((node: FullTreeNode) => {
                const isGroup = node.type === "group";
                const indent = node.level > 0 ? node.level * 16 : 0;
                const isChecked = selectedIds.includes(node.id);

                return (
                  <div
                    key={`${node.type}-${node.id}`}
                    style={{ paddingLeft: `${indent}px` }}
                    className={`py-1.5 px-2 rounded ${
                      isGroup
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
              })
            )}
          </div>

          {/* Footer with selected count */}
          {selectedCount > 0 && (
            <div className="p-2 border-t border-slate-100 bg-slate-50 rounded-b-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Đã chọn: <strong className="text-emerald-600">{selectedCount}</strong> danh mục</span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-rose-600 hover:text-rose-700 font-medium"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Single-select category dropdown component with search (for gift picker)
function SingleSelectCategoryDropdown({
  fullTree,
  selectedId,
  onChange,
  disabled,
  placeholder = "Chọn danh mục",
}: {
  fullTree: FullTreeNode[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const flatNodes = flattenFullTree(fullTree);

  // Filter nodes based on search keyword
  const filteredNodes = useMemo(() => {
    if (!searchKeyword.trim()) return flatNodes;

    const keyword = searchKeyword.trim().toLowerCase();
    const matchingCategoryIds = new Set<number>();
    const matchingGroupIds = new Set<number>();

    flatNodes.forEach((node) => {
      if (node.type === "category" && node.name?.toLowerCase().includes(keyword)) {
        matchingCategoryIds.add(node.id);
        if (node.groupId) {
          matchingGroupIds.add(node.groupId);
        }
      }
    });

    return flatNodes.filter((node) => {
      if (node.type === "group") {
        return matchingGroupIds.has(node.id);
      }
      return matchingCategoryIds.has(node.id);
    });
  }, [flatNodes, searchKeyword]);

  const handleSelect = (nodeId: number) => {
    onChange(nodeId);
    setIsOpen(false);
    setSearchKeyword("");
  };

  // Get selected category name for display
  const selectedName = useMemo(() => {
    if (!selectedId) return null;
    const node = flatNodes.find((n) => n.type === "category" && n.id === selectedId);
    return node?.name || null;
  }, [flatNodes, selectedId]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full text-left rounded-md border px-2.5 py-1.5 text-sm flex items-center justify-between ${
          disabled
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
        }`}
      >
        <span className="truncate flex-1 pr-2">
          {selectedName || placeholder}
        </span>
        <svg
          className={`w-4 h-4 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-80 bg-white border border-slate-200 rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm kiếm danh mục..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Category List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredNodes.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-500">
                Không tìm thấy danh mục phù hợp
              </div>
            ) : (
              filteredNodes.map((node: FullTreeNode) => {
                const isGroup = node.type === "group";
                const indent = node.level > 0 ? node.level * 16 : 0;
                const isSelected = node.id === selectedId;

                return (
                  <div
                    key={`${node.type}-${node.id}`}
                    style={{ paddingLeft: `${indent}px` }}
                    className={`py-1.5 px-2 rounded ${
                      isGroup
                        ? "font-semibold text-slate-700 text-sm"
                        : isSelected
                        ? "bg-emerald-50 text-emerald-700"
                        : "hover:bg-slate-50 cursor-pointer"
                    }`}
                    onClick={() => !isGroup && handleSelect(node.id)}
                  >
                    {isGroup ? (
                      <div className="text-xs uppercase tracking-wide text-slate-500 py-1">
                        {node.name}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        {isSelected && (
                          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        <span className={`text-sm ${isSelected ? "font-medium" : "text-slate-700"}`}>{node.name}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with clear button */}
          {selectedId && (
            <div className="p-2 border-t border-slate-100 bg-slate-50 rounded-b-lg">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className="text-sm text-rose-600 hover:text-rose-700 font-medium"
              >
                Bỏ chọn
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Variant selector dropdown with 2-line format (SKU + Attributes + Stock)
function VariantSelector({
  variants,
  selectedId,
  onChange,
  disabled,
  loading,
  placeholder = "-- Chọn phân loại --",
}: {
  variants: ProductVariant[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
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

  const handleSelect = (variantId: number) => {
    onChange(variantId);
    setIsOpen(false);
  };

  // Get selected variant for display
  const selectedVariant = useMemo(() => {
    if (!selectedId) return null;
    return variants.find((v) => v.id === selectedId) || null;
  }, [variants, selectedId]);

  // Format variant display text
  const getVariantDisplayText = (variant: ProductVariant) => {
    const attrText = variant.attributes?.map((a) => `${a.productTypeName}: ${a.productTypeValueName}`).join(" • ") || "";
    return {
      line1: variant.sku || `VAR-${variant.id}`,
      line2: attrText ? `${attrText} • Tồn: ${variant.stock}` : `Tồn kho: ${variant.stock}`,
    };
  };

  const isDisabled = disabled || loading;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={`w-full text-left rounded-md border px-2.5 py-1.5 text-sm flex items-center justify-between min-h-[38px] ${
          isDisabled
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
        }`}
      >
        <div className="flex-1 pr-2 truncate">
          {loading ? (
            <span className="text-slate-400">Đang tải...</span>
          ) : selectedVariant ? (
            <div>
              <div className="font-medium text-slate-900 truncate">{getVariantDisplayText(selectedVariant).line1}</div>
              <div className="text-xs text-slate-500 truncate">{getVariantDisplayText(selectedVariant).line2}</div>
            </div>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {loading && (
            <svg className="animate-spin h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && variants.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {variants.map((variant) => {
            const display = getVariantDisplayText(variant);
            const isSelected = variant.id === selectedId;

            return (
              <div
                key={variant.id}
                onClick={() => handleSelect(variant.id)}
                className={`px-3 py-2 cursor-pointer border-b border-slate-100 last:border-b-0 ${
                  isSelected ? "bg-emerald-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-2">
                  {isSelected && (
                    <svg className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <div className={`flex-1 min-w-0 ${isSelected ? "" : "pl-6"}`}>
                    <div className={`text-sm truncate ${isSelected ? "font-medium text-emerald-700" : "text-slate-900"}`}>
                      {display.line1}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{display.line2}</div>
                  </div>
                  {variant.stock <= 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded shrink-0">Hết hàng</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isOpen && variants.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center text-sm text-slate-500">
          Không có phân loại nào
        </div>
      )}
    </div>
  );
}

// Image upload component with preview
function ImageUpload({
  label,
  value,
  onChange,
  onClear,
  disabled,
}: {
  label: string;
  value: string | null;
  onChange: (file: File | null) => void;
  onClear?: () => void;
  disabled?: boolean;
}) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute preview: local preview from file selection takes priority, otherwise use value URL
  const preview = localPreview || (value ? buildImageUrl(value) : null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onChange(file);
    }
  };

  const handleRemove = () => {
    setLocalPreview(null);
    onChange(null);
    onClear?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-start gap-3">
        {preview && (
          <div className="relative w-24 h-24 rounded-lg border border-slate-200 overflow-hidden">
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={disabled}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
        </div>
      </div>
    </div>
  );
}

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const { notify } = useToast();
  const productId = parseInt(params.id as string);
  const [activeTab, setActiveTab] = useState<TabKey>("basic-info");

  // Product data state
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for basic info tab
  const [formData, setFormData] = useState<Partial<ProductDetail>>({});
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [imageFiles, setImageFiles] = useState<{
    image?: File | null;
    image2?: File | null;
    image3?: File | null;
    image4?: File | null;
  }>({});

  // Categories tree
  const [fullTree, setFullTree] = useState<FullTreeNode[]>([]);

  // Suppliers list
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Dropdown options from SQL views
  const [packedOptions, setPackedOptions] = useState<ViewDataItem[]>([]); // Kiểu chân
  const [pinOptions, setPinOptions] = useState<ViewDataItem[]>([]); // Số chân
  const [typeOptions, setTypeOptions] = useState<ViewDataItem[]>([]); // Chủng loại

  // Variants state
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [editingTiers, setEditingTiers] = useState<{ [variantId: number]: PriceTier[] }>({});

  // Related products state
  const [relatedProductIds, setRelatedProductIds] = useState<number[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [savingRelated, setSavingRelated] = useState(false);

  // Similar products state
  const [similarProductIds, setSimilarProductIds] = useState<number[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [savingSimilar, setSavingSimilar] = useState(false);

  // Cross-sell products state (SP bán kèm)
  const [crossSellProducts, setCrossSellProductsState] = useState<CrossSellProduct[]>([]);
  const [loadingCrossSell, setLoadingCrossSell] = useState(false);
  const [savingCrossSell, setSavingCrossSell] = useState(false);

  // Gift products state (SP tặng kèm)
  const [gifts, setGifts] = useState<ProductGift[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(false);
  const [savingGift, setSavingGift] = useState(false);
  const [showGiftForm, setShowGiftForm] = useState(false);
  const [editingGift, setEditingGift] = useState<ProductGift | null>(null);
  const [giftForm, setGiftForm] = useState<{
    giftVariantId: number | null;
    giftQuantity: number;
    fromDate: string;
    toDate: string;
    isUnlimited: boolean;
  }>({
    giftVariantId: null,
    giftQuantity: 1,
    fromDate: "",
    toDate: "",
    isUnlimited: true,
  });
  // Cascade selection state for gift picker: Category -> Product -> Variant
  const [giftCategoryId, setGiftCategoryId] = useState<number | null>(null);
  const [giftProductId, setGiftProductId] = useState<number | null>(null);
  const [giftProducts, setGiftProducts] = useState<{ id: number; name: string | null; code: string | null; image: string | null }[]>([]);
  const [giftVariants, setGiftVariants] = useState<ProductVariant[]>([]);
  const [loadingGiftProducts, setLoadingGiftProducts] = useState(false);
  const [loadingGiftVariants, setLoadingGiftVariants] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  // Load groups + categories + suppliers + view data for dropdowns
  const loadDropdownData = async () => {
    try {
      const [groups, categories, suppliersResult, packedData, pinData, typeData] = await Promise.all([
        fetchGroups({ Page: 1, PageSize: 999 }).then((res) => res.items || []),
        fetchAllCategories(),
        fetchSuppliers({ page: 1, pageSize: 999 }),
        fetchViewData("viewPacked").catch(() => []), // Kiểu chân
        fetchViewData("viewPin").catch(() => []), // Số chân
        fetchViewData("viewType").catch(() => []), // Chủng loại
      ]);
      const tree = buildFullTree(groups, categories);
      setFullTree(tree);
      setSuppliers(suppliersResult.items || []);
      setPackedOptions(packedData);
      setPinOptions(pinData);
      setTypeOptions(typeData);
    } catch (error) {
      console.error("Load dropdown data error:", error);
      notify({ message: "Không tải được dữ liệu dropdown.", variant: "error" });
    }
  };

  // Load product detail
  const loadProduct = async () => {
    setLoading(true);
    try {
      const data = await fetchProductDetail(productId);
      setProduct(data);
      setFormData(data);

      // Extract category IDs - try categoryIds first, then extract from categories array
      let catIds: number[] = [];
      if (data.categoryIds && data.categoryIds.length > 0) {
        catIds = data.categoryIds;
      } else if (data.categories && data.categories.length > 0) {
        catIds = data.categories.map((c) => c.id);
      }
      setSelectedCategoryIds(catIds);
    } catch (error) {
      console.error("Load product error:", error);
      notify({ message: "Không tải được thông tin sản phẩm.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Load product variants
  const loadVariants = async () => {
    setLoadingVariants(true);
    try {
      const data = await fetchProductVariants(productId);
      setVariants(data);

      // Load price tiers for each variant
      const tiersMap: { [variantId: number]: PriceTier[] } = {};
      for (const variant of data) {
        try {
          const tiers = await fetchVariantPriceTiers(variant.id);
          tiersMap[variant.id] = tiers;
        } catch {
          tiersMap[variant.id] = [];
        }
      }
      setEditingTiers(tiersMap);
    } catch (error) {
      console.error("Load variants error:", error);
      notify({ message: "Không tải được danh sách phân loại.", variant: "error" });
    } finally {
      setLoadingVariants(false);
    }
  };

  useEffect(() => {
    loadDropdownData();
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // Load variants when switching to variants tab
  useEffect(() => {
    if (activeTab === "variants-pricing" || activeTab === "inventory") {
      if (variants.length === 0) {
        loadVariants();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Load related products
  const loadRelatedProducts = async () => {
    setLoadingRelated(true);
    try {
      const data = await fetchRelatedProducts(productId);
      setRelatedProductIds(data.map((p) => p.productId));
    } catch (error) {
      console.error("Load related products error:", error);
      notify({ message: "Không tải được danh sách SP liên quan.", variant: "error" });
    } finally {
      setLoadingRelated(false);
    }
  };

  // Load related products when switching to related tab
  useEffect(() => {
    if (activeTab === "related") {
      loadRelatedProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Save related products
  const handleSaveRelated = async () => {
    setSavingRelated(true);
    try {
      await setRelatedProducts(productId, relatedProductIds);
      notify({ message: "Đã lưu danh sách SP liên quan!", variant: "success" });
    } catch (error) {
      console.error("Save related products error:", error);
      notify({ message: "Lưu danh sách SP liên quan thất bại.", variant: "error" });
    } finally {
      setSavingRelated(false);
    }
  };

  // Load similar products
  const loadSimilarProducts = async () => {
    setLoadingSimilar(true);
    try {
      const data = await fetchSimilarProducts(productId);
      setSimilarProductIds(data.map((p) => p.productId));
    } catch (error) {
      console.error("Load similar products error:", error);
      notify({ message: "Không tải được danh sách SP cùng chức năng.", variant: "error" });
    } finally {
      setLoadingSimilar(false);
    }
  };

  // Load similar products when switching to similar tab
  useEffect(() => {
    if (activeTab === "similar") {
      loadSimilarProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Save similar products
  const handleSaveSimilar = async () => {
    setSavingSimilar(true);
    try {
      await setSimilarProducts(productId, similarProductIds);
      notify({ message: "Đã lưu danh sách SP cùng chức năng!", variant: "success" });
    } catch (error) {
      console.error("Save similar products error:", error);
      notify({ message: "Lưu danh sách SP cùng chức năng thất bại.", variant: "error" });
    } finally {
      setSavingSimilar(false);
    }
  };

  // Load cross-sell products
  const loadCrossSellProducts = async () => {
    setLoadingCrossSell(true);
    try {
      const data = await fetchCrossSellProducts(productId);
      setCrossSellProductsState(data);
    } catch (error) {
      console.error("Load cross-sell products error:", error);
      notify({ message: "Không tải được danh sách SP bán kèm.", variant: "error" });
    } finally {
      setLoadingCrossSell(false);
    }
  };

  // Load cross-sell products when switching to cross-sell tab
  useEffect(() => {
    if (activeTab === "cross-sell") {
      loadCrossSellProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Update cross-sell product field (saleOff or applyQuantity)
  const handleCrossSellFieldChange = (productId: number, field: "saleOff" | "applyQuantity", value: number) => {
    setCrossSellProductsState((prev) =>
      prev.map((p) => (p.productId === productId ? { ...p, [field]: value } : p))
    );
  };

  // Add product to cross-sell list
  const handleAddCrossSellProduct = (product: { id: number; code: string | null; name: string | null; image: string | null }) => {
    if (crossSellProducts.some((p) => p.productId === product.id)) return;
    setCrossSellProductsState((prev) => [
      ...prev,
      {
        productId: product.id,
        code: product.code,
        name: product.name,
        image: product.image,
        saleOff: 0,
        applyQuantity: 1,
      },
    ]);
  };

  // Remove product from cross-sell list
  const handleRemoveCrossSellProduct = (productId: number) => {
    const removed = crossSellProducts.find((p) => p.productId === productId);
    setCrossSellProductsState((prev) => prev.filter((p) => p.productId !== productId));
    if (removed) {
      notify({ message: `Đã xóa "${removed.name || "sản phẩm"}" khỏi danh sách`, variant: "success" });
    }
  };

  // Save cross-sell products
  const handleSaveCrossSell = async () => {
    setSavingCrossSell(true);
    try {
      const items: CrossSellProductInput[] = crossSellProducts.map((p) => ({
        productId: p.productId,
        saleOff: p.saleOff,
        applyQuantity: p.applyQuantity,
      }));
      await setCrossSellProducts(productId, items);
      notify({ message: "Đã lưu danh sách SP bán kèm!", variant: "success" });
    } catch (error) {
      console.error("Save cross-sell products error:", error);
      notify({ message: "Lưu danh sách SP bán kèm thất bại.", variant: "error" });
    } finally {
      setSavingCrossSell(false);
    }
  };

  // Load gift products
  const loadGiftProducts = async () => {
    setLoadingGifts(true);
    try {
      const data = await fetchProductGifts(productId);
      setGifts(data);
    } catch (error) {
      console.error("Load gift products error:", error);
      notify({ message: "Không tải được danh sách SP tặng kèm.", variant: "error" });
    } finally {
      setLoadingGifts(false);
    }
  };

  // Load gift products when switching to bundle tab
  useEffect(() => {
    if (activeTab === "bundle") {
      loadGiftProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Load products by category for gift picker
  const loadGiftProductsByCategory = async (categoryId: number) => {
    setLoadingGiftProducts(true);
    setGiftProducts([]);
    setGiftProductId(null);
    setGiftVariants([]);
    setSelectedVariant(null);
    setGiftForm((prev) => ({ ...prev, giftVariantId: null }));
    try {
      const result = await fetchProducts({ page: 1, pageSize: 100, categoryId });
      setGiftProducts(result.items.map((p) => ({ id: p.id, name: p.name, code: p.code, image: p.image })));
    } catch (error) {
      console.error("Load gift products error:", error);
      setGiftProducts([]);
    } finally {
      setLoadingGiftProducts(false);
    }
  };

  // Load variants by product for gift picker
  const loadGiftVariantsByProduct = async (selectedProductId: number) => {
    setLoadingGiftVariants(true);
    setGiftVariants([]);
    setSelectedVariant(null);
    setGiftForm((prev) => ({ ...prev, giftVariantId: null }));
    try {
      const variants = await fetchProductVariants(selectedProductId);
      setGiftVariants(variants);
    } catch (error) {
      console.error("Load gift variants error:", error);
      setGiftVariants([]);
    } finally {
      setLoadingGiftVariants(false);
    }
  };

  // Handle category change in gift picker
  const handleGiftCategoryChange = (categoryId: number | null) => {
    setGiftCategoryId(categoryId);
    if (categoryId) {
      loadGiftProductsByCategory(categoryId);
    } else {
      setGiftProducts([]);
      setGiftProductId(null);
      setGiftVariants([]);
      setSelectedVariant(null);
      setGiftForm((prev) => ({ ...prev, giftVariantId: null }));
    }
  };

  // Handle product change in gift picker
  const handleGiftProductChange = (selectedProductId: number | null) => {
    setGiftProductId(selectedProductId);
    if (selectedProductId) {
      loadGiftVariantsByProduct(selectedProductId);
    } else {
      setGiftVariants([]);
      setSelectedVariant(null);
      setGiftForm((prev) => ({ ...prev, giftVariantId: null }));
    }
  };

  // Handle variant selection in gift picker
  const handleGiftVariantChange = (variantId: number | null) => {
    if (variantId) {
      const variant = giftVariants.find((v) => v.id === variantId);
      setSelectedVariant(variant || null);
      setGiftForm((prev) => ({ ...prev, giftVariantId: variantId }));
    } else {
      setSelectedVariant(null);
      setGiftForm((prev) => ({ ...prev, giftVariantId: null }));
    }
  };

  // Reset gift form
  const resetGiftForm = () => {
    setGiftForm({
      giftVariantId: null,
      giftQuantity: 1,
      fromDate: "",
      toDate: "",
      isUnlimited: true,
    });
    setGiftCategoryId(null);
    setGiftProductId(null);
    setGiftProducts([]);
    setGiftVariants([]);
    setSelectedVariant(null);
    setEditingGift(null);
    setShowGiftForm(false);
  };

  // Open form to add new gift
  const handleAddGift = () => {
    resetGiftForm();
    setShowGiftForm(true);
  };

  // Open form to edit existing gift (read-only variant display for editing)
  const handleEditGift = (gift: ProductGift) => {
    setEditingGift(gift);
    setGiftForm({
      giftVariantId: gift.giftVariantId,
      giftQuantity: gift.giftQuantity,
      fromDate: gift.fromDate ? gift.fromDate.split("T")[0] : "",
      toDate: gift.toDate ? gift.toDate.split("T")[0] : "",
      isUnlimited: gift.isUnlimited,
    });
    // For editing, we just show the variant info without cascade selection
    setSelectedVariant({
      id: gift.giftVariantId,
      productId: 0,
      sku: gift.giftVariantSku,
      stock: 0,
      status: 1,
      attributes: [],
    });
    setShowGiftForm(true);
  };

  // Save gift (create or update)
  const handleSaveGift = async () => {
    if (!giftForm.giftVariantId) {
      notify({ message: "Vui lòng chọn variant để tặng kèm", variant: "error" });
      return;
    }
    if (giftForm.giftQuantity < 1) {
      notify({ message: "Số lượng phải >= 1", variant: "error" });
      return;
    }
    if (!giftForm.isUnlimited && (!giftForm.fromDate || !giftForm.toDate)) {
      notify({ message: "Vui lòng chọn ngày bắt đầu và kết thúc", variant: "error" });
      return;
    }

    setSavingGift(true);
    try {
      const payload: ProductGiftInput = {
        giftVariantId: giftForm.giftVariantId,
        giftQuantity: giftForm.giftQuantity,
        fromDate: giftForm.isUnlimited ? null : giftForm.fromDate,
        toDate: giftForm.isUnlimited ? null : giftForm.toDate,
        isUnlimited: giftForm.isUnlimited,
      };

      if (editingGift) {
        await updateProductGift(productId, editingGift.id, payload);
        notify({ message: "Đã cập nhật quà tặng!", variant: "success" });
      } else {
        await createProductGift(productId, payload);
        notify({ message: "Đã thêm quà tặng!", variant: "success" });
      }
      resetGiftForm();
      await loadGiftProducts();
    } catch (error) {
      console.error("Save gift error:", error);
      notify({ message: "Lưu quà tặng thất bại.", variant: "error" });
    } finally {
      setSavingGift(false);
    }
  };

  // Delete gift
  const handleDeleteGift = async (giftId: number) => {
    if (!confirm("Bạn có chắc muốn xóa quà tặng này?")) return;

    setSavingGift(true);
    try {
      await deleteProductGift(productId, giftId);
      notify({ message: "Đã xóa quà tặng!", variant: "success" });
      await loadGiftProducts();
    } catch (error) {
      console.error("Delete gift error:", error);
      notify({ message: "Xóa quà tặng thất bại.", variant: "error" });
    } finally {
      setSavingGift(false);
    }
  };

  // Get gift status badge
  const getGiftStatusBadge = (gift: ProductGift) => {
    if (gift.isUnlimited) {
      return <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">Không thời hạn</span>;
    }
    if (gift.isActive) {
      return <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">Đang áp dụng</span>;
    }
    const now = new Date();
    const fromDate = gift.fromDate ? new Date(gift.fromDate) : null;
    const toDate = gift.toDate ? new Date(gift.toDate) : null;

    if (fromDate && now < fromDate) {
      return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">Chờ áp dụng</span>;
    }
    if (toDate && now > toDate) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Hết hạn</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-700">N/A</span>;
  };

  const handleFieldChange = (field: keyof ProductDetail, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!product) return;

    setSaving(true);
    try {
      // Upload images if changed
      const uploadedImages: { [key: string]: string } = {};

      for (const [key, file] of Object.entries(imageFiles)) {
        if (file) {
          try {
            const url = await uploadImage(file);
            uploadedImages[key] = url;
          } catch (error) {
            console.error(`Upload ${key} error:`, error);
            notify({ message: `Không upload được ${key}`, variant: "error" });
          }
        }
      }

      // Destructure to remove fields that shouldn't be sent
      const { id, categories, createdAt, createdBy, updatedAt, updatedBy, dateAdded, view, variants, nhaCungCapName, ...restProduct } = product as any;

      // Merge data
      const payload: UpdateProductRequest = {
        ...restProduct,
        ...formData,
        ...uploadedImages,
        categoryIds: selectedCategoryIds,
      };

      await updateProduct(productId, payload);
      notify({ message: "Đã lưu sản phẩm thành công!", variant: "success" });

      // Reload product
      await loadProduct();
      // Clear image files after successful upload
      setImageFiles({});
    } catch (error) {
      console.error("Save product error:", error);
      notify({ message: "Lưu sản phẩm thất bại.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Quản Lý / Cập nhật
          </p>
          <h1 className="text-xl font-semibold text-slate-900">
            Cập nhật sản phẩm
          </h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Quản Lý Sản Phẩm", href: "/catalog/products" },
            { label: "Cập nhật" },
          ]}
          className="justify-end"
        />
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors
                ${
                  activeTab === tab.key
                    ? "border-b-2 border-emerald-500 text-emerald-600"
                    : "text-slate-600 hover:text-slate-900 hover:border-b-2 hover:border-slate-300"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-lg font-medium mb-2">Đang tải...</div>
          </div>
        ) : (
          <>
            {/* Tab 1: Thông tin cơ bản */}
            {activeTab === "basic-info" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mã sản phẩm */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Mã sản phẩm (SKU)
                    </label>
                    <input
                      type="text"
                      value={formData.code || ""}
                      onChange={(e) => handleFieldChange("code", e.target.value)}
                      disabled={saving}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                    />
                  </div>

                  {/* Ẩn + Sản phẩm mới */}
                  <div className="flex items-center gap-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData.status ?? 0) !== 0}
                        onChange={(e) => handleFieldChange("status", e.target.checked ? 1 : 0)}
                        disabled={saving}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                      />
                      <span className="text-sm font-medium text-slate-700">Ẩn</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isNewProduct ?? false}
                        onChange={(e) => handleFieldChange("isNewProduct", e.target.checked)}
                        disabled={saving}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                      />
                      <span className="text-sm font-medium text-slate-700">Sản phẩm mới</span>
                    </label>
                  </div>

                  {/* Tên sản phẩm */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Tên sản phẩm (VN) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name || ""}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      disabled={saving}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                    />
                  </div>

                  {/* Tên tiếng Anh */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Tên sản phẩm (EN)
                    </label>
                    <input
                      type="text"
                      value={formData.nameEn || ""}
                      onChange={(e) => handleFieldChange("nameEn", e.target.value)}
                      disabled={saving}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                    />
                  </div>

                </div>

                {/* Danh mục + Nhà cung cấp */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Danh mục */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Danh mục sản phẩm
                    </label>
                    <MultiSelectCategoryDropdown
                      fullTree={fullTree}
                      selectedIds={selectedCategoryIds}
                      onChange={setSelectedCategoryIds}
                      disabled={saving}
                    />
                  </div>

                  {/* Nhà cung cấp */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Nhà cung cấp
                    </label>
                    <select
                      value={formData.nhaCungCap ?? ""}
                      onChange={(e) => handleFieldChange("nhaCungCap", e.target.value ? parseInt(e.target.value) : null)}
                      disabled={saving}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                    >
                      <option value="">-- Chọn nhà cung cấp --</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Kiểu chân + Số chân - 4 equal columns */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Kiểu chân - Select */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Kiểu chân
                    </label>
                    <select
                      value={formData.packed ?? ""}
                      onChange={(e) => handleFieldChange("packed", e.target.value || null)}
                      disabled={saving}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                    >
                      <option value="">-- Chọn --</option>
                      {packedOptions.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kiểu chân - Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Kiểu chân (tùy chỉnh)
                    </label>
                    <input
                      type="text"
                      value={formData.packed || ""}
                      onChange={(e) => handleFieldChange("packed", e.target.value || null)}
                      disabled={saving}
                      placeholder="Nhập tùy chỉnh"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                    />
                  </div>

                  {/* Số chân - Select */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Số chân
                    </label>
                    <select
                      value={formData.pin ?? ""}
                      onChange={(e) => handleFieldChange("pin", e.target.value || null)}
                      disabled={saving}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                    >
                      <option value="">-- Chọn --</option>
                      {pinOptions.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Số chân - Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Số chân (tùy chỉnh)
                    </label>
                    <input
                      type="text"
                      value={formData.pin || ""}
                      onChange={(e) => handleFieldChange("pin", e.target.value || null)}
                      disabled={saving}
                      placeholder="Nhập tùy chỉnh"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Chủng loại + Thứ tự sắp xếp + Điểm tích lũy - 4 equal columns */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Chủng loại - Select */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Chủng loại
                    </label>
                    <select
                      value={formData.type ?? ""}
                      onChange={(e) => handleFieldChange("type", e.target.value || null)}
                      disabled={saving}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                    >
                      <option value="">-- Chọn --</option>
                      {typeOptions.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chủng loại - Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Chủng loại (tùy chỉnh)
                    </label>
                    <input
                      type="text"
                      value={formData.type || ""}
                      onChange={(e) => handleFieldChange("type", e.target.value || null)}
                      disabled={saving}
                      placeholder="Nhập tùy chỉnh"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                    />
                  </div>

                  {/* Thứ tự sắp xếp */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Thứ tự sắp xếp
                    </label>
                    <input
                      type="number"
                      value={formData.sort ?? 0}
                      onChange={(e) => handleFieldChange("sort", parseInt(e.target.value) || 0)}
                      disabled={saving}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                    />
                  </div>

                  {/* Điểm tích lũy */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Điểm tích lũy
                    </label>
                    <input
                      type="number"
                      value={formData.pointSave ?? 0}
                      onChange={(e) => handleFieldChange("pointSave", parseInt(e.target.value) || 0)}
                      disabled={saving}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Đơn vị + Xuất xứ */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Đơn vị (VN) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Đơn vị tính (VN)
                      </label>
                      <input
                        type="text"
                        value={formData.unit || ""}
                        onChange={(e) => handleFieldChange("unit", e.target.value)}
                        disabled={saving}
                        placeholder="VD: Cái, Bộ..."
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                      />
                    </div>

                    {/* Đơn vị (EN) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Đơn vị tính (EN)
                      </label>
                      <input
                        type="text"
                        value={formData.unitEn || ""}
                        onChange={(e) => handleFieldChange("unitEn", e.target.value)}
                        disabled={saving}
                        placeholder="Ex: Piece, Set..."
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                      />
                    </div>

                    {/* Xuất xứ (VN) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Xuất xứ (VN)
                      </label>
                      <input
                        type="text"
                        value={formData.origin || ""}
                        onChange={(e) => handleFieldChange("origin", e.target.value)}
                        disabled={saving}
                        placeholder="VD: Việt Nam..."
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                      />
                    </div>

                    {/* Xuất xứ (EN) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Xuất xứ (EN)
                      </label>
                      <input
                        type="text"
                        value={formData.originEn || ""}
                        onChange={(e) => handleFieldChange("originEn", e.target.value)}
                        disabled={saving}
                        placeholder="Ex: Vietnam..."
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Tài liệu */}
                  <RichTextEditor
                    label="Tài liệu"
                    value={formData.documents || ""}
                    onChange={(value) => handleFieldChange("documents", value)}
                    placeholder="Nhập nội dung tài liệu..."
                    uploadModule="products"
                    minHeight={200}
                  />

                {/* Images */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-md font-semibold text-slate-900">Hình ảnh sản phẩm</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ImageUpload
                      label="Ảnh chính"
                      value={formData.image || null}
                      onChange={(file) => setImageFiles((prev) => ({ ...prev, image: file }))}
                      onClear={() => handleFieldChange("image", "")}
                      disabled={saving}
                    />
                    <ImageUpload
                      label="Ảnh 2"
                      value={formData.image2 || null}
                      onChange={(file) => setImageFiles((prev) => ({ ...prev, image2: file }))}
                      onClear={() => handleFieldChange("image2", "")}
                      disabled={saving}
                    />
                    <ImageUpload
                      label="Ảnh 3"
                      value={formData.image3 || null}
                      onChange={(file) => setImageFiles((prev) => ({ ...prev, image3: file }))}
                      onClear={() => handleFieldChange("image3", "")}
                      disabled={saving}
                    />
                    <ImageUpload
                      label="Ảnh 4"
                      value={formData.image4 || null}
                      onChange={(file) => setImageFiles((prev) => ({ ...prev, image4: file }))}
                      onClear={() => handleFieldChange("image4", "")}
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end gap-3 border-t pt-6">
                  <button
                    onClick={() => router.push("/catalog/products")}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !formData.name}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Mô tả */}
            {activeTab === "description" && (
              <div className="space-y-6">
                {/* Mô tả ngắn (VN) */}
                <div>
                  <RichTextEditor
                    label="Mô tả ngắn (VN)"
                    value={formData.shortContent || ""}
                    onChange={(value) => handleFieldChange("shortContent", value)}
                    placeholder="Mô tả ngắn gọn về sản phẩm (hiển thị trên danh sách)"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Mô tả ngắn hiển thị trong danh sách sản phẩm
                  </p>
                </div>

                {/* Mô tả ngắn (EN) */}
                <div>
                  <RichTextEditor
                    label="Mô tả ngắn (EN)"
                    value={formData.shortContentEn || ""}
                    onChange={(value) => handleFieldChange("shortContentEn", value)}
                    placeholder="Short description (shown in product list)"
                  />
                </div>

                {/* Mô tả chi tiết (VN) */}
                <div>
                  <RichTextEditor
                    label="Mô tả chi tiết (VN)"
                    value={formData.content || ""}
                    onChange={(value) => handleFieldChange("content", value)}
                    placeholder="Mô tả chi tiết, đầy đủ về sản phẩm"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Sử dụng các công cụ định dạng phía trên để tạo nội dung phong phú
                  </p>
                </div>

                {/* Mô tả chi tiết (EN) */}
                <div>
                  <RichTextEditor
                    label="Mô tả chi tiết (EN)"
                    value={formData.contentEn || ""}
                    onChange={(value) => handleFieldChange("contentEn", value)}
                    placeholder="Detailed product description"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Use the formatting tools above to create rich content
                  </p>
                </div>

                {/* Save button */}
                <div className="flex justify-end gap-3 border-t pt-6">
                  <button
                    onClick={() => router.push("/catalog/products")}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !formData.name}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Ghi chú */}
            {activeTab === "notes" && (
              <div className="space-y-6">
                <RichTextEditor
                  label="Thông tin khác (VN)"
                  value={formData.infoOther || ""}
                  onChange={(value) => handleFieldChange("infoOther", value)}
                  placeholder="Các thông tin bổ sung..."
                  uploadModule="products"
                  minHeight={200}
                />
                <RichTextEditor
                  label="Thông tin khác (EN)"
                  value={formData.infoOtherEn || ""}
                  onChange={(value) => handleFieldChange("infoOtherEn", value)}
                  placeholder="Additional information..."
                  uploadModule="products"
                  minHeight={200}
                />

                {/* Save button */}
                <div className="flex justify-end gap-3 border-t pt-6">
                  <button
                    onClick={() => router.push("/catalog/products")}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !formData.name}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 4: Thông tin bán hàng (Variants + Giá) */}
            {activeTab === "variants-pricing" && (
              <ProductSalesTab productId={productId} />
            )}

            {/* Tab 5: Kho hàng (Inventory) */}
            {activeTab === "inventory" && (
              <div className="space-y-6">
                {loadingVariants ? (
                  <div className="text-center py-12 text-slate-500">
                    <div className="text-lg font-medium mb-2">Đang tải...</div>
                  </div>
                ) : variants.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border-2 border-dashed">
                    <div className="text-lg font-medium mb-2">Chưa có phân loại sản phẩm</div>
                    <p className="text-sm">Sản phẩm này chưa có phân loại (variants). Vui lòng tạo variants trước.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Inventory Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b">
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">SKU</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Thuộc tính</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">Tồn kho hiện tại</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Điều chỉnh tồn</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {variants.map((variant) => {
                            const attrText = variant.attributes
                              ?.map((attr) => `${attr.productTypeName}: ${attr.productTypeValueName}`)
                              .join(", ") || "N/A";

                            return (
                              <tr key={variant.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm">{variant.sku || `VAR-${variant.id}`}</td>
                                <td className="px-4 py-3 text-sm">{attrText}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                                    variant.stock > 0
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}>
                                    {variant.stock}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      placeholder="Số lượng"
                                      id={`adjust-${variant.id}`}
                                      disabled={saving}
                                      className="w-24 rounded border border-slate-200 px-2 py-1 text-sm"
                                    />
                                    <select
                                      id={`reason-${variant.id}`}
                                      disabled={saving}
                                      className="rounded border border-slate-200 px-2 py-1 text-sm"
                                    >
                                      <option value="">-- Lý do --</option>
                                      <option value="import">Nhập kho</option>
                                      <option value="export">Xuất kho</option>
                                      <option value="return">Trả hàng</option>
                                      <option value="damage">Hư hỏng</option>
                                      <option value="adjustment">Kiểm kê</option>
                                    </select>
                                    <button
                                      onClick={async () => {
                                        const qtyInput = document.getElementById(`adjust-${variant.id}`) as HTMLInputElement;
                                        const reasonSelect = document.getElementById(`reason-${variant.id}`) as HTMLSelectElement;

                                        const adjustQty = parseInt(qtyInput.value);
                                        const reason = reasonSelect.value;

                                        if (!adjustQty || adjustQty === 0) {
                                          notify({ message: "Vui lòng nhập số lượng", variant: "error" });
                                          return;
                                        }
                                        if (!reason) {
                                          notify({ message: "Vui lòng chọn lý do", variant: "error" });
                                          return;
                                        }

                                        try {
                                          setSaving(true);
                                          await adjustInventory({
                                            variantId: variant.id,
                                            adjustQuantity: adjustQty,
                                            reason,
                                          });
                                          notify({ message: "Đã điều chỉnh tồn kho", variant: "success" });

                                          // Clear inputs
                                          qtyInput.value = "";
                                          reasonSelect.value = "";

                                          // Reload variants
                                          await loadVariants();
                                        } catch (error) {
                                          notify({ message: "Điều chỉnh tồn kho thất bại", variant: "error" });
                                        } finally {
                                          setSaving(false);
                                        }
                                      }}
                                      disabled={saving}
                                      className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {saving ? "Đang lưu..." : "Điều chỉnh"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="text-sm text-slate-500 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <strong>Lưu ý:</strong> Số lượng điều chỉnh có thể âm (giảm) hoặc dương (tăng).
                      VD: Nhập +10 để tăng 10 sp, nhập -5 để giảm 5 sp.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 6: Vận chuyển */}
            {activeTab === "shipping" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cân nặng */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Cân nặng (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.weight ?? ""}
                      onChange={(e) => handleFieldChange("weight", e.target.value ? parseFloat(e.target.value) : null)}
                      disabled={saving}
                      placeholder="0.00"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                    />
                  </div>

                  {/* Kích thước */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Kích thước (cm)
                    </label>
                    <input
                      type="text"
                      value={formData.dimension || ""}
                      onChange={(e) => handleFieldChange("dimension", e.target.value)}
                      disabled={saving}
                      placeholder="VD: 20 x 15 x 10"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Thông tin đóng gói */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Thông tin đóng gói
                  </label>
                  <textarea
                    rows={4}
                    value={formData.packed || ""}
                    onChange={(e) => handleFieldChange("packed", e.target.value)}
                    disabled={saving}
                    placeholder="Mô tả cách thức đóng gói, bao bì, vật liệu..."
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:opacity-50"
                  />
                </div>

                {/* Save button */}
                <div className="flex justify-end gap-3 border-t pt-6">
                  <button
                    onClick={() => router.push("/catalog/products")}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !formData.name}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 7: SP liên quan */}
            {activeTab === "related" && (
              <div className="space-y-6">
                {loadingRelated ? (
                  <div className="text-center py-12 text-slate-500">
                    <svg
                      className="animate-spin h-8 w-8 mx-auto mb-3 text-emerald-600"
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
                ) : (
                  <>
                    <ProductPicker
                      selectedProductIds={relatedProductIds}
                      onSelectionChange={setRelatedProductIds}
                      excludeProductId={productId}
                      disabled={savingRelated}
                      emptyLabel="Chưa có sản phẩm liên quan nào được chọn"
                      onProductRemoved={(_, name) => {
                        notify({
                          message: `Đã xóa "${name || "sản phẩm"}" khỏi danh sách`,
                          variant: "success",
                        });
                      }}
                    />

                    {/* Save button */}
                    <div className="flex justify-end gap-3 border-t pt-6">
                      <button
                        onClick={() => router.push("/catalog/products")}
                        disabled={savingRelated}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveRelated}
                        disabled={savingRelated}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingRelated ? "Đang lưu..." : "Lưu thay đổi"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab 8: SP cùng chức năng */}
            {activeTab === "similar" && (
              <div className="space-y-6">
                {loadingSimilar ? (
                  <div className="text-center py-12 text-slate-500">
                    <svg
                      className="animate-spin h-8 w-8 mx-auto mb-3 text-emerald-600"
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
                ) : (
                  <>
                    <ProductPicker
                      selectedProductIds={similarProductIds}
                      onSelectionChange={setSimilarProductIds}
                      excludeProductId={productId}
                      disabled={savingSimilar}
                      emptyLabel="Chưa có sản phẩm cùng chức năng nào được chọn"
                      onProductRemoved={(_, name) => {
                        notify({
                          message: `Đã xóa "${name || "sản phẩm"}" khỏi danh sách`,
                          variant: "success",
                        });
                      }}
                    />

                    {/* Save button */}
                    <div className="flex justify-end gap-3 border-t pt-6">
                      <button
                        onClick={() => router.push("/catalog/products")}
                        disabled={savingSimilar}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveSimilar}
                        disabled={savingSimilar}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingSimilar ? "Đang lưu..." : "Lưu thay đổi"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab 9: SP tặng kèm */}
            {activeTab === "bundle" && (
              <div className="space-y-6">
                {loadingGifts ? (
                  <div className="text-center py-12 text-slate-500">
                    <svg
                      className="animate-spin h-8 w-8 mx-auto mb-3 text-emerald-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang tải...
                  </div>
                ) : (
                  <>
                    {/* Add Gift Button */}
                    {!showGiftForm && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddGift}
                          disabled={savingGift}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Thêm quà tặng
                        </button>
                      </div>
                    )}

                    {/* Gift Form (Add/Edit) */}
                    {showGiftForm && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4">
                        <h3 className="text-md font-semibold text-slate-900">
                          {editingGift ? "Chỉnh sửa quà tặng" : "Thêm quà tặng mới"}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Cascade Selection: Category -> Product -> Variant */}
                          {!editingGift ? (
                            <>
                              {/* Step 1: Category Selection */}
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                  1. Chọn danh mục <span className="text-red-500">*</span>
                                </label>
                                <SingleSelectCategoryDropdown
                                  fullTree={fullTree}
                                  selectedId={giftCategoryId}
                                  onChange={handleGiftCategoryChange}
                                  disabled={savingGift}
                                  placeholder="-- Chọn danh mục --"
                                />
                              </div>

                              {/* Step 2: Product Selection */}
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                  2. Chọn sản phẩm <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                  <select
                                    value={giftProductId ?? ""}
                                    onChange={(e) => handleGiftProductChange(e.target.value ? parseInt(e.target.value) : null)}
                                    disabled={savingGift || !giftCategoryId || loadingGiftProducts}
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                                  >
                                    <option value="">
                                      {loadingGiftProducts ? "Đang tải..." : giftCategoryId ? "-- Chọn sản phẩm --" : "-- Chọn danh mục trước --"}
                                    </option>
                                    {giftProducts.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.code ? `[${p.code}] ` : ""}{p.name || `SP #${p.id}`}
                                      </option>
                                    ))}
                                  </select>
                                  {loadingGiftProducts && (
                                    <div className="absolute right-8 top-1/2 -translate-y-1/2">
                                      <svg className="animate-spin h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Step 3: Variant Selection - Custom Dropdown with 2-line format */}
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                  3. Chọn phân loại <span className="text-red-500">*</span>
                                </label>
                                <VariantSelector
                                  variants={giftVariants}
                                  selectedId={giftForm.giftVariantId}
                                  onChange={handleGiftVariantChange}
                                  disabled={savingGift || !giftProductId}
                                  loading={loadingGiftVariants}
                                  placeholder={giftProductId ? "-- Chọn phân loại --" : "-- Chọn sản phẩm trước --"}
                                />
                              </div>
                            </>
                          ) : (
                            /* Read-only variant info when editing */
                            <div className="md:col-span-3">
                              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Variant tặng kèm
                              </label>
                              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                <div className="font-medium text-sm text-slate-900">
                                  SKU: {selectedVariant?.sku || `ID:${giftForm.giftVariantId}`}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  (Không thể thay đổi variant khi chỉnh sửa)
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Selected Variant Preview */}
                          {selectedVariant && !editingGift && (
                            <div className="md:col-span-3">
                              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                                <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-slate-900">
                                    Đã chọn: {selectedVariant.sku || `VAR-${selectedVariant.id}`}
                                  </div>
                                  {selectedVariant.attributes && selectedVariant.attributes.length > 0 && (
                                    <div className="text-xs text-slate-500">
                                      {selectedVariant.attributes.map((a) => `${a.productTypeName}: ${a.productTypeValueName}`).join(", ")}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Quantity */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                              Số lượng tặng <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={giftForm.giftQuantity}
                              onChange={(e) => setGiftForm(prev => ({ ...prev, giftQuantity: parseInt(e.target.value) || 1 }))}
                              disabled={savingGift}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                            />
                          </div>

                          {/* Unlimited Checkbox */}
                          <div className="flex items-center">
                            <label className="flex items-center cursor-pointer space-x-2">
                              <input
                                type="checkbox"
                                checked={giftForm.isUnlimited}
                                onChange={(e) => setGiftForm(prev => ({ ...prev, isUnlimited: e.target.checked }))}
                                disabled={savingGift}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                              />
                              <span className="text-sm font-medium text-slate-700">Không thời hạn</span>
                            </label>
                          </div>

                          {/* Spacer for grid alignment */}
                          <div></div>

                          {/* Date Range (only shown if not unlimited) */}
                          {!giftForm.isUnlimited && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                  Ngày bắt đầu <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="date"
                                  value={giftForm.fromDate}
                                  onChange={(e) => setGiftForm(prev => ({ ...prev, fromDate: e.target.value }))}
                                  disabled={savingGift}
                                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                  Ngày kết thúc <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="date"
                                  value={giftForm.toDate}
                                  onChange={(e) => setGiftForm(prev => ({ ...prev, toDate: e.target.value }))}
                                  disabled={savingGift}
                                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={resetGiftForm}
                            disabled={savingGift}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveGift}
                            disabled={savingGift || !giftForm.giftVariantId}
                            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {savingGift ? "Đang lưu..." : editingGift ? "Cập nhật" : "Thêm"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Gifts Table */}
                    {gifts.length === 0 && !showGiftForm ? (
                      <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                        <p className="text-sm">Chưa có quà tặng kèm nào</p>
                        <p className="text-xs text-slate-400 mt-1">Nhấn &quot;Thêm quà tặng&quot; để bắt đầu</p>
                      </div>
                    ) : gifts.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">STT</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Variant tặng</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">Số lượng</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">Thời gian</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">Trạng thái</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 w-24">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {gifts.map((gift, index) => (
                              <tr key={gift.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    {gift.giftProductImage && (
                                      <img
                                        src={buildImageUrl(gift.giftProductImage)}
                                        alt=""
                                        className="w-10 h-10 rounded object-cover"
                                      />
                                    )}
                                    <div>
                                      <div className="font-medium text-sm text-slate-900">{gift.giftProductName || "N/A"}</div>
                                      <div className="text-xs text-slate-500">
                                        SKU: {gift.giftVariantSku || `ID:${gift.giftVariantId}`}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center text-sm font-medium text-slate-900">
                                  {gift.giftQuantity}
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-slate-600">
                                  {gift.isUnlimited ? (
                                    <span className="text-slate-400">Không thời hạn</span>
                                  ) : (
                                    <div className="text-xs">
                                      <div>{gift.fromDate ? new Date(gift.fromDate).toLocaleDateString("vi-VN") : "N/A"}</div>
                                      <div className="text-slate-400">đến</div>
                                      <div>{gift.toDate ? new Date(gift.toDate).toLocaleDateString("vi-VN") : "N/A"}</div>
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {getGiftStatusBadge(gift)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleEditGift(gift)}
                                      disabled={savingGift}
                                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-50"
                                      title="Sửa"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteGift(gift.id)}
                                      disabled={savingGift}
                                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                      title="Xóa"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Tab 10: SP bán kèm */}
            {activeTab === "cross-sell" && (
              <div className="space-y-6">
                {loadingCrossSell ? (
                  <div className="text-center py-12 text-slate-500">
                    <svg
                      className="animate-spin h-8 w-8 mx-auto mb-3 text-emerald-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang tải...
                  </div>
                ) : (
                  <>
                    {/* Add product section */}
                    <ProductPicker
                      selectedProductIds={crossSellProducts.map((p) => p.productId)}
                      onSelectionChange={() => {}}
                      excludeProductId={productId}
                      disabled={savingCrossSell}
                      emptyLabel="Chưa có sản phẩm bán kèm nào"
                      onProductAdded={(product) => handleAddCrossSellProduct(product)}
                      hideSelectedList
                    />

                    {/* Cross-sell products table */}
                    {crossSellProducts.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <p className="text-sm">Chưa có sản phẩm bán kèm nào</p>
                        <p className="text-xs text-slate-400 mt-1">Sử dụng ô tìm kiếm phía trên để thêm sản phẩm</p>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">STT</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Mã hàng</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Tên SP</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 w-32">Giá trị giảm</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 w-40">Áp dụng cho SL</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 w-20">Xóa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {crossSellProducts.map((product, index) => (
                              <tr key={product.productId} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                  {product.code || `ID: ${product.productId}`}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                  <div className="flex items-center gap-2">
                                    {product.image && (
                                      <img
                                        src={buildImageUrl(product.image)}
                                        alt=""
                                        className="w-8 h-8 rounded object-cover"
                                      />
                                    )}
                                    <span className="truncate max-w-xs">{product.name || "N/A"}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    value={product.saleOff}
                                    onChange={(e) => handleCrossSellFieldChange(product.productId, "saleOff", Number(e.target.value) || 0)}
                                    disabled={savingCrossSell}
                                    className="w-full text-center rounded border border-slate-200 px-2 py-1 text-sm focus:border-emerald-400 focus:outline-none disabled:bg-slate-50"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="1"
                                    value={product.applyQuantity}
                                    onChange={(e) => handleCrossSellFieldChange(product.productId, "applyQuantity", Number(e.target.value) || 1)}
                                    disabled={savingCrossSell}
                                    className="w-full text-center rounded border border-slate-200 px-2 py-1 text-sm focus:border-emerald-400 focus:outline-none disabled:bg-slate-50"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCrossSellProduct(product.productId)}
                                    disabled={savingCrossSell}
                                    className="text-rose-500 hover:text-rose-700 disabled:opacity-50"
                                  >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Save button */}
                    <div className="flex justify-end gap-3 border-t pt-6">
                      <button
                        onClick={() => router.push("/catalog/products")}
                        disabled={savingCrossSell}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveCrossSell}
                        disabled={savingCrossSell}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingCrossSell ? "Đang lưu..." : "Lưu thay đổi"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
