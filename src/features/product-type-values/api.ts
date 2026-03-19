import api from "@/lib/api";
import type {
  ProductTypeValue,
  CreateProductTypeValueRequest,
  UpdateProductTypeValueRequest,
  GetProductTypeValuesParams,
  PagedResult,
} from "./types";

export async function fetchProductTypeValues(
  typeId: number,
  params: GetProductTypeValuesParams
): Promise<PagedResult<ProductTypeValue>> {
  const { data } = await api.get(`/admin/v1/product-types/${typeId}/values`, {
    params,
  });
  const payload = (data as any)?.data ?? data;
  // API returns array directly, not paginated
  const items = Array.isArray(payload) ? payload : [];
  const totalCount = items.length;

  return {
    items,
    totalCount,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    totalPages: Math.ceil(totalCount / (params.pageSize || 20)),
  };
}

export async function createProductTypeValue(
  typeId: number,
  payload: CreateProductTypeValueRequest
): Promise<number> {
  const { data } = await api.post(
    `/admin/v1/product-types/${typeId}/values`,
    payload
  );
  const result = (data as any)?.data ?? data;
  return result?.id ?? result;
}

export async function updateProductTypeValue(
  valueId: number,
  payload: UpdateProductTypeValueRequest
): Promise<void> {
  await api.put(`/admin/v1/product-types/values/${valueId}`, payload);
}

export async function deleteProductTypeValue(valueId: number): Promise<void> {
  await api.delete(`/admin/v1/product-types/values/${valueId}`);
}
