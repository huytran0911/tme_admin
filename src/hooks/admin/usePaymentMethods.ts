"use client";

import { createCrudHooks, getErrorMessage, type ListParams } from "@/hooks/useCrud";

// ============================================================================
// Types
// ============================================================================

export type PaymentMethod = {
  id: number;
  name: string;
  nameEn: string;
  content: string;
  contentEn: string;
  status: 0 | 1;
  sort: number;
  createdAt?: string;
};

export type PaymentMethodCreateInput = Omit<PaymentMethod, "id" | "createdAt">;
export type PaymentMethodUpdateInput = Partial<Omit<PaymentMethod, "id">>;

// ============================================================================
// Mapper
// ============================================================================

const mapPaymentMethod = (dto: unknown): PaymentMethod => {
  const d = dto as Record<string, unknown>;
  return {
    id: Number(d?.id ?? 0),
    name: (d?.name as string) ?? "",
    nameEn: (d?.nameEn as string) ?? "",
    content: (d?.content as string) ?? "",
    contentEn: (d?.contentEn as string) ?? "",
    status: d?.status === 0 ? 0 : 1,
    sort: Number(d?.sort ?? 0),
    createdAt: d?.createdAt as string | undefined,
  };
};

// ============================================================================
// Create CRUD hooks using factory
// ============================================================================

const paymentMethodsCrud = createCrudHooks<
  PaymentMethod,
  PaymentMethodCreateInput,
  PaymentMethodUpdateInput
>({
  endpoint: "/admin/v1/payments",
  queryKey: "payment-methods",
  mapItem: mapPaymentMethod,
});

// ============================================================================
// Export hooks
// ============================================================================

/**
 * Hook to fetch paginated list of payment methods
 * @example
 * const { data, isLoading, error } = usePaymentMethodsList({ page: 1, pageSize: 10 });
 */
export const usePaymentMethodsList = (params: ListParams = { page: 1, pageSize: 10 }) => {
  const query = paymentMethodsCrud.useList(params);

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    // Additional React Query states
    isFetching: query.isFetching,
    isError: query.isError,
    isSuccess: query.isSuccess,
  };
};

/**
 * Hook to fetch single payment method by ID
 * @example
 * const { data, isLoading } = usePaymentMethodDetail(123);
 */
export const usePaymentMethodDetail = (id?: number) => {
  const query = paymentMethodsCrud.useDetail(id);

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};

/**
 * Hook to create a new payment method
 * @example
 * const { mutate, isPending } = useCreatePaymentMethod();
 * mutate({ name: 'New Method', ... });
 */
export const useCreatePaymentMethod = () => {
  return paymentMethodsCrud.useCreate();
};

/**
 * Hook to update an existing payment method
 * @example
 * const { mutate, isPending } = useUpdatePaymentMethod();
 * mutate({ id: 123, data: { name: 'Updated Name' } });
 */
export const useUpdatePaymentMethod = () => {
  return paymentMethodsCrud.useUpdate();
};

/**
 * Hook to delete a payment method
 * @example
 * const { mutate, isPending } = useDeletePaymentMethod();
 * mutate(123);
 */
export const useDeletePaymentMethod = () => {
  return paymentMethodsCrud.useDelete();
};

// Re-export utility
export { getErrorMessage };

// Export query key for manual cache manipulation
export const PAYMENT_METHODS_QUERY_KEY = paymentMethodsCrud.queryKey;
