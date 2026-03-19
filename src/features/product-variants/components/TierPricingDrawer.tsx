"use client";

import { useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import type { PriceTier, ProductVariant, VariantDraft } from "../types";
import { formatVariantOptions } from "../utils/variantCombinator";

type TierPricingDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  variant: ProductVariant | VariantDraft | null;
  onSave: (variantId: number | string, tiers: PriceTier[]) => Promise<void>;
  initialTiers?: PriceTier[];
};

export function TierPricingDrawer({
  isOpen,
  onClose,
  variant,
  onSave,
  initialTiers = [],
}: TierPricingDrawerProps) {
  const [tiers, setTiers] = useState<PriceTier[]>(initialTiers);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [previewQty, setPreviewQty] = useState<number>(1);

  useEffect(() => {
    if (isOpen && initialTiers.length > 0) {
      setTiers(initialTiers);
    } else if (isOpen && initialTiers.length === 0) {
      // Default: add base price tier
      setTiers([{ min_qty: 1, price: 0 }]);
    }
  }, [isOpen, initialTiers]);

  const validateTiers = (): boolean => {
    const newErrors: Record<number, string> = {};
    let isValid = true;

    // Must have at least base price (min_qty=1)
    const hasBasePrice = tiers.some((t) => t.min_qty === 1);
    if (!hasBasePrice) {
      newErrors[-1] = "Phải có giá lẻ (Số lượng tối thiểu = 1)";
      isValid = false;
    }

    // Check for duplicates and ordering
    const minQtys = tiers.map((t) => t.min_qty);
    const uniqueQtys = new Set(minQtys);

    if (minQtys.length !== uniqueQtys.size) {
      newErrors[-2] = "Không được có số lượng tối thiểu trùng lặp";
      isValid = false;
    }

    // Check ascending order
    const sorted = [...minQtys].sort((a, b) => a - b);
    if (JSON.stringify(minQtys) !== JSON.stringify(sorted)) {
      newErrors[-3] = "Số lượng tối thiểu phải tăng dần";
      isValid = false;
    }

    // Validate each tier
    tiers.forEach((tier, index) => {
      if (tier.min_qty < 1) {
        newErrors[index] = "Số lượng tối thiểu phải >= 1";
        isValid = false;
      }
      if (tier.price < 0) {
        newErrors[index] = "Giá phải >= 0";
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newMinQty = lastTier ? lastTier.min_qty + 10 : 1;

    setTiers([...tiers, { min_qty: newMinQty, price: 0 }]);
  };

  const handleRemoveTier = (index: number) => {
    if (tiers.length === 1) return; // Keep at least one tier
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleTierChange = (
    index: number,
    field: keyof PriceTier,
    value: number
  ) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
    // Clear error for this field
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const handleSave = async () => {
    if (!variant) return;
    if (!validateTiers()) return;

    setSaving(true);
    try {
      const variantId =
        "id" in variant ? variant.id : (variant as VariantDraft).temp_id;
      await onSave(variantId, tiers);
      onClose();
    } catch (error) {
      console.error("Failed to save tiers:", error);
    } finally {
      setSaving(false);
    }
  };

  const getAppliedPrice = (qty: number): number => {
    if (tiers.length === 0) return 0;

    // Sort tiers by min_qty descending
    const sorted = [...tiers].sort((a, b) => b.min_qty - a.min_qty);

    // Find first tier where qty >= min_qty
    const applicableTier = sorted.find((t) => qty >= t.min_qty);

    return applicableTier?.price || 0;
  };

  const appliedPrice = getAppliedPrice(previewQty);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-lg font-semibold text-white">
                      🏷️ Thiết lập giá sỉ theo số lượng
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="text-white/80 hover:text-white transition"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  {variant && (
                    <p className="text-sm text-white/90 mt-2">
                      {"id" in variant
                        ? `Phân loại: ${formatVariantOptions(variant.options)}`
                        : `Bản nháp: ${formatVariantOptions(
                            (variant as VariantDraft).options
                          )}`}
                    </p>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Global Errors */}
                  {Object.entries(errors)
                    .filter(([key]) => parseInt(key) < 0)
                    .map(([key, message]) => (
                      <div
                        key={key}
                        className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
                      >
                        <svg
                          className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm text-red-800">{message}</span>
                      </div>
                    ))}

                  {/* Tier Table */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-700">
                        Bảng giá theo số lượng
                      </h3>
                      <button
                        onClick={handleAddTier}
                        className="px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 border border-green-200 rounded-md hover:border-green-300 hover:bg-green-50 transition"
                      >
                        + Thêm bậc giá
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                              Số lượng tối thiểu
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                              Giá (₫)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-[80px]">
                              Xóa
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tiers.map((tier, index) => (
                            <tr
                              key={index}
                              className={`hover:bg-slate-50 transition ${
                                errors[index] ? "bg-red-50" : ""
                              }`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={tier.min_qty}
                                  onChange={(e) =>
                                    handleTierChange(
                                      index,
                                      "min_qty",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  min="1"
                                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-100 ${
                                    errors[index]
                                      ? "border-red-300 focus:border-red-400"
                                      : "border-slate-200 focus:border-green-500"
                                  }`}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <CurrencyInput
                                  value={tier.price}
                                  onChange={(val) =>
                                    handleTierChange(index, "price", val || 0)
                                  }
                                  placeholder="0"
                                  min={0}
                                  step={1000}
                                  className={errors[index] ? "[&_input]:border-red-300 [&_input]:focus:border-red-400" : ""}
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleRemoveTier(index)}
                                  disabled={tiers.length === 1}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {errors[0] && (
                      <p className="text-xs text-red-600 mt-1">{errors[0]}</p>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">
                      🔍 Xem trước giá áp dụng
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Nhập số lượng để test
                        </label>
                        <input
                          type="number"
                          value={previewQty}
                          onChange={(e) =>
                            setPreviewQty(parseInt(e.target.value) || 1)
                          }
                          min="1"
                          className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-blue-400 focus:ring-2 focus:ring-green-100"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Giá áp dụng
                        </label>
                        <div className="px-3 py-2 bg-white border border-green-200 rounded-md text-right">
                          <span className="font-bold text-lg text-green-700">
                            {appliedPrice.toLocaleString("vi-VN")}
                          </span>
                          <span className="text-sm text-green-600 ml-1">₫</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Giá được áp dụng dựa trên bậc thang có số lượng tối thiểu gần
                      nhất và ≤ số lượng đã nhập
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-200">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-md transition"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md font-medium shadow-sm hover:from-green-700 hover:to-green-800 disabled:opacity-50 transition text-sm"
                  >
                    {saving ? "Đang lưu..." : "💾 Lưu"}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
