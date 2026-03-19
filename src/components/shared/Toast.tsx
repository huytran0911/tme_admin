"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { onApiError } from "@/lib/api";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  notify: (toast: Omit<ToastItem, "id" | "variant"> & { variant?: ToastVariant }) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback<ToastContextValue["notify"]>(
    ({ title, message, variant = "info" }) => {
      const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
      setToasts((prev) => [...prev, { id, title, message, variant }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove],
  );

  // Listen to global API errors and show toast
  useEffect(() => {
    const unsubscribe = onApiError((error) => {
      notify({
        title: "Lỗi",
        message: error.message,
        variant: "error",
      });
    });
    return unsubscribe;
  }, [notify]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-100 flex justify-center px-4 sm:justify-end sm:px-6">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const variantStyles: Record<ToastVariant, string> = {
    success: "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80 shadow-emerald-100/80",
    error: "border-rose-500 bg-rose-50 text-rose-900 ring-1 ring-rose-200/80 shadow-rose-100/80",
    info: "border-amber-400 bg-amber-50 text-amber-900 ring-1 ring-amber-200/80 shadow-amber-100/80",
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className={cn(
        "pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-[0_12px_30px_rgba(15,23,42,0.12)]",
        variantStyles[toast.variant],
      )}
    >
      <div className="flex items-center gap-3">
        <div>
          {toast.variant === "success" && (
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M16.707 5.293a1 1 0 0 0-1.414-1.414L8 11.172 4.707 7.879a1 1 0 0 0-1.414 1.414l4 4a1 1 0 0 0 1.414 0l8-8Z" />
            </svg>
          )}
          {toast.variant === "error" && (
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM9 6.75a1 1 0 1 1 2 0v3.5a1 1 0 1 1-2 0v-3.5Zm1 7.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
            </svg>
          )}
          {toast.variant === "info" && (
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM9 8a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0V8Zm1 5.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          {toast.title && <p className="text-xs font-semibold uppercase tracking-wide">{toast.title}</p>}
          <p className="text-sm">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-slate-500 transition hover:bg-white/70 hover:text-slate-800"
          aria-label="Đóng thông báo"
        >
          x
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
