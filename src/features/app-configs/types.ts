export interface AppConfig {
  id: number;
  code: string;
  name: string;
  value: string;
  adminConfig?: number | null;
  createdAt?: string;
}

export type AppConfigListItem = AppConfig;

export interface GetAppConfigListParams {
  keyword?: string;
  adminConfig?: number;
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
