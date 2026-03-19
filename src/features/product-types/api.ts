import api from "@/lib/api";
import type {
  ProductType,
  ProductTypeDetail,
  CreateProductTypeRequest,
  UpdateProductTypeRequest,
  GetProductTypeListParams,
  PagedResult,
} from "./types";

export async function fetchProductTypes(
  params: GetProductTypeListParams
): Promise<PagedResult<ProductType>> {
  const { data } = await api.get("/admin/v1/product-types", { params });
  const payload = (data as any)?.data ?? data;
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const totalCount = payload?.totalCount ?? items.length;

  return {
    items,
    totalCount,
    page: payload?.page ?? params.page ?? 1,
    pageSize: payload?.pageSize ?? params.pageSize ?? 20,
    totalPages:
      payload?.totalPages ?? Math.ceil(totalCount / (params.pageSize || 20)),
  };
}

export async function fetchProductTypeById(
  id: number
): Promise<ProductTypeDetail> {
  const { data } = await api.get(`/admin/v1/product-types/${id}`);
  return (data as any)?.data ?? data;
}

export async function createProductType(
  payload: CreateProductTypeRequest
): Promise<number> {
  const { data } = await api.post("/admin/v1/product-types", payload);
  const result = (data as any)?.data ?? data;
  return result?.id ?? result;
}

export async function updateProductType(
  id: number,
  payload: UpdateProductTypeRequest
): Promise<void> {
  await api.put(`/admin/v1/product-types/${id}`, payload);
}

export async function deleteProductType(id: number): Promise<void> {
  await api.delete(`/admin/v1/product-types/${id}`);
}
