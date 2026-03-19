"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  if (!items || items.length === 0) return null;
  if (items.length === 1 && !items[0].href) {
    return (
      <nav
        aria-label="Breadcrumb"
        className={cn("flex items-center gap-1 text-xs sm:text-sm text-slate-400", className)}
      >
        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
          {items[0].label}
        </span>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-xs sm:text-sm text-slate-400", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const showHomeIcon =
          index === 0 && (item.label.toLowerCase() === "dashboard" || item.label.toLowerCase() === "trang chủ");

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <span className="mx-1 text-[10px] sm:text-xs text-slate-300">/</span>}
            {isLast || !item.href ? (
              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                {showHomeIcon && <HomeIcon />}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="inline-flex items-center gap-1 text-slate-400 transition-colors hover:text-emerald-500"
              >
                {showHomeIcon && <HomeIcon />}
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

function HomeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="M10 3.22 3 8.2V17a1 1 0 0 0 1 1h4.5v-4.25a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1V18H16a1 1 0 0 0 1-1V8.2l-7-4.98Z" />
    </svg>
  );
}
