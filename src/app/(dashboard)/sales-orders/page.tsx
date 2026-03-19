"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchSalesOrders } from "@/features/sales-orders/api";
import type { SalesOrderListItem, GetSalesOrdersParams } from "@/features/sales-orders/types";
import { ORDER_STATUS } from "@/features/sales-orders/types";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";
import { AddNewButton } from "@/components/shared/ToolbarButton";
import { Pagination } from "@/components/shared/Pagination";
import { formatDate } from "@/lib/utils";

// Status labels & colors
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    [ORDER_STATUS.NEW]: { label: "Mới", color: "bg-blue-50 text-blue-700 ring-blue-600/20" },
    [ORDER_STATUS.CONFIRMED]: { label: "Đã xác nhận", color: "bg-amber-50 text-amber-700 ring-amber-600/20" },
    [ORDER_STATUS.SHIPPED]: { label: "Đang giao", color: "bg-indigo-50 text-indigo-700 ring-indigo-600/20" },
    [ORDER_STATUS.COMPLETED]: { label: "Hoàn thành", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
    [ORDER_STATUS.CANCELLED]: { label: "Đã hủy", color: "bg-red-50 text-red-700 ring-red-600/20" },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-slate-50 text-slate-600 ring-slate-500/20" };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

function formatCurrency(value: number | null | undefined) {
    if (value == null) return "0 ₫";
    return value.toLocaleString("vi-VN") + " ₫";
}

export default function SalesOrdersPage() {
    const router = useRouter();
    const { notify } = useToast();

    const [orders, setOrders] = useState<SalesOrderListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    // Filter state
    const [keyword, setKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const [params, setParams] = useState<GetSalesOrdersParams>({
        page: 1,
        pageSize: 20,
    });

    const loadOrders = useCallback(async (nextParams: GetSalesOrdersParams) => {
        setLoading(true);
        try {
            const data = await fetchSalesOrders(nextParams);
            setOrders(data.items);
            setTotal(data.total);
        } catch (err) {
            console.error("Failed to fetch sales orders:", err);
            notify({ message: "Không thể tải danh sách đơn hàng.", variant: "error" });
            setOrders([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadOrders(params);
    }, [params, loadOrders]);

    // Debounced keyword search
    useEffect(() => {
        const timer = setTimeout(() => {
            setParams((prev) => {
                const next: GetSalesOrdersParams = { ...prev, page: 1 };
                if (keyword) {
                    // Try to detect phone vs order code
                    if (/^\d+$/.test(keyword)) {
                        next.phone = keyword;
                        next.orderCode = undefined;
                    } else {
                        next.orderCode = keyword;
                        next.phone = undefined;
                    }
                } else {
                    next.phone = undefined;
                    next.orderCode = undefined;
                }
                return next;
            });
        }, 400);
        return () => clearTimeout(timer);
    }, [keyword]);

    const handleFilterApply = () => {
        setParams((prev) => ({
            ...prev,
            page: 1,
            status: statusFilter || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
        }));
    };

    const handleClearFilters = () => {
        setKeyword("");
        setStatusFilter("");
        setDateFrom("");
        setDateTo("");
        setParams({ page: 1, pageSize: 20 });
    };

    const handlePageChange = (page: number) => setParams((prev) => ({ ...prev, page }));
    const handlePageSizeChange = (pageSize: number) => setParams((prev) => ({ ...prev, page: 1, pageSize }));

    const hasActiveFilters = statusFilter || dateFrom || dateTo;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Quản trị</p>
                    <h1 className="text-xl font-semibold text-slate-900">Quản Lý Đơn Đặt Hàng</h1>
                </div>
                <Breadcrumbs
                    items={[
                        { label: "Dashboard", href: "/" },
                        { label: "Đơn hàng" },
                    ]}
                    className="justify-end"
                />
            </div>

            {/* Toolbar */}
            <div className="mt-2 flex flex-col gap-3 px-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        <AddNewButton onClick={() => router.push("/sales-orders/create")}>
                            Tạo đơn hàng
                        </AddNewButton>
                    </div>

                    <div className="flex w-full justify-end sm:w-auto">
                        <div className="flex w-full max-w-xs items-center gap-2">
                            <input
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="Tìm theo mã đơn hoặc SĐT..."
                                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                            />
                        </div>
                    </div>
                </div>

                {/* Filters row */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500">Trạng thái</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        >
                            <option value="">Tất cả</option>
                            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500">Từ ngày</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500">Đến ngày</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleFilterApply}
                        className="rounded-md bg-emerald-600 px-4 py-1.5 text-[13px] font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 transition-colors"
                    >
                        Lọc
                    </button>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="rounded-md border border-slate-200 px-4 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 transition-colors"
                        >
                            Xóa bộ lọc
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="tme-table-card">
                <div className="tme-table-wrapper">
                    <table className="tme-table">
                        <thead className="tme-table-head">
                            <tr>
                                <HeaderCell label="Mã đơn" />
                                <HeaderCell label="Khách hàng" />
                                <HeaderCell label="Số ĐT" />
                                <HeaderCell label="Tổng tiền" className="text-right" />
                                <HeaderCell label="Trạng thái" className="text-center" />
                                <HeaderCell label="Ngày tạo" />
                                <HeaderCell label="Chức năng" className="text-right" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-5 text-center text-sm text-slate-500">
                                        Đang tải danh sách đơn hàng...
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                                        Chưa có đơn hàng nào.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 cursor-pointer"
                                        onClick={() => router.push(`/sales-orders/${order.id}`)}
                                    >
                                        <td className="px-3 py-2 text-sm font-medium text-emerald-700">
                                            {order.orderCode || "-"}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-900">
                                            {order.customerName || "-"}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-600">
                                            {order.customerPhone || "-"}
                                        </td>
                                        <td className="px-3 py-2 text-sm font-semibold text-slate-900 text-right">
                                            {formatCurrency(order.totalAmount)}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <StatusBadge status={order.status} />
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-600">
                                            {formatDate(order.createdAt, "dd/MM/yyyy")}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/sales-orders/${order.id}`);
                                                }}
                                                className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 ring-1 ring-inset ring-emerald-600/20 transition-colors"
                                            >
                                                Chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <Pagination
                page={params.page}
                pageSize={params.pageSize}
                totalItems={total}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
            />
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
