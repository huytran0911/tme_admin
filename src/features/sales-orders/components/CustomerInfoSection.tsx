"use client";

import { useState } from "react";
import { MagnifyingGlassIcon, CheckCircleIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { fetchCustomers } from "@/features/customers/api";
import type { Customer } from "@/features/customers/types";
import type { CustomerState } from "../types";
import { useDebounce } from "@/hooks/useDebounce";

type CustomerInfoSectionProps = {
  customer: CustomerState;
  onCustomerChange: (customer: CustomerState) => void;
};

export function CustomerInfoSection({ customer, onCustomerChange }: CustomerInfoSectionProps) {
  const [phone, setPhone] = useState(customer.phone);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    customer?: Customer;
  } | null>(null);

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
        onCustomerChange({
          id: found.id,
          name: found.name || "",
          phone: found.phone || phoneNumber,
          email: found.email || "",
          address: found.address || "",
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
    const cleaned = value.replace(/\D/g, "");
    setPhone(cleaned);
    searchCustomer(cleaned);
  };

  const handleGuestCheckout = (checked: boolean) => {
    if (checked) {
      onCustomerChange({
        name: "Khách lẻ",
        phone: phone || "",
        email: "",
        address: "",
        isNew: false,
        isGuest: true,
      });
      setSearchResult(null);
    } else {
      onCustomerChange({
        ...customer,
        isGuest: false,
        name: "",
      });
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-amber-50 px-4 py-2">
        <h3 className="font-semibold text-slate-800">Thông tin người mua hàng</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={customer.isGuest}
            onChange={(e) => handleGuestCheckout(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-500"
          />
          <span className="text-slate-600">Khách lẻ</span>
        </label>
      </div>

      {/* Form */}
      <div className="p-4">
        {/* Search result badge */}
        {searchResult && !customer.isGuest && (
          <div
            className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              searchResult.found
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {searchResult.found ? (
              <>
                <CheckCircleIcon className="h-4 w-4" />
                <span>Khách hàng đã có trong hệ thống</span>
              </>
            ) : (
              <>
                <UserPlusIcon className="h-4 w-4" />
                <span>Khách hàng mới</span>
              </>
            )}
          </div>
        )}

        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="w-28 py-1.5 pr-2 text-slate-600">Điện thoại:</td>
              <td className="py-1.5">
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    disabled={customer.isGuest}
                    placeholder="Nhập số điện thoại..."
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-emerald-400 focus:outline-none disabled:bg-slate-50"
                  />
                  {searching && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    </div>
                  )}
                </div>
              </td>
            </tr>
            <tr>
              <td className="py-1.5 pr-2 text-slate-600">Họ tên:</td>
              <td className="py-1.5">
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => onCustomerChange({ ...customer, name: e.target.value })}
                  disabled={customer.isGuest}
                  placeholder="Nhập họ tên..."
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-emerald-400 focus:outline-none disabled:bg-slate-50"
                />
              </td>
            </tr>
            <tr>
              <td className="py-1.5 pr-2 text-slate-600">Email:</td>
              <td className="py-1.5">
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => onCustomerChange({ ...customer, email: e.target.value })}
                  disabled={customer.isGuest}
                  placeholder="Nhập email..."
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-emerald-400 focus:outline-none disabled:bg-slate-50"
                />
              </td>
            </tr>
            <tr>
              <td className="py-1.5 pr-2 align-top text-slate-600">Địa chỉ:</td>
              <td className="py-1.5">
                <textarea
                  value={customer.address}
                  onChange={(e) => onCustomerChange({ ...customer, address: e.target.value })}
                  disabled={customer.isGuest}
                  placeholder="Nhập địa chỉ..."
                  rows={2}
                  className="w-full resize-none rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-emerald-400 focus:outline-none disabled:bg-slate-50"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
