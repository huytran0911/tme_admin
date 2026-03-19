export type Supplier = {
  id: number;
  name: string;
  nameEn: string;
  logo: string;
};

export type GetSupplierListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
};

export type PagedSupplierResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
