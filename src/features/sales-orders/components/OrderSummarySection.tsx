"use client";

import type { CartItem } from "../types";

type OrderSummarySectionProps = {
  cartItems: CartItem[];
  note: string;
  onNoteChange: (note: string) => void;
  shippingFee?: number;
  onShippingFeeChange?: (fee: number) => void;
  discount?: number;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function OrderSummarySection({
  cartItems,
  note,
  onNoteChange,
  shippingFee = 0,
  onShippingFeeChange,
  discount = 0,
}: OrderSummarySectionProps) {
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = subtotal + shippingFee - discount;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Note section */}
      <div className="border-b border-slate-200 p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Ghi chú đơn hàng:
        </label>
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Nhập ghi chú cho đơn hàng..."
          rows={2}
          className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        />
      </div>

      {/* Summary */}
      <div className="p-4">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1.5 text-slate-600">Cộng tiền hàng:</td>
              <td className="py-1.5 text-right font-medium text-slate-800">
                {formatCurrency(subtotal)}
              </td>
            </tr>
            <tr>
              <td className="py-1.5 text-slate-600">Phí vận chuyển:</td>
              <td className="py-1.5 text-right text-slate-800">
                {onShippingFeeChange ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={shippingFee === 0 ? "" : formatCurrency(shippingFee)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      onShippingFeeChange(raw ? parseInt(raw) : 0);
                    }}
                    placeholder="0"
                    className="w-28 rounded border border-slate-300 px-2 py-1 text-right text-sm focus:border-emerald-400 focus:outline-none"
                  />
                ) : (
                  formatCurrency(shippingFee)
                )}
              </td>
            </tr>
            <tr>
              <td className="py-1.5 text-slate-600">Khuyến mãi:</td>
              <td className="py-1.5 text-right text-rose-600">
                {discount > 0 ? `-${formatCurrency(discount)}` : "0"}
              </td>
            </tr>
            <tr className="border-t border-slate-200">
              <td className="py-2 text-base font-semibold text-slate-800">
                Tổng thanh toán:
              </td>
              <td className="py-2 text-right text-lg font-bold text-emerald-600">
                {formatCurrency(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
