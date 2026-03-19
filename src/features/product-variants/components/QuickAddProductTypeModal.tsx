"use client";

import { useState, useRef, useEffect } from "react";
import { createProductType } from "@/features/product-types/api";
import { createProductTypeValue } from "@/features/product-type-values/api";
import type { ProductType } from "../types";

type QuickAddProductTypeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newType: ProductType) => void;
};

export function QuickAddProductTypeModal({
  isOpen,
  onClose,
  onSuccess,
}: QuickAddProductTypeModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [valueInput, setValueInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);

  // Focus name input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setCode("");
      setValues([]);
      setValueInput("");
      setError("");
    }
  }, [isOpen]);

  const handleAddValue = () => {
    const trimmed = valueInput.trim();
    if (trimmed && !values.includes(trimmed)) {
      setValues([...values, trimmed]);
      setValueInput("");
      valueInputRef.current?.focus();
    }
  };

  const handleValueKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddValue();
    } else if (e.key === "Backspace" && !valueInput && values.length > 0) {
      // Remove last value on backspace when input is empty
      setValues(values.slice(0, -1));
    }
  };

  const handleRemoveValue = (index: number) => {
    setValues(values.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Vui lòng nhập tên phân loại");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // 1. Create product type
      const newTypeId = await createProductType({
        name: name.trim(),
        code: code.trim() || undefined,
        isActive: true,
      });

      // 2. Create values if any
      for (let i = 0; i < values.length; i++) {
        await createProductTypeValue(newTypeId, {
          name: values[i],
          sortOrder: i + 1,
          isActive: true,
        });
      }

      // 3. Return the new type
      const newType: ProductType = {
        id: newTypeId,
        name: name.trim(),
        code: code.trim() || "",
        is_active: true,
      };

      onSuccess(newType);
      onClose();
    } catch (err) {
      console.error("Failed to create product type:", err);
      setError("Tạo phân loại thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">
            Thêm phân loại sản phẩm
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tên phân loại <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Màu sắc, Kích thước..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition"
              disabled={saving}
            />
          </div>

          {/* Code input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Mã code <span className="text-slate-400 font-normal">(tùy chọn)</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VD: color, size..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition"
              disabled={saving}
            />
          </div>

          {/* Values input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Giá trị <span className="text-slate-400 font-normal">(nhập và Enter để thêm)</span>
            </label>
            <div className="min-h-[80px] p-2 border border-slate-200 rounded-lg focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100 transition">
              {/* Value tags */}
              <div className="flex flex-wrap gap-2 mb-2">
                {values.map((value, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 rounded-md text-sm font-medium"
                  >
                    {value}
                    <button
                      type="button"
                      onClick={() => handleRemoveValue(index)}
                      className="p-0.5 hover:bg-green-200 rounded"
                      disabled={saving}
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>

              {/* Input */}
              <input
                ref={valueInputRef}
                type="text"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                onKeyDown={handleValueKeyDown}
                placeholder={values.length === 0 ? "VD: Đỏ, Xanh, Vàng..." : "Thêm giá trị..."}
                className="w-full px-1 py-1 text-sm outline-none bg-transparent"
                disabled={saving}
              />
            </div>
            {values.length > 0 && (
              <p className="mt-1.5 text-xs text-slate-500">
                {values.length} giá trị
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-5 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg shadow-sm hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang tạo...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Tạo phân loại
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
