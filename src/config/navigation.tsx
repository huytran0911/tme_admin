import React from "react";

export type NavItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

const icons = {
  grid: icon([
    "M4.5 5.75A1.25 1.25 0 0 1 5.75 4.5h4.5a1.25 1.25 0 0 1 1.25 1.25v4.5a1.25 1.25 0 0 1-1.25 1.25h-4.5A1.25 1.25 0 0 1 4.5 10.25v-4.5Z",
    "M4.5 14.75A1.25 1.25 0 0 1 5.75 13h4.5a1.25 1.25 0 0 1 1.25 1.25v4.5A1.25 1.25 0 0 1 10.25 20h-4.5A1.25 1.25 0 0 1 4.5 18.75v-4.5Z",
    "M13 5.75A1.25 1.25 0 0 1 14.25 4.5h4.5A1.25 1.25 0 0 1 20 5.75v4.5a1.25 1.25 0 0 1-1.25 1.25h-4.5A1.25 1.25 0 0 1 13 10.25v-4.5Z",
    "M13 14.75A1.25 1.25 0 0 1 14.25 13h4.5A1.25 1.25 0 0 1 20 14.25v4.5A1.25 1.25 0 0 1 18.75 20h-4.5A1.25 1.25 0 0 1 13 18.75v-4.5Z",
  ]),
  folder: icon([
    "M3.75 6.75A1.75 1.75 0 0 1 5.5 5h3l1.25 1.5H18.5a1.75 1.75 0 0 1 1.75 1.75v7a1.75 1.75 0 0 1-1.75 1.75H5.5A1.75 1.75 0 0 1 3.75 15.25v-8.5Z",
  ]),
  users: icon([
    "M7.5 8.75a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M16.5 10.25a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    "M4.75 18.5a3.75 3.75 0 0 1 3.75-3.75h2.5A3.75 3.75 0 0 1 14.75 18.5",
    "M14 14.75h2a3.25 3.25 0 0 1 3.25 3.25",
  ]),
  tag: icon([
    "M3.75 5.75A2 2 0 0 1 5.75 3.75h4.586a2 2 0 0 1 1.414.586l6.914 6.914a1.5 1.5 0 0 1 0 2.121l-4.586 4.586a1.5 1.5 0 0 1-2.121 0L3.75 10.336a2 2 0 0 1-.586-1.414V5.75Z",
    "M7.25 7.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  ]),
  sparkles: icon([
    "M12 3.75 13 6l2.25 1-2.25 1L12 10l-1-2-2.25-1L11 6l1-2.25Z",
    "M17.5 11.25 18 12.5l1.25.5-1.25.5-.5 1.25-.5-1.25-1.25-.5 1.25-.5.5-1.25Z",
    "M7 11.25 7.75 13l1.75.75-1.75.75L7 16.25l-.75-1.75L4.5 13l1.75-.75L7 11.25Z",
  ]),
  cube: icon([
    "m12 3 7 3.5-7 3.5-7-3.5L12 3Z",
    "M5 9v6.5l7 3.5 7-3.5V9",
  ]),
  chart: icon([
    "M6.75 14.75v-4.5a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1Z",
    "M12.25 14.75v-6a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1Z",
    "M3.75 18.5h16.5",
  ]),
  newspaper: icon([
    "M5 5.75A1.75 1.75 0 0 1 6.75 4h10.5A1.75 1.75 0 0 1 19 5.75v10.5A1.75 1.75 0 0 1 17.25 18H6.75A1.75 1.75 0 0 1 5 16.25V5.75Z",
    "M7.5 6.5h5.75v1.5H7.5V6.5Zm0 3h9v1.5h-9V9.5Zm0 3h9v1.5h-9V12.5Z",
  ]),
  link: icon([
    "M8.75 9.25a3 3 0 0 1 0 4.243l-2.5 2.5a3 3 0 0 1-4.243-4.243l1.5-1.5",
    "M15.25 14.75a3 3 0 0 1 0-4.243l2.5-2.5a3 3 0 1 1 4.243 4.243l-1.5 1.5",
    "M9.75 14.25 14.25 9.75",
  ]),
  chat: icon([
    "M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v5A2.5 2.5 0 0 1 16.5 14H9l-3.5 3.5V6.5Z",
  ]),
  file: icon([
    "M7.75 4.75A1.75 1.75 0 0 1 9.5 3h5.25L19 7.25V17.5A1.75 1.75 0 0 1 17.25 19H9.5A1.75 1.75 0 0 1 7.75 17.25V4.75Z",
    "M14.75 3v3.5a.5.5 0 0 0 .5.5H19",
  ]),
  shield: icon([
    "M5.5 7.25 12 4l6.5 3.25V12c0 3.7-2.72 6.98-6.5 7.75C8.22 18.98 5.5 15.7 5.5 12V7.25Z",
  ]),
  cart: icon([
    "M4.75 5.25h1.5l1 9h9l1-6h-10",
    "M10 18.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm6 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z",
  ]),
  truck: icon([
    "M3.75 6.75A1.75 1.75 0 0 1 5.5 5h8.75v8.5H4.75a1 1 0 0 1-1-1v-5.75Z",
    "M14.25 8.5h2.75L19 11v3.5h-4.75v-6Z",
    "M6.5 18.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm8 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z",
  ]),
  credit: icon([
    "M4 7.75A1.75 1.75 0 0 1 5.75 6h12.5A1.75 1.75 0 0 1 20 7.75v8.5A1.75 1.75 0 0 1 18.25 18H5.75A1.75 1.75 0 0 1 4 16.25v-8.5Z",
    "M4 10h16",
  ]),
  cog: icon([
    "M12 9.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z",
    "M12 4.75v1.5",
    "M12 17.75v1.5",
    "m6.19 2.06-1.06-1.06",
    "m6.19-10.44-1.06 1.06",
    "m4.75 12h1.5",
    "m16.75 12h1.5",
    "m5.69 19.81 1.06-1.06",
    "m5.69 6.19 1.06 1.06",
  ]),
  logout: icon([
    "M13.25 6.75V5.5A1.75 1.75 0 0 0 11.5 3.75h-5A1.75 1.75 0 0 0 4.75 5.5v13a1.75 1.75 0 0 0 1.75 1.75h5a1.75 1.75 0 0 0 1.75-1.75v-1.25",
    "M16 12h-6",
    "m13.75 9.25 3.25-3.25-3.25-3.25",
  ]),
  book: icon([
    "M6.75 5.5a1.5 1.5 0 0 1 1.5-1.5h8.5a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5h-8.5a1.5 1.5 0 0 0-1.5 1.5V5.5Z",
    "M6.75 6h11.5",
  ]),
};

function icon(paths: string[]) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export const navSections: NavSection[] = [
  {
    id: "catalog",
    label: "Quản lý danh mục",
    items: [
      { label: "Nhóm Sản Phẩm", href: "/catalog/product-groups", icon: icons.grid },
      { label: "Danh Mục Sản Phẩm", href: "/catalog/categories", icon: icons.folder },
      { label: "Danh Mục Nhà Cung Cấp", href: "/catalog/suppliers", icon: icons.users },
    ],
  },
  {
    id: "product-content",
    label: "Nội dung sản phẩm",
    items: [
      { label: "Quản Lý Sản Phẩm", href: "/catalog/products", icon: icons.cube },
      { label: "Quản Lý Thông tin Sản Phẩm", href: "/products/info", icon: icons.file },
      { label: "Sản Phẩm Mới", href: "/products/new", icon: icons.sparkles },
      { label: "Cập nhật Nhanh giá SP", href: "/products/quick-price", icon: icons.tag },
      { label: "Cập nhật nhanh SL SP", href: "/products/quick-stock", icon: icons.chart },
      { label: "Phân loại Sản Phẩm", href: "/catalog/product-types", icon: icons.tag },
    ],
  },
  {
    id: "promotions",
    label: "Khuyến mãi",
    items: [
      { label: "Giảm Giá Sản Phẩm", href: "/sale-off", icon: icons.tag },
      { label: "Chương trình khuyến mãi", href: "/promotions", icon: icons.sparkles },
      // { label: "Phiếu mua hàng", href: "/promotions/coupons", icon: icons.folder },
    ],
  },
  {
    id: "slides",
    label: "Slide",
    items: [
      { label: "Quản Lý Slide", href: "/slides", icon: icons.grid },
      { label: "Slide Theo Categories", href: "/slides/by-category", icon: icons.folder },
    ],
  },
  {
    id: "news",
    label: "Nội dung tin tức",
    items: [
      { label: "Quản Lý Tin Tức", href: "/news", icon: icons.newspaper },
      { label: "Cập Nhật Tin Tức Trang Chủ", href: "/news/homepage", icon: icons.sparkles },
    ],
  },
  {
    id: "links",
    label: "Liên kết website",
    items: [
      { label: "Liên Kết Website", href: "/website-associates", icon: icons.link },
      { label: "Quản Lý Quảng Cáo", href: "/website-advertisings", icon: icons.chart },
    ],
  },
  {
    id: "support",
    label: "Hỗ trợ trực tuyến",
    items: [
      { label: "Quản Lý Hỗ Trợ Trực Tuyến", href: "/support/online", icon: icons.chat },
      { label: "Quản Lý Bài Viết Hỗ Trợ", href: "/support/articles", icon: icons.book },
    ],
  },
  {
    id: "other-content",
    label: "Nội dung khác",
    items: [
      { label: "Cập Nhật Nội Dung", href: "/content/pages", icon: icons.file },
      { label: "Quản Lý Download", href: "/content/downloads", icon: icons.folder },
    ],
  },
  {
    id: "members",
    label: "Thành viên",
    items: [{ label: "Quản Lý Thành Viên", href: "/customers", icon: icons.users }],
  },
  {
    id: "orders",
    label: "Đơn đặt hàng",
    items: [
      { label: "Tạo đơn hàng (POS)", href: "/sales-orders/create", icon: icons.cart },
      { label: "Quản Lý Đơn Đặt Hàng", href: "/sales-orders", icon: icons.cart },
      { label: "Quản Lý Báo giá", href: "/orders/quotes", icon: icons.file },
      { label: "Quản Lý Đơn Hàng Của Khách", href: "/orders/customer-orders", icon: icons.users },
      { label: "Quản Lý Phí Vận Chuyển", href: "/orders/shipping-fees", icon: icons.truck },
    ],
  },
  {
    id: "payments",
    label: "Thanh toán",
    items: [{ label: "Phương thức thanh toán", href: "/payment-methods", icon: icons.credit }],
  },
  {
    id: "settings",
    label: "Cấu hình hệ thống",
    items: [
      { label: "Cập Nhật Ngôn Ngữ", href: "/settings/languages", icon: icons.chat },
      { label: "Cập Nhật Cấu Hình", href: "/settings/config", icon: icons.cog },
      { label: "Thông Tin Tài Khoản", href: "/settings/account", icon: icons.shield },
    ],
  },
  {
    id: "system",
    label: "Hệ thống",
    items: [{ label: "Thoát", href: "/logout", icon: icons.logout }],
  },
];

