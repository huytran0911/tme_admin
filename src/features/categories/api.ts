import api from "@/lib/api";
import type {
  Category,
  CategoryDetail,
  CreateCategoryRequest,
  GetCategoryListParams,
  PagedResult,
  UpdateCategoryRequest,
} from "./types";

export async function fetchCategories(params: GetCategoryListParams): Promise<PagedResult<Category>> {
  const { data } = await api.get("/admin/v1/categories", { params });
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

export async function fetchCategoryById(id: number): Promise<CategoryDetail> {
  const { data } = await api.get(`/admin/v1/categories/${id}`);
  const payload = (data as any)?.data ?? data;
  return payload;
}

export async function createCategory(payload: CreateCategoryRequest): Promise<number> {
  const { data } = await api.post("/admin/v1/categories", payload);
  const result = (data as any)?.data ?? data;
  return result?.id ?? result;
}

export async function updateCategory(id: number, payload: UpdateCategoryRequest): Promise<void> {
  await api.put(`/admin/v1/categories/${id}`, payload);
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/admin/v1/categories/${id}`);
}

export async function uploadCategoryImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/admin/v1/files/upload", formData, {
    params: { module: "categories" },
    headers: { "Content-Type": "multipart/form-data" },
  });

  const payload = (data as any)?.data ?? data ?? {};
  const url = payload?.url ?? payload?.path;
  if (!url) {
    throw new Error("Upload image API did not return url/path");
  }
  return url;
}
