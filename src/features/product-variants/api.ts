// ============================================================================
// Product Variant API
// ============================================================================

import api from "@/lib/api";
import type {
  ProductType,
  ProductTypeValue,
  ProductVariant,
  CreateVariantRequest,
  UpdateVariantRequest,
  PriceTier,
  AppliedPriceResponse,
} from "./types";

// ============================================================================
// Product Types
// ============================================================================

export async function fetchProductTypes(): Promise<ProductType[]> {
  const { data } = await api.get("/admin/v1/product-types", {
    params: { page: 1, pageSize: 100 } // Get all types
  });
  // Response structure: { success, data: { items, totalCount }, error, traceId }
  const result = (data as any)?.data;
  const items = result?.items || result || [];

  // Map camelCase to snake_case
  return items.map((item: any) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    is_active: item.isActive
  }));
}

export async function fetchProductTypeValues(typeId: number): Promise<ProductTypeValue[]> {
  const { data } = await api.get(`/admin/v1/product-types/${typeId}/values`);
  // Response structure: { success, data: [...], error, traceId }
  const result = (data as any)?.data ?? data;

  // Map camelCase to snake_case
  return (result || []).map((item: any) => ({
    id: item.id,
    product_type_id: item.productTypeId,
    value: item.value,
    sort_order: item.sortOrder,
    is_active: item.isActive
  }));
}

// ============================================================================
// Product Variants
// ============================================================================

export async function fetchProductVariants(productId: number): Promise<ProductVariant[]> {
  const { data } = await api.get(`/admin/v1/products/${productId}/variants`);
  // Response structure: { success, data: [...], error, traceId }
  const result = (data as any)?.data ?? data;
  const items = Array.isArray(result) ? result : result.items || [];

  // Map camelCase to snake_case
  return items.map((item: any) => {
    // Build price_tier_summary from basePrice and priceTiers
    let priceTierSummary = undefined;

    if (item.basePrice !== undefined && item.basePrice !== null) {
      // Use basePrice directly if available
      const prices = item.priceTiers?.map((t: any) => t.price) || [item.basePrice];
      priceTierSummary = {
        base_price: item.basePrice,
        min_price: Math.min(...prices),
        max_price: Math.max(...prices)
      };
    } else if (item.priceTiers && item.priceTiers.length > 0) {
      // Calculate from priceTiers array
      const baseTier = item.priceTiers.find((t: any) => t.minQty === 1);
      const prices = item.priceTiers.map((t: any) => t.price);
      priceTierSummary = {
        base_price: baseTier?.price || prices[0],
        min_price: Math.min(...prices),
        max_price: Math.max(...prices)
      };
    }

    return {
      id: item.id,
      product_id: item.productId,
      sku: item.sku,
      stock: item.stock,
      status: item.status,
      options: (item.options || []).map((opt: any) => ({
        product_type_id: opt.productTypeId,
        product_type_value_id: opt.productTypeValueId,
        type_name: opt.productTypeName,
        value: opt.productTypeValueName
      })),
      price_tier_summary: priceTierSummary
    };
  });
}

export async function createProductVariant(
  productId: number,
  payload: CreateVariantRequest
): Promise<ProductVariant> {
  // Convert snake_case to camelCase for API
  const apiPayload = {
    sku: payload.sku,
    stock: payload.stock,
    status: payload.status,
    basePrice: payload.base_price,
    options: payload.options.map(opt => ({
      productTypeId: opt.product_type_id,
      productTypeValueId: opt.product_type_value_id
    }))
  };

  const { data } = await api.post(`/admin/v1/products/${productId}/variants`, apiPayload);
  const item = (data as any)?.data ?? data;

  // Map response back to snake_case
  return {
    id: item.id,
    product_id: item.productId,
    sku: item.sku,
    stock: item.stock,
    status: item.status,
    options: (item.options || []).map((opt: any) => ({
      product_type_id: opt.productTypeId,
      product_type_value_id: opt.productTypeValueId,
      type_name: opt.productTypeName,
      value: opt.productTypeValueName
    }))
  };
}

export async function updateProductVariant(
  variantId: number,
  payload: UpdateVariantRequest
): Promise<void> {
  await api.put(`/admin/v1/variants/${variantId}`, payload);
}

export async function deleteProductVariant(variantId: number): Promise<void> {
  await api.delete(`/admin/v1/variants/${variantId}`);
}

// ============================================================================
// Tier Pricing
// ============================================================================

export async function fetchVariantPriceTiers(variantId: number): Promise<PriceTier[]> {
  const { data } = await api.get(`/admin/v1/variants/${variantId}/price-tiers`);
  // Response structure: { success, data: [...], error, traceId }
  const result = (data as any)?.data ?? data;
  const items = Array.isArray(result) ? result : result.items || [];

  // Map camelCase to snake_case
  return items.map((item: any) => ({
    id: item.id,
    product_variant_id: item.productVariantId,
    min_qty: item.minQty,
    price: item.price
  }));
}

export async function updateVariantPriceTiers(
  variantId: number,
  tiers: PriceTier[]
): Promise<void> {
  // Convert to camelCase for API (backend expects minQty, not min_qty)
  const payload = tiers.map(tier => ({
    minQty: tier.min_qty,
    price: tier.price
  }));
  await api.put(`/admin/v1/variants/${variantId}/price-tiers`, payload);
}

export async function getAppliedPrice(
  variantId: number,
  qty: number
): Promise<AppliedPriceResponse> {
  const { data } = await api.get(`/admin/v1/variants/${variantId}/price`, {
    params: { qty },
  });
  return (data as any)?.data ?? data;
}

// ============================================================================
// Mock Data Fallback (for development)
// ============================================================================

export const MOCK_PRODUCT_TYPES: ProductType[] = [
  { id: 1, name: "Màu sắc", code: "color", is_active: true },
  { id: 2, name: "Kích thước", code: "size", is_active: true },
  { id: 3, name: "Chất liệu", code: "material", is_active: true },
];

export const MOCK_TYPE_VALUES: Record<number, ProductTypeValue[]> = {
  1: [
    { id: 1, product_type_id: 1, value: "Đỏ", sort_order: 1, is_active: true },
    { id: 2, product_type_id: 1, value: "Xanh", sort_order: 2, is_active: true },
    { id: 3, product_type_id: 1, value: "Vàng", sort_order: 3, is_active: true },
  ],
  2: [
    { id: 4, product_type_id: 2, value: "S", sort_order: 1, is_active: true },
    { id: 5, product_type_id: 2, value: "M", sort_order: 2, is_active: true },
    { id: 6, product_type_id: 2, value: "L", sort_order: 3, is_active: true },
    { id: 7, product_type_id: 2, value: "XL", sort_order: 4, is_active: true },
  ],
  3: [
    { id: 8, product_type_id: 3, value: "Cotton", sort_order: 1, is_active: true },
    { id: 9, product_type_id: 3, value: "Polyester", sort_order: 2, is_active: true },
  ],
};
