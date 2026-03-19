// ============================================================================
// Sales Orders Types - POS (Point of Sale)
// ============================================================================

// Customer info for creating order
export type CustomerInfo = {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
};

// Order item request
export type OrderItemRequest = {
  variantId: number;
  quantity: number;
  bundleItems?: BundleItemRequest[] | null;
};

export type BundleItemRequest = {
  variantId: number;
  quantity: number;
};

// Create sales order request
export type CreateSalesOrderRequest = {
  customer: CustomerInfo;
  items: OrderItemRequest[];
  paymentMethod?: string | null;
  channel?: string | null;
  note?: string | null;
};

// Create sales order response
export type CreateSalesOrderResponse = {
  id: number;
  orderCode: string;
  totalAmount: number;
  items: CreatedOrderItemResponse[];
};

export type CreatedOrderItemResponse = {
  variantId: number;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

// Sales order detail response
export type SalesOrderDetail = {
  id: number;
  orderCode: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  totalAmount: number | null;
  status: string | null;
  note: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  items: SalesOrderItem[];
};

export type SalesOrderItem = {
  id: number;
  variantId: number;
  productName: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  itemType: string | null;
  parentItemId: number | null;
  bundleDiscount: number;
};

// Sales order list item
export type SalesOrderListItem = {
  id: number;
  orderCode: string;
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;
  status: string;
  createdAt: string;
};

// Query params for listing sales orders
export type GetSalesOrdersParams = {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  phone?: string;
  orderCode?: string;
  page: number;
  pageSize: number;
};

// Update status request
export type UpdateSalesOrderStatusRequest = {
  status: string;
};

// Paged result
export type PagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

// Order status enum
export const ORDER_STATUS = {
  NEW: "NEW",
  CONFIRMED: "CONFIRMED",
  SHIPPED: "SHIPPED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// Payment methods
export const PAYMENT_METHODS = {
  CASH: "CASH",
  BANKING: "BANKING",
  MOMO: "MOMO",
  CARD: "CARD",
} as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANKING: "Chuyển khoản",
  MOMO: "Momo",
  CARD: "Thẻ",
};

// Sales channel
export const SALES_CHANNELS = {
  POS: "POS",
  ONLINE: "ONLINE",
  PHONE: "PHONE",
} as const;

export type SalesChannel = (typeof SALES_CHANNELS)[keyof typeof SALES_CHANNELS];

// ============================================================================
// Local state types for the create order form
// ============================================================================

// Selected product item in cart
export type CartItem = {
  variantId: number;
  productId: number;
  productName: string;
  productImage: string | null;
  sku: string | null;
  attributes: { typeName: string | null; valueName: string | null }[];
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  stock?: number;
  priceTiers?: { minQty: number; price: number }[];
};

// Customer state in form
export type CustomerState = {
  id?: number; // If existing customer
  name: string;
  phone: string;
  email: string;
  address: string;
  isNew: boolean; // true if new customer
  isGuest: boolean; // true if skip customer info
};
