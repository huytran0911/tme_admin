import api from "@/lib/api";
import type {
  SaleOff,
  SaleOffDetail,
  SaleOffProduct,
  CreateSaleOffRequest,
  UpdateSaleOffRequest,
  GetSaleOffListParams,
  GetSaleOffProductsParams,
  AddProductsToSaleOffRequest,
  UpdateSaleOffProductRequest,
  PagedResult,
  ProductForSelection,
} from "./types";

// Base endpoint - note the plural "sale-offs"
const API_BASE = "/admin/v1/sale-offs";

// ============ Sale Off CRUD ============

export async function fetchSaleOffs(params: GetSaleOffListParams): Promise<PagedResult<SaleOff>> {
  const { data } = await api.get(API_BASE, { params });
  const payload = (data as any)?.data ?? data;
  const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  const total =
    typeof payload?.total === "number"
      ? payload.total
      : typeof payload?.totalCount === "number"
        ? payload.totalCount
        : items.length;

  return {
    items,
    total,
    page: payload?.page ?? params.Page ?? 1,
    pageSize: payload?.pageSize ?? params.PageSize ?? items.length,
  };
}

export async function fetchSaleOffById(id: number): Promise<SaleOffDetail> {
  const { data } = await api.get(`${API_BASE}/${id}`);
  const payload = (data as any)?.data ?? data;
  return payload;
}

export async function createSaleOff(payload: CreateSaleOffRequest): Promise<number> {
  const { data } = await api.post(API_BASE, payload);
  const result = (data as any)?.data ?? data;
  return result?.id ?? result;
}

export async function updateSaleOff(id: number, payload: UpdateSaleOffRequest): Promise<void> {
  await api.put(`${API_BASE}/${id}`, payload);
}

export async function deleteSaleOff(id: number): Promise<void> {
  await api.delete(`${API_BASE}/${id}`);
}

// ============ Sale Off Products ============

export async function fetchSaleOffProducts(
  saleOffId: number,
  params?: GetSaleOffProductsParams
): Promise<PagedResult<SaleOffProduct>> {
  const { data } = await api.get(`${API_BASE}/${saleOffId}/products`, { params });
  const payload = (data as any)?.data ?? data;
  const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  const total =
    typeof payload?.total === "number"
      ? payload.total
      : typeof payload?.totalCount === "number"
        ? payload.totalCount
        : items.length;

  return {
    items,
    total,
    page: payload?.page ?? params?.Page ?? 1,
    pageSize: payload?.pageSize ?? params?.PageSize ?? items.length,
  };
}

export async function addProductsToSaleOff(
  saleOffId: number,
  request: AddProductsToSaleOffRequest
): Promise<void> {
  await api.post(`${API_BASE}/${saleOffId}/products`, request);
}

export async function updateSaleOffProduct(
  saleOffId: number,
  productId: number,
  request: UpdateSaleOffProductRequest
): Promise<void> {
  await api.put(`${API_BASE}/${saleOffId}/products/${productId}`, request);
}

export async function removeProductFromSaleOff(saleOffId: number, productId: number): Promise<void> {
  await api.delete(`${API_BASE}/${saleOffId}/products/${productId}`);
}

// ============ Products for selection ============

export async function fetchProductsForSelection(params: {
  categoryId?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<ProductForSelection>> {
  const { data } = await api.get("/admin/v1/products", {
    params: {
      CategoryId: params.categoryId,
      Keyword: params.keyword,
      Page: params.page ?? 1,
      PageSize: params.pageSize ?? 50,
    },
  });
  const payload = (data as any)?.data ?? data;
  const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  const total =
    typeof payload?.total === "number"
      ? payload.total
      : typeof payload?.totalCount === "number"
        ? payload.totalCount
        : items.length;

  return {
    items,
    total,
    page: payload?.page ?? params.page ?? 1,
    pageSize: payload?.pageSize ?? params.pageSize ?? items.length,
  };
}
