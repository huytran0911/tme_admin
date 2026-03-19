"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/shared/Toast";
import { VariantTypeBuilder } from "./VariantTypeBuilder";
import { VariantMatrixTable } from "./VariantMatrixTable";
import { TierPricingDrawer } from "./TierPricingDrawer";
import { QuickAddProductTypeModal } from "./QuickAddProductTypeModal";
import type {
  ProductType,
  ProductTypeValue,
  ProductVariant,
  VariantDraft,
  SelectedType,
  PriceTier,
  CreateVariantRequest,
} from "../types";
import {
  fetchProductTypes,
  fetchProductTypeValues,
  fetchProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  fetchVariantPriceTiers,
  updateVariantPriceTiers,
} from "../api";
import { generateVariantCombinations, formatVariantOptions, isDuplicateCombination } from "../utils/variantCombinator";

type ProductSalesTabProps = {
  productId: number;
};

export function ProductSalesTab({ productId }: ProductSalesTabProps) {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  // State
  const [selectedTypes, setSelectedTypes] = useState<SelectedType[]>([]);
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([]);
  const [mode, setMode] = useState<"generate" | "existing">("existing");
  const [tierPricingOpen, setTierPricingOpen] = useState(false);
  const [currentVariant, setCurrentVariant] = useState<ProductVariant | VariantDraft | null>(null);
  const [currentTiers, setCurrentTiers] = useState<PriceTier[]>([]);
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);

  // Fetch product types
  const { data: allTypes = [] } = useQuery({
    queryKey: ["product-types"],
    queryFn: async () => {
      try {
        return await fetchProductTypes();
      } catch (error) {
        console.warn("API product-types failed, using mock data:", error);
        // Fallback to mock data if API fails
        const { MOCK_PRODUCT_TYPES } = await import("../api");
        return MOCK_PRODUCT_TYPES;
      }
    },
  });

  // Fetch existing variants
  const { data: existingVariants = [], isLoading: loadingVariants } = useQuery({
    queryKey: ["product-variants", productId],
    queryFn: () => fetchProductVariants(productId),
  });

  // Load type values
  const loadTypeValues = async (typeId: number): Promise<ProductTypeValue[]> => {
    try {
      return await fetchProductTypeValues(typeId);
    } catch (error) {
      console.warn(`API product-type-values failed for type ${typeId}, using mock data:`, error);
      // Fallback to mock data if API fails
      const { MOCK_TYPE_VALUES } = await import("../api");
      return MOCK_TYPE_VALUES[typeId] || [];
    }
  };

  // Generate variants
  const handleGenerate = () => {
    const allCombinations = generateVariantCombinations(selectedTypes);

    // Filter out combinations that already exist
    const newCombinations = allCombinations.filter(
      draft => !isDuplicateCombination(draft.options, existingVariants)
    );

    const skippedCount = allCombinations.length - newCombinations.length;

    if (skippedCount > 0) {
      notify({
        message: `Đã bỏ qua ${skippedCount} phân loại trùng với phân loại đã có.`,
        variant: "info",
      });
    }

    if (newCombinations.length === 0) {
      notify({
        message: "Tất cả tổ hợp đã tồn tại. Không có phân loại mới để tạo.",
        variant: "info",
      });
      return;
    }

    setVariantDrafts(newCombinations);
    setMode("generate");
  };

  // Save all drafts
  const saveDraftsMutation = useMutation({
    mutationFn: async (drafts: VariantDraft[]) => {
      // Save sequentially to avoid race conditions
      for (const draft of drafts) {
        const payload: CreateVariantRequest = {
          sku: draft.sku || undefined,
          stock: draft.stock,
          status: draft.status,
          base_price: draft.base_price,
          options: draft.options.map((opt) => ({
            product_type_id: opt.product_type_id,
            product_type_value_id: opt.product_type_value_id,
          })),
        };
        const createdVariant = await createProductVariant(productId, payload);

        // Create price tiers - use all tiers if available, otherwise just base_price
        const tiersToCreate = draft.tiers && draft.tiers.length > 0
          ? draft.tiers
          : draft.base_price !== undefined && draft.base_price > 0
            ? [{ min_qty: 1, price: draft.base_price }]
            : [];

        if (tiersToCreate.length > 0) {
          await updateVariantPriceTiers(createdVariant.id, tiersToCreate);
        }
      }
    },
    onSuccess: () => {
      notify({ message: "Đã lưu danh sách phân loại hàng.", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["product-variants", productId] });
      setVariantDrafts([]);
      setSelectedTypes([]);
      setMode("existing");
    },
    onError: () => {
      notify({ message: "Lưu phân loại hàng thất bại.", variant: "error" });
    },
  });

  // Update variants (batch)
  const updateVariantsMutation = useMutation({
    mutationFn: async (
      updates: Array<{ id: number; sku: string | null; stock: number; status: boolean }>
    ) => {
      // Update each variant sequentially
      for (const update of updates) {
        const payload = {
          sku: update.sku || undefined,
          stock: update.stock,
          status: update.status,
        };
        await updateProductVariant(update.id, payload);
      }
    },
    onSuccess: () => {
      notify({ message: "Đã cập nhật phân loại hàng.", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["product-variants", productId] });
    },
    onError: () => {
      notify({ message: "Cập nhật phân loại hàng thất bại.", variant: "error" });
    },
  });

  // Delete variant
  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: number) => {
      await deleteProductVariant(variantId);
    },
    onSuccess: () => {
      notify({ message: "Đã xóa phân loại hàng.", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["product-variants", productId] });
    },
    onError: () => {
      notify({ message: "Xóa phân loại hàng thất bại.", variant: "error" });
    },
  });

  // Open tier pricing drawer
  const handleOpenTierPricing = async (variant: ProductVariant | VariantDraft) => {
    setCurrentVariant(variant);

    if ("id" in variant) {
      // Existing variant - fetch tiers
      const tiers = await fetchVariantPriceTiers(variant.id);
      setCurrentTiers(tiers);
    } else {
      // Draft variant - use existing tiers or create from base_price
      const draftTiers = variant.tiers ||
        (variant.base_price ? [{ min_qty: 1, price: variant.base_price }] : []);
      setCurrentTiers(draftTiers);
    }

    setTierPricingOpen(true);
  };

  // Save tier pricing
  const handleSaveTierPricing = async (variantId: number | string, tiers: PriceTier[]) => {
    if (typeof variantId === "number") {
      // Existing variant
      await updateVariantPriceTiers(variantId, tiers);
      queryClient.invalidateQueries({ queryKey: ["product-variants", productId] });
    } else {
      // Draft variant - store all tiers locally
      const updatedDrafts = variantDrafts.map((draft) => {
        if (draft.temp_id === variantId) {
          const baseTier = tiers.find((t) => t.min_qty === 1);
          return {
            ...draft,
            base_price: baseTier?.price,
            tiers: tiers, // Store all tiers including wholesale
          };
        }
        return draft;
      });
      setVariantDrafts(updatedDrafts);
    }
  };

  // Cancel generate mode
  const handleCancelGenerate = () => {
    setVariantDrafts([]);
    setSelectedTypes([]);
    setMode("existing");
  };

  // Handle quick add product type success
  const handleQuickAddSuccess = async (newType: ProductType) => {
    // Invalidate product types query to refresh the list
    queryClient.invalidateQueries({ queryKey: ["product-types"] });
    notify({ message: `Đã tạo phân loại "${newType.name}" thành công!`, variant: "success" });
  };

  // Preview data
  const previewStats = {
    totalVariants: mode === "generate" ? variantDrafts.length : existingVariants.length,
    activeVariants:
      mode === "generate"
        ? variantDrafts.filter((d) => d.status).length
        : existingVariants.filter((v) => v.status).length,
    totalStock:
      mode === "generate"
        ? variantDrafts.reduce((sum, d) => sum + d.stock, 0)
        : existingVariants.reduce((sum, v) => sum + v.stock, 0),
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Column - Main Content (75%) */}
      <div className="col-span-12 lg:col-span-9 space-y-6">
        {/* Variant Type Builder */}
        {(mode === "existing" || variantDrafts.length === 0) && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <VariantTypeBuilder
              allTypes={allTypes}
              selectedTypes={selectedTypes}
              onSelectedTypesChange={setSelectedTypes}
              onLoadValues={loadTypeValues}
              onGenerate={handleGenerate}
              onQuickAdd={() => setQuickAddModalOpen(true)}
              disabled={mode === "generate"}
            />
          </div>
        )}

        {/* Generate Mode Header */}
        {mode === "generate" && variantDrafts.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-green-800">
                📝 Chế độ tạo mới phân loại
              </h3>
              <p className="text-xs text-green-600 mt-1">
                Đang có {variantDrafts.length} phân loại chưa lưu. Kiểm tra và lưu để hoàn
                tất.
              </p>
            </div>
            <button
              onClick={handleCancelGenerate}
              className="px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 rounded-md transition"
            >
              ✕ Hủy
            </button>
          </div>
        )}

        {/* Variant Matrix Table */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          {loadingVariants ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-slate-500">
                <svg
                  className="animate-spin h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="text-sm">Đang tải...</span>
              </div>
            </div>
          ) : (
            <VariantMatrixTable
              mode={mode}
              drafts={variantDrafts}
              variants={existingVariants}
              onSaveDrafts={(drafts) => saveDraftsMutation.mutateAsync(drafts)}
              onUpdateVariants={(updates) => updateVariantsMutation.mutateAsync(updates)}
              onOpenTierPricing={handleOpenTierPricing}
              onDeleteVariant={(variantId) => deleteVariantMutation.mutateAsync(variantId)}
              disabled={saveDraftsMutation.isPending || updateVariantsMutation.isPending || deleteVariantMutation.isPending}
            />
          )}
        </div>
      </div>

      {/* Right Column - Preview Panel (25%) */}
      <div className="col-span-12 lg:col-span-3">
        <div className="sticky top-6 space-y-4">
          {/* Stats Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Thống kê
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-slate-600">Tổng phân loại</span>
                <span className="text-lg font-bold text-green-700">
                  {previewStats.totalVariants}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-slate-600">Đang hoạt động</span>
                <span className="text-lg font-bold text-green-700">
                  {previewStats.activeVariants}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm text-slate-600">Tổng tồn kho</span>
                <span className="text-lg font-bold text-purple-700">
                  {previewStats.totalStock.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-5">
            <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Hướng dẫn
            </h4>
            <ul className="space-y-2 text-xs text-green-800">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">1.</span>
                <span>Chọn tối đa 2 loại phân loại (VD: Màu sắc, Kích thước)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">2.</span>
                <span>Chọn các giá trị cho mỗi loại phân loại</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">3.</span>
                <span>Nhấn "Tạo danh sách" để sinh tổ hợp tự động</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">4.</span>
                <span>Chỉnh sửa SKU, tồn kho, giá cho từng phân loại</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">5.</span>
                <span>Thiết lập giá sỉ theo số lượng (tùy chọn)</span>
              </li>
            </ul>
          </div>

          {/* Mode Indicator */}
          {mode === "generate" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800">Chưa lưu</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Các phân loại sẽ được lưu vào database sau khi nhấn "Lưu tất cả"
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tier Pricing Drawer */}
      <TierPricingDrawer
        isOpen={tierPricingOpen}
        onClose={() => setTierPricingOpen(false)}
        variant={currentVariant}
        onSave={handleSaveTierPricing}
        initialTiers={currentTiers}
      />

      {/* Quick Add Product Type Modal */}
      <QuickAddProductTypeModal
        isOpen={quickAddModalOpen}
        onClose={() => setQuickAddModalOpen(false)}
        onSuccess={handleQuickAddSuccess}
      />
    </div>
  );
}
