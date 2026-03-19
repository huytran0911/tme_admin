import api from "@/lib/api";
import type { GetSupplierListParams, PagedSupplierResult, Supplier } from "./types";

type SupplierListPayload = {
  items?: any[];
  total?: number;
  totalCount?: number;
  page?: number;
  pageSize?: number;
};

export async function fetchSuppliers(
  params: GetSupplierListParams,
): Promise<PagedSupplierResult<Supplier>> {
  const { data } = await api.get("/admin/v1/suppliers", {
    params: {
      Keyword: params.keyword ?? "",
      Page: params.page ?? 1,
      PageSize: params.pageSize ?? 10,
    },
  });

  const payload: SupplierListPayload = (data as any)?.data ?? data ?? {};
  const rawItems = Array.isArray(payload?.items) ? payload?.items : [];

  const items: Supplier[] = rawItems.map((item: any) => ({
    id: item?.id ?? 0,
    name: item?.name ?? "",
    nameEn: item?.nameEn ?? "",
    logo: item?.logo ?? "",
  }));

  const total =
    typeof payload?.totalCount === "number"
      ? payload.totalCount
      : typeof payload?.total === "number"
        ? payload.total
        : items.length;

  return {
    items,
    total,
    page: payload?.page ?? params.page ?? 1,
    pageSize: payload?.pageSize ?? params.pageSize ?? items.length,
  };
}

export async function createSupplier(payload: Omit<Supplier, "id">): Promise<Supplier> {
  const { data } = await api.post("/admin/v1/suppliers", payload);
  const response = (data as any)?.data ?? data;
  return {
    id: response?.id ?? 0,
    name: payload.name,
    nameEn: payload.nameEn,
    logo: payload.logo,
  };
}

export async function updateSupplier(id: number, payload: Omit<Supplier, "id">): Promise<void> {
  await api.put(`/admin/v1/suppliers/${id}`, payload);
}

export async function deleteSupplier(id: number): Promise<void> {
  await api.delete(`/admin/v1/suppliers/${id}`);
}
