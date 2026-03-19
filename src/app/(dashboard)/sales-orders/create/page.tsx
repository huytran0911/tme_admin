"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";
import {
  CustomerInfoSection,
  ProductTableSection,
  OrderSummarySection,
} from "@/features/sales-orders/components";
import {
  createSalesOrder,
  type CustomerState,
  type CartItem,
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

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CreateSalesOrderResponse | null>(null);

  // Validation
  const canSubmit =
    cartItems.length > 0 &&
    (customer.isGuest || (customer.phone && customer.name));

  // Submit order
  const handleSubmit = async () => {
    if (!canSubmit) {
      notify({ message: "Vui lòng điền đầy đủ thông tin", variant: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createSalesOrder({
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
      });

      setCompletedOrder(response);
      notify({ message: "Tạo đơn hàng thành công!", variant: "success" });
    } catch (error: any) {
      console.error("Create order error:", error);
      const message = error?.response?.data?.error || "Không thể tạo đơn hàng. Vui lòng thử lại.";
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
    setCompletedOrder(null);
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);

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
              `Hoàn tất đơn hàng • ${new Intl.NumberFormat("vi-VN").format(subtotal)}đ`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
