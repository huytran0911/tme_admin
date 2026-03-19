import api from "@/lib/api";
import type {
  SupportOnlineItem,
  GetSupportOnlineListResponse,
  GetSupportOnlineResponse,
  CreateSupportOnlineRequest,
  UpdateSupportOnlineRequest,
} from "./types";

const API_BASE = "/admin/v1/online-support";

/**
 * Get list of online support contacts
 */
export async function fetchSupportOnlineList(): Promise<SupportOnlineItem[]> {
  const { data } = await api.get<GetSupportOnlineListResponse>(API_BASE);
  return data?.data?.items ?? [];
}

/**
 * Get single online support contact by ID
 */
export async function fetchSupportOnlineById(id: number): Promise<SupportOnlineItem> {
  const { data } = await api.get<GetSupportOnlineResponse>(`${API_BASE}/${id}`);
  return data.data;
}

/**
 * Create new online support contact
 */
export async function createSupportOnline(payload: CreateSupportOnlineRequest): Promise<SupportOnlineItem> {
  const { data } = await api.post<GetSupportOnlineResponse>(API_BASE, payload);
  return data.data;
}

/**
 * Update existing online support contact
 */
export async function updateSupportOnline(id: number, payload: UpdateSupportOnlineRequest): Promise<void> {
  await api.put(`${API_BASE}/${id}`, payload);
}

/**
 * Delete online support contact
 */
export async function deleteSupportOnline(id: number): Promise<void> {
  await api.delete(`${API_BASE}/${id}`);
}
