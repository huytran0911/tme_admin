// Sale Off list item (matches SaleOffListItemResponse)
export type SaleOff = {
  id: number;
  name: string;
  nameEn: string | null;
  applyFrom: string | null; // DateTime as ISO string
  applyTo: string | null;
  forever: boolean;
  popup: boolean;
  status: string; // "active" | "expired" | "upcoming" etc.
  createdAt: string;
};

// Sale Off detail (matches SaleOffDetailResponse)
export type SaleOffDetail = {
  id: number;
  name: string;
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  content: string | null;
  contentEn: string | null;
  applyFrom: string | null;
  applyTo: string | null;
  images: string | null;
  popup: boolean;
  forever: boolean;
  status: string;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

// Sale Off Product (matches SaleOffProductDto)
export type SaleOffProduct = {
  productId: number;
  productCode: string;
  productName: string;
  productNameEn: string | null;
  productImage: string | null;
  originalPrice: number | null;
  saleOffValue: number; // percentage or fixed amount
  quantity: number;
  createdAt: string;
};

// Request types
export type CreateSaleOffRequest = {
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  content?: string;
  contentEn?: string;
  applyFrom?: string | null;
  applyTo?: string | null;
  images?: string;
  popup?: boolean;
  forever?: boolean;
};

export type UpdateSaleOffRequest = CreateSaleOffRequest;

export type GetSaleOffListParams = {
  Keyword?: string;
  Status?: string;
  Forever?: boolean;
  DateFrom?: string;
  DateTo?: string;
  Page?: number;
  PageSize?: number;
};

export type GetSaleOffProductsParams = {
  Keyword?: string;
  Page?: number;
  PageSize?: number;
};

// Add products request item
export type SaleOffProductItem = {
  productId: number;
  saleOffValue: number;
  quantity: number;
};

export type AddProductsToSaleOffRequest = {
  products: SaleOffProductItem[];
};

export type UpdateSaleOffProductRequest = {
  saleOffValue: number;
  quantity: number;
};

export type PagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

// Product for selection (from /admin/v1/products)
export type ProductForSelection = {
  id: number;
  code: string;
  name: string;
  nameEn: string | null;
  image: string | null;
  categoryId: number | null;
  categoryName: string | null;
  price: number | null;
  originalPrice: number | null;
  quantity: number | null;
};
