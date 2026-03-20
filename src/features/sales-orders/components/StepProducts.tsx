"use client";

import { useState, useEffect, useRef } from "react";
import {
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  XMarkIcon,
  ClockIcon,
  QrCodeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import {
  fetchProducts,
  fetchProductVariants,
} from "@/features/products/api";
import type { Product, ProductVariant } from "@/features/products/types";
import type { CartItem } from "../types";
import { useDebounce } from "@/hooks/useDebounce";
import { getMediaUrl } from "@/lib/media";

type StepProductsProps = {
  cartItems: CartItem[];
  onCartChange: (items: CartItem[]) => void;
  onNext: () => void;
  onBack: () => void;
};

// Storage key for recent products
const RECENT_PRODUCTS_KEY = "pos_recent_products";
const MAX_RECENT_PRODUCTS = 12;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

// Get tiered price based on quantity
function getTieredPrice(priceTiers: { minQty: number; price: number }[] | undefined, qty: number): number {
  if (!priceTiers || priceTiers.length === 0) return 0;
  const sorted = [...priceTiers].sort((a, b) => b.minQty - a.minQty);
  const tier = sorted.find((t) => qty >= t.minQty);
  return tier?.price ?? priceTiers[0]?.price ?? 0;
}

// Get recent products from localStorage
function getRecentProducts(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_PRODUCTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save product to recent list
function saveToRecent(product: Product) {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentProducts();
    const filtered = recent.filter((p) => p.id !== product.id);
    const updated = [product, ...filtered].slice(0, MAX_RECENT_PRODUCTS);
    localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

export function StepProducts({
  cartItems,
  onCartChange,
  onNext,
  onBack,
}: StepProductsProps) {
  // Refs
  const skuInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // States
  const [skuInput, setSkuInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSku, setLoadingSku] = useState(false);
  const [skuError, setSkuError] = useState("");

  // Recent products
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  // Expanded product for variant selection
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Calculate totals
  const totalAmount = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Load recent products on mount
  useEffect(() => {
    setRecentProducts(getRecentProducts());
    // Focus SKU input on mount for barcode scanner
    skuInputRef.current?.focus();
  }, []);

  // Debounced search
  const doSearch = useDebounce(async (keyword: string) => {
    if (!keyword || keyword.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setLoadingSearch(true);
    try {
      const res = await fetchProducts({ search: keyword, page: 1, pageSize: 10 });
      setSearchResults(res.items || []);
      setShowSearchDropdown(true);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    doSearch(value);
  };

  // SKU/Barcode quick add
  const handleSkuSubmit = async () => {
    if (!skuInput.trim()) return;

    setLoadingSku(true);
    setSkuError("");

    try {
      // Search by exact SKU/code
      const res = await fetchProducts({ search: skuInput.trim(), page: 1, pageSize: 5 });

      if (res.items.length === 0) {
        setSkuError("Không tìm thấy sản phẩm với mã này");
        return;
      }

      // Find exact match by code or sku
      const exactMatch = res.items.find(
        (p) =>
          p.code?.toLowerCase() === skuInput.toLowerCase() ||
          p.name?.toLowerCase().includes(skuInput.toLowerCase())
      );

      const product = exactMatch || res.items[0];

      // Fetch variants and add first one
      const variants = await fetchProductVariants(product.id);
      if (variants.length > 0) {
        handleAddVariant(product, variants[0]);
        saveToRecent(product);
        setRecentProducts(getRecentProducts());
        setSkuInput("");
        skuInputRef.current?.focus();
      }
    } catch (error) {
      console.error("SKU lookup error:", error);
      setSkuError("Lỗi khi tìm sản phẩm");
    } finally {
      setLoadingSku(false);
    }
  };

  // Handle product click - expand for variant selection
  const handleProductClick = async (product: Product) => {
    if (expandedProductId === product.id) {
      setExpandedProductId(null);
      return;
    }

    setExpandedProductId(product.id);
    setLoadingVariants(true);

    try {
      const variants = await fetchProductVariants(product.id);
      setProductVariants(variants);

      // If only 1 variant, add directly
      if (variants.length === 1) {
        handleAddVariant(product, variants[0]);
        saveToRecent(product);
        setRecentProducts(getRecentProducts());
        setExpandedProductId(null);
      }
    } catch (error) {
      console.error("Load variants error:", error);
      setProductVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };

  // Add variant to cart
  const handleAddVariant = (product: Product, variant: ProductVariant) => {
    const existingIndex = cartItems.findIndex((item) => item.variantId === variant.id);
    const tiers = variant.priceTiers?.map((t) => ({ minQty: t.minQty, price: t.price }));
    const stock = variant.stock ?? Infinity;

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      const newQty = Math.min(updated[existingIndex].quantity + 1, stock);
      const newPrice = getTieredPrice(tiers ?? updated[existingIndex].priceTiers, newQty);
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].unitPrice = newPrice;
      updated[existingIndex].lineTotal = newQty * newPrice;
      onCartChange(updated);
    } else {
      const qty = 1;
      const unitPrice = getTieredPrice(tiers, qty);

      const newItem: CartItem = {
        variantId: variant.id,
        productId: product.id,
        productName: product.name || "",
        productImage: product.image,
        sku: variant.sku,
        attributes:
          variant.attributes?.map((a) => ({
            typeName: a.productTypeName || null,
            valueName: a.productTypeValueName || null,
          })) || [],
        quantity: qty,
        unitPrice,
        lineTotal: unitPrice * qty,
        saleOffDiscount: 0,
        stock,
        priceTiers: tiers,
      };
      onCartChange([...cartItems, newItem]);
    }

    // Save to recent
    saveToRecent(product);
    setRecentProducts(getRecentProducts());

    // Close search dropdown
    setShowSearchDropdown(false);
    setSearchTerm("");
  };

  const handleQuantityChange = (index: number, delta: number) => {
    const updated = [...cartItems];
    const item = updated[index];
    const maxStock = item.stock ?? Infinity;
    const newQty = Math.min(Math.max(item.quantity + delta, 0), maxStock);

    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      const newPrice = getTieredPrice(item.priceTiers, newQty);
      updated[index].quantity = newQty;
      updated[index].unitPrice = newPrice;
      updated[index].lineTotal = newQty * newPrice;
    }

    onCartChange(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...cartItems];
    updated.splice(index, 1);
    onCartChange(updated);
  };

  const canProceed = cartItems.length > 0;

  // Product card component
  const ProductCard = ({ product, showVariants = false }: { product: Product; showVariants?: boolean }) => {
    const isExpanded = expandedProductId === product.id && showVariants;
    const inCart = cartItems.filter((c) => c.productId === product.id);
    const cartQty = inCart.reduce((sum, i) => sum + i.quantity, 0);

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md">
        <button
          onClick={() => handleProductClick(product)}
          className="flex w-full items-center gap-3 p-3 text-left"
        >
          {/* Image */}
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
            {product.image ? (
              <img
                src={getMediaUrl(product.image)}
                alt={product.name || ""}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <ShoppingCartIcon className="h-6 w-6" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              {product.name}
            </p>
            <p className="text-xs text-slate-400">{product.code}</p>
            <p className="mt-0.5 text-sm font-semibold text-emerald-600">
              {product.minPrice ? formatCurrency(product.minPrice) : "Chưa có giá"}
              {product.maxPrice && product.maxPrice !== product.minPrice && (
                <span className="text-xs font-normal text-slate-400">
                  {" "}~ {formatCurrency(product.maxPrice)}
                </span>
              )}
            </p>
          </div>

          {/* Quick info */}
          <div className="flex flex-col items-end gap-1">
            {cartQty > 0 && (
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
                {cartQty}
              </span>
            )}
            {product.totalVariants > 1 && (
              <span className="flex items-center gap-0.5 text-xs text-slate-400">
                {product.totalVariants} loại
                {isExpanded ? (
                  <ChevronUpIcon className="h-3 w-3" />
                ) : (
                  <ChevronDownIcon className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
        </button>

        {/* Expanded variants */}
        {isExpanded && (
          <div className="border-t border-slate-100 bg-slate-50 p-2">
            {loadingVariants ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {productVariants.map((variant) => {
                  const attrText =
                    variant.attributes
                      ?.map((a) => a.productTypeValueName)
                      .filter(Boolean)
                      .join(" / ") || "Mặc định";
                  const price = variant.priceTiers?.[0]?.price || 0;
                  const inCartVariant = cartItems.find((c) => c.variantId === variant.id);
                  const outOfStock = variant.stock <= 0;

                  return (
                    <button
                      key={variant.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!outOfStock) handleAddVariant(product, variant);
                      }}
                      disabled={outOfStock}
                      className={`flex items-center justify-between rounded-lg border p-2 text-left transition ${outOfStock
                          ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                          : "border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50"
                        }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-700">
                          {attrText}
                        </p>
                        <p className="text-xs font-semibold text-emerald-600">
                          {formatCurrency(price)}
                        </p>
                        <p className={`text-[10px] ${outOfStock ? "text-red-500 font-medium" : "text-slate-400"}`}>
                          {outOfStock ? "Hết hàng" : `Tồn: ${variant.stock.toLocaleString("vi-VN")}`}
                        </p>
                      </div>
                      {inCartVariant ? (
                        <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {inCartVariant.quantity}
                        </span>
                      ) : (
                        !outOfStock && <PlusIcon className="h-4 w-4 text-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left column - Product Selection */}
      <div className="space-y-4 lg:col-span-2">
        {/* SKU/Barcode Quick Input */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <QrCodeIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="relative">
                <input
                  ref={skuInputRef}
                  type="text"
                  value={skuInput}
                  onChange={(e) => {
                    setSkuInput(e.target.value);
                    setSkuError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSkuSubmit();
                    }
                  }}
                  placeholder="Quét barcode hoặc nhập mã SKU, Enter để thêm..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-20 text-sm font-medium focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  onClick={handleSkuSubmit}
                  disabled={loadingSku || !skuInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {loadingSku ? "..." : "Thêm"}
                </button>
              </div>
              {skuError && (
                <p className="mt-1 text-xs text-rose-500">{skuError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Search Products */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
              placeholder="Tìm sản phẩm theo tên..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pl-11 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            {loadingSearch && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            )}

            {/* Search Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {searchResults.map((product) => (
                  <ProductCard key={product.id} product={product} showVariants />
                ))}
              </div>
            )}
          </div>

          {/* Click outside to close */}
          {showSearchDropdown && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowSearchDropdown(false)}
            />
          )}
        </div>

        {/* Recent Products */}
        {recentProducts.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ClockIcon className="h-4 w-4 text-slate-400" />
              Sản phẩm gần đây
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {recentProducts.slice(0, 6).map((product) => (
                <ProductCard key={product.id} product={product} showVariants />
              ))}
            </div>
          </div>
        )}

        {/* Selected items (mobile only) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:hidden">
          <h3 className="mb-3 font-semibold text-slate-900">
            Đã chọn ({totalItems} sản phẩm)
          </h3>
          {cartItems.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">
              Chưa chọn sản phẩm nào
            </p>
          ) : (
            <div className="space-y-2">
              {cartItems.map((item, index) => (
                <div
                  key={item.variantId}
                  className="flex items-center gap-3 rounded-lg bg-slate-50 p-2"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                    {item.productImage ? (
                      <img
                        src={getMediaUrl(item.productImage)}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <ShoppingCartIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.productName}</p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleQuantityChange(index, -1)}
                      className="rounded bg-white p-1 shadow-sm"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(index, 1)}
                      className="rounded bg-white p-1 shadow-sm"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="p-1 text-rose-500"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right column - Cart (desktop) */}
      <div className="hidden lg:block">
        <div className="sticky top-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-slate-100 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              <ShoppingCartIcon className="h-5 w-5 text-emerald-500" />
              Giỏ hàng
              {totalItems > 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  {totalItems}
                </span>
              )}
            </h3>
          </div>

          {/* Cart items */}
          <div className="max-h-[400px] overflow-auto p-4">
            {cartItems.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingCartIcon className="mx-auto h-12 w-12 text-slate-200" />
                <p className="mt-2 text-sm text-slate-400">Giỏ hàng trống</p>
                <p className="mt-1 text-xs text-slate-400">
                  Quét barcode hoặc tìm sản phẩm để thêm
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item, index) => (
                  <div
                    key={item.variantId}
                    className="flex gap-3 rounded-xl bg-slate-50 p-3"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
                      {item.productImage ? (
                        <img
                          src={getMediaUrl(item.productImage)}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-300">
                          <ShoppingCartIcon className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {item.productName}
                      </p>
                      {item.attributes.length > 0 && (
                        <p className="truncate text-xs text-slate-500">
                          {item.attributes
                            .map((a) => a.valueName)
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                      )}
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-sm font-semibold text-emerald-600">
                          {formatCurrency(item.lineTotal)}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleQuantityChange(index, -1)}
                            className="rounded bg-white p-1 text-slate-600 shadow-sm hover:bg-slate-100"
                          >
                            <MinusIcon className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(index, 1)}
                            className="rounded bg-white p-1 text-slate-600 shadow-sm hover:bg-slate-100"
                          >
                            <PlusIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="ml-1 rounded p-1 text-rose-500 hover:bg-rose-50"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals & Actions */}
          <div className="border-t border-slate-100 p-4">
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tạm tính</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span className="text-slate-800">Tổng cộng</span>
                <span className="text-emerald-600">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onBack}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                onClick={onNext}
                disabled={!canProceed}
                className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white p-4 lg:hidden">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-slate-500">Tổng cộng</p>
            <p className="text-lg font-bold text-emerald-600">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <button
            onClick={onBack}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium"
          >
            Quay lại
          </button>
          <button
            onClick={onNext}
            disabled={!canProceed}
            className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}
