"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title = "Xác nhận",
  description,
  confirmText = "Đồng ý",
  cancelText = "Hủy",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-inner shadow-emerald-200/40">
            !
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export type ConfirmState = {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  onConfirm: () => void | Promise<void>;
};

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({ open: false, onConfirm: () => {} });
  const openConfirm = (payload: Omit<ConfirmState, "open">) =>
    setState({ ...payload, open: true });
  const closeConfirm = () => setState((prev) => ({ ...prev, open: false }));

  const dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      description={state.description}
      confirmText={state.confirmText}
      onConfirm={async () => {
        closeConfirm();
        await state.onConfirm();
      }}
      onCancel={closeConfirm}
    />
  );

  return { confirm: openConfirm, closeConfirm, dialog };
}
