"use client";

import { useState, useEffect, useMemo } from "react";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import type { ProductVariant, VariantDraft, BulkApplyData } from "../types";
import { formatVariantOptions } from "../utils/variantCombinator";

// Sanitize SKU: only allow A-Z, a-z, 0-9, hyphen, underscore
function sanitizeSku(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9\-_]/g, "");
}

type VariantMatrixTableProps = {
  mode: "generate" | "existing";
  drafts?: VariantDraft[];
  variants?: ProductVariant[];
  onSaveDrafts?: (drafts: VariantDraft[]) => Promise<void>;
  onUpdateVariants?: (updates: Array<{ id: number; sku: string | null; stock: number; status: boolean }>) => Promise<void>;
  onOpenTierPricing?: (variant: ProductVariant | VariantDraft) => void;
  onDeleteVariant?: (variantId: number) => Promise<void>;
  disabled?: boolean;
};

export function VariantMatrixTable({
  mode,
  drafts = [],
  variants = [],
  onSaveDrafts,
  onUpdateVariants,
  onOpenTierPricing,
  onDeleteVariant,
  disabled = false,
}: VariantMatrixTableProps) {
  const [localDrafts, setLocalDrafts] = useState<VariantDraft[]>(drafts);
  const [localVariants, setLocalVariants] = useState<ProductVariant[]>(variants);
  const [saving, setSaving] = useState(false);
  const [showBulkBar, setShowBulkBar] = useState(false);
  const [bulkData, setBulkData] = useState<BulkApplyData>({});
  const [modifiedVariantIds, setModifiedVariantIds] = useState<Set<number>>(new Set());

  const items = mode === "generate" ? localDrafts : localVariants;

  // Check if there are changes (for existing variants)
  const hasChanges = useMemo(() => {
    if (mode !== "existing") return false;
    return modifiedVariantIds.size > 0;
  }, [mode, modifiedVariantIds]);

  // Sync localDrafts when drafts prop changes
  useEffect(() => {
    if (mode === "generate") {
      setLocalDrafts(drafts);
    }
  }, [drafts, mode]);

  // Sync localVariants when variants prop changes
  useEffect(() => {
    if (mode === "existing") {
      setLocalVariants(variants);
      setModifiedVariantIds(new Set()); // Reset modified tracking
    }
  }, [variants, mode]);

  const handleDraftChange = (index: number, field: keyof VariantDraft, value: any) => {
    const updated = [...localDrafts];
    (updated[index] as any)[field] = value;
    setLocalDrafts(updated);
  };

  // Only update local state, track modified variants
  const handleVariantChange = (variantId: number, field: string, value: any) => {
    setLocalVariants(prev =>
      prev.map(v => (v.id === variantId ? { ...v, [field]: value } : v))
    );
    setModifiedVariantIds(prev => new Set(prev).add(variantId));
  };

  // Save all modified variants
  const handleUpdateVariants = async () => {
    if (!onUpdateVariants || modifiedVariantIds.size === 0) return;

    setSaving(true);
    try {
      // Get all modified variants with full data
      const updates = localVariants
        .filter(v => modifiedVariantIds.has(v.id))
        .map(v => ({
          id: v.id,
          sku: v.sku,
          stock: v.stock,
          status: v.status,
        }));

      await onUpdateVariants(updates);
      setModifiedVariantIds(new Set()); // Reset after successful save
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (!onSaveDrafts || localDrafts.length === 0) return;

    setSaving(true);
    try {
      await onSaveDrafts(localDrafts);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkApply = () => {
    if (mode === "generate") {
      const updated = localDrafts.map((draft) => {
        const newDraft = { ...draft };

        if (bulkData.stock !== undefined) {
          newDraft.stock = bulkData.stock;
        }

        if (bulkData.base_price !== undefined) {
          newDraft.base_price = bulkData.base_price;
        }

        return newDraft;
      });

      setLocalDrafts(updated);
    } else if (mode === "existing") {
      // Apply bulk changes to existing variants
      const updated = localVariants.map((variant) => {
        const newVariant = { ...variant };

        if (bulkData.stock !== undefined) {
          newVariant.stock = bulkData.stock;
        }

        return newVariant;
      });

      setLocalVariants(updated);
      // Mark all as modified
      setModifiedVariantIds(new Set(localVariants.map(v => v.id)));
    }

    setBulkData({});
    setShowBulkBar(false);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
        <svg
          className="w-16 h-16 mx-auto mb-3 text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm font-medium">Chưa có phân loại hàng nào</p>
        <p className="text-xs text-slate-400 mt-1">
          {mode === "generate"
            ? "Chọn phân loại ở trên và nhấn 'Tạo danh sách'"
            : "Thêm phân loại để bắt đầu"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800">
            Danh sách phân loại hàng
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {items.length} phân loại
            {mode === "generate" && " (chưa lưu)"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkBar(!showBulkBar)}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-green-700 border border-slate-200 rounded-md hover:border-green-300 transition"
          >
            ⚡ Áp dụng hàng loạt
          </button>

          {mode === "generate" && (
            <button
              onClick={handleSaveAll}
              disabled={saving || disabled}
              className="px-4 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md font-medium shadow-sm hover:from-green-700 hover:to-green-800 disabled:opacity-50 transition text-sm"
            >
              {saving ? "Đang lưu..." : "💾 Lưu tất cả"}
            </button>
          )}

          {mode === "existing" && (
            <button
              onClick={handleUpdateVariants}
              disabled={saving || disabled || !hasChanges}
              className={`px-4 py-1.5 rounded-md font-medium shadow-sm transition text-sm ${
                hasChanges
                  ? "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              } disabled:opacity-50`}
            >
              {saving ? "Đang lưu..." : `💾 Cập nhật${hasChanges ? ` (${modifiedVariantIds.size})` : ""}`}
            </button>
          )}
        </div>
      </div>

      {/* Bulk Apply Bar */}
      {showBulkBar && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">
            Áp dụng hàng loạt cho tất cả phân loại
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Tồn kho
              </label>
              <input
                type="number"
                value={bulkData.stock ?? ""}
                onChange={(e) =>
                  setBulkData({
                    ...bulkData,
                    stock: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="VD: 100"
                min="0"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Giá lẻ
              </label>
              <CurrencyInput
                value={bulkData.base_price}
                onChange={(val) =>
                  setBulkData({ ...bulkData, base_price: val })
                }
                placeholder="VD: 100,000"
                min={0}
                step={1000}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setBulkData({});
                setShowBulkBar(false);
              }}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition"
            >
              Hủy
            </button>
            <button
              onClick={handleBulkApply}
              className="px-4 py-1.5 bg-green-600 text-white rounded-md font-medium text-sm hover:bg-green-700 transition"
            >
              ✓ Áp dụng
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Phân loại
              </th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[120px]">
                SKU
              </th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[80px]">
                Tồn kho
              </th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[85px]">
                Trạng thái
              </th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[160px]">
                Giá lẻ (₫)
              </th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[80px]">
                Giá sỉ
              </th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-[60px]">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mode === "generate"
              ? localDrafts.map((draft, index) => (
                  <tr key={draft.temp_id} className="hover:bg-slate-50 transition">
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {draft.options.map((opt, optIdx) => (
                          <span
                            key={optIdx}
                            className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium"
                          >
                            {opt.type_name}: {opt.value}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={draft.sku || ""}
                        onChange={(e) =>
                          handleDraftChange(index, "sku", sanitizeSku(e.target.value))
                        }
                        disabled={disabled}
                        placeholder="VD: SKU-001"
                        className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:border-green-500 focus:ring-1 focus:ring-green-100 uppercase"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={draft.stock}
                        onChange={(e) =>
                          handleDraftChange(index, "stock", parseInt(e.target.value) || 0)
                        }
                        disabled={disabled}
                        min="0"
                        className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:border-green-500 focus:ring-1 focus:ring-green-100"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() =>
                          handleDraftChange(index, "status", !draft.status)
                        }
                        disabled={disabled}
                        className={`w-full px-2 py-1 rounded text-xs font-medium transition ${
                          draft.status
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {draft.status ? "Hoạt động" : "Tắt"}
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <CurrencyInput
                        value={draft.base_price}
                        onChange={(val) =>
                          handleDraftChange(index, "base_price", val)
                        }
                        disabled={disabled}
                        placeholder="Chưa set"
                        min={0}
                        step={1000}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => onOpenTierPricing?.(draft)}
                        disabled={disabled}
                        className="w-full px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-medium hover:bg-green-100 transition"
                      >
                        Set giá
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => {
                          const updated = localDrafts.filter((_, i) => i !== index);
                          setLocalDrafts(updated);
                        }}
                        disabled={disabled}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Xóa"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              : localVariants.map((variant) => (
                  <tr key={variant.id} className="hover:bg-slate-50 transition">
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {variant.options.map((opt, optIdx) => (
                          <span
                            key={optIdx}
                            className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium"
                          >
                            {opt.type_name}: {opt.value}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={variant.sku || ""}
                        onChange={(e) =>
                          handleVariantChange(variant.id, "sku", sanitizeSku(e.target.value))
                        }
                        disabled={disabled}
                        placeholder="VD: SKU-001"
                        className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:border-green-500 focus:ring-1 focus:ring-green-100 uppercase"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={variant.stock}
                        onChange={(e) =>
                          handleVariantChange(
                            variant.id,
                            "stock",
                            parseInt(e.target.value) || 0
                          )
                        }
                        disabled={disabled}
                        min="0"
                        className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:border-green-500 focus:ring-1 focus:ring-green-100"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() =>
                          handleVariantChange(variant.id, "status", !variant.status)
                        }
                        disabled={disabled}
                        className={`w-full px-2 py-1 rounded text-xs font-medium transition ${
                          variant.status
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {variant.status ? "Hoạt động" : "Tắt"}
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-right">
                        {variant.price_tier_summary?.base_price ? (
                          <span className="text-sm font-semibold text-emerald-700">
                            {variant.price_tier_summary.base_price.toLocaleString("vi-VN")}
                            <span className="text-xs text-emerald-600 ml-0.5">₫</span>
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Chưa set</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => onOpenTierPricing?.(variant)}
                        disabled={disabled}
                        className="w-full px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-medium hover:bg-green-100 transition"
                      >
                        Set giá
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => onDeleteVariant?.(variant.id)}
                        disabled={disabled}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Xóa"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
    </div>
  );
}
