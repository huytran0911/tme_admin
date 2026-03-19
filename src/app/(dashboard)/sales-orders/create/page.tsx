"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";
import {
  CustomerInfoSection,
  ProductTableSection,
  OrderSummarySection,
} from "@/features/sales-orders/components";
import {
  createPosOrder,
  confirmPosPayment,
  previewOrder,
  type CustomerState,
  type CartItem,
  type OrderPreviewResponse,
  type PaymentMethod,
  type CreateSalesOrderResponse,
  PAYMENT_METHODS,
  SALES_CHANNELS,
} from "@/features/sales-orders";
import {
  CheckCircleIcon,
  PrinterIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

const INITIAL_CUSTOMER: CustomerState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  isNew: false,
  isGuest: false,
};

export default function CreateSalesOrderPage() {
  const { notify } = useToast();

  // Form state
  const [customer, setCustomer] = useState<CustomerState>(INITIAL_CUSTOMER);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHODS.CASH);
  const [note, setNote] = useState("");
  const [shippingFee, setShippingFee] = useState(0);

  // Preview state
  const [previewData, setPreviewData] = useState<OrderPreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<CreateSalesOrderResponse | null>(null); // Order created, awaiting payment
  const [completedOrder, setCompletedOrder] = useState<CreateSalesOrderResponse | null>(null);

  // Validation
  const canSubmit =
    cartItems.length > 0 &&
    (customer.isGuest || (customer.phone && customer.name)) &&
    !isPreviewLoading;

  // React to cart items changing - fetch preview logic
  const fetchPreview = useDebounce(async (items: CartItem[]) => {
    if (items.length === 0) {
      setPreviewData(null);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const response = await previewOrder({
        items: items.map((item: CartItem) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      });
      setPreviewData(response);

      // Update cart items with true discounts and line totals
      setCartItems((prevItems) => {
        let hasChanges = false;
        const newItems = prevItems.map((prevItem) => {
          const previewItem = response.items.find(
            (p) => p.variantId === prevItem.variantId
          );
          if (!previewItem) return prevItem;

          if (
            prevItem.unitPrice !== previewItem.unitPrice ||
            prevItem.lineTotal !== previewItem.lineTotal ||
            prevItem.saleOffDiscount !== previewItem.saleOffDiscount
          ) {
            hasChanges = true;
            return {
              ...prevItem,
              unitPrice: previewItem.unitPrice,
              lineTotal: previewItem.lineTotal,
              saleOffDiscount: previewItem.saleOffDiscount,
            };
          }
          return prevItem;
        });

        return hasChanges ? newItems : prevItems;
      });
    } catch (error) {
      console.error("Failed to preview order", error);
      notify({
        message: "Lỗi tính toán đơn hàng. Vui lòng thử lại.",
        variant: "error",
      });
    } finally {
      setIsPreviewLoading(false);
    }
  }, 500);

  useEffect(() => {
    fetchPreview(cartItems);
  }, [cartItems, fetchPreview]);

  // Submit order (Step 1: Create POS order)
  const handleSubmit = async () => {
    if (!canSubmit) {
      notify({ message: "Vui lòng điền đầy đủ thông tin", variant: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createPosOrder({
        customer: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email || null,
          address: customer.address || null,
        },
        items: cartItems.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        paymentMethod: paymentMethod,
        channel: SALES_CHANNELS.POS,
        note: note || null,
        shippingFee: shippingFee > 0 ? shippingFee : undefined,
      });

      setPendingOrder(response);
      notify({ message: "Đơn hàng đã tạo. Vui lòng xác nhận thanh toán.", variant: "success" });
    } catch (error: any) {
      console.error("Create order error:", error);
      const message = error?.response?.data?.error || "Không thể tạo đơn hàng. Vui lòng thử lại.";
      notify({ message, variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm payment (Step 2: Complete POS order)
  const handleConfirmPayment = async () => {
    if (!pendingOrder) return;

    setIsSubmitting(true);
    try {
      await confirmPosPayment(pendingOrder.id, { paymentMethod: paymentMethod as "CASH" | "TRANSFER" });
      setCompletedOrder(pendingOrder);
      setPendingOrder(null);
      notify({ message: "Thanh toán thành công!", variant: "success" });
    } catch (error: any) {
      console.error("Confirm payment error:", error);
      const message = error?.response?.data?.error || "Không thể xác nhận thanh toán. Vui lòng thử lại.";
      notify({ message, variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form for new order
  const handleCreateNew = () => {
    setCustomer(INITIAL_CUSTOMER);
    setCartItems([]);
    setPaymentMethod(PAYMENT_METHODS.CASH);
    setNote("");
    setShippingFee(0);
    setPendingOrder(null);
    setCompletedOrder(null);
  };

  // Cancel pending order and go back to form
  const handleCancelPending = () => {
    setPendingOrder(null);
  };

  // Calculate totals (Fallback to frontend calculation if preview is loading or fails)
  const subtotal = previewData ? previewData.subTotal : cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalSaleOffDiscount = previewData ? previewData.totalSaleOffDiscount : 0;
  const promotionDiscount = previewData ? previewData.promotionDiscount : 0;
  const grandTotal = previewData ? previewData.totalAmount + shippingFee : subtotal + shippingFee;

  // Pending payment state - Step 2: Confirm payment
  if (pendingOrder) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">
              Bán hàng
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">Xác nhận thanh toán</h1>
          </div>
          <Breadcrumbs
            items={[
              { label: "Bảng điều khiển", href: "/" },
              { label: "Đơn hàng", href: "/sales-orders" },
              { label: "Xác nhận thanh toán" },
            ]}
          />
        </div>

        {/* Payment confirmation card */}
        <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-amber-800">
              Chờ xác nhận thanh toán
            </h2>
            <p className="text-amber-700">
              Mã đơn hàng: <span className="font-bold">{pendingOrder.orderCode}</span>
            </p>
          </div>

          {/* Order summary */}
          <div className="mb-6 space-y-3 rounded-xl bg-white p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Khách hàng:</span>
              <span className="font-medium text-slate-900">{customer.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Số điện thoại:</span>
              <span className="font-medium text-slate-900">{customer.phone}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Số sản phẩm:</span>
              <span className="font-medium text-slate-900">{pendingOrder.items.length}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tạm tính:</span>
                <span className="text-slate-900">{new Intl.NumberFormat("vi-VN").format(pendingOrder.subtotal)}đ</span>
              </div>
              {pendingOrder.saleOffDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Giảm giá:</span>
                  <span className="text-red-600">-{new Intl.NumberFormat("vi-VN").format(pendingOrder.saleOffDiscount)}đ</span>
                </div>
              )}
              {pendingOrder.promotionDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Khuyến mãi:</span>
                  <span className="text-red-600">-{new Intl.NumberFormat("vi-VN").format(pendingOrder.promotionDiscount)}đ</span>
                </div>
              )}
              {pendingOrder.couponDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Mã giảm giá:</span>
                  <span className="text-red-600">-{new Intl.NumberFormat("vi-VN").format(pendingOrder.couponDiscount)}đ</span>
                </div>
              )}
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-slate-900">Tổng cộng:</span>
                <span className="text-lg font-bold text-amber-600">{new Intl.NumberFormat("vi-VN").format(pendingOrder.finalAmount)}đ</span>
              </div>
            </div>
          </div>

          {/* Payment method selection */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-slate-700">Phương thức thanh toán</label>
            <div className="flex gap-3">
              <button
                onClick={() => setPaymentMethod(PAYMENT_METHODS.CASH)}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  paymentMethod === PAYMENT_METHODS.CASH
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                Tiền mặt
              </button>
              <button
                onClick={() => setPaymentMethod(PAYMENT_METHODS.BANKING)}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  paymentMethod === PAYMENT_METHODS.BANKING
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                Chuyển khoản
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCancelPending}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Quay lại
            </button>
            <button
              onClick={handleConfirmPayment}
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang xử lý...
                </span>
              ) : (
                "Xác nhận đã thanh toán"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (completedOrder) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
              Bán hàng
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">Tạo đơn hàng</h1>
          </div>
          <Breadcrumbs
            items={[
              { label: "Bảng điều khiển", href: "/" },
              { label: "Đơn hàng", href: "/sales-orders" },
              { label: "Tạo đơn hàng" },
            ]}
          />
        </div>

        {/* Success card */}
        <div className="mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500">
            <CheckCircleIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-emerald-800">
            Đơn hàng đã được tạo!
          </h2>
          <p className="mb-1 text-emerald-700">
            Mã đơn hàng: <span className="font-bold">{completedOrder.orderCode}</span>
          </p>
          <p className="mb-6 text-sm text-emerald-600">
            Tổng tiền: {new Intl.NumberFormat("vi-VN").format(completedOrder.totalAmount)}đ
          </p>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <PrinterIcon className="h-4 w-4" />
              In hóa đơn
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600"
            >
              <PlusIcon className="h-4 w-4" />
              Tạo đơn mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Bán hàng
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Tạo đơn hàng</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Đơn hàng", href: "/sales-orders" },
            { label: "Tạo đơn hàng" },
          ]}
        />
      </div>

      {/* Form */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Customer info */}
        <div className="lg:col-span-1">
          <CustomerInfoSection customer={customer} onCustomerChange={setCustomer} />
        </div>

        {/* Right column - Products & Summary */}
        <div className="space-y-6 lg:col-span-2">
          {/* Products table */}
          <ProductTableSection cartItems={cartItems} onCartChange={setCartItems} />

          {/* Summary */}
          <OrderSummarySection
            cartItems={cartItems}
            note={note}
            onNoteChange={setNote}
            shippingFee={shippingFee}
            onShippingFeeChange={setShippingFee}
            subtotal={subtotal}
            saleOffDiscount={totalSaleOffDiscount}
            promotionDiscount={promotionDiscount}
            grandTotal={grandTotal}
            gifts={previewData?.gifts ?? []}
            giftValue={previewData?.giftValue ?? 0}
          />

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Đang xử lý...
              </span>
            ) : (
              `Hoàn tất đơn hàng • ${new Intl.NumberFormat("vi-VN").format(grandTotal)}đ`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
