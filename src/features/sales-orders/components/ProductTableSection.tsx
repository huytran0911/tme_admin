"use client";

import { useState, useRef, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  fetchProducts,
  fetchProductVariants,
} from "@/features/products/api";
import type { Product, ProductVariant } from "@/features/products/types";
import type { CartItem } from "../types";
import { useDebounce } from "@/hooks/useDebounce";
import { getMediaUrl } from "@/lib/media";

type ProductTableSectionProps = {
  cartItems: CartItem[];
  onCartChange: (items: CartItem[]) => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

// Get tiered price based on quantity
function getTieredPrice(priceTiers: { minQty: number; price: number }[] | undefined, qty: number): number {
  if (!priceTiers || priceTiers.length === 0) return 0;
  // Sort descending by minQty to find the highest tier that the qty qualifies for
  const sorted = [...priceTiers].sort((a, b) => b.minQty - a.minQty);
  const tier = sorted.find((t) => qty >= t.minQty);
  return tier?.price ?? priceTiers[0]?.price ?? 0;
}

export function ProductTableSection({ cartItems, onCartChange }: ProductTableSectionProps) {
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Variant selection
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Debounced search
  const doSearch = useDebounce(async (keyword: string) => {
    if (!keyword || keyword.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchProducts({ search: keyword, page: 1, pageSize: 10 });
      setSearchResults(res.items || []);
      setShowDropdown(true);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, 300);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setSelectedProduct(null);
    doSearch(value);
  };

  // Select product and load variants
  const handleSelectProduct = async (product: Product) => {
    console.log("Selected product:", product);
    setSelectedProduct(product);
    setSearchTerm(product.name || "");
    setShowDropdown(false);
    setLoadingVariants(true);

    try {
      const productVariants = await fetchProductVariants(product.id);
      console.log("Product variants:", productVariants);
      setVariants(productVariants);

      // If no variants or only 1 variant, add directly
      if (productVariants.length === 0) {
        // No variants - create a default cart item
        console.log("No variants found, creating default item");
        const newItem: CartItem = {
          variantId: 0, // No variant ID
          productId: product.id,
          productName: product.name || "",
          productImage: product.image,
          sku: product.code || "",
          attributes: [],
          quantity: 1,
          unitPrice: product.minPrice || 0,
          lineTotal: product.minPrice || 0,
          saleOffDiscount: 0,
        };
        onCartChange([...cartItems, newItem]);
        resetSearch();
      } else if (productVariants.length === 1) {
        addVariantToCart(product, productVariants[0]);
        resetSearch();
      }
      // If > 1 variants, show selector (handled by render)
    } catch (error) {
      console.error("Load variants error:", error);
      setVariants([]);
      resetSearch();
    } finally {
      setLoadingVariants(false);
    }
  };

  // Add variant to cart
  const addVariantToCart = (product: Product, variant: ProductVariant) => {
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
        lineTotal: unitPrice * qty, // Live updated by preview API anyway
        saleOffDiscount: 0, 
        stock,
        priceTiers: tiers,
      };
      onCartChange([...cartItems, newItem]);
    }

    resetSearch();
  };

  const resetSearch = () => {
    setSearchTerm("");
    setSelectedProduct(null);
    setVariants([]);
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const handleQuantityChange = (index: number, value: string) => {
    if (value === "") return; // Allow empty temporarily (handled on blur)

    const raw = parseInt(value) || 1;
    const updated = [...cartItems];
    const item = updated[index];
    const maxStock = item.stock ?? Infinity;
    const qty = Math.min(Math.max(raw, 1), maxStock);
    const newPrice = getTieredPrice(item.priceTiers, qty);
    updated[index].quantity = qty;
    updated[index].unitPrice = newPrice;
    updated[index].lineTotal = qty * newPrice;
    onCartChange(updated);
  };

  const handleQuantityBlur = (index: number, value: string) => {
    const raw = parseInt(value);
    if (isNaN(raw) || raw <= 0) {
      // Reset to 1 instead of removing
      const updated = [...cartItems];
      const item = updated[index];
      const newPrice = getTieredPrice(item.priceTiers, 1);
      updated[index].quantity = 1;
      updated[index].unitPrice = newPrice;
      updated[index].lineTotal = newPrice;
      onCartChange(updated);
    }
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...cartItems];
    updated.splice(index, 1);
    onCartChange(updated);
  };

  // Close dropdown when clicking outside (use click instead of mousedown to allow button clicks)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        (showDropdown || selectedProduct) &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setSelectedProduct(null);
        setVariants([]);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showDropdown, selectedProduct]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-amber-50 px-4 py-2">
        <h3 className="font-semibold text-slate-800">Sản phẩm</h3>
      </div>

      {/* Search bar */}
      <div className="border-b border-slate-200 p-3">
        <div ref={searchContainerRef} className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="Nhập mã SP hoặc tên sản phẩm để tìm..."
                className="w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-400 focus:outline-none"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                </div>
              )}
            </div>
          </div>

          {/* Search dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className="flex w-full items-center gap-3 border-b border-slate-100 p-2 text-left hover:bg-slate-50 last:border-0"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100">
                    {product.image ? (
                      <img
                        src={getMediaUrl(product.image)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                        IMG
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.code} • {formatCurrency(product.minPrice || 0)}đ
                    </p>
                  </div>
                  {product.totalVariants > 1 && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                      {product.totalVariants} loại
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Loading variants indicator */}
          {selectedProduct && loadingVariants && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <span className="text-sm text-slate-600">Đang tải phân loại...</span>
              </div>
            </div>
          )}

          {/* Variant selector */}
          {selectedProduct && !loadingVariants && variants.length > 1 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Chọn phân loại cho: {selectedProduct.name}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {variants.map((variant) => {
                  const attrText =
                    variant.attributes
                      ?.map((a) => a.productTypeValueName)
                      .filter(Boolean)
                      .join(" / ") || "Mặc định";
                  const price = variant.priceTiers?.[0]?.price || 0;
                  const outOfStock = variant.stock <= 0;

                  return (
                    <button
                      key={variant.id}
                      onClick={() => !outOfStock && addVariantToCart(selectedProduct, variant)}
                      disabled={outOfStock}
                      className={`rounded border p-2 text-left transition ${outOfStock
                        ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                        : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50"
                        }`}
                    >
                      <p className="truncate text-xs font-medium text-slate-700">{attrText}</p>
                      <p className="text-xs text-emerald-600">{formatCurrency(price)}đ</p>
                      <p className={`text-[10px] ${outOfStock ? "text-red-500 font-medium" : "text-slate-400"}`}>
                        {outOfStock ? "Hết hàng" : `Tồn: ${variant.stock.toLocaleString("vi-VN")}`}
                      </p>
                      {!outOfStock && variant.priceTiers && variant.priceTiers.length > 1 && (
                        <p className="text-[10px] text-blue-500">{variant.priceTiers.length} mức giá</p>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={resetSearch}
                className="mt-2 text-xs text-slate-500 hover:text-slate-700"
              >
                Hủy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products table */}
      <div className="overflow-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="px-3 py-2 font-medium text-slate-600">Mã SP</th>
              <th className="px-3 py-2 font-medium text-slate-600">Mô tả</th>
              <th className="w-24 px-3 py-2 text-center font-medium text-slate-600">SL</th>
              <th className="w-28 px-3 py-2 text-right font-medium text-slate-600">Đơn giá</th>
              <th className="w-32 px-3 py-2 text-right font-medium text-slate-600">Thành tiền</th>
              <th className="w-10 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {cartItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                  Chưa có sản phẩm. Nhập mã hoặc tên SP ở trên để thêm.
                </td>
              </tr>
            ) : (
              cartItems.map((item, index) => {
                const attrText = item.attributes
                  .map((a) => a.valueName)
                  .filter(Boolean)
                  .join(", ");
                const isAtStockLimit = item.stock != null && item.quantity >= item.stock;

                return (
                  <tr key={item.variantId} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-600">{item.sku || "-"}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-800">{item.productName}</p>
                      {attrText && <p className="text-xs text-slate-500">{attrText}</p>}
                      {item.stock != null && (
                        <p className="text-[10px] text-slate-400">Tồn kho: {item.stock.toLocaleString("vi-VN")}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        min="1"
                        max={item.stock ?? undefined}
                        className={`w-full rounded border px-2 py-1 text-center text-sm focus:outline-none ${isAtStockLimit
                          ? "border-amber-400 bg-amber-50 focus:border-amber-500"
                          : "border-slate-300 focus:border-emerald-400"
                          }`}
                      />
                      {isAtStockLimit && (
                        <p className="mt-0.5 text-[10px] text-amber-600 text-center">Tối đa</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {item.saleOffDiscount > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="text-slate-400 line-through text-xs">
                            {formatCurrency(item.unitPrice)}đ
                          </span>
                          <span className="text-rose-600 font-medium">
                            {formatCurrency(item.unitPrice - item.saleOffDiscount)}đ
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-700">{formatCurrency(item.unitPrice)}đ</span>
                      )}
                      {item.priceTiers && item.priceTiers.length > 1 && (
                        <div className="mt-1 group relative">
                          <span className="cursor-help text-[10px] text-blue-500 underline decoration-dotted">
                            {item.priceTiers.length} mức giá
                          </span>
                          <div className="invisible group-hover:visible absolute right-0 bottom-full z-50 mb-1 w-40 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                            {[...item.priceTiers].sort((a, b) => a.minQty - b.minQty).map((t, i) => (
                              <div
                                key={i}
                                className={`flex justify-between text-[11px] py-0.5 ${item.quantity >= t.minQty &&
                                  (i === item.priceTiers!.length - 1 ||
                                    item.quantity < [...item.priceTiers!].sort((a, b) => a.minQty - b.minQty)[i + 1]?.minQty)
                                  ? "font-semibold text-emerald-700"
                                  : "text-slate-500"
                                  }`}
                              >
                                <span>≥ {t.minQty.toLocaleString("vi-VN")}</span>
                                <span>{formatCurrency(t.price)}đ</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-800">
                      {formatCurrency(item.lineTotal)}đ
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="rounded p-1 text-rose-500 hover:bg-rose-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
