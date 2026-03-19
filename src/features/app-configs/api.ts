import api from "@/lib/api";
import type { GetAppConfigListParams, PagedResult, AppConfig } from "./types";

export async function fetchAppConfigs(
  params: GetAppConfigListParams
): Promise<PagedResult<AppConfig>> {
  const { data } = await api.get("/admin/v1/configs", { params });

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

export async function updateAppConfig(payload: AppConfig): Promise<AppConfig> {
  const { data } = await api.put<AppConfig>(`/admin/v1/configs/${payload.id}`, {
    name: payload.name,
    value: payload.value,
    adminConfig: payload.adminConfig,
  });
  return data;
}

// Hidden for now - uncomment when needed
// export async function createAppConfig(
//   payload: Omit<AppConfig, "id" | "createdAt">
// ): Promise<AppConfig> {
//   const { data } = await api.post<AppConfig>("/admin/v1/configs", payload);
//   return data;
// }

// export async function deleteAppConfig(id: number): Promise<void> {
//   await api.delete(`/admin/v1/configs/${id}`);
// }
