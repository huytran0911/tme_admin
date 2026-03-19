export type ProductTypeValue = {
  id: number;
  productTypeId: number;
  productTypeName: string | null;
  value: string | null; // The actual value/name (e.g., "Samsung", "Trắng")
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

export type CreateProductTypeValueRequest = {
  name: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateProductTypeValueRequest = {
  name?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type GetProductTypeValuesParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
