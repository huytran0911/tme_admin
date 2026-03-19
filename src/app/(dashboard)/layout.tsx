import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ToastProvider } from "@/components/shared/Toast";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <ToastProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-h-screen flex-1 flex-col bg-white">
            <Topbar />
            <main className="flex-1 px-3 pb-10 pt-5 sm:px-5 lg:px-7">
              <div className="mx-auto w-full max-w-7xl space-y-5">{children}</div>
            </main>
          </div>
        </div>
      </ToastProvider>
    </div>
  );
}
