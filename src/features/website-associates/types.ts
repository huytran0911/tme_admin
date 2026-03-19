export type WebsiteAssociate = {
  id: number;
  name: string;
  address?: string;
  status: 0 | 1;
  sort?: number;
  viewCount?: number;
  view?: number;
  createdAt?: string;
  logoUrl?: string;
};

export type WebsiteAssociateInput = {
  name: string;
  address?: string;
  status?: 0 | 1;
  sort?: number;
  logoUrl?: string;
};

export type GetWebsiteAssociateParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  searchTerm?: string;
  status?: 0 | 1;
};

export type PagedWebsiteAssociateResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
};
