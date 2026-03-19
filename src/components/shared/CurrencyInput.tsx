"use client";

import { useState, useEffect, useRef } from "react";

type CurrencyInputProps = {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  suffix?: string;
  min?: number;
  step?: number;
};

// Format number with thousand separators
function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) return "";
  return value.toLocaleString("vi-VN");
}

// Parse formatted string back to number
function parseCurrency(value: string): number | undefined {
  if (!value || value.trim() === "") return undefined;
  // Remove all non-digit characters except minus sign
  const cleaned = value.replace(/[^\d-]/g, "");
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? undefined : parsed;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  disabled = false,
  className = "",
  suffix = "₫",
  min = 0,
  step = 1000,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(formatCurrency(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);

  // Sync display value when prop changes
  useEffect(() => {
    setDisplayValue(formatCurrency(value));
  }, [value]);

  // Restore cursor position after formatting
  useEffect(() => {
    if (cursorRef.current !== null && inputRef.current) {
      const input = inputRef.current;
      // Calculate new cursor position based on formatted value
      const oldLength = cursorRef.current;
      const newLength = displayValue.length;
      const diff = newLength - oldLength;

      // Adjust cursor position
      let newPosition = (input.selectionStart || 0) + diff;
      newPosition = Math.max(0, Math.min(newPosition, displayValue.length));

      input.setSelectionRange(newPosition, newPosition);
      cursorRef.current = null;
    }
  }, [displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;

    // Parse the input to get raw number
    const parsed = parseCurrency(inputValue);

    // Store cursor position before formatting
    cursorRef.current = inputValue.length;

    // Apply min constraint and update
    if (parsed !== undefined) {
      const finalValue = parsed < min ? min : parsed;
      onChange(finalValue);
      setDisplayValue(formatCurrency(finalValue));
    } else if (inputValue === "" || inputValue === "-") {
      onChange(undefined);
      setDisplayValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Increment/decrement with arrow keys
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const currentValue = value || 0;
      const delta = e.key === "ArrowUp" ? step : -step;
      const newValue = Math.max(min, currentValue + delta);
      onChange(newValue);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className={`
          w-full px-2 py-1.5 pr-6 text-right
          border border-slate-200 rounded
          focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100
          disabled:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed
          text-sm font-medium
          ${displayValue ? "text-slate-800" : "text-slate-400"}
        `}
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
        {suffix}
      </span>
    </div>
  );
}
