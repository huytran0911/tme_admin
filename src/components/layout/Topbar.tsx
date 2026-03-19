"use client";

import { useAuth } from "@/features/auth";

export function Topbar() {
  const { user, logout } = useAuth();

  const userInitials = user?.userName
    ? user.userName.slice(0, 2).toUpperCase()
    : "AU";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <div className="hidden flex-1 items-center gap-2 md:flex">
          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 shadow-[0_2px_6px_rgba(56,199,147,0.16)]">
            Live
          </span>
          <span className="text-sm text-slate-500">Dashboard</span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1.5">
          <IconButton icon="bell" label="Alerts" />
          <IconButton icon="moon" label="Theme" />
          <IconButton icon="globe" label="Language" />
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 shadow-sm shadow-slate-200/80">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-sky-400 text-xs font-semibold text-white shadow-[0_4px_10px_rgba(56,189,248,0.22)]">
              {userInitials}
            </div>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-slate-800">{user?.userName || "Admin"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}

type IconButtonProps = {
  icon: "bell" | "moon" | "globe";
  label: string;
};

function IconButton({ icon, label }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_8px_18px_rgba(56,199,147,0.18)]"
    >
      {icon === "bell" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4.5 w-4.5"
        >
          <path d="M12 4.5a5 5 0 0 0-5 5V12l-1.5 3h15L19 12V9.5a5 5 0 0 0-5-5" />
          <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
        </svg>
      )}
      {icon === "moon" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4.5 w-4.5"
        >
          <path d="M20 14.5A7.5 7.5 0 0 1 10.5 5a7.5 7.5 0 1 0 9.5 9.5Z" />
        </svg>
      )}
      {icon === "globe" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4.5 w-4.5"
        >
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17M12 3.5c-2.5 3-2.5 14 0 17M9 4c-3 3-3 13 0 16M15 4c3 3 3 13 0 16" />
        </svg>
      )}
    </button>
  );
}
