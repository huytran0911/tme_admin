"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchSalesOrderById, updateSalesOrderStatus } from "@/features/sales-orders/api";
import type { SalesOrderDetail, SalesOrderItem } from "@/features/sales-orders/types";
import { ORDER_STATUS } from "@/features/sales-orders/types";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/shared/Toast";
import { formatDate } from "@/lib/utils";

// ─── Status config ───────────────────────────────────────────────────────────
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
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

function formatCurrency(value: number | null | undefined) {
    if (value == null) return "0 ₫";
    return value.toLocaleString("vi-VN") + " ₫";
}

// ─── Next status transitions ─────────────────────────────────────────────────
const STATUS_TRANSITIONS: Record<string, { nextStatus: string; label: string; color: string }[]> = {
    [ORDER_STATUS.NEW]: [
        { nextStatus: ORDER_STATUS.CONFIRMED, label: "Xác nhận đơn", color: "bg-amber-600 hover:bg-amber-700" },
        { nextStatus: ORDER_STATUS.CANCELLED, label: "Hủy đơn", color: "bg-red-600 hover:bg-red-700" },
    ],
    [ORDER_STATUS.CONFIRMED]: [
        { nextStatus: ORDER_STATUS.SHIPPED, label: "Giao hàng", color: "bg-indigo-600 hover:bg-indigo-700" },
        { nextStatus: ORDER_STATUS.CANCELLED, label: "Hủy đơn", color: "bg-red-600 hover:bg-red-700" },
    ],
    [ORDER_STATUS.SHIPPED]: [
        { nextStatus: ORDER_STATUS.COMPLETED, label: "Hoàn thành", color: "bg-emerald-600 hover:bg-emerald-700" },
    ],
};

export default function SalesOrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = Number(params.id);
    const { notify } = useToast();

    const [order, setOrder] = useState<SalesOrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const loadOrder = useCallback(async () => {
        if (!orderId || isNaN(orderId)) return;
        setLoading(true);
        try {
            const data = await fetchSalesOrderById(orderId);
            setOrder(data);
        } catch (err) {
            console.error("Failed to fetch order:", err);
            notify({ message: "Không thể tải thông tin đơn hàng.", variant: "error" });
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    useEffect(() => {
        loadOrder();
    }, [loadOrder]);

    const handleStatusChange = async (nextStatus: string) => {
        if (!order) return;
        setUpdating(true);
        try {
            await updateSalesOrderStatus(order.id, { status: nextStatus });
            notify({ message: "Cập nhật trạng thái thành công!", variant: "success" });
            await loadOrder();
        } catch (err) {
            console.error("Failed to update status:", err);
            notify({ message: "Không thể cập nhật trạng thái đơn hàng.", variant: "error" });
        } finally {
            setUpdating(false);
        }
    };

    // ─── Loading state ───────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-emerald-500 border-t-transparent" />
                    <p className="text-sm text-slate-500">Đang tải chi tiết đơn hàng...</p>
                </div>
            </div>
        );
    }

    // ─── Not found ───────────────────────────────────────────────────────────
    if (!order) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
                <p className="text-sm text-slate-500">Không tìm thấy đơn hàng.</p>
                <button
                    onClick={() => router.push("/sales-orders")}
                    className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                >
                    Quay lại danh sách
                </button>
            </div>
        );
    }

    const transitions = STATUS_TRANSITIONS[order.status ?? ""] ?? [];
    const mainItems = order.items.filter((i) => !i.parentItemId);
    const bundleChildren = (parentId: number) => order.items.filter((i) => i.parentItemId === parentId);

    return (
        <div className="space-y-5">
            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Chi tiết đơn hàng</p>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-semibold text-slate-900">{order.orderCode}</h1>
                        <StatusBadge status={order.status ?? ""} />
                    </div>
                </div>
                <Breadcrumbs
                    items={[
                        { label: "Dashboard", href: "/" },
                        { label: "Đơn hàng", href: "/sales-orders" },
                        { label: order.orderCode },
                    ]}
                    className="justify-end"
                />
            </div>

            {/* ── Action buttons ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 px-2">
                <button
                    type="button"
                    onClick={() => router.push("/sales-orders")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Quay lại
                </button>

                {transitions.map((t) => (
                    <button
                        key={t.nextStatus}
                        type="button"
                        disabled={updating}
                        onClick={() => handleStatusChange(t.nextStatus)}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors disabled:opacity-50 ${t.color}`}
                    >
                        {updating ? "Đang xử lý..." : t.label}
                    </button>
                ))}
            </div>

            {/* ── Content grid ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Left: Order items */}
                <div className="lg:col-span-2">
                    <div className="tme-table-card">
                        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                            <h3 className="text-sm font-semibold text-slate-700">Sản phẩm đặt hàng</h3>
                        </div>
                        <div className="tme-table-wrapper">
                            <table className="tme-table">
                                <thead className="tme-table-head">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                                            Sản phẩm
                                        </th>
                                        <th className="px-3 py-2.5 text-left text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                                            SKU
                                        </th>
                                        <th className="px-3 py-2.5 text-right text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                                            SL
                                        </th>
                                        <th className="px-3 py-2.5 text-right text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                                            Đơn giá
                                        </th>
                                        <th className="px-3 py-2.5 text-right text-[13px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                                            Thành tiền
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {mainItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                                                Không có sản phẩm.
                                            </td>
                                        </tr>
                                    ) : (
                                        mainItems.map((item) => {
                                            const children = bundleChildren(item.id);
                                            return (
                                                <ItemRows key={item.id} item={item} children={children} />
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Total row */}
                        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
                            <span className="text-sm font-semibold text-slate-700">Tổng cộng</span>
                            <span className="text-lg font-bold text-emerald-600">
                                {formatCurrency(order.totalAmount)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Customer info + meta */}
                <div className="space-y-5">
                    {/* Customer info */}
                    <div className="rounded-lg border border-slate-200 bg-white">
                        <div className="border-b border-slate-200 bg-amber-50 px-4 py-2.5">
                            <h3 className="text-sm font-semibold text-slate-800">Thông tin khách hàng</h3>
                        </div>
                        <div className="p-4">
                            <table className="w-full text-sm">
                                <tbody>
                                    <InfoRow label="Họ tên" value={order.customerName} />
                                    <InfoRow label="Số ĐT" value={order.customerPhone} />
                                    <InfoRow label="Email" value={order.customerEmail} />
                                    <InfoRow label="Địa chỉ" value={order.customerAddress} />
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Note */}
                    {order.note && (
                        <div className="rounded-lg border border-slate-200 bg-white">
                            <div className="border-b border-slate-200 bg-blue-50 px-4 py-2.5">
                                <h3 className="text-sm font-semibold text-slate-800">Ghi chú</h3>
                            </div>
                            <div className="p-4 text-sm text-slate-700 whitespace-pre-wrap">{order.note}</div>
                        </div>
                    )}

                    {/* System info */}
                    <div className="rounded-lg border border-slate-200 bg-white">
                        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                            <h3 className="text-sm font-semibold text-slate-700">Thông tin hệ thống</h3>
                        </div>
                        <div className="p-4">
                            <table className="w-full text-sm">
                                <tbody>
                                    <InfoRow label="Ngày tạo" value={formatDate(order.createdAt, "dd/MM/yyyy")} />
                                    <InfoRow label="Người tạo" value={order.createdBy} />
                                    <InfoRow label="Cập nhật" value={formatDate(order.updatedAt, "dd/MM/yyyy")} />
                                    <InfoRow label="Người cập nhật" value={order.updatedBy} />
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Sub components ──────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <tr>
            <td className="w-28 py-1.5 pr-2 text-slate-500">{label}:</td>
            <td className="py-1.5 font-medium text-slate-800">{value || "-"}</td>
        </tr>
    );
}

function ItemRows({ item, children }: { item: SalesOrderDetail["items"][0]; children: SalesOrderDetail["items"] }) {
    return (
        <>
            <tr className="hover:bg-slate-50/60">
                <td className="px-3 py-2 text-sm text-slate-900">
                    <div className="flex items-center gap-2">
                        {item.itemType === "BUNDLE" && (
                            <span className="inline-flex items-center rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-600/20">
                                COMBO
                            </span>
                        )}
                        <span>{item.productName || "-"}</span>
                    </div>
                </td>
                <td className="px-3 py-2 text-sm text-slate-600">{item.sku || "-"}</td>
                <td className="px-3 py-2 text-sm text-slate-900 text-right">{item.quantity}</td>
                <td className="px-3 py-2 text-sm text-slate-900 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="px-3 py-2 text-sm font-semibold text-slate-900 text-right">{formatCurrency(item.lineTotal)}</td>
            </tr>
            {children.map((child) => (
                <tr key={child.id} className="bg-slate-50/40 hover:bg-slate-50">
                    <td className="px-3 py-1.5 pl-8 text-sm text-slate-600">
                        <span className="text-slate-400">└ </span>
                        {child.productName || "-"}
                    </td>
                    <td className="px-3 py-1.5 text-sm text-slate-500">{child.sku || "-"}</td>
                    <td className="px-3 py-1.5 text-sm text-slate-600 text-right">{child.quantity}</td>
                    <td className="px-3 py-1.5 text-sm text-slate-600 text-right">{formatCurrency(child.unitPrice)}</td>
                    <td className="px-3 py-1.5 text-sm text-slate-600 text-right">{formatCurrency(child.lineTotal)}</td>
                </tr>
            ))}
        </>
    );
}


