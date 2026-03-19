import api from "@/lib/api";
import type {
  CreateSalesOrderRequest,
  CreateSalesOrderResponse,
  OrderPreviewRequest,
  OrderPreviewResponse,
  SalesOrderDetail,
  SalesOrderListItem,
  GetSalesOrdersParams,
  UpdateSalesOrderStatusRequest,
  UpdateSalesOrderRequest,
  UpdateSalesOrderShippingRequest,
  CancelSalesOrderRequest,
  ConfirmPosPaymentRequest,
  ConfirmPosPaymentResponse,
  PagedResult,
} from "./types";

const API_BASE = "/admin/v1/sales-orders";

// Get sales orders list
export async function fetchSalesOrders(
  params: GetSalesOrdersParams
): Promise<PagedResult<SalesOrderListItem>> {
  const { data } = await api.get(API_BASE, { params });
  const payload = (data as any)?.data ?? data;
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
      ? payload
      : [];
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

// Get sales order by id
export async function fetchSalesOrderById(orderId: number): Promise<SalesOrderDetail> {
  const { data } = await api.get(`${API_BASE}/${orderId}`);
  const payload = (data as any)?.data ?? data;
  return payload;
}

// Create sales order (POS)
export async function createSalesOrder(
  payload: CreateSalesOrderRequest
): Promise<CreateSalesOrderResponse> {
  const { data } = await api.post(API_BASE, payload);
  const result = (data as any)?.data ?? data;
  return result;
}

// Preview sales order (calculate discounts, etc)
export async function previewOrder(
  payload: OrderPreviewRequest
): Promise<OrderPreviewResponse> {
  const { data } = await api.post(`${API_BASE}/preview`, payload);
  const result = (data as any)?.data ?? data;
  return result;
}

// Update sales order status
export async function updateSalesOrderStatus(
  orderId: number,
  payload: UpdateSalesOrderStatusRequest
): Promise<void> {
  await api.put(`${API_BASE}/${orderId}/status`, payload);
}

// Update sales order (general update)
export async function updateSalesOrder(
  orderId: number,
  payload: UpdateSalesOrderRequest
): Promise<void> {
  await api.put(`${API_BASE}/${orderId}`, payload);
}

// Update shipping info only
export async function updateSalesOrderShipping(
  orderId: number,
  payload: UpdateSalesOrderShippingRequest
): Promise<void> {
  await api.put(`${API_BASE}/${orderId}/shipping`, payload);
}

// Cancel order with reason
export async function cancelSalesOrder(
  orderId: number,
  payload: CancelSalesOrderRequest
): Promise<void> {
  await api.post(`${API_BASE}/${orderId}/cancel`, payload);
}

// ============================================================================
// POS Endpoints
// ============================================================================

const POS_API_BASE = "/admin/v1/pos";

// Create POS order
export async function createPosOrder(
  payload: CreateSalesOrderRequest
): Promise<CreateSalesOrderResponse> {
  const { data } = await api.post(`${POS_API_BASE}/orders`, payload);
  const result = (data as any)?.data ?? data;
  return result;
}

// Confirm POS payment and complete order
export async function confirmPosPayment(
  orderId: number,
  payload?: ConfirmPosPaymentRequest
): Promise<ConfirmPosPaymentResponse> {
  const { data } = await api.post(`${POS_API_BASE}/orders/${orderId}/confirm-payment`, payload ?? {});
  const result = (data as any)?.data ?? data;
  return result;
}

// Cancel POS order
export async function cancelPosOrder(
  orderId: number,
  payload: CancelSalesOrderRequest
): Promise<void> {
  await api.post(`${API_BASE}/${orderId}/cancel`, payload);
}

