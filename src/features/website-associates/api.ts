import api from "@/lib/api";
import type {
  GetWebsiteAssociateParams,
  PagedWebsiteAssociateResult,
  WebsiteAssociate,
  WebsiteAssociateInput,
} from "./types";

type WebsiteAssociateDto = Partial<{
  id: number;
  name: string;
  address: string;
  status: number;
  sort: number;
  view: number;
  viewCount: number;
  createdAt: string;
  dateAdded: string;
  logoUrl: string;
}>;

type ListPayload = {
  items?: WebsiteAssociateDto[];
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

const mapItem = (dto?: WebsiteAssociateDto, fallback?: Partial<WebsiteAssociate>): WebsiteAssociate => ({
  id: Number(dto?.id ?? fallback?.id ?? 0),
  name: dto?.name ?? fallback?.name ?? "",
  address: dto?.address ?? fallback?.address ?? "",
  status: (dto?.status ?? fallback?.status ?? 1) === 0 ? 0 : 1,
  sort: safeNumber(dto?.sort ?? fallback?.sort) ?? 0,
  view: safeNumber(dto?.view ?? fallback?.view),
  viewCount: safeNumber(dto?.viewCount ?? fallback?.viewCount ?? dto?.view ?? fallback?.view),
  createdAt: dto?.createdAt ?? dto?.dateAdded ?? fallback?.createdAt,
  logoUrl: dto?.logoUrl ?? fallback?.logoUrl ?? "",
});

export async function fetchWebsiteAssociates(
  params: GetWebsiteAssociateParams,
): Promise<PagedWebsiteAssociateResult<WebsiteAssociate>> {
  const { data } = await api.get("/admin/v1/website-associates", {
    params: {
      Page: params.page ?? 1,
      PageSize: params.pageSize ?? 10,
      SearchTerm: params.searchTerm ?? params.keyword ?? "",
      Status: params.status ?? undefined,
    },
  });

  const envelope = data as Envelope<ListPayload>;
  const payload = (envelope?.data as ListPayload) ?? {};
  const rawItems = Array.isArray(payload.items) ? payload.items : Array.isArray(envelope?.data) ? (envelope.data as WebsiteAssociateDto[]) : [];
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

const toPayload = (input: WebsiteAssociateInput) => ({
  name: input.name,
  address: input.address,
  status: input.status ?? 1,
  sort: input.sort ?? 0,
});

export async function createWebsiteAssociate(payload: WebsiteAssociateInput): Promise<WebsiteAssociate> {
  const body = toPayload(payload);
  const { data } = await api.post("/admin/v1/website-associates", body);
  const envelope = data as Envelope<{ id?: number } & WebsiteAssociateDto>;
  const dto = (envelope?.data as WebsiteAssociateDto) ?? {};
  return mapItem(dto, { ...payload, ...body });
}

export async function updateWebsiteAssociate(
  id: number,
  payload: Partial<WebsiteAssociateInput>,
  current?: Partial<WebsiteAssociate>,
): Promise<WebsiteAssociate> {
  const body = toPayload({
    name: payload.name ?? current?.name ?? "",
    address: payload.address ?? current?.address,
    status: payload.status ?? current?.status ?? 1,
    sort: payload.sort ?? current?.sort ?? 0,
  });
  const { data } = await api.put(`/admin/v1/website-associates/${id}`, body);
  const envelope = data as Envelope<WebsiteAssociateDto>;
  const dto = (envelope?.data as WebsiteAssociateDto) ?? {};
  return mapItem(dto, { ...current, ...body, id });
}

export async function deleteWebsiteAssociate(id: number): Promise<void> {
  await api.delete(`/admin/v1/website-associates/${id}`);
}

export async function uploadWebsiteAssociateLogo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/admin/v1/files/upload", formData, {
    params: { module: "website-associates" },
    headers: { "Content-Type": "multipart/form-data" },
  });
  const envelope = data as Envelope<{ url?: string; path?: string }>;
  const result = (envelope?.data as { url?: string; path?: string }) ?? {};
  const url = result.url ?? result.path;
  if (!url) {
    throw new Error("Upload image API did not return url/path");
  }
  return url;
}
