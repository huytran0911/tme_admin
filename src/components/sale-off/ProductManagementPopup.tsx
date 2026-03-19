"use client";
/* eslint-disable @next/next/no-img-element */

import { createPortal } from "react-dom";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { fetchCategories } from "@/features/categories/api";
import {
  fetchProductsForSelection,
  fetchVariantsForProduct,
  addProductsToSaleOff,
  fetchSaleOffProducts,
  removeProductFromSaleOff,
  updateSaleOffProduct,
} from "@/features/sale-off/api";
import type { Category } from "@/features/categories/types";
import type { ProductForSelection, SaleOffProduct, VariantForSelection } from "@/features/sale-off/types";
import { buildImageUrl } from "@/lib/utils";
import { useToast } from "@/components/shared/Toast";

type ProductManagementPopupProps = {
  open: boolean;
  onClose: () => void;
  saleOffId: number;
  saleOffName?: string;
  onSuccess?: () => void;
};

// Variant to add with sale off value and quantity
type VariantToAdd = {
  product: ProductForSelection;
  variant: VariantForSelection;
  saleOffValue: number;
  quantity: number;
};

// Helper to get base price from variant's price tiers
function getVariantBasePrice(variant: VariantForSelection): number {
  const baseTier = variant.priceTiers?.find((pt) => pt.minQty === 1);
  return baseTier?.price ?? variant.basePrice ?? 0;
}

// Helper to format variant options as display string
function formatVariantOptions(variant: VariantForSelection): string {
  if (!variant.options || variant.options.length === 0) return "Mặc định";
  return variant.options.map((opt) => `${opt.productTypeName}: ${opt.productTypeValueName}`).join(", ");
}

export function ProductManagementPopup({
  open,
  onClose,
  saleOffId,
  saleOffName,
  onSuccess,
}: ProductManagementPopupProps) {
  const { notify } = useToast();
  const [mounted, setMounted] = useState(false);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Products dropdown with pagination
  const [products, setProducts] = useState<ProductForSelection[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [productPage, setProductPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const productListRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;

  // Variants for selected product (variant picker)
  const [variantPickerProductId, setVariantPickerProductId] = useState<number | null>(null);
  const [variantPickerProduct, setVariantPickerProduct] = useState<ProductForSelection | null>(null);
  const [variants, setVariants] = useState<VariantForSelection[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Variants to add (pending)
  const [variantsToAdd, setVariantsToAdd] = useState<VariantToAdd[]>([]);

  // Existing products in sale-off
  const [existingProducts, setExistingProducts] = useState<SaleOffProduct[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Saving state
  const [saving, setSaving] = useState(false);

  useEffect(() => setMounted(true), []);

  // Load categories on mount
  useEffect(() => {
    if (!open) return;
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const data = await fetchCategories({ Page: 1, PageSize: 9999 });
        setCategories(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, [open]);

  // Load existing products in sale-off
  const loadExistingProducts = useCallback(async () => {
    if (!open || !saleOffId) return;
    setLoadingExisting(true);
    try {
      const data = await fetchSaleOffProducts(saleOffId, { Page: 1, PageSize: 500 });
      setExistingProducts(data.items);
    } catch (err) {
      console.error("Failed to load existing products:", err);
    } finally {
      setLoadingExisting(false);
    }
  }, [open, saleOffId]);

  useEffect(() => {
    loadExistingProducts();
  }, [loadExistingProducts]);

  // Get excluded variant IDs (already added or in existing list)
  const excludedVariantIds = useMemo(() => {
    return new Set([
      ...existingProducts.map((p) => p.variantId),
      ...variantsToAdd.map((v) => v.variant.id),
    ]);
  }, [existingProducts, variantsToAdd]);

  // Load products (first page) when category or search changes
  const loadProducts = useCallback(async (reset = true) => {
    if (!open) return;

    if (reset) {
      setLoadingProducts(true);
      setProductPage(1);
    } else {
      setLoadingMore(true);
    }

    const page = reset ? 1 : productPage;

    try {
      const data = await fetchProductsForSelection({
        categoryId: selectedCategoryId,
        keyword: productSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      });

      if (reset) {
        setProducts(data.items);
      } else {
        setProducts((prev) => [...prev, ...data.items]);
      }

      setHasMoreProducts(data.items.length === PAGE_SIZE);
      if (!reset) {
        setProductPage((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
      if (reset) setProducts([]);
    } finally {
      setLoadingProducts(false);
      setLoadingMore(false);
    }
  }, [open, selectedCategoryId, productSearch, productPage]);

  // Load products when category changes
  useEffect(() => {
    if (!open) return;
    loadProducts(true);
  }, [open, selectedCategoryId]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      loadProducts(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // Load more when scrolling to bottom
  const handleProductScroll = useCallback(() => {
    const el = productListRef.current;
    if (!el || loadingMore || !hasMoreProducts) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      setProductPage((prev) => prev + 1);
      loadProducts(false);
    }
  }, [loadingMore, hasMoreProducts, loadProducts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProductDropdownOpen(false);
      }
    };
    if (productDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [productDropdownOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedCategoryId(undefined);
      setVariantsToAdd([]);
      setProducts([]);
      setProductPage(1);
      setHasMoreProducts(true);
      setProductDropdownOpen(false);
      setProductSearch("");
      setSelectedProductIds(new Set());
      setVariantPickerProductId(null);
      setVariantPickerProduct(null);
      setVariants([]);
    }
  }, [open]);

  // Load variants when a product is selected for variant picking
  useEffect(() => {
    if (!variantPickerProductId) {
      setVariants([]);
      return;
    }
    const loadVariants = async () => {
      setLoadingVariants(true);
      try {
        const data = await fetchVariantsForProduct(variantPickerProductId);
        // Filter out already-added variants
        setVariants(data.filter((v) => v.status && !excludedVariantIds.has(v.id)));
      } catch (err) {
        console.error("Failed to load variants:", err);
        setVariants([]);
      } finally {
        setLoadingVariants(false);
      }
    };
    loadVariants();
  }, [variantPickerProductId, excludedVariantIds]);

  // Build category tree for dropdown
  const categoryOptions = useMemo(() => {
    const buildTree = (items: Category[], parentId = 0, level = 0): { id: number; name: string; level: number }[] => {
      const result: { id: number; name: string; level: number }[] = [];
      const children = items.filter((c) => c.parentId === parentId);
      children.sort((a, b) => a.sortOrder - b.sortOrder);
      for (const child of children) {
        result.push({ id: child.id, name: child.name, level });
        result.push(...buildTree(items, child.id, level + 1));
      }
      return result;
    };
    return buildTree(categories);
  }, [categories]);

  // Open variant picker for a product
  const handleOpenVariantPicker = (product: ProductForSelection) => {
    setVariantPickerProductId(product.id);
    setVariantPickerProduct(product);
    setProductDropdownOpen(false);
  };

  // Add a variant to pending list
  const handleAddVariant = (product: ProductForSelection, variant: VariantForSelection) => {
    if (excludedVariantIds.has(variant.id)) return;
    setVariantsToAdd((prev) => [
      ...prev,
      {
        product,
        variant,
        saleOffValue: 0,
        quantity: 1,
      },
    ]);
  };

  // Add all variants of selected product
  const handleAddAllVariants = () => {
    if (!variantPickerProduct || variants.length === 0) return;
    const newVariants = variants
      .filter((v) => !excludedVariantIds.has(v.id))
      .map((variant) => ({
        product: variantPickerProduct,
        variant,
        saleOffValue: 0,
        quantity: 1,
      }));
    setVariantsToAdd((prev) => [...prev, ...newVariants]);
    setVariantPickerProductId(null);
    setVariantPickerProduct(null);
    notify({ message: `Đã thêm ${newVariants.length} phân loại.`, variant: "success" });
  };

  // Remove variant from pending list
  const handleRemovePending = (variantId: number) => {
    setVariantsToAdd((prev) => prev.filter((v) => v.variant.id !== variantId));
  };

  // Update pending variant values
  const handleUpdatePending = (variantId: number, field: "saleOffValue" | "quantity", value: number) => {
    setVariantsToAdd((prev) =>
      prev.map((v) => (v.variant.id === variantId ? { ...v, [field]: value } : v))
    );
  };

  // Remove existing product from sale-off
  const handleRemoveExisting = async (variantId: number) => {
    try {
      await removeProductFromSaleOff(saleOffId, variantId);
      setExistingProducts((prev) => prev.filter((p) => p.variantId !== variantId));
      notify({ message: "Đã xóa phân loại.", variant: "success" });
    } catch {
      notify({ message: "Xóa thất bại.", variant: "error" });
    }
  };

  // Update existing product
  const handleUpdateExisting = async (variantId: number, saleOffValue: number, quantity: number) => {
    try {
      await updateSaleOffProduct(saleOffId, variantId, { saleOffValue, quantity });
      setExistingProducts((prev) =>
        prev.map((p) => (p.variantId === variantId ? { ...p, saleOffValue, quantity } : p))
      );
      notify({ message: "Đã cập nhật.", variant: "success" });
    } catch {
      notify({ message: "Cập nhật thất bại.", variant: "error" });
    }
  };

  // Save pending variants
  const handleSave = async () => {
    if (variantsToAdd.length === 0) {
      notify({ message: "Chưa có phân loại nào để thêm.", variant: "info" });
      return;
    }

    for (const item of variantsToAdd) {
      if (item.quantity < 1) {
        notify({ message: `Số lượng phải >= 1.`, variant: "error" });
        return;
      }
    }

    setSaving(true);
    try {
      const request = {
        products: variantsToAdd.map((v) => ({
          variantId: v.variant.id,
          saleOffValue: v.saleOffValue,
          quantity: v.quantity,
        })),
      };
      await addProductsToSaleOff(saleOffId, request);
      notify({ message: `Đã thêm ${variantsToAdd.length} phân loại.`, variant: "success" });
      setVariantsToAdd([]);
      loadExistingProducts();
      onSuccess?.();
    } catch (err) {
      console.error("Failed to add variants:", err);
      notify({ message: "Thêm thất bại.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-80 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex min-h-[85vh] max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-slate-100 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Quản lý sản phẩm giảm giá</h2>
            {saleOffName && <p className="text-sm text-slate-500">{saleOffName}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Add Product Section */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Thêm phân loại sản phẩm</h3>
            <div className="flex flex-wrap items-end gap-3">
              {/* Category Dropdown */}
              <div className="min-w-50 flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600">Danh mục</label>
                <select
                  value={selectedCategoryId ?? ""}
                  onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                  disabled={loadingCategories}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Tất cả danh mục</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.level > 0 ? `${"—".repeat(c.level)} ` : ""}
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Dropdown */}
              <div className="min-w-75 flex-2 relative" ref={dropdownRef}>
                <label className="mb-1 block text-xs font-medium text-slate-600">Sản phẩm</label>
                <button
                  type="button"
                  onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <span className="text-slate-500">Chọn sản phẩm để xem phân loại...</span>
                  <svg className={`h-4 w-4 text-slate-400 transition-transform ${productDropdownOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Dropdown Panel */}
                {productDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg">
                    {/* Search Input */}
                    <div className="border-b border-slate-100 p-2">
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Tìm kiếm sản phẩm..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-200"
                        autoFocus
                      />
                    </div>

                    {/* Product List */}
                    <div
                      ref={productListRef}
                      onScroll={handleProductScroll}
                      className="max-h-64 overflow-y-auto"
                    >
                      {loadingProducts ? (
                        <div className="flex items-center justify-center py-8">
                          <svg className="h-5 w-5 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </div>
                      ) : products.length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-500">
                          Không tìm thấy sản phẩm
                        </div>
                      ) : (
                        <>
                          {products.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => handleOpenVariantPicker(product)}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50"
                            >
                              {product.image ? (
                                <img
                                  src={buildImageUrl(product.image)}
                                  alt=""
                                  className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                  </svg>
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
                                <p className="text-xs text-slate-500">
                                  {product.code && <span className="mr-2">{product.code}</span>}
                                </p>
                              </div>
                              <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                              </svg>
                            </button>
                          ))}

                          {loadingMore && (
                            <div className="flex items-center justify-center py-3 border-t border-slate-100">
                              <svg className="h-4 w-4 animate-spin text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              <span className="text-xs text-slate-500">Đang tải thêm...</span>
                            </div>
                          )}

                          {!hasMoreProducts && products.length > 0 && !loadingMore && (
                            <div className="py-2 text-center text-xs text-slate-400 border-t border-slate-100">
                              Đã hiển thị tất cả sản phẩm
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Variant Picker Panel */}
            {variantPickerProductId && variantPickerProduct && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-700">
                      Phân loại: <span className="text-emerald-600">{variantPickerProduct.name}</span>
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {variants.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAddAllVariants}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        Thêm tất cả ({variants.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setVariantPickerProductId(null); setVariantPickerProduct(null); }}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {loadingVariants ? (
                  <div className="flex items-center justify-center py-4">
                    <svg className="h-5 w-5 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : variants.length === 0 ? (
                  <p className="py-3 text-center text-sm text-slate-500">Không có phân loại khả dụng</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => handleAddVariant(variantPickerProduct, variant)}
                        disabled={excludedVariantIds.has(variant.id)}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div>
                          <p className="font-medium text-slate-800">{formatVariantOptions(variant)}</p>
                          <p className="text-xs text-slate-500">
                            SKU: {variant.sku || "N/A"} · Tồn: {variant.stock}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600">
                          {getVariantBasePrice(variant).toLocaleString("vi-VN")}đ
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pending Variants Table */}
          {variantsToAdd.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {variantsToAdd.length}
                </span>
                Phân loại sẽ thêm
              </h3>
              <div className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50">
                <table className="w-full text-sm">
                  <thead className="bg-emerald-100 text-left text-xs font-semibold uppercase text-emerald-800">
                    <tr>
                      <th className="px-3 py-2">Sản phẩm / Phân loại</th>
                      <th className="px-3 py-2 text-right">Giá gốc</th>
                      <th className="px-3 py-2 text-center w-32">Giảm giá (VNĐ)</th>
                      <th className="px-3 py-2 text-center w-28">Số lượng</th>
                      <th className="px-3 py-2 text-center w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100">
                    {variantsToAdd.map((item) => (
                      <tr key={item.variant.id} className="bg-white">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {item.product.image && (
                              <img
                                src={buildImageUrl(item.product.image)}
                                alt=""
                                className="h-8 w-8 rounded border border-slate-200 object-cover"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">{item.product.name}</p>
                              <p className="text-xs text-slate-500">
                                {formatVariantOptions(item.variant)}
                                {item.variant.sku && <span className="ml-1 text-slate-400">· {item.variant.sku}</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap">
                          {getVariantBasePrice(item.variant).toLocaleString("vi-VN")}đ
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            value={item.saleOffValue}
                            onChange={(e) => handleUpdatePending(item.variant.id, "saleOffValue", Number(e.target.value))}
                            className="w-24 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleUpdatePending(item.variant.id, "quantity", Number(e.target.value))}
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePending(item.variant.id)}
                            className="rounded p-1 text-rose-500 hover:bg-rose-50"
                            title="Xóa"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Save Button */}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                      </svg>
                      Thêm {variantsToAdd.length} phân loại
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Existing Products Table */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                {existingProducts.length}
              </span>
              Phân loại đã áp dụng
            </h3>

            {loadingExisting ? (
              <div className="py-8 text-center text-sm text-slate-500">Đang tải...</div>
            ) : existingProducts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
                Chưa có phân loại nào được áp dụng giảm giá.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Sản phẩm / Phân loại</th>
                      <th className="px-3 py-2 text-right">Giá gốc</th>
                      <th className="px-3 py-2 text-center w-32">Giảm giá (VNĐ)</th>
                      <th className="px-3 py-2 text-center w-28">Số lượng</th>
                      <th className="px-3 py-2 text-center w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {existingProducts.map((item) => (
                      <ExistingProductRow
                        key={item.variantId}
                        item={item}
                        onUpdate={handleUpdateExisting}
                        onRemove={handleRemoveExisting}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Separate component for existing product row to handle local state
function ExistingProductRow({
  item,
  onUpdate,
  onRemove,
}: {
  item: SaleOffProduct;
  onUpdate: (variantId: number, saleOffValue: number, quantity: number) => Promise<void>;
  onRemove: (variantId: number) => Promise<void>;
}) {
  const [saleOffValue, setSaleOffValue] = useState(item.saleOffValue);
  const [quantity, setQuantity] = useState(item.quantity);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const hasChanges = saleOffValue !== item.saleOffValue || quantity !== item.quantity;

  const handleUpdate = async () => {
    setSaving(true);
    await onUpdate(item.variantId, saleOffValue, quantity);
    setSaving(false);
  };

  const handleRemove = async () => {
    setRemoving(true);
    await onRemove(item.variantId);
    setRemoving(false);
  };

  return (
    <tr>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {item.productImage && (
            <img
              src={buildImageUrl(item.productImage)}
              alt=""
              className="h-8 w-8 rounded border border-slate-200 object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{item.productName}</p>
            <p className="text-xs text-slate-500">
              {item.sku && <span className="mr-1">{item.sku}</span>}
              {item.variantOptions && <span className="text-slate-400">· {item.variantOptions}</span>}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap">
        {item.variantPrice?.toLocaleString("vi-VN")}đ
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="number"
          min={0}
          value={saleOffValue}
          onChange={(e) => setSaleOffValue(Number(e.target.value))}
          className="w-24 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          {hasChanges && (
            <button
              type="button"
              onClick={handleUpdate}
              disabled={saving}
              className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
              title="Lưu thay đổi"
            >
              {saving ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M16.78 5.72a.75.75 0 0 0-1.06-1.06l-7.25 7.25-3.19-3.2a.75.75 0 1 0-1.06 1.06l3.72 3.72a.75.75 0 0 0 1.06 0l7.78-7.77Z" />
                </svg>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="rounded p-1 text-rose-500 hover:bg-rose-50 disabled:opacity-50"
            title="Xóa"
          >
            {removing ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7.5 3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v.75h3.75a.75.75 0 0 1 0 1.5h-.57l-.7 9.06A2.25 2.25 0 0 1 12.74 17H7.26a2.25 2.25 0 0 1-2.24-2.19l-.7-9.06h-.57a.75.75 0 0 1 0-1.5H7.5V3.5Zm1.5.75h2V3.5h-2v.75Zm-3 1.5.68 8.83a.75.75 0 0 0 .75.67h5.14a.75.75 0 0 0 .75-.67l.68-8.83H6Z" />
              </svg>
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
