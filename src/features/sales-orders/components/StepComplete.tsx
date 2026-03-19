"use client";

import Link from "next/link";
import {
  CheckCircleIcon,
  PrinterIcon,
  DocumentTextIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import type { CreateSalesOrderResponse, CustomerState, PaymentMethod } from "../types";
import { PAYMENT_METHOD_LABELS } from "../types";

type StepCompleteProps = {
  order: CreateSalesOrderResponse;
  customer: CustomerState;
  paymentMethod: PaymentMethod;
  onCreateNew: () => void;
};

// Helper to format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

// Helper to format date
function formatDateTime(date: Date): string {
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function StepComplete({
  order,
  customer,
  paymentMethod,
  onCreateNew,
}: StepCompleteProps) {
  const handlePrint = () => {
    // TODO: Implement print functionality
    window.print();
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        {/* Success icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircleIcon className="h-12 w-12 text-emerald-500" />
        </div>

        {/* Success message */}
        <h2 className="mb-2 text-2xl font-bold text-slate-900">
          Đặt hàng thành công!
        </h2>
        <p className="mb-6 text-slate-500">
          Đơn hàng đã được tạo và lưu vào hệ thống
        </p>

        {/* Order info card */}
        <div className="mb-6 rounded-xl bg-slate-50 p-6 text-left">
          <div className="mb-4 text-center">
            <p className="text-sm text-slate-500">Mã đơn hàng</p>
            <p className="text-2xl font-bold text-emerald-600">
              #{order.orderCode}
            </p>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Khách hàng</span>
              <span className="font-medium text-slate-900">{customer.name}</span>
            </div>
            {customer.phone && (
              <div className="flex justify-between">
                <span className="text-slate-500">Số điện thoại</span>
                <span className="font-medium text-slate-900">{customer.phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Tổng tiền</span>
              <span className="font-bold text-emerald-600">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thanh toán</span>
              <span className="font-medium text-slate-900">
                {PAYMENT_METHOD_LABELS[paymentMethod]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thời gian</span>
              <span className="font-medium text-slate-900">
                {formatDateTime(new Date())}
              </span>
            </div>
          </div>

          {/* Items summary */}
          {order.items.length > 0 && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="mb-2 text-xs font-medium uppercase text-slate-500">
                Chi tiết sản phẩm
              </p>
              <div className="space-y-2 text-sm">
                {order.items.map((item) => (
                  <div key={item.variantId} className="flex justify-between">
                    <span className="text-slate-600">
                      {item.sku || `Variant #${item.variantId}`} × {item.quantity}
                    </span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <PrinterIcon className="h-4 w-4" />
              In hóa đơn
            </button>
            <Link
              href={`/sales-orders/${order.id}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <DocumentTextIcon className="h-4 w-4" />
              Xem chi tiết
            </Link>
          </div>

          <button
            type="button"
            onClick={onCreateNew}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            <PlusCircleIcon className="h-5 w-5" />
            Tạo đơn hàng mới
          </button>
        </div>
      </div>
    </div>
  );
}
