"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAppConfigs, updateAppConfig } from "@/features/app-configs/api";
import type { GetAppConfigListParams, AppConfig } from "@/features/app-configs/types";
import { AppConfigTable } from "@/features/app-configs/components/AppConfigTable";
import { Pagination } from "@/components/shared/Pagination";
import { useToast } from "@/components/shared/Toast";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { UpdateButton } from "@/components/shared/ToolbarButton";

export default function AppConfigsPage() {
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();
  const originalConfigsRef = useRef<Record<number, AppConfig>>({});
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [params, setParams] = useState<GetAppConfigListParams>({ page: 1, pageSize: 20, keyword: "" });
  const [total, setTotal] = useState(0);

  const load = async (nextParams: GetAppConfigListParams = params) => {
    setLoading(true);
    try {
      const data = await fetchAppConfigs(nextParams);
      const items = Array.isArray(data?.items) ? data.items : [];
      setConfigs(items);
      originalConfigsRef.current = items.reduce<Record<number, AppConfig>>((acc, item) => {
        acc[item.id] = { ...item };
        return acc;
      }, {});
      setDirtyIds(new Set());
      setSelectedIds(new Set());
      setTotal(typeof data?.total === "number" ? data.total : 0);
      if (!Array.isArray(data?.items)) {
        notify({
          message: "Dữ liệu trả về không hợp lệ. Vui lòng kiểm tra API /admin/v1/configs.",
          variant: "error",
        });
      }
    } catch {
      notify({
        message: "Không thể tải danh sách cấu hình. Kiểm tra API /admin/v1/configs.",
        variant: "error",
      });
      setConfigs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParams((prev) => ({ ...prev, page: 1, keyword }));
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === configs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(configs.map((c) => c.id)));
    }
  };

  const clearSelectionFor = (id: number) => {
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const hasConfigChanged = (config: AppConfig) => {
    const original = originalConfigsRef.current[config.id];
    if (!original) return false;
    const fields: (keyof AppConfig)[] = ["name", "value"];
    return fields.some((field) => {
      const nextValue = config[field] ?? "";
      const originalValue = original[field] ?? "";
      return nextValue !== originalValue;
    });
  };

  const handleChangeConfig = (updated: AppConfig) => {
    const changed = hasConfigChanged(updated);
    setConfigs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setDirtyIds((prev) => {
      const next = new Set(prev);
      changed ? next.add(updated.id) : next.delete(updated.id);
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      changed ? next.add(updated.id) : next.delete(updated.id);
      return next;
    });
  };

  const handleSaveConfig = async (config: AppConfig) => {
    setSaving(true);
    try {
      await updateAppConfig(config);
      clearSelectionFor(config.id);
      notify({ message: "Đã cập nhật cấu hình.", variant: "success" });
      load(params);
    } catch {
      notify({ message: "Cập nhật thất bại. Vui lòng kiểm tra API.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const computeDirtyIds = () => {
    const dirty = new Set<number>();
    configs.forEach((config) => {
      if (hasConfigChanged(config)) {
        dirty.add(config.id);
      }
    });
    return dirty;
  };

  const handleBulkUpdate = async (targetIds: number[]) => {
    if (!targetIds.length) return;
    setSaving(true);
    try {
      for (const id of targetIds) {
        const item = configs.find((c) => c.id === id);
        if (item) {
          await updateAppConfig(item);
          clearSelectionFor(id);
        }
      }
      notify({ message: "Đã cập nhật danh sách cấu hình.", variant: "success" });
      setSelectedIds(new Set());
      load(params);
    } catch {
      notify({ message: "Cập nhật hàng loạt thất bại.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpdateClick = () => {
    const dirtyPool = dirtyIds.size ? new Set(dirtyIds) : computeDirtyIds();
    setDirtyIds(dirtyPool);
    const targetIds = Array.from(dirtyPool);
    if (!targetIds.length) {
      notify({ message: "Không có thay đổi nào cần cập nhật.", variant: "info" });
      return;
    }
    setSelectedIds(new Set(targetIds));
    confirm({
      title: "Cập nhật cấu hình",
      description: `Áp dụng cập nhật cho ${targetIds.length} cấu hình đã thay đổi?`,
      confirmText: "Cập nhật",
      onConfirm: () => handleBulkUpdate(targetIds),
    });
  };

  const handlePageChange = (nextPage: number) => {
    setParams((prev) => ({ ...prev, page: nextPage }));
  };

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Cấu hình hệ thống</p>
          <h1 className="text-xl font-semibold text-slate-900">Cập Nhật Cấu Hình</h1>
        </div>
        <Breadcrumbs
          items={[
            { label: "Bảng điều khiển", href: "/" },
            { label: "Cấu hình hệ thống", href: "/settings/config" },
            { label: "Cập Nhật Cấu Hình" },
          ]}
          className="justify-end"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 px-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Delete button hidden for now */}
          {/* <button
            onClick={handleBulkDeleteClick}
            disabled={selectedCount === 0 || saving}
            className={`tme-btn tme-btn-danger ${selectedCount === 0 || saving ? "cursor-not-allowed opacity-40" : ""}`}
          >
            Xóa chọn
          </button> */}

          <UpdateButton onClick={handleBulkUpdateClick} disabled={saving} />

          {/* Create button hidden for now */}
          {/* <button
            type="button"
            onClick={handleStartCreate}
            className="tme-btn tme-btn-primary px-3.5 text-[14px] disabled:opacity-60"
            disabled={Boolean(newConfig) || saving}
          >
            Thêm cấu hình
          </button> */}
        </div>

        <div className="ml-auto flex w-full max-w-xs items-center gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên cấu hình..."
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700 placeholder-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      <AppConfigTable
        configs={configs}
        selectedIds={selectedIds}
        loading={loading}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onChangeConfig={handleChangeConfig}
        onSaveConfig={handleSaveConfig}
      />

      <Pagination
        page={params.page || 1}
        pageSize={params.pageSize || 20}
        totalItems={total}
        onPageChange={handlePageChange}
        onPageSizeChange={(s) => setParams((prev) => ({ ...prev, page: 1, pageSize: s }))}
      />
      {dialog}
    </div>
  );
}
