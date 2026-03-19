"use client";

import type { CartItem, CartGiftResponse } from "../types";
import { getMediaUrl } from "@/lib/media";

type OrderSummarySectionProps = {
  cartItems: CartItem[];
  note: string;
  onNoteChange: (note: string) => void;
  shippingFee?: number;
  onShippingFeeChange?: (fee: number) => void;
  subtotal: number;
  saleOffDiscount: number;
  promotionDiscount: number;
  grandTotal: number;
  gifts?: CartGiftResponse[];
  giftValue?: number;
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
  subtotal,
  saleOffDiscount,
  promotionDiscount,
  grandTotal,
  gifts = [],
  giftValue = 0,
}: OrderSummarySectionProps) {

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

      {/* Gifts section */}
      {gifts.length > 0 && (
        <div className="border-b border-slate-200 p-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-pink-600">
            🎁 Quà tặng kèm
            <span className="rounded-full bg-pink-100 px-1.5 py-0.5 text-xs font-semibold text-pink-700">
              {gifts.length}
            </span>
          </h4>
          <div className="space-y-2">
            {gifts.map((gift, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded bg-pink-50 px-3 py-2 text-xs"
              >
                {gift.giftProductImage && (
                  <img
                    src={getMediaUrl(gift.giftProductImage)}
                    alt={gift.giftProductName}
                    className="h-8 w-8 rounded border border-pink-200 object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-slate-700">
                    {gift.giftProductName}
                  </p>
                  <p className="text-slate-500">
                    x{gift.giftQuantity} · Miễn phí
                    {gift.giftPrice ? ` (trị giá ${formatCurrency(gift.giftPrice)}đ)` : ""}
                  </p>
                  <p className="text-slate-400">
                    Khi mua: {gift.forProductName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <td className="py-1.5 text-slate-600">Giảm giá sản phẩm (Sale Off):</td>
              <td className="py-1.5 text-right text-rose-600">
                {saleOffDiscount > 0 ? `-${formatCurrency(saleOffDiscount)}` : "0"}
              </td>
            </tr>
            {giftValue > 0 && (
              <tr>
                <td className="py-1.5 text-slate-600">Quà tặng:</td>
                <td className="py-1.5 text-right text-pink-600">
                  -{formatCurrency(giftValue)}
                </td>
              </tr>
            )}
            <tr>
              <td className="py-1.5 text-slate-600">Khuyến mãi (Promotion):</td>
              <td className="py-1.5 text-right text-rose-600">
                {promotionDiscount > 0 ? `-${formatCurrency(promotionDiscount)}` : "0"}
              </td>
            </tr>
            <tr className="border-t border-slate-200">
              <td className="py-2 text-base font-semibold text-slate-800">
                Tổng thanh toán:
              </td>
              <td className="py-2 text-right text-lg font-bold text-emerald-600">
                {formatCurrency(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
