"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCustomers, deleteCustomer, toggleCustomerStatus } from "@/features/customers/api";
import type { Customer } from "@/features/customers/types";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";
import { AddNewButton } from "@/components/shared/ToolbarButton";
import { Pagination } from "@/components/shared/Pagination";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { EditActionButton } from "@/components/shared/EditActionButton";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { formatDate } from "@/lib/utils";

export default function CustomersPage() {
  const router = useRouter();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [params, setParams] = useState({ page: 1, pageSize: 20, keyword: "" });
  const [total, setTotal] = useState(0);

  const loadCustomers = async (nextParams = params) => {
    setLoading(true);
    try {
      const apiParams: any = {
        Page: nextParams.page,
        PageSize: nextParams.pageSize,
      };
      if (nextParams.keyword) apiParams.Keyword = nextParams.keyword;

      const data = await fetchCustomers(apiParams);
      setCustomers(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      notify({ message: "Không thể tải danh sách thành viên.", variant: "error" });
      setCustomers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParams((prev) => {
        if (prev.keyword === keyword && prev.page === 1) {
          return prev;
        }
        return { ...prev, page: 1, keyword };
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleSearchSubmit = () => {
    setParams((prev) => ({ ...prev, page: 1, keyword }));
  };

  const handleToggleStatus = async (customer: Customer) => {
    try {
      await toggleCustomerStatus(customer);
      notify({
        message: customer.status === "0" ? "Đã khóa tài khoản." : "Đã kích hoạt tài khoản.",
        variant: "success",
      });
      loadCustomers(params);
    } catch (err) {
      console.error("Failed to toggle customer status:", err);
      notify({ message: "Không thể cập nhật trạng thái.", variant: "error" });
    }
  };

  const handleDelete = (customer: Customer) => {
    confirm({
      title: "Xóa thành viên",
      description: `Bạn có chắc muốn xóa "${customer.name || customer.userName}"?`,
      confirmText: "Xóa",
      onConfirm: async () => {
        try {
          await deleteCustomer(customer.id);
          notify({ message: "Đã xóa thành viên.", variant: "success" });
          loadCustomers(params);
        } catch (err) {
          console.error("Failed to delete customer:", err);
          notify({ message: "Không thể xóa thành viên.", variant: "error" });
        }
      },
    });
  };

  const handlePageChange = (page: number) => setParams((prev) => ({ ...prev, page }));
  const handlePageSizeChange = (pageSize: number) => setParams((prev) => ({ ...prev, page: 1, pageSize }));

  return (
    <div className="space-y-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Quản trị</p>
          <h1 className="text-xl font-semibold text-slate-900">Thành viên</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Thành viên" },
          ]}
          className="justify-end"
        />
      </div>

      <div className="mt-2 flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <AddNewButton onClick={() => router.push("/customers/create")}>
            Thêm thành viên
          </AddNewButton>
        </div>

        <div className="flex w-full justify-end sm:w-auto">
          <div className="flex w-full max-w-xs items-center gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
              placeholder="Tìm theo tên, email, username..."
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>
      </div>

      <div className="tme-table-card">
        <div className="tme-table-wrapper">
          <table className="tme-table">
            <thead className="tme-table-head">
              <tr>
                <HeaderCell label="Khóa TK" />
                <HeaderCell label="Tên KH" />
                <HeaderCell label="Email" />
                <HeaderCell label="Username" />
                <HeaderCell label="Số ĐT" />
                <HeaderCell label="Điểm" className="text-center" />
                <HeaderCell label="Ngày tạo" />
                <HeaderCell label="Chức năng" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-5 text-center text-sm text-slate-500">
                    Đang tải danh sách thành viên...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                    Chưa có thành viên nào.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={customer.status === "1"}
                        onChange={() => handleToggleStatus(customer)}
                        className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-200"
                        title={customer.status === "0" ? "Đang hoạt động - Click để khóa" : "Đã khóa - Click để mở khóa"}
                      />
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-slate-900">{customer.name || "-"}</td>
                    <td className="px-3 py-2 text-sm text-slate-600">{customer.email || "-"}</td>
                    <td className="px-3 py-2 text-sm text-slate-600">{customer.userName || "-"}</td>
                    <td className="px-3 py-2 text-sm text-slate-600">{customer.phone || "-"}</td>
                    <td className="px-3 py-2 text-center text-sm font-semibold text-emerald-600">
                      {customer.point}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-600">
                      {formatDate(customer.createdAt, "dd/MM/yyyy")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        <EditActionButton onClick={() => router.push(`/customers/${customer.id}/edit`)} />
                        <DeleteActionButton onClick={() => handleDelete(customer)} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={params.page}
        pageSize={params.pageSize}
        totalItems={total}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
      {dialog}
    </div>
  );
}

function HeaderCell({ label, className = "" }: { label: string; className?: string }) {
  return (
    <th className={`px-3 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500 ${className}`}>
      {label}
    </th>
  );
}
