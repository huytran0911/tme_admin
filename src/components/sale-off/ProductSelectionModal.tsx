"use client";
/* eslint-disable @next/next/no-img-element */

import { createPortal } from "react-dom";
import { useEffect, useState, useMemo } from "react";
import { fetchProductsForSelection } from "@/features/sale-off/api";
import { fetchCategories } from "@/features/categories/api";
import type { ProductForSelection } from "@/features/sale-off/types";
import type { Category } from "@/features/categories/types";
import { buildImageUrl } from "@/lib/utils";

type ProductSelectionModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedProducts: ProductForSelection[]) => void;
  excludeProductIds?: number[];
  title?: string;
};

export function ProductSelectionModal({
  open,
  onClose,
  onConfirm,
  excludeProductIds = [],
  title = "Chọn sản phẩm",
}: ProductSelectionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductForSelection[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [keyword, setKeyword] = useState("");
  const [keywordBuffer, setKeywordBuffer] = useState("");

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

  // Load products when category or keyword changes
  useEffect(() => {
    if (!open) return;
    const loadProducts = async () => {
      setLoading(true);
      try {
        const data = await fetchProductsForSelection({
          categoryId,
          keyword,
          page: 1,
          pageSize: 100,
        });
        // Filter out excluded products
        const filtered = data.items.filter((p) => !excludeProductIds.includes(p.id));
        setProducts(filtered);
      } catch (err) {
        console.error("Failed to load products:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [open, categoryId, keyword, excludeProductIds]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setCategoryId(undefined);
      setKeyword("");
      setKeywordBuffer("");
    }
  }, [open]);

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
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const handleConfirm = () => {
    const selectedProducts = products.filter((p) => selectedIds.has(p.id));
    onConfirm(selectedProducts);
  };

  const handleSearch = () => {
    setKeyword(keywordBuffer);
  };

  // Build category tree for dropdown display
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

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-100 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <select
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
            disabled={loadingCategories}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">Tất cả danh mục</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.level > 0 ? `${"—".repeat(c.level)} ` : ""}
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex flex-1 items-center gap-2">
            <input
              type="text"
              value={keywordBuffer}
              onChange={(e) => setKeywordBuffer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Tìm kiếm sản phẩm..."
              className="min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              Tìm
            </button>
          </div>

          <span className="text-sm text-slate-500">
            Đã chọn: <span className="font-semibold text-emerald-600">{selectedIds.size}</span> sản phẩm
          </span>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Đang tải sản phẩm...</div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Không tìm thấy sản phẩm nào</div>
          ) : (
            <div className="space-y-2">
              {/* Select All */}
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <input
                  type="checkbox"
                  checked={products.length > 0 && selectedIds.size === products.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700">Chọn tất cả ({products.length} sản phẩm)</span>
              </div>

              {/* Product Items */}
              <div className="grid gap-2">
                {products.map((product) => (
                  <label
                    key={product.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                      selectedIds.has(product.id)
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    {product.image && (
                      <img
                        src={buildImageUrl(product.image)}
                        alt={product.name}
                        className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
                      {product.categoryName && (
                        <p className="truncate text-xs text-slate-500">{product.categoryName}</p>
                      )}
                    </div>
                    {product.price != null && (
                      <span className="text-sm font-medium text-emerald-600">
                        {product.price.toLocaleString("vi-VN")}đ
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 p-4">
          <span className="text-sm text-slate-500">
            Đã chọn <span className="font-semibold text-emerald-600">{selectedIds.size}</span> sản phẩm
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Xác nhận ({selectedIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
