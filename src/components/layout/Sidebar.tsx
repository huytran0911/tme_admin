"use client";

import { useState } from "react";
import { navSections } from "@/config/navigation";
import { SidebarItem } from "./SidebarItem";

type SidebarToggleProps = {
  collapsed: boolean;
  onToggle: () => void;
};

function SidebarToggle({ collapsed, onToggle }: SidebarToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/70 bg-white text-slate-500 shadow-sm transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 hover:shadow-md active:scale-95"
      aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
    >
      {collapsed ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          className="h-4 w-4 transition-transform duration-200"
        >
          <path d="m9 8 4 4-4 4" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          className="h-4 w-4 transition-transform duration-200"
        >
          <path d="m15 8-4 4 4 4" />
        </svg>
      )}
    </button>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  return (
    <aside
      className={`sticky left-0 top-0 z-20 flex h-screen flex-col border-r border-slate-200 bg-white py-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-16 px-2" : "w-64 px-3"
      }`}
    >
      {collapsed ? (
        <div className="mb-3 flex flex-col items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 text-base font-bold text-white shadow-sm shadow-emerald-500/30">
            T
          </div>
          <SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} />
        </div>
      ) : (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 px-3 py-2.5 shadow-[0_6px_18px_rgba(56,199,147,0.12)]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 text-base font-bold text-white shadow-sm shadow-emerald-500/30">
              T
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-600">
                TME Admin
              </p>
              <p className="text-[13px] font-semibold text-slate-800">
                Control Center
              </p>
            </div>
          </div>
          <SidebarToggle collapsed={collapsed} onToggle={toggleCollapsed} />
        </div>
      )}

      <nav aria-label="Main navigation" className="overflow-y-auto pr-1">
        {navSections.map((section) => (
          <div key={section.id} className="mt-3 first:mt-0">
            {!collapsed && (
              <p className="mt-2.5 mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                {section.label}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  collapsed={collapsed}
                >
                  {item.icon}
                </SidebarItem>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[11px] text-slate-600 shadow-[0_2px_6px_rgba(15,23,42,0.04)]">
          <p className="text-[11px] font-semibold text-slate-800">Need help?</p>
          <p className="mt-1 leading-relaxed text-[11px]">
            Reach the platform team anytime for support or guidance.
          </p>
        </div>
      )}
    </aside>
  );
}
