"use client";

import type { ReactNode } from "react";

type ActionIconButtonProps = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: "edit" | "delete" | "view" | "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
};

export function ActionIconButton({
  label,
  icon,
  onClick,
  variant = "edit",
  disabled,
}: ActionIconButtonProps) {
  // Map old variant names to new colors for backward compatibility
  const variantClass =
    variant === "delete" || variant === "danger"
      ? "text-rose-600 hover:bg-rose-50"
      : variant === "view" || variant === "ghost"
        ? "text-emerald-600 hover:bg-emerald-50"
        : variant === "primary"
          ? "text-emerald-600 hover:bg-emerald-50"
          : variant === "secondary"
            ? "text-slate-600 hover:bg-slate-50"
            : "text-blue-600 hover:bg-blue-50"; // edit (default)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`rounded-lg p-1.5 transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClass}`}
    >
      {icon}
    </button>
  );
}
