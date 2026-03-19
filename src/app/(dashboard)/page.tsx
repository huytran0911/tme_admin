type StatCardProps = {
  title: string;
  value: string;
  change: string;
  accent: "mint" | "blue" | "purple";
  progress: number;
};

type Status = "Done" | "Pending";

const statCards: StatCardProps[] = [
  {
    title: "Total Sale",
    value: "$82,450",
    change: "+12.4% vs last month",
    accent: "mint",
    progress: 72,
  },
  {
    title: "New Orders",
    value: "1,284",
    change: "+8.2% weekly",
    accent: "blue",
    progress: 64,
  },
  {
    title: "Order Delivery",
    value: "96.4%",
    change: "On-time rate",
    accent: "purple",
    progress: 90,
  },
];

const productRows = [
  { name: "Aurora Lamp", category: "Lighting", revenue: "$24,800", status: "Done" as Status },
  { name: "Velvet Chair", category: "Furniture", revenue: "$18,650", status: "Pending" as Status },
  { name: "Minimal Clock", category: "Accessories", revenue: "$12,420", status: "Done" as Status },
  { name: "Nordic Sofa", category: "Living Room", revenue: "$32,100", status: "Done" as Status },
];

const manageOrders = [
  {
    customer: "Sarah Lin",
    orderId: "#A-1245",
    amount: "$420",
    status: "Done" as Status,
    eta: "Delivered · 2h ago",
  },
  {
    customer: "James Kim",
    orderId: "#A-1246",
    amount: "$318",
    status: "Pending" as Status,
    eta: "ETA · Today 4:30 PM",
  },
  {
    customer: "Ava Wong",
    orderId: "#A-1247",
    amount: "$756",
    status: "Done" as Status,
    eta: "Delivered · 30m ago",
  },
  {
    customer: "Marcus Lee",
    orderId: "#A-1248",
    amount: "$189",
    status: "Pending" as Status,
    eta: "ETA · Tomorrow",
  },
];

const categoryLegend = [
  { label: "Home Decor", value: "40%", color: "bg-emerald-400" },
  { label: "Electronics", value: "25%", color: "bg-sky-400" },
  { label: "Fashion", value: "17%", color: "bg-amber-300" },
  { label: "Beauty", value: "18%", color: "bg-purple-400" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
        <p className="text-sm font-semibold text-emerald-600">Welcome back</p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              TME Admin Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Bright, calm, and ready to manage your operations at a glance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">
              Export
            </button>
            <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600">
              Create Report
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-600">
                  Performance
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Top Selling Products
                </h2>
              </div>
              <button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">
                View all
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-4 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">
                <span>Product</span>
                <span>Category</span>
                <span className="text-right">Revenue</span>
                <span className="text-right">Status</span>
              </div>
              {productRows.map((row) => (
                <div
                  key={row.name}
                  className="grid grid-cols-4 items-center px-6 py-4 text-sm text-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-[11px] font-semibold uppercase text-slate-500">
                      {row.name
                        .split(" ")
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {row.name}
                      </p>
                      <p className="text-xs text-slate-500">SKU · Dynamic</p>
                    </div>
                  </div>
                  <span className="text-slate-600">{row.category}</span>
                  <span className="text-right font-semibold text-slate-900">
                    {row.revenue}
                  </span>
                  <div className="flex justify-end">
                    <StatusBadge status={row.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_2px_6px_rgba(0,0,0,0.03)] lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center justify-center">
              <div
                className="relative h-48 w-48 rounded-full"
                style={{
                  background:
                    "conic-gradient(#34d399 0% 40%, #38bdf8 40% 65%, #fbbf24 65% 82%, #a78bfa 82% 100%)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
                }}
              >
                <div className="absolute inset-5 rounded-full border border-white bg-white shadow-inner shadow-slate-200/70" />
                <div className="absolute inset-12 flex items-center justify-center rounded-full bg-white">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Category
                    </p>
                    <p className="text-xl font-bold text-slate-900">Overview</p>
                    <p className="text-xs text-slate-500">Last 30 days</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-600">
                  Category Overview
                </p>
                <h3 className="text-lg font-semibold text-slate-900">
                  Distribution by category
                </h3>
                <p className="text-sm text-slate-500">
                  Track how your catalog performs across key product groups.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {categoryLegend.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${item.color}`}
                      />
                      <p className="text-sm font-semibold text-slate-800">
                        {item.label}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-600">
                Operations
              </p>
              <h2 className="text-lg font-semibold text-slate-900">
                Manage Order
              </h2>
              <p className="text-sm text-slate-500">Live updates from today</p>
            </div>
            <button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">
              Refresh
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {manageOrders.map((order) => (
              <div
                key={order.orderId}
                className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/70"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600">
                    {order.customer
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {order.customer}
                    </p>
                    <p className="text-xs text-slate-500">{order.orderId}</p>
                    <p className="text-xs text-emerald-600">{order.eta}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {order.amount}
                  </p>
                  <div className="mt-1 flex justify-end">
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, accent, progress }: StatCardProps) {
  const accentStyles: Record<
    StatCardProps["accent"],
    { chip: string; bar: string; icon: string; glow: string }
  > = {
    mint: {
      chip: "bg-emerald-50 text-emerald-700 border-emerald-100",
      bar: "bg-emerald-500",
      icon: "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white",
      glow: "shadow-[0_10px_25px_rgba(56,199,147,0.22)]",
    },
    blue: {
      chip: "bg-sky-50 text-sky-700 border-sky-100",
      bar: "bg-sky-500",
      icon: "bg-gradient-to-br from-sky-400 to-sky-500 text-white",
      glow: "shadow-[0_10px_25px_rgba(56,189,248,0.22)]",
    },
    purple: {
      chip: "bg-purple-50 text-purple-700 border-purple-100",
      bar: "bg-purple-500",
      icon: "bg-gradient-to-br from-purple-400 to-purple-500 text-white",
      glow: "shadow-[0_10px_25px_rgba(167,139,250,0.22)]",
    },
  };

  const styles = accentStyles[accent];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_2px_6px_rgba(0,0,0,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {value}
          </p>
          <span
            className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${styles.chip}`}
          >
            <span className={`h-2 w-2 rounded-full ${styles.bar}`} />
            {change}
          </span>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${styles.icon} ${styles.glow}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-6 w-6"
          >
            <path d="M4 12.5 9.5 18 20 6.5" />
          </svg>
        </div>
      </div>
      <div className="mt-5">
        <div className="h-2 w-full rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${styles.bar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {progress}% of monthly target achieved
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const badgeClasses =
    status === "Done"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : "border-orange-100 bg-orange-50 text-orange-700";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses}`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          status === "Done" ? "bg-emerald-400" : "bg-orange-400"
        }`}
      />
      {status}
    </span>
  );
}
