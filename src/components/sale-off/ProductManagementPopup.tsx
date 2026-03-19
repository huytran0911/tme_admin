"use client";
/* eslint-disable @next/next/no-img-element */

import { createPortal } from "react-dom";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { fetchCategories } from "@/features/categories/api";
import { fetchProductsForSelection, addProductsToSaleOff, fetchSaleOffProducts, removeProductFromSaleOff, updateSaleOffProduct } from "@/features/sale-off/api";
import type { Category } from "@/features/categories/types";
import type { ProductForSelection, SaleOffProduct } from "@/features/sale-off/types";
import { buildImageUrl } from "@/lib/utils";
import { useToast } from "@/components/shared/Toast";

type ProductManagementPopupProps = {
  open: boolean;
  onClose: () => void;
  saleOffId: number;
  saleOffName?: string;
  onSuccess?: () => void;
};

// Product to add with sale off value and quantity
type ProductToAdd = {
  product: ProductForSelection;
  saleOffValue: number;
  quantity: number;
};

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

  // Products to add (pending)
  const [productsToAdd, setProductsToAdd] = useState<ProductToAdd[]>([]);

  // Existing products in sale-off
  const [existingProducts, setExistingProducts] = useState<SaleOffProduct[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Saving state
  const [saving, setSaving] = useState(false);

  // Add all products in category state
  const [addingAllInCategory, setAddingAllInCategory] = useState(false);

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

  // Get excluded product IDs (already added or in existing list)
  const excludedIds = useMemo(() => {
    return new Set([
      ...existingProducts.map((p) => p.productId),
      ...productsToAdd.map((p) => p.product.id),
    ]);
  }, [existingProducts, productsToAdd]);

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

      const newItems = data.items.filter((p) => !excludedIds.has(p.id));

      if (reset) {
        setProducts(newItems);
      } else {
        setProducts((prev) => [...prev, ...newItems]);
      }

      // Check if there are more products
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
  }, [open, selectedCategoryId, productSearch, productPage, excludedIds]);

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
      setProductsToAdd([]);
      setProducts([]);
      setProductPage(1);
      setHasMoreProducts(true);
      setProductDropdownOpen(false);
      setProductSearch("");
      setSelectedProductIds(new Set());
    }
  }, [open]);

  // Toggle product selection in dropdown
  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Add all selected products to pending list
  const handleAddSelectedProducts = () => {
    const selectedProducts = products.filter((p) => selectedProductIds.has(p.id));
    const newProductsToAdd = selectedProducts.map((product) => ({
      product,
      saleOffValue: 0,
      quantity: 1,
    }));
    setProductsToAdd((prev) => [...prev, ...newProductsToAdd]);
    setSelectedProductIds(new Set());
    setProductDropdownOpen(false);
  };

  // Select all visible products
  const handleSelectAll = () => {
    if (selectedProductIds.size === products.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(products.map((p) => p.id)));
    }
  };

  // Add all products in the selected category
  const handleAddAllInCategory = async () => {
    if (!selectedCategoryId) {
      notify({ message: "Vui lòng chọn danh mục trước.", variant: "info" });
      return;
    }

    setAddingAllInCategory(true);
    try {
      // Fetch all products in category with large page size
      const data = await fetchProductsForSelection({
        categoryId: selectedCategoryId,
        keyword: undefined,
        page: 1,
        pageSize: 9999,
      });

      // Filter out already added products
      const newProducts = data.items.filter((p) => !excludedIds.has(p.id));

      if (newProducts.length === 0) {
        notify({ message: "Không có sản phẩm mới nào để thêm trong danh mục này.", variant: "info" });
        return;
      }

      // Add all to pending list
      const newProductsToAdd = newProducts.map((product) => ({
        product,
        saleOffValue: 0,
        quantity: 1,
      }));

      setProductsToAdd((prev) => [...prev, ...newProductsToAdd]);
      notify({ message: `Đã thêm ${newProducts.length} sản phẩm từ danh mục.`, variant: "success" });
    } catch (err) {
      console.error("Failed to add all products in category:", err);
      notify({ message: "Không thể thêm sản phẩm từ danh mục.", variant: "error" });
    } finally {
      setAddingAllInCategory(false);
    }
  };

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

  // Add product to pending list
  const handleAddProduct = (product: ProductForSelection) => {
    setProductsToAdd((prev) => [
      ...prev,
      {
        product,
        saleOffValue: 0,
        quantity: 1,
      },
    ]);
  };

  // Remove product from pending list
  const handleRemovePending = (productId: number) => {
    setProductsToAdd((prev) => prev.filter((p) => p.product.id !== productId));
  };

  // Update pending product values
  const handleUpdatePending = (productId: number, field: "saleOffValue" | "quantity", value: number) => {
    setProductsToAdd((prev) =>
      prev.map((p) => (p.product.id === productId ? { ...p, [field]: value } : p))
    );
  };

  // Remove existing product from sale-off
  const handleRemoveExisting = async (productId: number) => {
    try {
      await removeProductFromSaleOff(saleOffId, productId);
      setExistingProducts((prev) => prev.filter((p) => p.productId !== productId));
      notify({ message: "Đã xóa sản phẩm.", variant: "success" });
    } catch {
      notify({ message: "Xóa sản phẩm thất bại.", variant: "error" });
    }
  };

  // Update existing product
  const handleUpdateExisting = async (productId: number, saleOffValue: number, quantity: number) => {
    try {
      await updateSaleOffProduct(saleOffId, productId, { saleOffValue, quantity });
      setExistingProducts((prev) =>
        prev.map((p) => (p.productId === productId ? { ...p, saleOffValue, quantity } : p))
      );
      notify({ message: "Đã cập nhật sản phẩm.", variant: "success" });
    } catch {
      notify({ message: "Cập nhật thất bại.", variant: "error" });
    }
  };

  // Save pending products
  const handleSave = async () => {
    if (productsToAdd.length === 0) {
      notify({ message: "Chưa có sản phẩm nào để thêm.", variant: "info" });
      return;
    }

    // Validate
    for (const item of productsToAdd) {
      if (item.quantity < 1) {
        notify({ message: `Số lượng của "${item.product.name}" phải >= 1.`, variant: "error" });
        return;
      }
    }

    setSaving(true);
    try {
      const request = {
        products: productsToAdd.map((p) => ({
          productId: p.product.id,
          saleOffValue: p.saleOffValue,
          quantity: p.quantity,
        })),
      };
      await addProductsToSaleOff(saleOffId, request);
      notify({ message: `Đã thêm ${productsToAdd.length} sản phẩm.`, variant: "success" });
      setProductsToAdd([]);
      loadExistingProducts();
      onSuccess?.();
    } catch (err) {
      console.error("Failed to add products:", err);
      notify({ message: "Thêm sản phẩm thất bại.", variant: "error" });
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
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Thêm sản phẩm</h3>
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

              {/* Add All in Category Button */}
              {selectedCategoryId && (
                <button
                  type="button"
                  onClick={handleAddAllInCategory}
                  disabled={addingAllInCategory}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addingAllInCategory ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Đang thêm...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                      </svg>
                      Thêm toàn bộ danh mục
                    </>
                  )}
                </button>
              )}

              {/* Product Dropdown with Multi-Select */}
              <div className="min-w-75 flex-2 relative" ref={dropdownRef}>
                <label className="mb-1 block text-xs font-medium text-slate-600">Sản phẩm</label>
                <button
                  type="button"
                  onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <span className={selectedProductIds.size > 0 ? "text-slate-900" : "text-slate-500"}>
                    {selectedProductIds.size > 0
                      ? `Đã chọn ${selectedProductIds.size} sản phẩm`
                      : "Chọn sản phẩm để thêm..."}
                  </span>
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

                    {/* Select All */}
                    {!loadingProducts && products.length > 0 && (
                      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 bg-slate-50">
                        <input
                          type="checkbox"
                          checked={products.length > 0 && selectedProductIds.size === products.length}
                          onChange={handleSelectAll}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-slate-700">
                          Chọn tất cả ({products.length})
                        </span>
                      </div>
                    )}

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
                            <label
                              key={product.id}
                              className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors ${
                                selectedProductIds.has(product.id)
                                  ? "bg-emerald-50"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedProductIds.has(product.id)}
                                onChange={() => toggleProductSelection(product.id)}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
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
                                  {product.price != null && (
                                    <span className="text-emerald-600 font-medium">{product.price.toLocaleString("vi-VN")}đ</span>
                                  )}
                                </p>
                              </div>
                            </label>
                          ))}

                          {/* Load More Indicator */}
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

                    {/* Footer with Add Button */}
                    {selectedProductIds.size > 0 && (
                      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="text-sm text-slate-600">
                          Đã chọn <span className="font-semibold text-emerald-600">{selectedProductIds.size}</span> sản phẩm
                        </span>
                        <button
                          type="button"
                          onClick={handleAddSelectedProducts}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
                        >
                          Thêm vào danh sách
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pending Products Table */}
          {productsToAdd.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {productsToAdd.length}
                </span>
                Sản phẩm sẽ thêm
              </h3>
              <div className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50">
                <table className="w-full text-sm">
                  <thead className="bg-emerald-100 text-left text-xs font-semibold uppercase text-emerald-800">
                    <tr>
                      <th className="px-3 py-2">Sản phẩm</th>
                      <th className="px-3 py-2 text-center w-32">Giảm giá (%)</th>
                      <th className="px-3 py-2 text-center w-28">Số lượng</th>
                      <th className="px-3 py-2 text-center w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100">
                    {productsToAdd.map((item) => (
                      <tr key={item.product.id} className="bg-white">
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
                              {item.product.code && (
                                <p className="text-xs text-slate-500">{item.product.code}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            value={item.saleOffValue}
                            onChange={(e) => handleUpdatePending(item.product.id, "saleOffValue", Number(e.target.value))}
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleUpdatePending(item.product.id, "quantity", Number(e.target.value))}
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePending(item.product.id)}
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
                      Thêm {productsToAdd.length} sản phẩm
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
              Sản phẩm đã áp dụng
            </h3>

            {loadingExisting ? (
              <div className="py-8 text-center text-sm text-slate-500">Đang tải...</div>
            ) : existingProducts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
                Chưa có sản phẩm nào được áp dụng giảm giá.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Sản phẩm</th>
                      <th className="px-3 py-2 text-right">Giá gốc</th>
                      <th className="px-3 py-2 text-center w-32">Giảm giá (%)</th>
                      <th className="px-3 py-2 text-center w-28">Số lượng</th>
                      <th className="px-3 py-2 text-center w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {existingProducts.map((item) => (
                      <ExistingProductRow
                        key={item.productId}
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
  onUpdate: (productId: number, saleOffValue: number, quantity: number) => Promise<void>;
  onRemove: (productId: number) => Promise<void>;
}) {
  const [saleOffValue, setSaleOffValue] = useState(item.saleOffValue);
  const [quantity, setQuantity] = useState(item.quantity);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const hasChanges = saleOffValue !== item.saleOffValue || quantity !== item.quantity;

  const handleUpdate = async () => {
    setSaving(true);
    await onUpdate(item.productId, saleOffValue, quantity);
    setSaving(false);
  };

  const handleRemove = async () => {
    setRemoving(true);
    await onRemove(item.productId);
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
            {item.productCode && <p className="text-xs text-slate-500">{item.productCode}</p>}
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-right text-slate-600">
        {item.originalPrice?.toLocaleString("vi-VN")}đ
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="number"
          min={0}
          value={saleOffValue}
          onChange={(e) => setSaleOffValue(Number(e.target.value))}
          className="w-20 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200"
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
