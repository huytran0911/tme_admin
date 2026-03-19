export interface ProductGroup {
  id: number;
  name: string;
  nameEn: string;
  image?: string | null;
  showStyle: number;
  slideStyle: number;
  sort: number;
  sortNew: number;
}

export type ProductGroupListItem = ProductGroup;

export interface GetProductGroupListParams {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}
