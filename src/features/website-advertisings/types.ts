export type WebsiteAdvertising = {
  id: number;
  name: string;
  address?: string;
  image?: string;
  status: 0 | 1;
  sort?: number;
  view?: number;
  createdAt?: string;
};

export type WebsiteAdvertisingInput = {
  name: string;
  address?: string;
  image?: string;
  status?: 0 | 1;
  sort?: number;
};

export type GetWebsiteAdvertisingParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: 0 | 1;
};

export type PagedWebsiteAdvertisingResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
};
