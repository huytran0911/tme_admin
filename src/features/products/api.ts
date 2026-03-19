import api from "@/lib/api";
import type {
  Product,
  ProductDetail,
  UpdateProductRequest,
  GetProductListParams,
  PagedResult,
  Group,
  Category,
  GetGroupsParams,
  GetCategoriesParams,
  ProductType,
  ProductTypeValue,
  ProductVariant,
  PriceTier,
  InventoryAdjustmentRequest,
} from "./types";

export async function fetchProducts(
  params: GetProductListParams
): Promise<PagedResult<Product>> {
  const { data } = await api.get("/admin/v1/products", {
    params,
  });
  const result = (data as any)?.data ?? data;
  // Ensure we return proper structure even if API returns error
  if (!result || typeof result !== "object" || !Array.isArray(result.items)) {
    console.warn("fetchProducts: Unexpected API response", result);
    return { items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
  }
  return result;
}

export async function fetchProductDetail(id: number): Promise<ProductDetail> {
  const { data } = await api.get(`/admin/v1/products/${id}`);
  return (data as any)?.data ?? data;
}

export async function updateProduct(
  id: number,
  payload: UpdateProductRequest
): Promise<void> {
  await api.put(`/admin/v1/products/${id}`, payload);
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/admin/v1/products/${id}`);
}

// Create a new product and return the new product ID
export async function createProduct(payload: UpdateProductRequest): Promise<number> {
  const { data } = await api.post("/admin/v1/products", payload);
  const result = (data as any)?.data ?? data;
  return result?.id ?? result;
}

// Upload image and return URL
export async function uploadImage(file: File, module: string = "products"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/admin/v1/files/upload", formData, {
    params: { module },
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  // Return the uploaded image URL/path
  const response = (data as any)?.data ?? data;
  const url = response?.url ?? response?.path;
  if (!url) {
    throw new Error("Upload image API did not return url/path");
  }
  return url;
}

// API functions for Groups (used in dropdown)
export async function fetchGroups(
  params: GetGroupsParams
): Promise<PagedResult<Group>> {
  const { data } = await api.get("/admin/v1/groups", {
    params,
  });
  const result = (data as any)?.data ?? data;
  return result;
}

// API functions for Categories (used in dropdown)
export async function fetchCategories(
  params: GetCategoriesParams
): Promise<PagedResult<Category>> {
  const { data } = await api.get("/admin/v1/categories", {
    params,
  });
  const result = (data as any)?.data ?? data;
  return result;
}

// Fetch ALL categories without filters for tree building
export async function fetchAllCategories(): Promise<Category[]> {
  const { data } = await api.get("/admin/v1/categories", {
    params: {
      Page: 1,
      PageSize: 9999, // Large number to get all
    },
  });
  const result = (data as any)?.data ?? data;
  return result.items || [];
}

// ============= PRODUCT TYPES & VALUES =============

// Fetch all product types (Brand, Color, Version, etc.)
export async function fetchProductTypes(): Promise<ProductType[]> {
  const { data } = await api.get("/admin/v1/product-types");
  const result = (data as any)?.data ?? data;
  return Array.isArray(result) ? result : result.items || [];
}

// Fetch values for a specific product type
export async function fetchProductTypeValues(productTypeId: number): Promise<ProductTypeValue[]> {
  const { data } = await api.get(`/admin/v1/product-types/${productTypeId}/values`);
  const result = (data as any)?.data ?? data;
  return Array.isArray(result) ? result : result.items || [];
}

// ============= PRODUCT VARIANTS =============

// Fetch all variants for a product
export async function fetchProductVariants(productId: number): Promise<ProductVariant[]> {
  const { data } = await api.get(`/admin/v1/products/${productId}/variants`);
  const result = (data as any)?.data ?? data;
  const items = Array.isArray(result) ? result : result.items || [];

  // Map API response: "options" -> "attributes"
  return items.map((item: any) => ({
    ...item,
    attributes: item.options || [],
  }));
}

// Create variants from combinations (bulk create)
export async function createProductVariants(
  productId: number,
  payload: {
    productTypeIds: number[];
    selectedValueIds: { [productTypeId: number]: number[] };
  }
): Promise<void> {
  await api.post(`/admin/v1/products/${productId}/variants`, payload);
}

// Update single variant
export async function updateProductVariant(
  variantId: number,
  payload: Partial<ProductVariant>
): Promise<void> {
  await api.put(`/admin/v1/variants/${variantId}`, payload);
}

// Delete variant
export async function deleteProductVariant(variantId: number): Promise<void> {
  await api.delete(`/admin/v1/variants/${variantId}`);
}

// ============= TIER PRICING =============

// Fetch price tiers for a variant
export async function fetchVariantPriceTiers(variantId: number): Promise<PriceTier[]> {
  const { data } = await api.get(`/admin/v1/variants/${variantId}/price-tiers`);
  const result = (data as any)?.data ?? data;
  return Array.isArray(result) ? result : result.items || [];
}

// Update price tiers for a variant (bulk update)
export async function updateVariantPriceTiers(
  variantId: number,
  priceTiers: PriceTier[]
): Promise<void> {
  await api.put(`/admin/v1/variants/${variantId}/price-tiers`, priceTiers);
}

// ============= INVENTORY =============

// Adjust inventory for a variant
export async function adjustInventory(payload: InventoryAdjustmentRequest): Promise<void> {
  await api.post("/admin/inventory/adjust", payload);
}

// ============= RELATED PRODUCTS =============

export type RelatedProduct = {
  productId: number;
  code: string | null;
  name: string | null;
  image: string | null;
};

// Fetch related products for a product
export async function fetchRelatedProducts(productId: number): Promise<RelatedProduct[]> {
  try {
    const { data } = await api.get(`/admin/v1/products/${productId}/related`);
    const result = (data as any)?.data ?? data;
    // Ensure we always return an array, even if API returns error object
    if (!Array.isArray(result)) {
      console.warn("fetchRelatedProducts: API did not return array", result);
      return [];
    }
    return result;
  } catch (error) {
    console.error("fetchRelatedProducts error:", error);
    return [];
  }
}

// Set related products for a product
export async function setRelatedProducts(productId: number, relatedProductIds: number[]): Promise<void> {
  await api.put(`/admin/v1/products/${productId}/related`, { relatedProductIds });
}

// ============= SIMILAR PRODUCTS (Cùng chức năng) =============

export type SimilarProduct = {
  productId: number;
  code: string | null;
  name: string | null;
  image: string | null;
};

// Fetch similar products for a product
export async function fetchSimilarProducts(productId: number): Promise<SimilarProduct[]> {
  try {
    const { data } = await api.get(`/admin/v1/products/${productId}/similar`);
    const result = (data as any)?.data ?? data;
    if (!Array.isArray(result)) {
      console.warn("fetchSimilarProducts: API did not return array", result);
      return [];
    }
    return result;
  } catch (error) {
    console.error("fetchSimilarProducts error:", error);
    return [];
  }
}

// Set similar products for a product
export async function setSimilarProducts(productId: number, similarProductIds: number[]): Promise<void> {
  await api.put(`/admin/v1/products/${productId}/similar`, { similarProductIds });
}

// ============= CROSS-SELL PRODUCTS (Bán kèm) =============

export type CrossSellProduct = {
  productId: number;
  code: string | null;
  name: string | null;
  image: string | null;
  saleOff: number;
  applyQuantity: number;
};

export type CrossSellProductInput = {
  productId: number;
  saleOff?: number;
  applyQuantity?: number;
};

// Fetch cross-sell products for a product
export async function fetchCrossSellProducts(productId: number): Promise<CrossSellProduct[]> {
  const { data } = await api.get(`/admin/v1/products/${productId}/includes`);
  const result = (data as any)?.data ?? data;
  return Array.isArray(result) ? result : [];
}

// Set cross-sell products for a product
export async function setCrossSellProducts(productId: number, items: CrossSellProductInput[]): Promise<void> {
  await api.put(`/admin/v1/products/${productId}/includes`, { items });
}

// ============= PRODUCT GIFTS (SP tặng kèm) =============

export type ProductGift = {
  id: number;
  productId: number;
  giftVariantId: number;
  giftVariantSku: string | null;
  giftVariantName: string | null;
  giftProductName: string | null;
  giftProductImage: string | null;
  giftQuantity: number;
  fromDate: string | null;
  toDate: string | null;
  isUnlimited: boolean;
  isActive: boolean;
};

export type ProductGiftInput = {
  giftVariantId: number;
  giftQuantity: number;
  fromDate?: string | null;
  toDate?: string | null;
  isUnlimited: boolean;
};

// Fetch all gifts for a product
export async function fetchProductGifts(productId: number): Promise<ProductGift[]> {
  try {
    const { data } = await api.get(`/admin/v1/products/${productId}/gifts`);
    const result = (data as any)?.data ?? data;
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("fetchProductGifts error:", error);
    return [];
  }
}

// Create a new gift for a product
export async function createProductGift(productId: number, payload: ProductGiftInput): Promise<void> {
  await api.post(`/admin/v1/products/${productId}/gifts`, payload);
}

// Update an existing gift
export async function updateProductGift(productId: number, giftId: number, payload: ProductGiftInput): Promise<void> {
  await api.put(`/admin/v1/products/${productId}/gifts/${giftId}`, payload);
}

// Delete a gift
export async function deleteProductGift(productId: number, giftId: number): Promise<void> {
  await api.delete(`/admin/v1/products/${productId}/gifts/${giftId}`);
}

// ============= VARIANT SEARCH (for gift picker) =============

export type VariantSearchResult = {
  id: number;
  sku: string | null;
  productId: number;
  productName: string | null;
  productImage: string | null;
  attributes: { typeName: string | null; valueName: string | null }[];
};

// Search variants across all products (for gift variant picker)
export async function searchVariants(params: {
  keyword?: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<VariantSearchResult>> {
  try {
    const { data } = await api.get("/admin/v1/variants/search", { params });
    const result = (data as any)?.data ?? data;
    if (!result || typeof result !== "object" || !Array.isArray(result.items)) {
      return { items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
    }
    return result;
  } catch (error) {
    console.error("searchVariants error:", error);
    return { items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 0 };
  }
}

// ============= SQL VIEW DATA =============

export type ViewDataItem = {
  id: number;
  name: string;
};

// Fetch data from SQL view (viewPacked, viewPin, viewType, etc.)
export async function fetchViewData(viewName: string): Promise<ViewDataItem[]> {
  const { data } = await api.get(`/admin/v1/viewSqlData/${viewName}`);
  const result = (data as any)?.data ?? data;

  // API returns objects with dynamic field names based on viewName
  // e.g., viewPacked -> { "packed": "TO-5" }, viewPin -> { "pin": "6" }
  // Extract field name by removing "view" prefix (case insensitive)
  const fieldName = viewName.toLowerCase().replace(/^view/, "");

  if (Array.isArray(result)) {
    return result.map((item: any, index: number) => {
      // Try to get value from dynamic field name or fallback to common patterns
      const value = item[fieldName] ?? item.name ?? item.Name ?? item.ten ?? item.Ten ?? "";
      return {
        id: item.id ?? item.Id ?? index + 1,
        name: String(value),
      };
    });
  }
  return [];
}
