"use client";

import type { ReactNode } from "react";
import Link from "next/link";

type ToolbarButtonVariant = "primary" | "secondary" | "danger";

type ToolbarButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: ToolbarButtonVariant;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  icon?: ReactNode;
};

const variantClasses: Record<ToolbarButtonVariant, string> = {
  primary: "bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-200",
  secondary: "bg-slate-600 text-white hover:bg-slate-700 focus:ring-slate-200",
  danger: "bg-rose-500 text-white hover:bg-rose-600 focus:ring-rose-200",
};

export function ToolbarButton({
  children,
  onClick,
  href,
  variant = "secondary",
  disabled = false,
  type = "button",
  className = "",
  icon,
}: ToolbarButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white";
  const disabledClasses = disabled ? "cursor-not-allowed opacity-40" : "";
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`;

  const content = (
    <span className="flex items-center gap-1">
      {icon}
      {children}
    </span>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={combinedClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedClasses}
    >
      {content}
    </button>
  );
}

// Icon components
const TrashIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M7.5 3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v.75h3.75a.75.75 0 0 1 0 1.5h-.57l-.7 9.06A2.25 2.25 0 0 1 12.74 17H7.26a2.25 2.25 0 0 1-2.24-2.19l-.7-9.06h-.57a.75.75 0 0 1 0-1.5H7.5V3.5Zm1.5.75h2V3.5h-2v.75Zm-3 1.5.68 8.83a.75.75 0 0 0 .75.67h5.14a.75.75 0 0 0 .75-.67l.68-8.83H6Z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M16.78 5.72a.75.75 0 0 0-1.06-1.06l-7.25 7.25-3.19-3.2a.75.75 0 1 0-1.06 1.06l3.72 3.72a.75.75 0 0 0 1.06 0l7.78-7.77Z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10 4.5a.75.75 0 0 1 .75.75v4h4a.75.75 0 0 1 0 1.5h-4v4a.75.75 0 0 1-1.5 0v-4h-4a.75.75 0 0 1 0-1.5h4v-4A.75.75 0 0 1 10 4.5Z" />
  </svg>
);

// Preset buttons for common actions
export function DeleteSelectedButton({
  count,
  onClick,
  disabled,
}: {
  count: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ToolbarButton
      variant="danger"
      onClick={onClick}
      disabled={disabled || count === 0}
      icon={<TrashIcon />}
    >
      Xóa chọn
    </ToolbarButton>
  );
}

export function UpdateButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ToolbarButton variant="secondary" onClick={onClick} disabled={disabled} icon={<CheckIcon />}>
      Cập nhật
    </ToolbarButton>
  );
}

export function AddNewButton({
  href,
  onClick,
  disabled,
  children = "Thêm mới",
}: {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <ToolbarButton
      variant="primary"
      href={href}
      onClick={onClick}
      disabled={disabled}
      className="px-3.5 text-[14px]"
      icon={<PlusIcon />}
    >
      {children}
    </ToolbarButton>
  );
}
