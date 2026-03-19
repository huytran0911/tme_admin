"use client";

import {
  CreditCardIcon,
  BanknotesIcon,
  DevicePhoneMobileIcon,
  BuildingLibraryIcon,
  UserIcon,
  ShoppingBagIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";
import type { CartItem, CustomerState, PaymentMethod } from "../types";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "../types";

type StepPaymentProps = {
  customer: CustomerState;
  cartItems: CartItem[];
  paymentMethod: PaymentMethod;
  note: string;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
};

// Helper to format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

const PAYMENT_ICONS: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = {
  CASH: BanknotesIcon,
  BANKING: BuildingLibraryIcon,
  MOMO: DevicePhoneMobileIcon,
  CARD: CreditCardIcon,
};

export function StepPayment({
  customer,
  cartItems,
  paymentMethod,
  note,
  onPaymentMethodChange,
  onNoteChange,
  onSubmit,
  onBack,
  isSubmitting,
}: StepPaymentProps) {
  // Calculate totals
  const totalAmount = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Customer info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <UserIcon className="h-5 w-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Khách hàng</h3>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium text-slate-900">{customer.name}</p>
              {customer.phone && (
                <p className="text-slate-600">📱 {customer.phone}</p>
              )}
              {customer.email && (
                <p className="text-slate-600">✉️ {customer.email}</p>
              )}
              {customer.address && (
                <p className="text-slate-600">📍 {customer.address}</p>
              )}
              {customer.isGuest && (
                <span className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  Khách lẻ
                </span>
              )}
            </div>
          </div>

          {/* Payment method */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <CreditCardIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-900">
                Phương thức thanh toán
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((method) => {
                const Icon = PAYMENT_ICONS[method];
                const isSelected = paymentMethod === method;

                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => onPaymentMethodChange(method)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        isSelected ? "text-emerald-600" : "text-slate-400"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? "text-emerald-700" : "text-slate-600"
                      }`}
                    >
                      {PAYMENT_METHOD_LABELS[method]}
                    </span>
                    {isSelected && (
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <ChatBubbleLeftIcon className="h-5 w-5 text-slate-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Ghi chú</h3>
            </div>

            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Nhập ghi chú cho đơn hàng (không bắt buộc)..."
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        {/* Right column - Order summary */}
        <div>
          <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <ShoppingBagIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-900">
                Chi tiết đơn hàng
              </h3>
            </div>

            {/* Items */}
            <div className="mb-4 max-h-60 space-y-3 overflow-auto">
              {cartItems.map((item) => (
                <div
                  key={item.variantId}
                  className="flex justify-between text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-slate-700">{item.productName}</p>
                    <p className="text-xs text-slate-400">
                      {item.attributes
                        .map((a) => a.valueName)
                        .filter(Boolean)
                        .join(" / ") || "Mặc định"}{" "}
                      × {item.quantity}
                    </p>
                  </div>
                  <p className="ml-2 font-medium text-slate-900">
                    {formatCurrency(item.lineTotal)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  Tạm tính ({totalItems} sản phẩm)
                </span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-slate-600">Giảm giá</span>
                <span className="font-medium">0đ</span>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-slate-900">
                  Tổng cộng
                </span>
                <span className="text-xl font-bold text-emerald-600">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    Xác nhận đơn hàng
                    <span className="rounded-lg bg-emerald-600 px-2 py-0.5 text-xs">
                      {formatCurrency(totalAmount)}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
