import api from "@/lib/api";
import type { AdminSlide, GetSlideListParams, PagedSlideResult, SlideInput } from "./types";

type SlideDto = Partial<{
  id: number;
  name: string;
  content: string;
  image: string;
  url: string;
  sort: number;
  groupId: number;
  groupName: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}>;

type SlideListPayload = {
  items?: SlideDto[];
  total?: number;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

type SlideListResponse = SlideListPayload & {
  data?: SlideListPayload | SlideDto[];
};

const safeString = (value: unknown, fallback = ""): string => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const unwrapData = <T>(input: unknown): T | undefined => {
  if (input && typeof input === "object" && "data" in input) {
    const candidate = (input as { data?: T }).data;
    if (candidate !== undefined) return candidate;
  }
  return input as T;
};

const toSlideArray = (input: unknown): SlideDto[] => {
  if (!Array.isArray(input)) return [];
  return input.filter((item): item is SlideDto => Boolean(item) && typeof item === "object");
};

const mapSlide = (input?: SlideDto, fallback?: Partial<AdminSlide>): AdminSlide => ({
  id: Number(input?.id ?? fallback?.id ?? 0),
  name: safeString(input?.name, fallback?.name ?? ""),
  content: input?.content ?? fallback?.content ?? "",
  image: input?.image ?? fallback?.image ?? "",
  sort: Number(input?.sort ?? fallback?.sort ?? 0),
  url: input?.url ?? fallback?.url ?? "",
  groupId: input?.groupId ?? fallback?.groupId ?? undefined,
  groupName: input?.groupName ?? fallback?.groupName ?? undefined,
  createdAt: input?.createdAt ?? fallback?.createdAt,
  createdBy: input?.createdBy ?? fallback?.createdBy,
  updatedAt: input?.updatedAt ?? fallback?.updatedAt,
  updatedBy: input?.updatedBy ?? fallback?.updatedBy,
});

export async function fetchSlides(
  params: GetSlideListParams,
): Promise<PagedSlideResult<AdminSlide>> {
  const { data } = await api.get("/admin/v1/product-slides", {
    params: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 10,
      keyword: params.keyword ?? "",
      groupId: params.groupId ?? undefined,
    },
  });

  const rawResponse = data as SlideListResponse | SlideDto[] | undefined;
  const resolved = unwrapData<SlideListPayload | SlideDto[]>(rawResponse) ?? {};
  const basePayload: SlideListPayload = Array.isArray(resolved) ? { items: resolved } : resolved;

  let rawItems = toSlideArray(basePayload.items);
  if (!rawItems.length && rawResponse && typeof rawResponse === "object") {
    rawItems = toSlideArray((rawResponse as SlideListResponse).items);
  }

  const items = rawItems.map((item) => mapSlide(item));

  const total: number = Number(
    typeof basePayload.totalCount === "number"
      ? basePayload.totalCount
      : typeof basePayload.total === "number"
        ? basePayload.total
        : typeof (rawResponse as SlideListResponse | undefined)?.totalCount === "number"
          ? (rawResponse as SlideListResponse).totalCount
          : items.length,
  );

  const page: number = Number(
    typeof basePayload.page === "number"
      ? basePayload.page
      : typeof (rawResponse as SlideListResponse | undefined)?.page === "number"
        ? (rawResponse as SlideListResponse).page
        : typeof params.page === "number"
          ? params.page
          : 1,
  );

  const pageSize: number = Number(
    typeof basePayload.pageSize === "number"
      ? basePayload.pageSize
      : typeof (rawResponse as SlideListResponse | undefined)?.pageSize === "number"
        ? (rawResponse as SlideListResponse).pageSize
        : typeof params.pageSize === "number"
          ? params.pageSize
          : items.length || 10,
  );

  return {
    items,
    total,
    page,
    pageSize,
  };
}

export async function createSlide(payload: SlideInput): Promise<AdminSlide> {
  const { data } = await api.post("/admin/v1/product-slides", payload);
  const response = unwrapData<SlideDto>(data) ?? {};
  return mapSlide(response, { ...payload, id: response?.id ?? 0 });
}

export async function updateSlide(
  id: number,
  payload: Partial<SlideInput>,
  current?: Partial<AdminSlide>,
): Promise<AdminSlide> {
  const { data } = await api.put(`/admin/v1/product-slides/${id}`, payload);
  const response = unwrapData<SlideDto>(data) ?? {};
  return mapSlide(response, { ...current, ...payload, id });
}

export async function deleteSlide(id: number): Promise<void> {
  await api.delete(`/admin/v1/product-slides/${id}`);
}

export async function uploadSlideAsset(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/admin/v1/files/upload", formData, {
    params: { module: "slides" },
    headers: { "Content-Type": "multipart/form-data" },
  });

  const response = unwrapData<{ url?: string; path?: string }>(data) ?? {};
  const url = response?.url ?? response?.path;
  if (!url) {
    throw new Error("Upload image API did not return url/path");
  }
  return url;
}
