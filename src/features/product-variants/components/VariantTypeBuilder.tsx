"use client";

import { useState, useEffect } from "react";
import type { ProductType, ProductTypeValue, SelectedType } from "../types";

type VariantTypeBuilderProps = {
  allTypes: ProductType[];
  selectedTypes: SelectedType[];
  onSelectedTypesChange: (types: SelectedType[]) => void;
  onLoadValues: (typeId: number) => Promise<ProductTypeValue[]>;
  onGenerate: () => void;
  onQuickAdd?: () => void;
  disabled?: boolean;
};

export function VariantTypeBuilder({
  allTypes,
  selectedTypes,
  onSelectedTypesChange,
  onLoadValues,
  onGenerate,
  onQuickAdd,
  disabled = false,
}: VariantTypeBuilderProps) {
  const [valuesCache, setValuesCache] = useState<Record<number, ProductTypeValue[]>>({});
  const [loadingValues, setLoadingValues] = useState<Record<number, boolean>>({});

  // Available types (not yet selected)
  const selectedTypeIds = selectedTypes.map(st => st.type.id);
  const availableTypes = allTypes.filter(t => !selectedTypeIds.includes(t.id) && t.is_active);

  // Max 2 classifications
  const canAddMore = selectedTypes.length < 2;

  const handleAddType = async () => {
    if (!canAddMore || availableTypes.length === 0) return;

    const firstType = availableTypes[0];

    // Load values
    if (!valuesCache[firstType.id]) {
      setLoadingValues(prev => ({ ...prev, [firstType.id]: true }));
      try {
        const values = await onLoadValues(firstType.id);
        setValuesCache(prev => ({ ...prev, [firstType.id]: values }));
      } finally {
        setLoadingValues(prev => ({ ...prev, [firstType.id]: false }));
      }
    }

    onSelectedTypesChange([
      ...selectedTypes,
      { type: firstType, selectedValues: [] },
    ]);
  };

  const handleChangeType = async (index: number, newType: ProductType) => {
    // Load values if not cached
    if (!valuesCache[newType.id]) {
      setLoadingValues(prev => ({ ...prev, [newType.id]: true }));
      try {
        const values = await onLoadValues(newType.id);
        setValuesCache(prev => ({ ...prev, [newType.id]: values }));
      } finally {
        setLoadingValues(prev => ({ ...prev, [newType.id]: false }));
      }
    }

    const updated = [...selectedTypes];
    updated[index] = { type: newType, selectedValues: [] };
    onSelectedTypesChange(updated);
  };

  const handleRemoveType = (index: number) => {
    const updated = selectedTypes.filter((_, i) => i !== index);
    onSelectedTypesChange(updated);
  };

  const handleToggleValue = (typeIndex: number, value: ProductTypeValue) => {
    const updated = [...selectedTypes];
    const current = updated[typeIndex];

    const isSelected = current.selectedValues.some(v => v.id === value.id);

    if (isSelected) {
      current.selectedValues = current.selectedValues.filter(v => v.id !== value.id);
    } else {
      current.selectedValues = [...current.selectedValues, value];
    }

    onSelectedTypesChange(updated);
  };

  const hasValues = selectedTypes.every(st => st.selectedValues.length > 0);
  const canGenerate = selectedTypes.length > 0 && hasValues;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">Phân loại hàng</h3>
        <div className="flex items-center gap-2">
          {onQuickAdd && (
            <button
              onClick={onQuickAdd}
              disabled={disabled}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:text-green-700 hover:bg-green-50 border border-slate-200 hover:border-green-300 rounded-lg disabled:opacity-50 transition"
              title="Tạo loại phân loại mới"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tạo mới
            </button>
          )}
          {canAddMore && availableTypes.length > 0 && (
            <button
              onClick={handleAddType}
              disabled={disabled}
              className="text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
            >
              + Thêm phân loại ({selectedTypes.length}/2)
            </button>
          )}
        </div>
      </div>

      {/* Selected types */}
      <div className="space-y-4">
        {selectedTypes.map((st, index) => {
          const availableForSwap = availableTypes.filter(t => t.id !== st.type.id);
          const values = valuesCache[st.type.id] || [];
          const loading = loadingValues[st.type.id];

          return (
            <div key={index} className="bg-green-50/30 rounded-lg border border-green-200/50 p-4 space-y-3">
              {/* Type selector */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-700 min-w-[100px]">
                  Phân loại {index + 1}:
                </label>
                <select
                  value={st.type.id}
                  onChange={(e) => {
                    const newType = allTypes.find(t => t.id === parseInt(e.target.value));
                    if (newType) handleChangeType(index, newType);
                  }}
                  disabled={disabled || loading}
                  className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100"
                >
                  <option value={st.type.id}>{st.type.name}</option>
                  {availableForSwap.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleRemoveType(index)}
                  disabled={disabled}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                  title="Xóa"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Values selector */}
              <div className="flex flex-wrap gap-2">
                {loading ? (
                  <div className="text-sm text-slate-500">Đang tải...</div>
                ) : values.length === 0 ? (
                  <div className="text-sm text-slate-500 italic">Không có giá trị nào</div>
                ) : (
                  values.map(value => {
                    const isSelected = st.selectedValues.some(v => v.id === value.id);
                    return (
                      <button
                        key={value.id}
                        onClick={() => handleToggleValue(index, value)}
                        disabled={disabled}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                          isSelected
                            ? "bg-green-600 text-white shadow-sm"
                            : "bg-white border border-slate-200 text-slate-700 hover:border-green-300 hover:bg-green-50"
                        }`}
                      >
                        {value.value}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Selected chips */}
              {st.selectedValues.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-green-200/50">
                  <span className="text-xs font-medium text-slate-600">Đã chọn:</span>
                  {st.selectedValues.map(v => (
                    <span
                      key={v.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-600 text-white rounded-md text-xs font-medium"
                    >
                      {v.value}
                      <button
                        onClick={() => handleToggleValue(index, v)}
                        disabled={disabled}
                        className="hover:bg-green-700 rounded"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Warnings */}
      {selectedTypes.length > 0 && !hasValues && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-yellow-800">Vui lòng chọn ít nhất 1 giá trị cho mỗi phân loại</span>
        </div>
      )}

      {/* Generate button */}
      {selectedTypes.length > 0 && (
        <button
          onClick={onGenerate}
          disabled={!canGenerate || disabled}
          className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium shadow-sm hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          🚀 Tạo danh sách phân loại ({
            selectedTypes.reduce((acc, st) => acc * Math.max(st.selectedValues.length, 1), 1)
          } tổ hợp)
        </button>
      )}

      {selectedTypes.length === 0 && (
        <div className="text-center py-8">
          <svg className="w-16 h-16 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-sm font-medium text-slate-600 mb-3">Chưa có phân loại nào</p>
          <div className="flex items-center justify-center gap-3">
            {availableTypes.length > 0 ? (
              <button
                onClick={handleAddType}
                disabled={disabled}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium shadow-sm hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Thêm phân loại
              </button>
            ) : onQuickAdd ? (
              <button
                onClick={onQuickAdd}
                disabled={disabled}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium shadow-sm hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tạo phân loại mới
              </button>
            ) : (
              <p className="text-xs text-slate-400">Không có loại phân loại nào khả dụng</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
