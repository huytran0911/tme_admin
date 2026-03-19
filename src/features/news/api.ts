import api from "@/lib/api";
import type {
  NewsListItem,
  NewsDetail,
  NewsListParams,
  CreateNewsRequest,
  UpdateNewsRequest,
} from "./types";

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchNewsList(
  params: NewsListParams
): Promise<PagedResult<NewsListItem>> {
  const { data } = await api.get("/admin/v1/news", { params });

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
    page: payload?.page ?? params.Page ?? 1,
    pageSize: payload?.pageSize ?? params.PageSize ?? items.length,
  };
}

export async function fetchNewsById(id: number): Promise<NewsDetail> {
  const { data } = await api.get(`/admin/v1/news/${id}`);
  const payload = (data as any)?.data ?? data;
  return payload;
}

export async function createNews(payload: CreateNewsRequest): Promise<NewsDetail> {
  const { data } = await api.post<NewsDetail>("/admin/v1/news", payload);
  return (data as any)?.data ?? data;
}

export async function updateNews(
  id: number,
  payload: UpdateNewsRequest
): Promise<NewsDetail> {
  const { data } = await api.put<NewsDetail>(`/admin/v1/news/${id}`, payload);
  return (data as any)?.data ?? data;
}

export async function deleteNews(id: number): Promise<void> {
  await api.delete(`/admin/v1/news/${id}`);
}

export async function uploadNewsImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/admin/v1/files/upload", formData, {
    params: { module: "news" },
    headers: { "Content-Type": "multipart/form-data" },
  });

  const payload = (data as any)?.data ?? data ?? {};
  const url = payload?.url ?? payload?.path;
  if (!url) {
    throw new Error("Upload image API did not return url/path");
  }
  return url;
}
