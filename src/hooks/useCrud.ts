"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import api from "@/lib/api";
import type { AxiosError } from "axios";

// ============================================================================
// Types
// ============================================================================

export type ListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: number;
  [key: string]: unknown;
};

export type PagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ApiError = {
  message: string;
  code?: string;
  details?: unknown;
};

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Extract error message from API error response
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const axiosError = error as AxiosError<{ error?: { message?: string }; message?: string }>;
    return (
      axiosError.response?.data?.error?.message ||
      axiosError.response?.data?.message ||
      axiosError.message ||
      "Co loi xay ra"
    );
  }
  return "Co loi xay ra";
}

/**
 * Convert ListParams to API query params (Pascal case for backend)
 */
function toApiParams(params: ListParams): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (params.page !== undefined) result.Page = params.page;
  if (params.pageSize !== undefined) result.PageSize = params.pageSize;
  if (params.keyword) result.Keyword = params.keyword;
  if (params.status !== undefined) result.Status = params.status;

  // Pass through any additional params
  Object.entries(params).forEach(([key, value]) => {
    if (!["page", "pageSize", "keyword", "status"].includes(key) && value !== undefined) {
      result[key] = value;
    }
  });

  return result;
}

/**
 * Unwrap API response payload
 */
function unwrapPayload<T>(response: unknown): T {
  const res = response as { data?: T } | T;
  if (res && typeof res === "object" && "data" in res) {
    return res.data as T;
  }
  return res as T;
}

// ============================================================================
// Generic CRUD Configuration
// ============================================================================

export type CrudConfig<TEntity, TCreateInput, TUpdateInput> = {
  /** Base endpoint (e.g., "/admin/v1/payments") */
  endpoint: string;
  /** Unique key for React Query cache */
  queryKey: string;
  /** Transform API response to entity (optional) */
  mapItem?: (dto: unknown) => TEntity;
  /** Transform entity to create payload (optional) */
  toCreatePayload?: (input: TCreateInput) => unknown;
  /** Transform entity to update payload (optional) */
  toUpdatePayload?: (input: TUpdateInput) => unknown;
};

// ============================================================================
// Factory function to create CRUD hooks
// ============================================================================

export function createCrudHooks<
  TEntity extends { id: number | string },
  TCreateInput = Omit<TEntity, "id" | "createdAt">,
  TUpdateInput = Partial<Omit<TEntity, "id">>
>(config: CrudConfig<TEntity, TCreateInput, TUpdateInput>) {
  const { endpoint, queryKey, mapItem = (dto) => dto as TEntity } = config;

  // ---------------------------------------------------------------------------
  // List Hook
  // ---------------------------------------------------------------------------
  function useList(
    params: ListParams = { page: 1, pageSize: 10 },
    options?: Omit<UseQueryOptions<PagedResult<TEntity>>, "queryKey" | "queryFn">
  ) {
    return useQuery({
      queryKey: [queryKey, "list", params],
      queryFn: async (): Promise<PagedResult<TEntity>> => {
        const { data: res } = await api.get(endpoint, {
          params: toApiParams(params),
        });

        const payload = unwrapPayload<{
          items?: unknown[];
          data?: unknown[];
          total?: number;
          totalCount?: number;
          page?: number;
          pageSize?: number;
        }>(res);

        const items = (payload?.items || payload?.data || []).map(mapItem);
        const total = payload?.total ?? payload?.totalCount ?? items.length;

        return {
          items,
          total: Number(total || 0),
          page: payload?.page ?? params.page ?? 1,
          pageSize: payload?.pageSize ?? params.pageSize ?? 10,
        };
      },
      ...options,
    });
  }

  // ---------------------------------------------------------------------------
  // Detail Hook
  // ---------------------------------------------------------------------------
  function useDetail(
    id?: number | string,
    options?: Omit<UseQueryOptions<TEntity | null>, "queryKey" | "queryFn">
  ) {
    return useQuery({
      queryKey: [queryKey, "detail", id],
      queryFn: async (): Promise<TEntity | null> => {
        if (!id) return null;
        const { data: res } = await api.get(`${endpoint}/${id}`);
        const payload = unwrapPayload(res);
        return mapItem(payload);
      },
      enabled: !!id,
      ...options,
    });
  }

  // ---------------------------------------------------------------------------
  // Create Mutation
  // ---------------------------------------------------------------------------
  function useCreate(
    options?: UseMutationOptions<TEntity, Error, TCreateInput>
  ) {
    const queryClient = useQueryClient();
    const toPayload = config.toCreatePayload || ((input) => input);

    return useMutation({
      mutationFn: async (input: TCreateInput): Promise<TEntity> => {
        const { data: res } = await api.post(endpoint, toPayload(input));
        const payload = unwrapPayload(res);
        return mapItem(payload);
      },
      onSuccess: () => {
        // Invalidate list queries to refetch
        queryClient.invalidateQueries({ queryKey: [queryKey, "list"] });
      },
      ...options,
    });
  }

  // ---------------------------------------------------------------------------
  // Update Mutation
  // ---------------------------------------------------------------------------
  function useUpdate(
    options?: UseMutationOptions<TEntity, Error, { id: number | string; data: TUpdateInput }>
  ) {
    const queryClient = useQueryClient();
    const toPayload = config.toUpdatePayload || ((input) => input);

    return useMutation({
      mutationFn: async ({ id, data }): Promise<TEntity> => {
        const { data: res } = await api.put(`${endpoint}/${id}`, toPayload(data));
        const payload = unwrapPayload(res);
        return mapItem(payload);
      },
      onSuccess: (_, variables) => {
        // Invalidate both list and detail queries
        queryClient.invalidateQueries({ queryKey: [queryKey, "list"] });
        queryClient.invalidateQueries({ queryKey: [queryKey, "detail", variables.id] });
      },
      ...options,
    });
  }

  // ---------------------------------------------------------------------------
  // Delete Mutation
  // ---------------------------------------------------------------------------
  function useDelete(
    options?: UseMutationOptions<void, Error, number | string>
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (id: number | string): Promise<void> => {
        await api.delete(`${endpoint}/${id}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey, "list"] });
      },
      ...options,
    });
  }

  // ---------------------------------------------------------------------------
  // Bulk Update Mutation (optional)
  // ---------------------------------------------------------------------------
  function useBulkUpdate<TBulkPayload = unknown>(
    options?: UseMutationOptions<void, Error, TBulkPayload>
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (payload: TBulkPayload): Promise<void> => {
        await api.put(`${endpoint}/bulk`, payload);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey, "list"] });
      },
      ...options,
    });
  }

  return {
    useList,
    useDetail,
    useCreate,
    useUpdate,
    useDelete,
    useBulkUpdate,
    queryKey,
  };
}

// ============================================================================
// Utility hook for manual cache invalidation
// ============================================================================

export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return {
    invalidate: (key: string | string[]) => {
      const keys = Array.isArray(key) ? key : [key];
      keys.forEach((k) => {
        queryClient.invalidateQueries({ queryKey: [k] });
      });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },
  };
}
