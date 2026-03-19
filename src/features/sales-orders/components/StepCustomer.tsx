"use client";

import { useState } from "react";
import { MagnifyingGlassIcon, CheckCircleIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { fetchCustomers } from "@/features/customers/api";
import type { Customer } from "@/features/customers/types";
import type { CustomerState } from "../types";
import { useDebounce } from "@/hooks/useDebounce";

type StepCustomerProps = {
  customer: CustomerState;
  onCustomerChange: (customer: CustomerState) => void;
  onNext: () => void;
};

export function StepCustomer({ customer, onCustomerChange, onNext }: StepCustomerProps) {
  const [phone, setPhone] = useState(customer.phone);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    customer?: Customer;
  } | null>(null);

  // Debounced search function
  const searchCustomer = useDebounce(async (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.length < 9) {
      setSearchResult(null);
      return;
    }

    setSearching(true);
    try {
      const result = await fetchCustomers({
        Keyword: phoneNumber,
        Page: 1,
        PageSize: 1,
      });

      if (result.items.length > 0) {
        const found = result.items[0];
        setSearchResult({ found: true, customer: found });
        // Auto-fill customer info
        onCustomerChange({
          id: found.id,
          name: found.name || "",
          phone: found.phone || phoneNumber,
          email: found.email || "",
          address: "",
          isNew: false,
          isGuest: false,
        });
      } else {
        setSearchResult({ found: false });
        onCustomerChange({
          name: "",
          phone: phoneNumber,
          email: "",
          address: "",
          isNew: true,
          isGuest: false,
        });
      }
    } catch (error) {
      console.error("Search customer error:", error);
      setSearchResult({ found: false });
    } finally {
      setSearching(false);
    }
  }, 500);

  const handlePhoneChange = (value: string) => {
    // Only allow numbers
    const cleaned = value.replace(/\D/g, "");
    setPhone(cleaned);
    searchCustomer(cleaned);
  };

  const handleSearch = () => {
    searchCustomer(phone);
  };

  const handleGuestCheckout = () => {
    onCustomerChange({
      name: "Khách lẻ",
      phone: phone || "",
      email: "",
      address: "",
      isNew: false,
      isGuest: true,
    });
    setSearchResult(null);
  };

  const canProceed =
    customer.isGuest || (customer.phone && customer.name);

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <UserPlusIcon className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Thông tin khách hàng
            </h2>
            <p className="text-sm text-slate-500">
              Nhập số điện thoại để tìm khách hàng
            </p>
          </div>
        </div>

        {/* Phone search */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Số điện thoại <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="Nhập số điện thoại..."
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || !phone}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              Tìm
            </button>
          </div>
        </div>

        {/* Search result badge */}
        {searchResult && (
          <div
            className={`mb-4 rounded-xl p-4 ${
              searchResult.found
                ? "border border-emerald-200 bg-emerald-50"
                : "border border-amber-200 bg-amber-50"
            }`}
          >
            {searchResult.found && searchResult.customer ? (
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
                <div>
                  <p className="font-medium text-emerald-700">
                    Khách hàng đã có trong hệ thống
                  </p>
                  <p className="text-sm text-emerald-600">
                    {searchResult.customer.name} • {searchResult.customer.point || 0} điểm
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <UserPlusIcon className="h-6 w-6 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-700">Khách hàng mới</p>
                  <p className="text-sm text-amber-600">
                    Vui lòng nhập thông tin bên dưới
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customer info form */}
        {!customer.isGuest && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Họ tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customer.name}
                onChange={(e) =>
                  onCustomerChange({ ...customer, name: e.target.value })
                }
                placeholder="Nhập họ tên khách hàng..."
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={customer.email}
                onChange={(e) =>
                  onCustomerChange({ ...customer, email: e.target.value })
                }
                placeholder="Nhập email (không bắt buộc)..."
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Địa chỉ
              </label>
              <input
                type="text"
                value={customer.address}
                onChange={(e) =>
                  onCustomerChange({ ...customer, address: e.target.value })
                }
                placeholder="Nhập địa chỉ (không bắt buộc)..."
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
        )}

        {/* Guest checkout option */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={customer.isGuest}
              onChange={(e) => {
                if (e.target.checked) {
                  handleGuestCheckout();
                } else {
                  onCustomerChange({
                    ...customer,
                    isGuest: false,
                    name: "",
                  });
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-600">
              Khách lẻ (bỏ qua thông tin khách hàng)
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onNext}
            disabled={!canProceed}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tiếp tục
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
