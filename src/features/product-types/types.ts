export type ProductType = {
  id: number;
  name: string | null;
  code: string | null;
  isActive: boolean;
  valuesCount: number;
  createdAt: string;
};

export type ProductTypeDetail = {
  id: number;
  name: string | null;
  code: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type CreateProductTypeRequest = {
  name: string;
  code?: string;
  isActive?: boolean;
};

export type UpdateProductTypeRequest = {
  name?: string;
  code?: string;
  isActive?: boolean;
};

export type GetProductTypeListParams = {
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
