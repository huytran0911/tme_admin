// ============================================================================
// Sales Orders Types - POS (Point of Sale)
// ============================================================================

// Customer info for creating order
export type CustomerInfo = {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  // Address breakdown for shipping calculation
  provinceId?: number | null;
  districtId?: number | null;
  wardId?: number | null;
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
  // Shipping
  shippingMethod?: string | null;
  shippingFee?: number;
  // Coupon
  couponCode?: string | null;
  // User (for logged-in customers)
  userId?: number | null;
};

// Create sales order response
export type CreateSalesOrderResponse = {
  id: number;
  orderCode: string;
  // Price breakdown
  subtotal: number;
  saleOffDiscount: number;
  promotionDiscount: number;
  couponDiscount: number;
  shippingFee: number;
  finalAmount: number;
  totalAmount: number; // Legacy (= finalAmount)
  // Status
  channel: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  vnpayUrl?: string | null;
  // Promotion
  appliedPromotion?: CartPromotionApplied | null;
  couponCode?: string | null;
  items: CreatedOrderItemResponse[];
};

export type CreatedOrderItemResponse = {
  variantId: number;
  productName?: string | null;
  variantName?: string | null;
  sku: string | null;
  quantity: number;
  originalPrice: number;
  unitPrice: number;
  lineTotal: number;
  appliedTierMinQty: number;
  saleOffDiscount: number;
  bundleDiscount: number;
  itemType: string;
  bundleItems?: CreatedOrderItemResponse[] | null;
};

// Sales order detail response
export type SalesOrderDetail = {
  id: number;
  orderCode: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  // Price breakdown
  subtotal: number;
  promotionDiscount: number;
  couponDiscount: number;
  shippingFee: number;
  finalAmount: number;
  paidAmount: number;
  totalAmount: number | null; // Legacy
  // Promotion & Coupon
  appliedPromotionId: number | null;
  couponCode: string | null;
  // Status
  status: string | null;
  paymentStatus: string;
  paymentMethod: string;
  channel: string;
  note: string | null;
  cancelReason: string | null;
  // User
  userId: number | null;
  // Address breakdown
  provinceId: number | null;
  districtId: number | null;
  wardId: number | null;
  // Shipping & Delivery
  shippingMethod: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  // Audit
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
  variantName: string | null;
  sku: string | null;
  quantity: number;
  originalPrice: number;
  unitPrice: number;
  lineTotal: number;
  itemType: string | null;
  parentItemId: number | null;
  bundleDiscount: number;
  saleOffDiscount: number;
  note: string | null;
  options?: VariantOptionInfo[];
  bundleItems?: SalesOrderItem[] | null;
};

export type VariantOptionInfo = {
  typeId: number;
  typeName: string;
  valueId: number;
  value: string;
};

// Sales order list item
export type SalesOrderListItem = {
  id: number;
  orderCode: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  // Price
  subtotal: number;
  finalAmount: number;
  totalAmount: number; // Legacy
  // Status
  status: string;
  paymentStatus: string;
  channel: string;
  // Shipping
  carrier: string | null;
  trackingNumber: string | null;
  // Counts
  totalItems: number;
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

// Update sales order request
export type UpdateSalesOrderRequest = {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  provinceId?: number;
  districtId?: number;
  wardId?: number;
  shippingMethod?: string;
  shippingFee?: number;
  trackingNumber?: string;
  carrier?: string;
  expectedDeliveryDate?: string;
  paidAmount?: number;
  paymentStatus?: string;
  note?: string;
};

// Update shipping request
export type UpdateSalesOrderShippingRequest = {
  trackingNumber?: string;
  carrier?: string;
  expectedDeliveryDate?: string;
};

// Cancel order request
export type CancelSalesOrderRequest = {
  reason: string;
};

// POS confirm payment request
export type ConfirmPosPaymentRequest = {
  paymentMethod?: "CASH" | "TRANSFER";
};

// POS confirm payment response
export type ConfirmPosPaymentResponse = {
  id: number;
  orderCode: string;
  status: string;
  paymentStatus: string;
  paidAmount: number;
  finalAmount: number;
  paymentMethod: string;
  message: string;
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
// ONLINE: NEW → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → COMPLETED
// POS: NEW → COMPLETED (via confirm-payment)
export const ORDER_STATUS = {
  NEW: "NEW",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Mới",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang đóng gói",
  SHIPPED: "Đang giao hàng",
  DELIVERED: "Đã nhận hàng",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

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

// Payment status
export const PAYMENT_STATUS = {
  UNPAID: "UNPAID",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PARTIAL: "Thanh toán 1 phần",
  PAID: "Đã thanh toán",
};

// Sales channel
export const SALES_CHANNELS = {
  POS: "POS",
  ONLINE: "ONLINE",
  PHONE: "PHONE",
} as const;

export type SalesChannel = (typeof SALES_CHANNELS)[keyof typeof SALES_CHANNELS];

export const SALES_CHANNEL_LABELS: Record<SalesChannel, string> = {
  POS: "Tại quầy",
  ONLINE: "Online",
  PHONE: "Qua điện thoại",
};

// Shipping methods
export const SHIPPING_METHODS = {
  STANDARD: "STANDARD",
  EXPRESS: "EXPRESS",
  SAME_DAY: "SAME_DAY",
} as const;

// Carriers
export const CARRIERS = {
  GHN: "GHN",
  GHTK: "GHTK",
  VIETTEL_POST: "VIETTEL_POST",
  JT: "J&T",
} as const;

// ============================================================================
// Order Preview Models
// ============================================================================

export type OrderPreviewRequest = {
  items: {
    variantId: number;
    quantity: number;
    bundleItems?: { variantId: number; quantity: number }[] | null;
  }[];
};

export type CartPromotionApplied = {
  id: number;
  name: string;
  nameEn?: string;
  saleOff: number;
  isPercent: boolean;
  freeTransportFee: boolean;
  applyForTotal: number;
  discountValue: number;
};

export type OrderPreviewResponse = {
  items: OrderPreviewItemResponse[];
  subTotal: number;
  totalSaleOffDiscount: number;
  promotionDiscount: number;
  totalDiscount: number;
  totalAmount: number;
  appliedPromotion: CartPromotionApplied | null;
  gifts: CartGiftResponse[];
  giftValue: number;
  warnings: string[];
};

export type CartGiftResponse = {
  forVariantId: number;
  forProductName: string;
  giftVariantId: number;
  giftSku: string | null;
  giftProductName: string;
  giftProductImage: string | null;
  giftQuantity: number;
  giftPrice: number | null;
  giftStock: number;
};

export type OrderPreviewItemResponse = {
  variantId: number;
  productId: number;
  sku: string | null;
  productName: string;
  productImage: string | null;
  quantity: number;
  stock: number;
  unitPrice: number;
  lineTotal: number;
  appliedTierMinQty: number;
  itemType: string;
  bundleDiscount: number;
  saleOffDiscount: number;
  bundleItems: OrderPreviewItemResponse[] | null;
};

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
  saleOffDiscount: number;
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
