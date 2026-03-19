import api from "@/lib/api";
import type {
  CreateSalesOrderRequest,
  CreateSalesOrderResponse,
  SalesOrderDetail,
  SalesOrderListItem,
  GetSalesOrdersParams,
  UpdateSalesOrderStatusRequest,
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

// Update sales order status
export async function updateSalesOrderStatus(
  orderId: number,
  payload: UpdateSalesOrderStatusRequest
): Promise<void> {
  await api.put(`${API_BASE}/${orderId}/status`, payload);
}
