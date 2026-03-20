// Customer list item (matches API CustomerListItemResponse)
export type Customer = {
  id: number;
  userName: string | null;
  email: string | null;
  name: string | null; // fullName in API is "name"
  phone: string | null;
  status: string | null; // "0" = active, "1" = locked
  address: string | null;
  point: number; // "point" not "points" in API
  createdAt: string;
};

// Customer detail (matches API CustomerDetailResponse)
export type CustomerDetail = {
  id: number;
  userName: string | null;
  email: string | null;
  name: string | null; // fullName in API is "name"
  phone: string | null;
  fax: string | null;
  website: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  sex: number | null; // gender in API is "sex" (number)
  status: string | null; // "0" = active, "1" = locked
  point: number;
  recieveNewProduct: number | null; // typo in API: "recieve" not "receive"
  recieveNewSpecial: number | null;
  createdAt: string;
};

// Request types (matches API)
export type CreateCustomerRequest = {
  name?: string | null;
  sex?: number | null; // 0 = male, 1 = female
  company?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  fax?: string | null;
  website?: string | null;
  userName?: string | null;
  recieveNewProduct?: number | null; // 0 or 1
  recieveNewSpecial?: number | null; // 0 or 1
  status?: string | null; // "0" = active, "1" = locked
  lang?: string | null;
};

export type UpdateCustomerRequest = {
  name?: string | null;
  sex?: number | null;
  company?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  fax?: string | null;
  website?: string | null;
  recieveNewProduct?: number | null;
  recieveNewSpecial?: number | null;
  status?: string | null; // "0" = active, "1" = locked
  point?: number;
  saveMoney?: number;
  lang?: string | null;
};

export type GetCustomersParams = {
  Keyword?: string;
  IsActive?: boolean;
  Page?: number;
  PageSize?: number;
};

export type PagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
