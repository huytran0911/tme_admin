import api from "@/lib/api";
import type { GetProductGroupListParams, PagedResult, ProductGroup } from "./types";

export async function fetchProductGroups(params: GetProductGroupListParams): Promise<
  PagedResult<ProductGroup>
> {
  const { data } = await api.get("/admin/v1/groups", { params });

  const payload = (data as any)?.data ?? data;
  const items = Array.isArray(payload?.items) ? payload.items : [];
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

export async function createProductGroup(
  payload: Omit<ProductGroup, "id">,
): Promise<ProductGroup> {
  const { data } = await api.post<ProductGroup>("/admin/v1/groups", payload);
  return data;
}

export async function updateProductGroup(payload: ProductGroup): Promise<ProductGroup> {
  const { data } = await api.put<ProductGroup>(`/admin/v1/groups/${payload.id}`, payload);
  return data;
}

export async function deleteProductGroup(id: number): Promise<void> {
  await api.delete(`/admin/v1/groups/${id}`);
}

export async function bulkUpdateProductGroups(payload: ProductGroup[]): Promise<void> {
  await api.put("/admin/v1/groups", payload);
}

export async function fetchGroupCategories(groupId: number): Promise<any[]> {
  const { data } = await api.get("/admin/v1/categories", {
    params: { groupId, level: 1 },
  });
  const payload = (data as any)?.data ?? data;
  return Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
}

export async function uploadProductGroupImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/admin/v1/files/upload", formData, {
    params: { module: "product-groups" },
    headers: { "Content-Type": "multipart/form-data" },
  });

  const payload = (data as any)?.data ?? data ?? {};
  const url = payload?.url ?? payload?.path;
  if (!url) {
    throw new Error("Upload image API did not return url/path");
  }
  return url;
}
