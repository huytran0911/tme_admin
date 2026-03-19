import api from "@/lib/api";
import type {
  Customer,
  CustomerDetail,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  GetCustomersParams,
  PagedResult,
} from "./types";

const API_BASE = "/admin/v1/customers";

// Get customers list
export async function fetchCustomers(params: GetCustomersParams): Promise<PagedResult<Customer>> {
  const { data } = await api.get(API_BASE, { params });
  const payload = (data as any)?.data ?? data;
  const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  const total =
    typeof payload?.total === "number"
      ? payload.total
      : typeof payload?.totalCount === "number"
        ? payload.totalCount
        : items.length;

  return {
    items,
    total,
    page: payload?.page ?? params.Page ?? 1,
    pageSize: payload?.pageSize ?? params.PageSize ?? items.length,
  };
}

// Get customer by id
export async function fetchCustomerById(id: number): Promise<CustomerDetail> {
  const { data } = await api.get(`${API_BASE}/${id}`);
  const payload = (data as any)?.data ?? data;
  return payload;
}

// Create customer
export async function createCustomer(payload: CreateCustomerRequest): Promise<number> {
  const { data } = await api.post(API_BASE, payload);
  const result = (data as any)?.data ?? data;
  return result?.id ?? result;
}

// Update customer
export async function updateCustomer(id: number, payload: UpdateCustomerRequest): Promise<void> {
  await api.put(`${API_BASE}/${id}`, payload);
}

// Toggle customer status (0 = active, 1 = locked)
export async function toggleCustomerStatus(customer: Customer): Promise<void> {
  const newStatus = customer.status === "0" ? "1" : "0";
  await api.put(`${API_BASE}/${customer.id}`, {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    status: newStatus,
    lang: "vi",
  });
}

// Delete customer
export async function deleteCustomer(id: number): Promise<void> {
  await api.delete(`${API_BASE}/${id}`);
}
