"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { PropsWithChildren, ReactNode } from "react";

type SidebarItemProps = PropsWithChildren<{
  href: string;
  label: string;
  icon?: ReactNode;
  collapsed?: boolean;
}>;

export function SidebarItem({
  href,
  label,
  icon,
  children,
  collapsed,
}: SidebarItemProps) {
  const pathname = usePathname();

  // List of independent sub-routes that should not make their parent active
  const INDEPENDENT_SUBROUTES = ['/homepage', '/create'];

  // Check if current pathname is on an independent sub-route of this href
  const hasIndependentSubroute = INDEPENDENT_SUBROUTES.some(sub =>
    pathname.startsWith(`${href}${sub}`)
  );

  const isActive =
    pathname === href ||
    (href !== "/" && pathname.startsWith(`${href}/`) && !hasIndependentSubroute);

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group relative flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1 text-[13px] leading-tight font-semibold transition-all",
          isActive
            ? "bg-emerald-100/80 border border-emerald-300 text-emerald-700 shadow-[0_6px_18px_rgba(56,199,147,0.16)]"
            : "text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
        )}
        title={collapsed ? label : undefined}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          {icon ?? children}
        </span>
        {!collapsed && <span>{label}</span>}
        {collapsed && (
          <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
            {label}
          </span>
        )}
      </Link>
    </li>
  );
}
