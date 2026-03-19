import api from "@/lib/api";
import type {
  NewsHomeItem,
  GetNewsHomeListResponse,
  UpdateNewsHomeRequest,
  AddNewsToHomeRequest,
  AddNewsListToHomeRequest,
} from "./types";

const API_BASE = "/admin/v1/news-home";

/**
 * Get list of news displayed on home page
 */
export async function fetchNewsHomeList(): Promise<NewsHomeItem[]> {
  const { data } = await api.get<GetNewsHomeListResponse>(API_BASE);
  return data?.data ?? [];
}

/**
 * Add a single news to home page
 */
export async function addNewsToHome(newsId: number, payload: AddNewsToHomeRequest): Promise<void> {
  await api.post(`${API_BASE}/${newsId}`, payload);
}

/**
 * Update news-home sort order or status
 */
export async function updateNewsHome(newsId: number, payload: UpdateNewsHomeRequest): Promise<void> {
  await api.put(`${API_BASE}/${newsId}`, payload);
}

/**
 * Remove news from home page
 */
export async function deleteNewsFromHome(newsId: number): Promise<void> {
  await api.delete(`${API_BASE}/${newsId}`);
}

/**
 * Add multiple news to home page (batch)
 */
export async function addNewsListToHome(payload: AddNewsListToHomeRequest): Promise<void> {
  await api.post(`${API_BASE}/batch`, payload);
}
