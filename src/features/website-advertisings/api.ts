import api from "@/lib/api";
import type {
  GetWebsiteAdvertisingParams,
  PagedWebsiteAdvertisingResult,
  WebsiteAdvertising,
  WebsiteAdvertisingInput,
} from "./types";

type WebsiteAdvertisingDto = Partial<{
  id: number;
  name: string;
  address: string;
  image: string;
  status: number;
  sort: number;
  view: number;
  createdAt: string;
}>;

type ListPayload = {
  items?: WebsiteAdvertisingDto[];
  total?: number;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

type Envelope<T> = {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string } | null;
};

const safeNumber = (val: unknown): number | undefined => {
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
};

const mapItem = (dto?: WebsiteAdvertisingDto, fallback?: Partial<WebsiteAdvertising>): WebsiteAdvertising => ({
  id: Number(dto?.id ?? fallback?.id ?? 0),
  name: dto?.name ?? fallback?.name ?? "",
  address: dto?.address ?? fallback?.address ?? "",
  image: dto?.image ?? fallback?.image ?? "",
  status: (dto?.status ?? fallback?.status ?? 1) === 0 ? 0 : 1,
  sort: safeNumber(dto?.sort ?? fallback?.sort) ?? 0,
  view: safeNumber(dto?.view ?? fallback?.view) ?? 0,
  createdAt: dto?.createdAt ?? fallback?.createdAt,
});

export async function fetchWebsiteAdvertisings(
  params: GetWebsiteAdvertisingParams,
): Promise<PagedWebsiteAdvertisingResult<WebsiteAdvertising>> {
  const { data } = await api.get("/admin/v1/website-advertisings", {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 10,
      keyword: params.keyword ?? "",
      status: params.status ?? undefined,
    },
  });

  const envelope = data as Envelope<ListPayload>;
  const payload = (envelope?.data as ListPayload) ?? {};
  const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(envelope?.data) ? (envelope.data as WebsiteAdvertisingDto[]) : [];
  const items = rawItems.map((item) => mapItem(item));

  const total =
    typeof payload.totalCount === "number"
      ? payload.totalCount
      : typeof payload.total === "number"
        ? payload.total
        : items.length;

  return {
    items,
    total,
    page: payload.page ?? params.page ?? 1,
    pageSize: payload.pageSize ?? params.pageSize ?? items.length,
    totalPages: payload.totalPages,
  };
}

export async function createWebsiteAdvertising(payload: WebsiteAdvertisingInput): Promise<WebsiteAdvertising> {
  const { data } = await api.post("/admin/v1/website-advertisings", payload);
  const envelope = data as Envelope<{ id?: number } & WebsiteAdvertisingDto>;
  const dto = (envelope?.data as WebsiteAdvertisingDto) ?? {};
  return mapItem(dto, payload);
}

export async function updateWebsiteAdvertising(
  id: number,
  payload: Partial<WebsiteAdvertisingInput>,
  current?: Partial<WebsiteAdvertising>,
): Promise<WebsiteAdvertising> {
  const { data } = await api.put(`/admin/v1/website-advertisings/${id}`, payload);
  const envelope = data as Envelope<WebsiteAdvertisingDto>;
  const dto = (envelope?.data as WebsiteAdvertisingDto) ?? {};
  return mapItem(dto, { ...current, ...payload, id });
}

export async function deleteWebsiteAdvertising(id: number): Promise<void> {
  await api.delete(`/admin/v1/website-advertisings/${id}`);
}

export async function uploadWebsiteAdvertisingImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/admin/v1/files/upload", formData, {
    params: { module: "website-advertisings" },
    headers: { "Content-Type": "multipart/form-data" },
  });
  const envelope = data as Envelope<{ url?: string; path?: string }>;
  const result = (envelope?.data as { url?: string; path?: string }) ?? {};
  const url = result.url ?? result.path;
  if (!url) throw new Error("Upload image API did not return url/path");
  return url;
}
