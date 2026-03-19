import api from "@/lib/api";
import type {
  Promotion,
  PromotionDetail,
  CreatePromotionRequest,
  UpdatePromotionRequest,
  GetPromotionsParams,
  PagedResult,
} from "./types";

const API_BASE = "/admin/v1/promotions";

// Get promotions list
export async function fetchPromotions(params: GetPromotionsParams): Promise<PagedResult<Promotion>> {
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

// Get promotion by id
export async function fetchPromotionById(id: number): Promise<PromotionDetail> {
  const { data } = await api.get(`${API_BASE}/${id}`);
  const payload = (data as any)?.data ?? data;
  return payload;
}

// Create promotion
export async function createPromotion(payload: CreatePromotionRequest): Promise<number> {
  const { data } = await api.post(API_BASE, payload);
  const result = (data as any)?.data ?? data;
  return result?.id ?? result;
}

// Update promotion
export async function updatePromotion(id: number, payload: UpdatePromotionRequest): Promise<void> {
  await api.put(`${API_BASE}/${id}`, payload);
}

// Delete promotion
export async function deletePromotion(id: number): Promise<void> {
  await api.delete(`${API_BASE}/${id}`);
}
